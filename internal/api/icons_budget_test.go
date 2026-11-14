package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestIconPendingBudgetAndCanceledRequests(t *testing.T) {
	i := &Icons{MaxEntries: 1, MaxPending: 2, BatchDelay: time.Hour}
	i.init()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := i.get(ctx, "set", "canceled"); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	if i.pending != 0 {
		t.Fatal("canceled request was queued")
	}
	// Start callers and cancel after the entry was admitted. They leave a
	// bounded shared fetch that can still satisfy other callers for the icon.
	for n := range 2 {
		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan struct{})
		go func() { defer close(done); _, _ = i.get(ctx, "set", "icon-"+strconv.Itoa(n)) }()
		deadline := time.Now().Add(time.Second)
		for {
			i.mu.Lock()
			pending := i.pending
			i.mu.Unlock()
			if pending == n+1 {
				break
			}
			if time.Now().After(deadline) {
				t.Fatal("entry not queued")
			}
			time.Sleep(time.Millisecond)
		}
		cancel()
		<-done
	}
	if _, err := i.get(context.Background(), "set", "overflow"); !errors.Is(err, errIconBusy) {
		t.Fatalf("pending budget not enforced: %v", err)
	}
	// Exercise the HTTP overload response as well as the internal budget.
	req := httptest.NewRequest("GET", "/api/v1/icons/set/overflow.svg", nil)
	req.SetPathValue("prefix", "set")
	req.SetPathValue("file", "overflow.svg")
	w := httptest.NewRecorder()
	i.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests || w.Header().Get("Retry-After") == "" {
		t.Fatalf("overload response: %d %v", w.Code, w.Header())
	}
}

func TestConcurrentMissingIconResultsArePublishedSafely(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	defer upstream.Close()
	i := &Icons{Source: upstream.URL, BatchDelay: time.Nanosecond, MissingTTL: time.Nanosecond}
	i.init()
	var wg sync.WaitGroup
	for range 30 {
		wg.Go(func() {
			for range 60 {
				_, _ = i.get(context.Background(), "set", "missing")
			}
		})
	}
	wg.Wait()
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.pending != 0 {
		t.Fatal("completed entries retain budget")
	}
}

func TestIconSearchRejectsOverloadWithoutQueuing(t *testing.T) {
	i := &Icons{Limit: 1}
	i.init()
	i.slots <- struct{}{}
	req := httptest.NewRequest("GET", "/api/v1/icons?query=test", nil)
	w := httptest.NewRecorder()
	i.ServeSearch(w, req)
	if w.Code != http.StatusTooManyRequests || !strings.Contains(w.Body.String(), "busy") {
		t.Fatalf("search overload: %d %s", w.Code, w.Body.String())
	}
	<-i.slots
}

func TestIconNamesHaveByteBoundsBeforeQueueAdmission(t *testing.T) {
	i := &Icons{}
	for _, parts := range [][2]string{{strings.Repeat("a", 129), "icon"}, {"set", strings.Repeat("a", 257)}} {
		req := httptest.NewRequest("GET", "/api/v1/icons/unused", nil)
		req.SetPathValue("prefix", parts[0])
		req.SetPathValue("file", parts[1]+".svg")
		w := httptest.NewRecorder()
		i.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest || i.pending != 0 {
			t.Fatalf("oversized name was queued: %d %d", w.Code, i.pending)
		}
	}
}

func TestIconColorLengthIsBoundedBeforeSubstitution(t *testing.T) {
	i := &Icons{}
	req := httptest.NewRequest("GET", "/api/v1/icons/set/icon.svg?color="+strings.Repeat("a", 65), nil)
	req.SetPathValue("prefix", "set")
	req.SetPathValue("file", "icon.svg")
	w := httptest.NewRecorder()
	i.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest || i.pending != 0 {
		t.Fatalf("oversized color accepted: %d", w.Code)
	}
}

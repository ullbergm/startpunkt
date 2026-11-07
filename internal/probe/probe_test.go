package probe

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func fast() Options {
	o := DefaultOptions()
	o.Interval = 20 * time.Millisecond
	o.Timeout = 200 * time.Millisecond
	o.InitialBackoff = 20 * time.Millisecond
	o.MaxBackoff = 80 * time.Millisecond
	return o
}

func start(t *testing.T, s *store.Store, o Options) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go (&Prober{Store: s, Cluster: "local", Options: o}).Run(ctx)
}

func mk(id, url string) tile.Tile {
	return tile.Tile{ID: id, Kind: tile.KindApplication, Name: id, Cluster: "local", URL: url, Tags: []string{}}
}

func available(s *store.Store, id string) *bool {
	for _, tl := range s.Snapshot().Tiles {
		if tl.ID == id {
			return tl.Available
		}
	}
	return nil
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(2 * time.Millisecond)
	}
}

func is(s *store.Store, id string, want bool) func() bool {
	return func() bool { v := available(s, id); return v != nil && *v == want }
}

func TestStatusCodes(t *testing.T) {
	var redirected atomic.Bool
	mux := http.NewServeMux()
	mux.HandleFunc("/ok", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("/missing", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNotFound) })
	mux.HandleFunc("/login", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusUnauthorized) })
	mux.HandleFunc("/broken", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusBadGateway) })
	mux.HandleFunc("/redirect", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/target", http.StatusFound)
	})
	mux.HandleFunc("/target", func(w http.ResponseWriter, _ *http.Request) {
		redirected.Store(true)
		w.WriteHeader(http.StatusInternalServerError)
	})
	mux.HandleFunc("/slow", func(_ http.ResponseWriter, r *http.Request) { <-r.Context().Done() })
	ts := httptest.NewServer(mux)
	defer ts.Close()
	closed := httptest.NewServer(http.NotFoundHandler())
	closed.Close()

	s := store.New()
	want := map[string]bool{
		"ok": true, "missing": true, "login": true, "redirect": true,
		"broken": false, "slow": false,
	}
	for id := range want {
		s.Upsert(mk(id, ts.URL+"/"+id))
	}
	s.Upsert(mk("refused", closed.URL))
	want["refused"] = false
	start(t, s, fast())

	for id, expected := range want {
		eventually(t, id, is(s, id, expected))
	}
	if redirected.Load() {
		t.Error("a redirect must not be followed")
	}
}

func TestSkipsWhatItMustNotProbe(t *testing.T) {
	var hits atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { hits.Add(1) }))
	defer ts.Close()

	s := store.New()
	remote := mk("remote", ts.URL+"/remote")
	remote.Cluster = "other"
	bookmark := mk("bookmark", ts.URL+"/bookmark")
	bookmark.Kind = tile.KindBookmark
	s.Upsert(remote, bookmark, mk("ssh", "ssh://host"), mk("empty", ""), mk("local", ts.URL+"/local"))
	start(t, s, fast())

	eventually(t, "the local tile", is(s, "local", true))
	time.Sleep(60 * time.Millisecond)
	if n := hits.Load(); n < 1 {
		t.Errorf("the local tile was not probed")
	}
	for _, id := range []string{"remote", "bookmark", "ssh", "empty"} {
		if available(s, id) != nil {
			t.Errorf("%s must not have a result", id)
		}
	}
}

func TestSharedURLIsProbedOnce(t *testing.T) {
	var hits atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { hits.Add(1) }))
	defer ts.Close()

	s := store.New()
	s.Upsert(mk("a", ts.URL), mk("b", ts.URL))
	o := fast()
	o.Interval = time.Hour
	start(t, s, o)

	eventually(t, "both tiles", func() bool { return is(s, "a", true)() && is(s, "b", true)() })
	// A tile that arrives later gets the known result without a new probe.
	s.Upsert(mk("c", ts.URL))
	eventually(t, "the late tile", is(s, "c", true))
	if n := hits.Load(); n != 1 {
		t.Errorf("the URL was probed %d times", n)
	}
}

func TestFollowsChanges(t *testing.T) {
	var healthy atomic.Bool
	healthy.Store(true)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if !healthy.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
	}))
	defer ts.Close()

	s := store.New()
	s.Upsert(mk("a", ts.URL))
	start(t, s, fast())
	eventually(t, "available", is(s, "a", true))

	healthy.Store(false)
	eventually(t, "unavailable", is(s, "a", false))
	healthy.Store(true)
	eventually(t, "available again", is(s, "a", true))

	// The tile moves to another URL: the old result is dropped by whoever
	// rewrites the tile, and the new URL is probed.
	moved := mk("a", ts.URL+"/elsewhere")
	s.Upsert(moved)
	eventually(t, "the new URL", is(s, "a", true))

	s.Remove("a")
	time.Sleep(30 * time.Millisecond) // nothing to assert beyond not crashing
}

func TestBackoffGrowsAndIsCapped(t *testing.T) {
	var times []time.Time
	done := make(chan struct{})
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		times = append(times, time.Now())
		if len(times) == 6 {
			close(done)
		}
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	s := store.New()
	s.Upsert(mk("a", ts.URL))
	o := fast()
	o.Concurrency = 1 // also makes the handler's slice safe
	start(t, s, o)
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("not enough probes")
	}
	// Waits are roughly 20, 40, 80, 80, 80 ms. Scheduling adds a little.
	gaps := make([]time.Duration, 0, 5)
	for i := 1; i < 6; i++ {
		gaps = append(gaps, times[i].Sub(times[i-1]))
	}
	if gaps[1] < gaps[0] || gaps[2] < 70*time.Millisecond {
		t.Errorf("backoff did not grow: %v", gaps)
	}
	if gaps[4] > 200*time.Millisecond {
		t.Errorf("backoff is not capped: %v", gaps)
	}
}

func TestConcurrencyLimit(t *testing.T) {
	var current, peak atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		n := current.Add(1)
		for {
			old := peak.Load()
			if n <= old || peak.CompareAndSwap(old, n) {
				break
			}
		}
		time.Sleep(15 * time.Millisecond)
		current.Add(-1)
	}))
	defer ts.Close()

	s := store.New()
	ids := []string{"a", "b", "c", "d", "e", "f", "g", "h"}
	for _, id := range ids {
		s.Upsert(mk(id, ts.URL+"/"+id))
	}
	o := fast()
	o.Concurrency = 3
	o.Interval = time.Hour
	start(t, s, o)
	for _, id := range ids {
		eventually(t, id, is(s, id, true))
	}
	if p := peak.Load(); p > 3 {
		t.Errorf("%d probes ran at once, limit is 3", p)
	}
}

func TestSurvivesFallingBehind(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	defer ts.Close()
	s := store.New()
	start(t, s, fast())
	// Far more changes at once than a subscription buffers.
	for i := 0; i < 500; i++ {
		s.Upsert(mk("flood", ts.URL+"/"+time.Duration(i).String()))
	}
	s.Upsert(mk("after", ts.URL+"/after"))
	eventually(t, "probing to continue", is(s, "after", true))
}

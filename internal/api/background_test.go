package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
)

func TestBackground(t *testing.T) {
	var hits atomic.Int32
	var fail atomic.Bool
	bing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		_, _ = w.Write([]byte(`{"images":[{"urlbase":"/th?id=OHR.Example","title":"A view","copyright":"Someone"}]}`))
	}))
	defer bing.Close()

	b := &Background{Source: bing.URL, TTL: 30 * time.Millisecond}
	h := (&Server{Store: store.New(), Background: b}).Handler()

	var p Picture
	rec := get(t, h, "/api/v1/background")
	if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &p) != nil {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	if p.URL != "https://www.bing.com/th?id=OHR.Example_1920x1080.jpg" || p.Title != "A view" || p.Copyright != "Someone" {
		t.Errorf("picture = %+v", p)
	}

	get(t, h, "/api/v1/background")
	if n := hits.Load(); n != 1 {
		t.Errorf("the source was asked %d times within the cache time", n)
	}

	// The source fails after the answer expired: the old picture is kept.
	time.Sleep(40 * time.Millisecond)
	fail.Store(true)
	if rec := get(t, h, "/api/v1/background"); rec.Code != http.StatusOK {
		t.Errorf("stale picture not served: %d", rec.Code)
	}
}

func TestBackgroundUnavailable(t *testing.T) {
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"images":[{"urlbase":"https://evil.example/x"}]}`))
	}))
	defer bad.Close()
	h := (&Server{Store: store.New(), Background: &Background{Source: bad.URL}}).Handler()
	if rec := get(t, h, "/api/v1/background"); rec.Code != http.StatusBadGateway {
		t.Errorf("an answer that names another host must be refused: %d", rec.Code)
	}
	off := (&Server{Store: store.New()}).Handler()
	if rec := get(t, off, "/api/v1/background"); rec.Code != http.StatusNotFound {
		t.Errorf("endpoint must be off without a Background: %d", rec.Code)
	}
}

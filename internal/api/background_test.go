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

	// The size of the screen chooses the size of the picture.
	rec = get(t, h, "/api/v1/background?width=3840&height=2160")
	if json.Unmarshal(rec.Body.Bytes(), &p) != nil || p.URL != "https://www.bing.com/th?id=OHR.Example_UHD.jpg" {
		t.Errorf("large screen: %+v", p)
	}
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

func TestResolution(t *testing.T) {
	cases := map[[2]int]string{
		{0, 0}:        "1920x1080",
		{-5, 100}:     "1920x1080",
		{1920, 1080}:  "1920x1080",
		{2560, 1440}:  "1920x1080",
		{1920, 1200}:  "1920x1200",
		{2560, 1600}:  "1920x1200",
		{3840, 2160}:  "UHD",
		{5120, 1440}:  "UHD",
		{1366, 768}:   "1366x768",
		{1280, 720}:   "1366x768",
		{1024, 768}:   "1024x768",
		{1080, 1920}:  "1080x1920",
		{1170, 2532}:  "1080x1920",
		{800, 1280}:   "768x1280",
		{390, 844}:    "480x800",
		{99999999, 1}: "UHD",
	}
	for size, want := range cases {
		if got := Resolution(size[0], size[1]); got != want {
			t.Errorf("Resolution(%d, %d) = %q, want %q", size[0], size[1], got, want)
		}
	}
}

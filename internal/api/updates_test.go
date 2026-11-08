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

func TestNewerVersion(t *testing.T) {
	cases := []struct {
		candidate, current string
		want               bool
	}{
		{"v4.9.1", "4.9.0", true},
		{"4.10.0", "4.9.9", true},
		{"5.0.0", "4.9.0", true},
		{"4.9.0", "4.9.0", false},
		{"4.8.0", "4.9.0", false},
		{"5.0.0", "5.0.0-alpha.5-abc1234", true}, // the release of a pre-release
		{"4.9.0", "5.0.0-alpha.5-abc1234", false},
		{"5.0.0-beta.1", "5.0.0-alpha.1", false}, // pre-releases are not ordered
		{"5.0.1-rc.1", "5.0.0", true},
		{"5.0.0", "dev", false},
		{"nightly", "4.9.0", false},
		{"", "4.9.0", false},
		{"4.9", "4.8.0", false},
	}
	for _, c := range cases {
		if got := NewerVersion(c.candidate, c.current); got != c.want {
			t.Errorf("NewerVersion(%q, %q) = %v, want %v", c.candidate, c.current, got, c.want)
		}
	}
}

func versionInfo(t *testing.T, h http.Handler) VersionInfo {
	t.Helper()
	rec := get(t, h, "/api/v1/version")
	var info VersionInfo
	if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &info) != nil {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	return info
}

func TestVersionEndpoint(t *testing.T) {
	var hits atomic.Int32
	var tag atomic.Value
	tag.Store("v5.1.0")
	var agent atomic.Value
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		agent.Store(r.Header.Get("User-Agent"))
		_ = json.NewEncoder(w).Encode(map[string]string{"tag_name": tag.Load().(string)})
	}))
	defer github.Close()

	serve := func(u *Updates) http.Handler { return (&Server{Store: store.New(), Updates: u}).Handler() }

	h := serve(&Updates{Current: "5.0.0", Check: true, Source: github.URL})
	info := versionInfo(t, h)
	if info.Version != "5.0.0" || !info.UpdateAvailable || info.Latest != "v5.1.0" ||
		info.URL != "https://github.com/ullbergm/startpunkt/releases/tag/v5.1.0" {
		t.Errorf("info = %+v", info)
	}
	versionInfo(t, h)
	if n := hits.Load(); n != 1 {
		t.Errorf("the release list was asked %d times within the cache time", n)
	}
	if got := agent.Load(); got != "startpunkt" {
		t.Errorf("the request must not carry the running version, got %q", got)
	}

	if info := versionInfo(t, serve(&Updates{Current: "5.1.0", Check: true, Source: github.URL})); info.UpdateAvailable || info.Latest != "" {
		t.Errorf("already current: %+v", info)
	}

	before := hits.Load()
	if info := versionInfo(t, serve(&Updates{Current: "5.0.0", Source: github.URL})); info.UpdateAvailable || info.Version != "5.0.0" {
		t.Errorf("checking turned off: %+v", info)
	}
	if info := versionInfo(t, serve(&Updates{Current: "dev", Check: true, Source: github.URL})); info.UpdateAvailable || info.Version != "dev" {
		t.Errorf("development build: %+v", info)
	}
	if hits.Load() != before {
		t.Error("nothing may be asked when checking is off or the build has no version")
	}

	// A tag that is not a version, or an unreachable source, reports nothing.
	tag.Store("latest")
	if info := versionInfo(t, serve(&Updates{Current: "5.0.0", Check: true, Source: github.URL})); info.UpdateAvailable {
		t.Errorf("odd tag: %+v", info)
	}
	github.Close()
	if info := versionInfo(t, serve(&Updates{Current: "5.0.0", Check: true, Source: github.URL, TTL: time.Millisecond})); info.UpdateAvailable || info.Version != "5.0.0" {
		t.Errorf("unreachable: %+v", info)
	}

	if rec := get(t, (&Server{Store: store.New()}).Handler(), "/api/v1/version"); rec.Code != http.StatusNotFound {
		t.Errorf("endpoint must be off without Updates: %d", rec.Code)
	}
}

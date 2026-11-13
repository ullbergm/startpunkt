package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
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

	h := serve(&Updates{Current: "5.0.0", Check: true, GitHubLink: true, Source: github.URL})
	info := versionInfo(t, h)
	if info.Version != "5.0.0" || !info.GitHubLink || !info.UpdateAvailable || info.Latest != "v5.1.0" ||
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

func TestParseChangelog(t *testing.T) {
	got := ParseChangelog(`# Changelog

## [5.2.0](https://github.com/ullbergm/startpunkt/compare/v5.1.0...v5.2.0) (2026-11-13)


### Features

* **web:** add an edit mode ([#960](https://github.com/ullbergm/startpunkt/issues/960)) ([e3ac835](https://github.com/ullbergm/startpunkt/commit/e3ac835))
* read [the notes](https://example.com/notes) <script>alert(1)</script>

### Bug Fixes

* **api:** settle every waiting icon exactly once ([70dadf1](https://github.com/ullbergm/startpunkt/commit/70dadf1))

### [5.0.1](https://github.com/ullbergm/startpunkt/compare/v5.0.0...v5.0.1) (2026-11-12)

### Bug Fixes

- a fix

## 5.0.0

Nothing that is a change.

### Empty
`)
	want := []Release{
		{Version: "5.2.0", Date: "2026-11-13", Sections: []ReleaseSection{
			// Markup is not interpreted here: the page shows it as text.
			{Title: "Features", Changes: []string{"web: add an edit mode", "read the notes <script>alert(1)</script>"}},
			{Title: "Bug Fixes", Changes: []string{"api: settle every waiting icon exactly once"}},
		}},
		{Version: "5.0.1", Date: "2026-11-12", Sections: []ReleaseSection{{Title: "Bug Fixes", Changes: []string{"a fix"}}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
	if got := ParseChangelog("no changelog at all"); len(got) != 0 {
		t.Errorf("text without entries: %+v", got)
	}
	long := ParseChangelog("## 1.0.0\n\n* " + strings.Repeat("x", 2000))
	if len(long) != 1 || len([]rune(long[0].Sections[0].Changes[0])) != maxChangeLength+1 {
		t.Errorf("a long change is not cut: %+v", long)
	}
}

func TestChangelogEndpoint(t *testing.T) {
	entry := func(v string) string {
		return "## [" + v + "](x) (2026-01-01)\n\n### Features\n\n* change in " + v + "\n\n"
	}
	var changelogHits atomic.Int32
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/changelog" {
			changelogHits.Add(1)
			// The changelog of the newest release, and one that is newer
			// still than the release that was announced.
			_, _ = io.WriteString(w, "# Changelog\n\n"+entry("5.3.0")+entry("5.2.0")+entry("5.1.0")+entry("5.0.0"))
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"tag_name": "v5.2.0"})
	}))
	defer github.Close()
	built := ParseChangelog(entry("5.0.0") + entry("4.8.0"))
	versions := func(h http.Handler) []string {
		t.Helper()
		rec := get(t, h, "/api/v1/changelog")
		var doc Changelog
		if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &doc) != nil {
			t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
		}
		out := []string{}
		for _, r := range doc.Releases {
			out = append(out, r.Version)
		}
		return out
	}
	serve := func(u *Updates) http.Handler { return (&Server{Store: store.New(), Updates: u}).Handler() }

	// What is newer than the running version, up to the latest release,
	// and then what the binary was built with.
	h := serve(&Updates{Current: "5.0.0", Check: true, Changelog: built, Source: github.URL, ChangelogSource: github.URL + "/changelog"})
	if got, want := versions(h), []string{"5.2.0", "5.1.0", "5.0.0", "4.8.0"}; !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
	versions(h)
	versionInfo(t, h)
	if n := changelogHits.Load(); n != 1 {
		t.Errorf("the changelog was read %d times for one release", n)
	}
	// Only its own when updates are not looked for, or cannot be read.
	for name, u := range map[string]*Updates{
		"checking off":  {Current: "5.0.0", Changelog: built, Source: github.URL, ChangelogSource: github.URL + "/changelog"},
		"unreadable":    {Current: "5.0.0", Check: true, Changelog: built, Source: github.URL, ChangelogSource: github.URL + "/missing/"},
		"nothing newer": {Current: "5.2.0", Check: true, Changelog: built, Source: github.URL, ChangelogSource: github.URL + "/changelog"},
	} {
		if got, want := versions(serve(u)), []string{"5.0.0", "4.8.0"}; !reflect.DeepEqual(got, want) {
			t.Errorf("%s: got %v, want %v", name, got, want)
		}
	}
	if got := versions(serve(&Updates{Current: "dev"})); len(got) != 0 {
		t.Errorf("without a changelog: %v", got)
	}
}

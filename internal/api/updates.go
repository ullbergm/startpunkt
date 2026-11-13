package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// VersionInfo is the document served by GET /api/v1/version.
type VersionInfo struct {
	// Version is the running version.
	Version string `json:"version"`
	// Latest is the newest release, when it is newer than Version.
	Latest string `json:"latest,omitempty"`
	// UpdateAvailable is true when Latest is set.
	UpdateAvailable bool `json:"updateAvailable"`
	// URL is the page of the newer release.
	URL string `json:"url,omitempty"`
	// GitHubLink says whether the page shows its footer, which names the
	// version and links to the project on GitHub.
	GitHubLink bool `json:"githubLink"`
}

const (
	latestRelease = "https://api.github.com/repos/ullbergm/startpunkt/releases/latest"
	releasePages  = "https://github.com/ullbergm/startpunkt/releases/"
)

// Updates answers with the running version and, when checking is on, whether
// a newer release exists. The check is made here and not in the browser, so
// that the page talks to no host but its own, and its result is kept for
// hours: however many visitors there are, the release list is asked rarely.
//
// A development build is never checked, and a failed check just means no
// update is reported.
type Updates struct {
	Current string
	// Check turns the lookup of newer releases on.
	Check bool
	// GitHubLink is passed on to the page.
	GitHubLink bool
	// Flags, when set, is asked for Check and GitHubLink in their place,
	// for settings that can change while the process runs.
	Flags func() (check, githubLink bool)
	// Source overrides the address the latest release is looked up at.
	Source string
	// Changelog is what changed in the running version and those before
	// it, newest first.
	Changelog []Release
	// ChangelogSource overrides the address the changes of a newer release
	// are read from. With Source overridden and this left empty, they are
	// not read at all.
	ChangelogSource string
	Client          *http.Client
	// TTL overrides how long an answer is kept.
	TTL time.Duration

	mu      sync.Mutex
	latest  string
	expires time.Time
	// ahead is what changed in the releases after the running version, up
	// to latest, and aheadOf the release it was read for.
	ahead   []Release
	aheadOf string
}

func (u *Updates) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	info := VersionInfo{Version: u.Current, GitHubLink: u.GitHubLink}
	if u.Flags != nil {
		_, info.GitHubLink = u.Flags()
	}
	if latest := u.newer(r.Context(), u.checking()); latest != "" {
		info.Latest = latest
		info.UpdateAvailable = true
		info.URL = releasePages + "tag/" + latest
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache")
	_ = json.NewEncoder(w).Encode(info)
}

// checking reports whether newer releases are looked for.
func (u *Updates) checking() bool {
	if u.Flags != nil {
		check, _ := u.Flags()
		return check
	}
	return u.Check
}

// newer returns the tag of the latest release when it is newer than the
// running version, otherwise "".
func (u *Updates) newer(ctx context.Context, check bool) string {
	if !check {
		return ""
	}
	if _, ok := parseVersion(u.Current); !ok {
		return "" // a development build
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	fetched := false
	if time.Now().After(u.expires) {
		fetched = true
		ttl := u.TTL
		if ttl <= 0 {
			ttl = 6 * time.Hour
		}
		latest, err := u.fetch(ctx)
		if err != nil {
			// Keep what was known and try again before long.
			ttl = 10 * time.Minute
		} else {
			u.latest = latest
		}
		u.expires = time.Now().Add(ttl)
	}
	if !NewerVersion(u.latest, u.Current) {
		return ""
	}
	// What changed since the running version is read once for each newer
	// release. Not having it is no reason to keep quiet about the release,
	// and it is asked for again when the release is next looked up.
	if u.aheadOf != u.latest && fetched && (u.Source == "" || u.ChangelogSource != "") {
		if ahead, err := u.changesUntil(ctx, u.latest); err == nil {
			u.ahead, u.aheadOf = ahead, u.latest
		}
	}
	return u.latest
}

func (u *Updates) client() *http.Client {
	if u.Client != nil {
		return u.Client
	}
	return &http.Client{}
}

func (u *Updates) fetch(ctx context.Context) (string, error) {
	source := u.Source
	if source == "" {
		source = latestRelease
	}
	client := u.client()
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	// Deliberately without the running version: who runs what is nobody
	// else's business.
	req.Header.Set("User-Agent", "startpunkt")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status %s", resp.Status)
	}
	var release struct {
		TagName string `json:"tag_name"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&release); err != nil {
		return "", err
	}
	if _, ok := parseVersion(release.TagName); !ok {
		return "", fmt.Errorf("the latest release has no version for a tag: %q", release.TagName)
	}
	return release.TagName, nil
}

type version struct {
	numbers    [3]int
	prerelease bool
}

// parseVersion reads "1.2.3", "v1.2.3" and "1.2.3-anything". The part after
// a hyphen only marks the version as a pre-release.
func parseVersion(s string) (version, bool) {
	var v version
	s = strings.TrimPrefix(strings.TrimSpace(s), "v")
	s, _, _ = strings.Cut(s, "+")
	core, _, pre := strings.Cut(s, "-")
	v.prerelease = pre
	parts := strings.Split(core, ".")
	if len(parts) != 3 {
		return v, false
	}
	for i, part := range parts {
		n, err := strconv.Atoi(part)
		if err != nil || n < 0 {
			return v, false
		}
		v.numbers[i] = n
	}
	return v, true
}

// NewerVersion reports whether candidate is a newer version than current. A
// release is newer than a pre-release of the same number. Anything that is
// not a version is never newer, and nothing is newer than it.
func NewerVersion(candidate, current string) bool {
	c, ok := parseVersion(candidate)
	if !ok {
		return false
	}
	now, ok := parseVersion(current)
	if !ok {
		return false
	}
	for i := range c.numbers {
		if c.numbers[i] != now.numbers[i] {
			return c.numbers[i] > now.numbers[i]
		}
	}
	return now.prerelease && !c.prerelease
}

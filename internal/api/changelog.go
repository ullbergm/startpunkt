package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Release is one entry of the changelog.
type Release struct {
	// Version is the version without a leading "v".
	Version string `json:"version"`
	// Date is the day of the release, when the entry names one.
	Date     string           `json:"date,omitempty"`
	Sections []ReleaseSection `json:"sections"`
}

// ReleaseSection is one heading of an entry, such as "Features", and the
// changes under it.
type ReleaseSection struct {
	Title   string   `json:"title"`
	Changes []string `json:"changes"`
}

// Changelog is the document served by GET /api/v1/changelog.
type Changelog struct {
	// Releases are the entries, newest first: those of releases newer than
	// the running version, when the update check has found one, and then
	// those the binary was built with.
	Releases []Release `json:"releases"`
}

const (
	// The changelog as it is at a release. %s is the tag.
	changelogAtTag = "https://raw.githubusercontent.com/ullbergm/startpunkt/%s/CHANGELOG.md"

	maxReleases     = 50
	maxChangeLength = 500
)

var (
	// "## [5.2.0](address) (2026-11-13)" and "### 5.0.1 (2026-11-12)".
	releaseHeading = regexp.MustCompile(`^#{2,3}\s+\[?v?(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)\]?(?:\([^)]*\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$`)
	sectionHeading = regexp.MustCompile(`^#{3,4}\s+(.+?)\s*$`)
	change         = regexp.MustCompile(`^[*-]\s+(.+?)\s*$`)
	// The pull request and the commit that release-please puts after a
	// change: " ([#960](address))".
	reference = regexp.MustCompile(`\s*\(\[[^\]]*\]\([^)]*\)\)`)
	link      = regexp.MustCompile(`\[([^\]]*)\]\([^)]*\)`)
)

// plain returns a line of the changelog as text: without the references to
// pull requests and commits, with links replaced by their words, and
// without the marks for bold. The page shows it as text, so nothing else
// needs to be taken out.
func plain(s string) string {
	s = reference.ReplaceAllString(s, "")
	s = link.ReplaceAllString(s, "$1")
	s = strings.TrimSpace(strings.ReplaceAll(s, "**", ""))
	if r := []rune(s); len(r) > maxChangeLength {
		s = string(r[:maxChangeLength]) + "…"
	}
	return s
}

// ParseChangelog reads a changelog in the form release-please writes it.
// Lines it does not recognise are left out, and so are entries without
// changes.
func ParseChangelog(text string) []Release {
	var releases []Release
	var current *Release
	flush := func() {
		if current == nil {
			return
		}
		sections := current.Sections[:0]
		for _, s := range current.Sections {
			if len(s.Changes) > 0 {
				sections = append(sections, s)
			}
		}
		current.Sections = sections
		if len(sections) > 0 {
			releases = append(releases, *current)
		}
		current = nil
	}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimRight(line, " \t\r")
		if m := releaseHeading.FindStringSubmatch(line); m != nil {
			flush()
			if len(releases) >= maxReleases {
				return releases
			}
			current = &Release{Version: m[1], Date: m[2]}
			continue
		}
		if current == nil {
			continue
		}
		if m := sectionHeading.FindStringSubmatch(line); m != nil {
			current.Sections = append(current.Sections, ReleaseSection{Title: plain(m[1])})
			continue
		}
		if m := change.FindStringSubmatch(line); m != nil {
			if len(current.Sections) == 0 {
				current.Sections = append(current.Sections, ReleaseSection{})
			}
			last := &current.Sections[len(current.Sections)-1]
			if text := plain(m[1]); text != "" {
				last.Changes = append(last.Changes, text)
			}
		}
	}
	flush()
	return releases
}

// ServeChangelog answers GET /api/v1/changelog.
func (u *Updates) ServeChangelog(w http.ResponseWriter, r *http.Request) {
	// Looks for a newer release when that is due, and its changes with it.
	latest := u.newer(r.Context(), u.checking())
	doc := Changelog{Releases: []Release{}}
	if latest != "" {
		u.mu.Lock()
		doc.Releases = append(doc.Releases, u.ahead...)
		u.mu.Unlock()
	}
	doc.Releases = append(doc.Releases, u.Changelog...)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache")
	_ = json.NewEncoder(w).Encode(doc)
}

// changesUntil fetches the changelog as it is at the release with the given
// tag and returns the entries that are newer than the running version.
func (u *Updates) changesUntil(ctx context.Context, tag string) ([]Release, error) {
	source := u.ChangelogSource
	if source == "" {
		source = fmt.Sprintf(changelogAtTag, tag)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "startpunkt")
	resp, err := u.client().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %s", resp.Status)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var ahead []Release
	for _, release := range ParseChangelog(string(data)) {
		if NewerVersion(release.Version, u.Current) && !NewerVersion(release.Version, tag) {
			ahead = append(ahead, release)
		}
	}
	return ahead, nil
}

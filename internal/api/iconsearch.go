package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// IconSearch is the document served by GET /api/v1/icons?query=.
type IconSearch struct {
	// Icons are the names that match, as "set:name".
	Icons []string `json:"icons"`
}

const (
	maxIconQuery   = 50
	iconSearchSize = 48
	// How long an answer is kept, and how many of them.
	iconSearchTTL  = time.Hour
	iconSearchKept = 200
)

type iconSearchEntry struct {
	icons   []string
	expires time.Time
}

// ServeSearch answers GET /api/v1/icons?query= with the names of icons that
// match, for the icon picker of the editor. The icon service is asked from
// here, since the page talks to no host but its own, and an answer is kept
// for a while, so that typing a word letter by letter and deleting it again
// costs each query once.
func (i *Icons) ServeSearch(w http.ResponseWriter, r *http.Request) {
	i.init()
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("query")))
	if query == "" || len(query) > maxIconQuery {
		writeError(w, http.StatusBadRequest, "query is missing or too long")
		return
	}
	icons, err := i.search(r.Context(), query)
	if errors.Is(err, errIconBusy) {
		w.Header().Set("Retry-After", "1")
		writeError(w, http.StatusTooManyRequests, "the icon service is busy; try again shortly")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadGateway, "icons cannot be searched right now")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_ = json.NewEncoder(w).Encode(IconSearch{Icons: icons})
}

func (i *Icons) search(ctx context.Context, query string) ([]string, error) {
	i.mu.Lock()
	if e, ok := i.searches[query]; ok && time.Now().Before(e.expires) {
		i.mu.Unlock()
		return e.icons, nil
	}
	i.mu.Unlock()

	// The same limit as for icons: not more than a few requests to the
	// service at once, whoever asks.
	select {
	case i.slots <- struct{}{}:
		defer func() { <-i.slots }()
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
		return nil, errIconBusy
	}
	source := i.Source
	if i.SourceFunc != nil {
		source = i.SourceFunc()
	}
	if source == "" {
		source = iconSource
	}
	client := i.Client
	if client == nil {
		client = &http.Client{}
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	address := fmt.Sprintf("%s/search?query=%s&limit=%d", strings.TrimRight(source, "/"), url.QueryEscape(query), iconSearchSize)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", i.UserAgent)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %s", resp.Status)
	}
	var found struct {
		Icons []string `json:"icons"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&found); err != nil {
		return nil, err
	}
	// Only what is an icon name is passed on: the page makes addresses and
	// field values of these.
	icons := []string{}
	for _, name := range found.Icons {
		prefix, rest, ok := strings.Cut(name, ":")
		if ok && iconPart.MatchString(prefix) && iconPart.MatchString(rest) && len(icons) < iconSearchSize {
			icons = append(icons, name)
		}
	}
	i.mu.Lock()
	if len(i.searches) >= iconSearchKept {
		i.searches = map[string]iconSearchEntry{}
	}
	i.searches[query] = iconSearchEntry{icons: icons, expires: time.Now().Add(iconSearchTTL)}
	i.mu.Unlock()
	return icons, nil
}

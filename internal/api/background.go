package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Picture describes the picture of the day.
type Picture struct {
	URL       string `json:"url"`
	Title     string `json:"title"`
	Copyright string `json:"copyright"`
}

const bingArchive = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US"

// Background answers with the Bing picture of the day. The lookup is done
// here because the browser may not read Bing's answer from another origin;
// the picture itself is loaded by the browser straight from Bing.
//
// The answer is kept for an hour, so however many visitors ask, Bing is
// asked at most once an hour.
type Background struct {
	// Source overrides the address the picture is looked up at.
	Source    string
	Client    *http.Client
	UserAgent string
	// TTL overrides how long an answer is kept.
	TTL time.Duration

	mu      sync.Mutex
	picture Picture
	expires time.Time
}

func (b *Background) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	picture, err := b.get(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, "the picture of the day is not available")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=600")
	_ = json.NewEncoder(w).Encode(picture)
}

func (b *Background) get(ctx context.Context) (Picture, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if time.Now().Before(b.expires) {
		return b.picture, nil
	}
	picture, err := b.fetch(ctx)
	if err != nil {
		if b.picture.URL != "" {
			// Yesterday's picture is better than none. Try again soon.
			b.expires = time.Now().Add(time.Minute)
			return b.picture, nil
		}
		return Picture{}, err
	}
	ttl := b.TTL
	if ttl <= 0 {
		ttl = time.Hour
	}
	b.picture, b.expires = picture, time.Now().Add(ttl)
	return picture, nil
}

func (b *Background) fetch(ctx context.Context) (Picture, error) {
	source := b.Source
	if source == "" {
		source = bingArchive
	}
	client := b.Client
	if client == nil {
		client = &http.Client{}
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return Picture{}, err
	}
	req.Header.Set("User-Agent", b.UserAgent)
	resp, err := client.Do(req)
	if err != nil {
		return Picture{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Picture{}, fmt.Errorf("unexpected status %s", resp.Status)
	}
	var archive struct {
		Images []struct {
			URLBase   string `json:"urlbase"`
			Title     string `json:"title"`
			Copyright string `json:"copyright"`
		} `json:"images"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&archive); err != nil {
		return Picture{}, err
	}
	if len(archive.Images) == 0 || !strings.HasPrefix(archive.Images[0].URLBase, "/") {
		return Picture{}, fmt.Errorf("the answer names no picture")
	}
	image := archive.Images[0]
	return Picture{
		// The base path comes from Bing's answer and is only ever joined
		// onto Bing's own host.
		URL:       "https://www.bing.com" + image.URLBase + "_1920x1080.jpg",
		Title:     image.Title,
		Copyright: image.Copyright,
	}, nil
}

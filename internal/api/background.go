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

// Resolution picks the size Bing offers that suits a screen best: the
// largest one for very large screens, otherwise the one closest in shape
// that the screen is at least as large as. Unknown or odd sizes get the
// common 1920x1080.
func Resolution(width, height int) string {
	const fallback = "1920x1080"
	if width <= 0 || height <= 0 {
		return fallback
	}
	if height > width {
		for _, size := range []struct {
			w, h int
			name string
		}{{1080, 1920, "1080x1920"}, {768, 1280, "768x1280"}, {720, 1280, "720x1280"}} {
			if width >= size.w && height >= size.h {
				return size.name
			}
		}
		return "480x800"
	}
	if width >= 3840 || height >= 2160 {
		return "UHD"
	}
	ratio := float64(width) / float64(height)
	switch {
	case ratio < 1.45:
		return "1024x768"
	case ratio < 1.7 && width >= 1920:
		return "1920x1200"
	case width >= 1920:
		return fallback
	default:
		return "1366x768"
	}
}

func (b *Background) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	picture, err := b.get(r.Context())
	if err == nil {
		// The size is the visitor's screen; anything unreadable means the
		// default size.
		width, _ := strconv.Atoi(r.URL.Query().Get("width"))
		height, _ := strconv.Atoi(r.URL.Query().Get("height"))
		picture.URL += "_" + Resolution(width, height) + ".jpg"
	}
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
		URL:       "https://www.bing.com" + image.URLBase,
		Title:     image.Title,
		Copyright: image.Copyright,
	}, nil
}

package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const iconSource = "https://api.iconify.design"

var (
	iconPart  = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	iconColor = regexp.MustCompile(`^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$`)
)

// errNoIcon means the icon service has no icon of that name.
var errNoIcon = errors.New("no such icon")

// Icons serves Iconify icons from this instance: GET
// /api/v1/icons/{prefix}/{name}.svg, with an optional color.
//
// Each icon is fetched from the icon service once and then kept, so the page
// loads its icons from its own server however many tiles and visitors there
// are. Without this every visitor's browser asks the icon service for every
// icon, and the service starts refusing them.
//
// Icons are fetched in batches: the icons of one set that are asked for
// within a moment of each other go out as a single request. A page with
// sixty icons from three sets costs three requests, not sixty, which keeps
// well clear of the service's rate limit even on a cold start.
type Icons struct {
	// Source overrides the address icons are fetched from.
	Source string
	// SourceFunc, when set, is asked for the address in place of Source.
	SourceFunc func() string
	Client     *http.Client
	UserAgent  string
	// Limit is the number of batches that may be fetched at the same time.
	Limit int
	// MaxEntries bounds the number of icons kept.
	MaxEntries int
	// MissingTTL is how long an icon that does not exist is remembered as
	// missing before it is asked for again.
	MissingTTL time.Duration
	// BatchDelay is how long requests for icons of one set are collected
	// before they are sent off together.
	BatchDelay time.Duration

	once    sync.Once
	slots   chan struct{}
	mu      sync.Mutex
	entries map[string]*iconEntry
	// waiting holds, per icon set, what is collected for the next batch.
	waiting map[string][]iconWait
	// searches holds the answers to searches, by query.
	searches map[string]iconSearchEntry
}

// iconWait is one icon waiting for its batch. It holds the entry itself, not
// only the name: when the kept icons are started over, the name no longer
// leads to this entry, and whoever waits on it still has to be answered.
type iconWait struct {
	name  string
	entry *iconEntry
}

type iconEntry struct {
	ready   chan struct{} // closed when the fetch is over
	svg     []byte
	err     error
	expires time.Time // zero: kept for good
}

// batchSize keeps the request address short. The icon service cuts long
// queries off.
const batchSize = 40

func (i *Icons) init() {
	i.once.Do(func() {
		if i.Limit <= 0 {
			i.Limit = 2
		}
		if i.MaxEntries <= 0 {
			i.MaxEntries = 4000
		}
		if i.MissingTTL <= 0 {
			i.MissingTTL = time.Hour
		}
		if i.BatchDelay <= 0 {
			i.BatchDelay = 40 * time.Millisecond
		}
		i.slots = make(chan struct{}, i.Limit)
		i.entries = map[string]*iconEntry{}
		i.waiting = map[string][]iconWait{}
		i.searches = map[string]iconSearchEntry{}
	})
}

func (i *Icons) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	i.init()
	prefix := r.PathValue("prefix")
	name, isSVG := strings.CutSuffix(r.PathValue("file"), ".svg")
	color := r.URL.Query().Get("color")
	if !isSVG || !iconPart.MatchString(prefix) || !iconPart.MatchString(name) ||
		(color != "" && !iconColor.MatchString(color)) {
		writeError(w, http.StatusBadRequest, "not an icon name")
		return
	}
	svg, err := i.get(r.Context(), prefix, name)
	switch {
	case errors.Is(err, errNoIcon):
		// Remembered by the browser for a while as well.
		w.Header().Set("Cache-Control", "public, max-age=3600")
		writeError(w, http.StatusNotFound, "no such icon")
		return
	case err != nil:
		writeError(w, http.StatusBadGateway, "the icon is not available right now")
		return
	}
	if color != "" {
		// Icons of one colour are drawn in "currentColor". Icons with
		// colours of their own do not contain it and are left as they are.
		svg = bytes.ReplaceAll(svg, []byte("currentColor"), []byte(color))
	}
	h := w.Header()
	h.Set("Content-Type", "image/svg+xml")
	h.Set("Cache-Control", "public, max-age=604800, immutable")
	// The icon is only ever meant to be shown as an image. Opened as a page
	// of its own it may do nothing at all.
	h.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	_, _ = w.Write(svg)
}

// get returns the icon, having it fetched when it is not kept. Requests for
// the same icon while it is being fetched wait for that one fetch.
func (i *Icons) get(ctx context.Context, prefix, name string) ([]byte, error) {
	key := prefix + "/" + name
	i.mu.Lock()
	entry := i.entries[key]
	if entry != nil && !entry.expires.IsZero() && time.Now().After(entry.expires) {
		select {
		case <-entry.ready:
			entry = nil // a remembered failure that has run out
		default:
		}
	}
	if entry == nil {
		if len(i.entries) >= i.MaxEntries {
			// Far more icons than any start page has. Start over rather
			// than grow without bound. Fetches under way still finish,
			// and what waits for a batch is still answered by it.
			i.entries = map[string]*iconEntry{}
		}
		entry = &iconEntry{ready: make(chan struct{})}
		i.entries[key] = entry
		// The first name of a set starts the clock for its batch.
		if len(i.waiting[prefix]) == 0 {
			time.AfterFunc(i.BatchDelay, func() { i.send(prefix) })
		}
		i.waiting[prefix] = append(i.waiting[prefix], iconWait{name, entry})
	}
	i.mu.Unlock()

	select {
	case <-entry.ready:
		return entry.svg, entry.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// send fetches the icons collected for one set and settles their entries.
// It does not depend on any one request: several may be waiting.
func (i *Icons) send(prefix string) {
	i.mu.Lock()
	waiting := i.waiting[prefix]
	delete(i.waiting, prefix)
	i.mu.Unlock()

	for start := 0; start < len(waiting); start += batchSize {
		batch := waiting[start:min(start+batchSize, len(waiting))]
		// A name is in a batch twice when the kept icons were started over
		// between two requests for it. It is asked for once; each of the
		// two entries is settled, and each exactly once.
		names := make([]string, 0, len(batch))
		seen := make(map[string]bool, len(batch))
		for _, w := range batch {
			if !seen[w.name] {
				seen[w.name] = true
				names = append(names, w.name)
			}
		}
		i.slots <- struct{}{}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		icons, retry, err := i.fetch(ctx, prefix, names)
		cancel()
		<-i.slots
		for _, w := range batch {
			entry := w.entry
			switch svg, found := icons[w.name]; {
			case err != nil:
				// Refused or unreachable: not held against the icon for
				// long, but not asked again at once either.
				entry.err = err
				entry.expires = time.Now().Add(retry)
			case !found:
				entry.err = errNoIcon
				entry.expires = time.Now().Add(i.MissingTTL)
			default:
				entry.svg = svg
			}
			close(entry.ready)
		}
	}
}

// iconSet is the icon service's answer to a batch request.
type iconSet struct {
	Width   float64             `json:"width"`
	Height  float64             `json:"height"`
	Icons   map[string]iconData `json:"icons"`
	Aliases map[string]struct {
		Parent string `json:"parent"`
	} `json:"aliases"`
}

type iconData struct {
	Body   string  `json:"body"`
	Left   float64 `json:"left"`
	Top    float64 `json:"top"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// fetch asks for several icons of one set. On failure it also says how long
// to wait before asking again.
func (i *Icons) fetch(ctx context.Context, prefix string, names []string) (map[string][]byte, time.Duration, error) {
	const retry = 30 * time.Second
	source := i.Source
	if i.SourceFunc != nil {
		source = i.SourceFunc()
	}
	if source == "" {
		source = iconSource
	}
	source = strings.TrimRight(source, "/")
	client := i.Client
	if client == nil {
		client = &http.Client{}
	}
	address := source + "/" + prefix + ".json?icons=" + strings.Join(names, ",")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return nil, retry, err
	}
	req.Header.Set("User-Agent", i.UserAgent)
	resp, err := client.Do(req)
	if err != nil {
		return nil, retry, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		// The set itself does not exist, so none of its icons do.
		return map[string][]byte{}, 0, nil
	}
	if resp.StatusCode != http.StatusOK {
		wait := retry
		// When the service says how long it wants to be left alone, do so,
		// within reason.
		if seconds, err := strconv.Atoi(resp.Header.Get("Retry-After")); err == nil && seconds > 0 {
			wait = min(time.Duration(seconds)*time.Second, 15*time.Minute)
		}
		return nil, wait, fmt.Errorf("unexpected status %s", resp.Status)
	}
	var set iconSet
	if err := json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(&set); err != nil {
		return nil, retry, fmt.Errorf("decoding the icon set: %w", err)
	}
	out := make(map[string][]byte, len(names))
	for _, name := range names {
		// An alias is another name for an icon of the same set.
		target := name
		for hops := 0; hops < 5; hops++ {
			alias, ok := set.Aliases[target]
			if !ok {
				break
			}
			target = alias.Parent
		}
		icon, ok := set.Icons[target]
		if !ok || icon.Body == "" {
			continue
		}
		width, height := first(icon.Width, set.Width, 16), first(icon.Height, set.Height, 16)
		out[name] = fmt.Appendf(nil,
			`<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="%g %g %g %g">%s</svg>`,
			icon.Left, icon.Top, width, height, icon.Body)
	}
	return out, 0, nil
}

// first returns the first value that is set.
func first(values ...float64) float64 {
	for _, v := range values {
		if v > 0 {
			return v
		}
	}
	return 0
}

// Package probe checks whether the tiles of the local cluster answer, and
// writes the result into the store.
package probe

import (
	"context"
	"crypto/tls"
	"errors"
	"github.com/ullbergm/startpunkt/internal/metrics"
	"io"
	"log/slog"
	"math/rand/v2"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// Options configures the prober.
type Options struct {
	// Interval is the time between probes of a URL that answers.
	Interval time.Duration
	// Timeout bounds a single probe.
	Timeout time.Duration
	// InitialBackoff is the wait after the first failure. It doubles with
	// every further failure up to MaxBackoff. A success goes back to
	// Interval.
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
	// Concurrency is the number of probes that may run at once.
	Concurrency int
	// InsecureSkipVerify accepts any TLS certificate.
	InsecureSkipVerify bool
	// UserAgent is sent with every probe.
	UserAgent string
}

// DefaultOptions are the 4.x defaults.
func DefaultOptions() Options {
	return Options{
		Interval:       60 * time.Second,
		Timeout:        5 * time.Second,
		InitialBackoff: 5 * time.Second,
		MaxBackoff:     5 * time.Minute,
		Concurrency:    8,
		UserAgent:      "startpunkt",
	}
}

// Prober probes the tiles of one cluster. A hub does not probe the tiles it
// received from other instances; it shows what their owners report.
type Prober struct {
	Store   *store.Store
	Cluster string
	Options Options
	Log     *slog.Logger
	// Client overrides the HTTP client built from Options.
	Client *http.Client

	targets map[string]*target
	urlOf   map[string]string
}

// target is one URL, shared by every tile that links to it.
type target struct {
	ids      map[string]bool
	failures int
	next     time.Time
	inFlight bool
	// result is the last outcome, nil before the first probe.
	result *bool
}

type result struct {
	url       string
	available bool
	detail    string
}

// Run blocks until ctx is cancelled.
func (p *Prober) Run(ctx context.Context) {
	if p.Log == nil {
		p.Log = slog.Default()
	}
	if p.Client == nil {
		p.Client = p.newClient()
		defer p.Client.CloseIdleConnections()
	}
	for ctx.Err() == nil {
		p.follow(ctx)
	}
}

// follow tracks the store until its subscription ends, which happens when
// this consumer fell behind. The next call starts again from a snapshot.
func (p *Prober) follow(ctx context.Context) {
	snap, events, cancel := p.Store.Subscribe()
	defer cancel()

	previous := p.targets
	p.targets = map[string]*target{}
	p.urlOf = map[string]string{}
	for _, t := range snap.Tiles {
		p.track(t)
	}
	// Keep the schedule and backoff of URLs that are still there.
	for url, old := range previous {
		if current := p.targets[url]; current != nil && !old.inFlight {
			current.failures, current.next, current.result = old.failures, old.next, old.result
		}
	}

	results := make(chan result)
	running := 0
	ticker := time.NewTicker(p.tick())
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case batch, ok := <-events:
			if !ok {
				// Probes still running would write to a channel nobody
				// reads. Let them finish first.
				for ; running > 0; running-- {
					select {
					case <-results:
					case <-ctx.Done():
						return
					}
				}
				return
			}
			for _, e := range batch {
				switch e.Type {
				case store.EventUpsert:
					p.track(e.Tile)
				case store.EventDelete:
					p.untrack(e.ID)
				}
			}
		case r := <-results:
			running--
			p.record(r)
		case now := <-ticker.C:
			for url, t := range p.targets {
				if running >= p.Options.Concurrency {
					break
				}
				if t.inFlight || now.Before(t.next) {
					continue
				}
				t.inFlight = true
				running++
				go func() {
					available, detail := p.probe(ctx, url)
					select {
					case results <- result{url: url, available: available, detail: detail}:
					case <-ctx.Done():
					}
				}()
			}
		}
	}
}

// tick is how often due targets are looked for.
func (p *Prober) tick() time.Duration {
	shortest := min(p.Options.Interval, p.Options.InitialBackoff)
	return max(min(shortest/4, time.Second), time.Millisecond)
}

// track makes sure the tile's URL is probed.
func (p *Prober) track(t tile.Tile) {
	url := t.URL
	// Bookmarks are not probed. They mostly point at sites outside the
	// cluster, which would be asked every minute for no one's benefit.
	if t.Cluster != p.Cluster || t.Kind != tile.KindApplication || !probeable(url) {
		p.untrack(t.ID)
		return
	}
	if old, ok := p.urlOf[t.ID]; ok && old != url {
		p.untrack(t.ID)
	}
	p.urlOf[t.ID] = url
	tg := p.targets[url]
	if tg == nil {
		// A new URL is probed at the next tick.
		tg = &target{ids: map[string]bool{}}
		p.targets[url] = tg
	}
	tg.ids[t.ID] = true
	// A tile that joins a URL with a known result gets it right away.
	if tg.result != nil && (t.Available == nil || *t.Available != *tg.result) {
		p.Store.SetProbe([]string{t.ID}, *tg.result, time.Now())
	}
}

func (p *Prober) untrack(id string) {
	url, ok := p.urlOf[id]
	if !ok {
		return
	}
	delete(p.urlOf, id)
	if tg := p.targets[url]; tg != nil {
		delete(tg.ids, id)
		if len(tg.ids) == 0 {
			delete(p.targets, url)
		}
	}
}

// record stores a probe result and schedules the next probe of the URL.
func (p *Prober) record(r result) {
	tg := p.targets[r.url]
	if tg == nil {
		return // No tile links to the URL any more.
	}
	tg.inFlight = false
	changed := tg.result == nil || *tg.result != r.available
	tg.result = &r.available

	var wait time.Duration
	if r.available {
		tg.failures = 0
		wait = p.Options.Interval
	} else {
		tg.failures++
		wait = p.Options.InitialBackoff
		for i := 1; i < tg.failures && wait < p.Options.MaxBackoff; i++ {
			wait *= 2
		}
		wait = min(wait, p.Options.MaxBackoff)
	}
	// Spread the probes so they do not all fire together.
	wait += time.Duration(rand.Int64N(int64(wait)/10 + 1))
	tg.next = time.Now().Add(wait)

	if changed {
		p.Log.Info("availability changed", "url", r.url, "available", r.available, "detail", r.detail)
	}
	ids := make([]string, 0, len(tg.ids))
	for id := range tg.ids {
		ids = append(ids, id)
	}
	p.Store.SetProbe(ids, r.available, time.Now())
}

// probeable reports whether a URL can be checked over HTTP.
func probeable(url string) bool {
	lower := strings.ToLower(url)
	return strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
}

// probe sends one request. Any answer below 500 means the service is there:
// a login redirect or a 404 on the root path still comes from a running
// application, and so does a TLS handshake whose certificate cannot be
// verified. A 5xx answer or no answer at all counts as unavailable.
func (p *Prober) probe(ctx context.Context, url string) (available bool, detail string) {
	started := time.Now()
	defer func() {
		result := "unavailable"
		if available {
			result = "available"
		}
		metrics.Inc("startpunkt_probes_total", "result", result)
		metrics.Observe("startpunkt_probe_duration_seconds", time.Since(started).Seconds(), "result", result)
	}()
	ctx, cancel := context.WithTimeout(ctx, p.Options.Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, err.Error()
	}
	req.Header.Set("User-Agent", p.Options.UserAgent)
	resp, err := p.Client.Do(req)
	if err != nil {
		// A certificate that cannot be verified still came from a server
		// that is there: self-signed and mismatched certificates are common
		// on internal services. The probe asks whether something answers,
		// not whether it can be trusted, and nothing was sent to it.
		var certificate *tls.CertificateVerificationError
		if errors.As(err, &certificate) {
			return true, "answered with a certificate that could not be verified: " + certificate.Err.Error()
		}
		return false, err.Error()
	}
	// Only the status line matters. Read a little so the connection can be
	// reused, and never a whole large body.
	_, _ = io.CopyN(io.Discard, resp.Body, 4096)
	_ = resp.Body.Close()
	return resp.StatusCode < 500, resp.Status
}

// Check probes one address once, the way the prober does, and reports
// whether something answers there. It is for an address that is not a tile
// yet.
func Check(ctx context.Context, url string, options Options) bool {
	if !probeable(url) {
		return false
	}
	if options.Timeout <= 0 {
		options.Timeout = DefaultOptions().Timeout
	}
	p := &Prober{Options: options}
	p.Client = p.newClient()
	defer p.Client.CloseIdleConnections()
	available, _ := p.probe(ctx, url)
	return available
}

func (p *Prober) newClient() *http.Client {
	return &http.Client{
		// A redirect is an answer. Following it would probe some other
		// place, often a login page on another host.
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		Transport: &http.Transport{
			Proxy:                 http.ProxyFromEnvironment,
			DialContext:           (&net.Dialer{Timeout: p.Options.Timeout}).DialContext,
			TLSHandshakeTimeout:   p.Options.Timeout,
			ResponseHeaderTimeout: p.Options.Timeout,
			MaxIdleConnsPerHost:   1,
			IdleConnTimeout:       2 * p.Options.Interval,
			TLSClientConfig:       &tls.Config{InsecureSkipVerify: p.Options.InsecureSkipVerify}, //nolint:gosec // opt-in setting
		},
	}
}

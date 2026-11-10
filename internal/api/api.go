// Package api serves the versioned HTTP API, the health endpoints and the
// embedded frontend.
package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// SchemaVersion is the version of the JSON documents under /api/v1. It is
// raised when a change is made that an older client cannot ignore.
const SchemaVersion = 1

// State is the document served by GET /api/v1/state and sent as the first
// event of GET /api/v1/events.
type State struct {
	SchemaVersion int             `json:"schemaVersion"`
	Tiles         []tile.Tile     `json:"tiles"`
	Clusters      []store.Cluster `json:"clusters"`
	Config        UIConfig        `json:"config"`
	Editing       Editing         `json:"editing"`
}

// UIConfig is the configuration the frontend needs.
type UIConfig struct {
	Title           string `json:"title"`
	DefaultLanguage string `json:"defaultLanguage"`
	SearchEngine    string `json:"searchEngine"`
	Theme           Theme  `json:"theme"`
}

// Theme is the pair of palettes the page switches between.
type Theme struct {
	Light Palette `json:"light"`
	Dark  Palette `json:"dark"`
}

// Palette is one set of colours, as hex values.
type Palette struct {
	BodyBgColor      string `json:"bodyBgColor"`
	BodyColor        string `json:"bodyColor"`
	EmphasisColor    string `json:"emphasisColor"`
	TextPrimaryColor string `json:"textPrimaryColor"`
	TextAccentColor  string `json:"textAccentColor"`
}

// Editing tells the frontend whether an edit key can unlock editing.
type Editing struct {
	Available bool `json:"available"`
}

// TileDelete is the payload of a tile.delete event.
type TileDelete struct {
	ID string `json:"id"`
}

// ClusterDelete is the payload of a cluster.delete event.
type ClusterDelete struct {
	Name string `json:"name"`
}

// EventConfig is the name of the event that carries a changed UIConfig.
const EventConfig = "config"

// EventSnapshot is the name of the first event on the stream. The names of
// the events that follow are the store's event types.
const EventSnapshot = "snapshot"

// DefaultHeartbeat is how often a comment is sent on an idle event stream, so
// that proxies keep the connection open and clients notice a dead one.
const DefaultHeartbeat = 15 * time.Second

// Server holds what the handlers need. Store and Assets are each optional:
// without a store the API is not served, without assets the frontend is not.
type Server struct {
	Store *store.Store
	// UI is passed to the frontend as it is.
	UI UIConfig
	// UIFunc, when set, is asked for the frontend's configuration in place
	// of UI. Changed tells when its answer may have changed; the event
	// stream then sends the new configuration to every browser.
	UIFunc  func() UIConfig
	Changed func() (changed <-chan struct{}, cancel func())
	// Internal, when set, is served under /internal/. It is for the other
	// roles of the same instance and must only be given to a process that
	// is not reachable from outside the cluster.
	Internal http.Handler
	// Background serves the picture of the day. Nil turns the endpoint off.
	Background *Background
	// Updates serves the running version and whether a newer one exists.
	// Nil turns the endpoint off.
	Updates *Updates
	// Icons serves Iconify icons from this instance. Nil turns the endpoint
	// off.
	Icons *Icons
	// Assets is the built frontend, with index.html at its root.
	Assets fs.FS
	// Heartbeat overrides DefaultHeartbeat.
	Heartbeat time.Duration
}

// Handler returns the HTTP handler for everything the process serves.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	if s.Store != nil {
		mux.HandleFunc("GET /api/v1/state", s.handleState)
		mux.HandleFunc("GET /api/v1/events", s.handleEvents)
		if s.Background != nil {
			mux.Handle("GET /api/v1/background", s.Background)
		}
		if s.Updates != nil {
			mux.Handle("GET /api/v1/version", s.Updates)
		}
		if s.Icons != nil {
			mux.Handle("GET /api/v1/icons/{prefix}/{file}", s.Icons)
		}
	}
	mux.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "not found")
	})
	if s.Internal != nil {
		mux.Handle("/internal/", s.Internal)
	}
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		if s.Store != nil && !s.Store.Ready() {
			writeError(w, http.StatusServiceUnavailable, "initial sync in progress")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	if s.Assets != nil {
		mux.Handle("/", s.assets())
	}
	return securityHeaders(mux)
}

func (s *Server) state(snap store.Snapshot) State {
	return State{
		SchemaVersion: SchemaVersion,
		Tiles:         snap.Tiles,
		Clusters:      snap.Clusters,
		Config:        s.ui(),
		Editing:       Editing{Available: false},
	}
}

func (s *Server) ui() UIConfig {
	if s.UIFunc != nil {
		return s.UIFunc()
	}
	return s.UI
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	body, err := json.Marshal(s.state(s.Store.Snapshot()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "encoding state failed")
		return
	}
	// The tag is a hash of the content, so it is the same on every replica.
	sum := sha256.Sum256(body)
	etag := `"` + hex.EncodeToString(sum[:16]) + `"`
	h := w.Header()
	h.Set("ETag", etag)
	h.Set("Cache-Control", "no-cache")
	if etagMatches(r.Header.Get("If-None-Match"), etag) {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	h.Set("Content-Type", "application/json")
	_, _ = w.Write(body)
}

// handleEvents streams the state as Server-Sent Events: one snapshot, then
// every change. A client that falls behind is disconnected and gets a fresh
// snapshot when it reconnects, so no event log is kept.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	rc := http.NewResponseController(w)
	snap, events, cancel := s.Store.Subscribe()
	defer cancel()

	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	// Tell browsers to reconnect quickly after a dropped stream.
	if _, err := io.WriteString(w, "retry: 2000\n\n"); err != nil {
		return
	}
	if writeEvent(w, EventSnapshot, s.state(snap)) != nil || rc.Flush() != nil {
		return
	}

	interval := s.Heartbeat
	if interval <= 0 {
		interval = DefaultHeartbeat
	}
	heartbeat := time.NewTicker(interval)
	defer heartbeat.Stop()
	var changed <-chan struct{}
	sent := s.ui()
	if s.Changed != nil {
		var stop func()
		changed, stop = s.Changed()
		defer stop()
	}
	for {
		select {
		case <-r.Context().Done():
			return
		case <-changed:
			// Settings changed. Tell the page only if its part of them did.
			if now := s.ui(); now != sent {
				sent = now
				if writeEvent(w, EventConfig, now) != nil {
					return
				}
			}
		case <-heartbeat.C:
			if _, err := io.WriteString(w, ": keepalive\n\n"); err != nil {
				return
			}
		case batch, ok := <-events:
			if !ok {
				return
			}
			for _, e := range batch {
				var payload any
				switch e.Type {
				case store.EventUpsert:
					payload = e.Tile
				case store.EventDelete:
					payload = TileDelete{ID: e.ID}
				case store.EventCluster:
					payload = e.Cluster
				case store.EventClusterDelete:
					payload = ClusterDelete{Name: e.Cluster.Name}
				default:
					continue
				}
				if writeEvent(w, string(e.Type), payload) != nil {
					return
				}
			}
		}
		if rc.Flush() != nil {
			return
		}
	}
}

// writeEvent writes one event. JSON never contains a raw newline, so the
// payload always fits on a single data line.
func writeEvent(w io.Writer, name string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", name, data)
	return err
}

func etagMatches(header, etag string) bool {
	for _, candidate := range strings.Split(header, ",") {
		candidate = strings.TrimPrefix(strings.TrimSpace(candidate), "W/")
		if candidate == etag || candidate == "*" {
			return true
		}
	}
	return false
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// assets serves the frontend. Paths that are not files fall back to
// index.html, because tag filters are part of the URL path.
func (s *Server) assets() http.Handler {
	files := http.FileServerFS(s.Assets)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name != "" && name != "index.html" {
			if info, err := fs.Stat(s.Assets, name); err == nil && !info.IsDir() {
				if strings.HasPrefix(name, "assets/") {
					// Vite puts a content hash in these file names.
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				files.ServeHTTP(w, r)
				return
			}
			if strings.HasPrefix(name, "assets/") {
				http.NotFound(w, r)
				return
			}
		}
		index, err := fs.ReadFile(s.Assets, "index.html")
		if err != nil {
			http.Error(w, "The frontend is not part of this build.", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeContent(w, r, "", zeroTime, bytes.NewReader(index))
	})
}

// securityHeaders sets headers that keep the page from loading scripts or
// styles from anywhere but itself. Icons are images and may come from any
// host, because tiles name them by URL.
func securityHeaders(next http.Handler) http.Handler {
	const csp = "default-src 'self'; img-src * data:; object-src 'none'; " +
		"base-uri 'self'; frame-ancestors 'self'; form-action 'self'"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", csp)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

var zeroTime time.Time

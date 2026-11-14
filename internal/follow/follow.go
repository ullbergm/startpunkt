// Package follow keeps a store in step with another Startpunkt process by
// subscribing to its event stream. It is how the api role tracks the
// controller role when the two run as separate processes, and how a hub
// shows the tiles of other clusters.
package follow

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/metrics"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// Follower mirrors one upstream process into Store.
type Follower struct {
	// URL is the base URL of the upstream, without the /api/v1 path.
	URL   string
	Store *store.Store
	// Remote is the name this process gives the other instance when that
	// is a federated remote. It becomes the cluster of every tile taken
	// from it, whatever the remote calls itself. Empty means the upstream
	// is this instance's own controller, whose tiles are taken as they are.
	Remote string
	// Headers are sent with the request, for a remote that sits behind an
	// authenticating proxy.
	Headers map[string]string
	// InsecureSkipVerify accepts any TLS certificate from the upstream. It
	// has no effect when Client is set.
	InsecureSkipVerify bool
	// Filter chooses which of a remote's tiles are taken over.
	Filter Filter
	Client *http.Client
	Log    *slog.Logger
	// IdleTimeout is how long the stream may be silent before it is
	// considered dead. It must exceed the upstream's heartbeat interval.
	IdleTimeout time.Duration
	// MinBackoff and MaxBackoff bound the wait between connection attempts.
	MinBackoff, MaxBackoff time.Duration

	// Limits bound input even when the upstream is faulty. Zero uses the defaults.
	MaxEventBytes int
	MaxTiles      int
	received      map[string]bool
	clusters      map[string]bool
	pending       map[string]tile.Tile
	own           remote
	// problem is why the last connection ended or could not be made, and
	// is empty while connected.
	problem atomic.Pointer[string]
}

// Problem says why the upstream is not connected. It is empty while it is,
// and before the first attempt has failed.
func (f *Follower) Problem() string {
	if p := f.problem.Load(); p != nil {
		return *p
	}
	return ""
}

// Run connects, applies the stream, and reconnects when it ends, until ctx
// is cancelled. While disconnected the store keeps the last known tiles and
// its clusters are marked stale.
func (f *Follower) Run(ctx context.Context) {
	if f.Log == nil {
		f.Log = slog.Default()
	}
	if f.Client == nil {
		f.Client = newClient(f.InsecureSkipVerify)
	}
	if f.IdleTimeout <= 0 {
		f.IdleTimeout = 3 * api.DefaultHeartbeat
	}
	if f.MinBackoff <= 0 {
		f.MinBackoff = 500 * time.Millisecond
	}
	if f.MaxBackoff <= 0 {
		// The controller is next door; a remote is another cluster.
		f.MaxBackoff = 5 * time.Second
		if f.Remote != "" {
			f.MaxBackoff = 30 * time.Second
		}
	}
	if f.own.local == nil {
		f.own.local = map[string]bool{}
	}
	if f.Remote != "" {
		// Known before the first connection, so the page can say that the
		// remote has not been reached yet.
		f.Store.SetClusterFrom(f.feed(), store.Cluster{Name: f.Remote, Local: false, State: store.StateSyncing})
	}
	backoff := f.MinBackoff
	for ctx.Err() == nil {
		connected, err := f.stream(ctx)
		if ctx.Err() != nil {
			return
		}
		kind := "controller"
		if f.Remote != "" {
			kind = "remote"
		}
		metrics.Inc("startpunkt_follower_reconnects_total", "kind", kind)
		f.Store.MarkStaleFrom(f.feed())
		if err != nil {
			problem := err.Error()
			f.problem.Store(&problem)
		}
		if connected {
			backoff = f.MinBackoff
		}
		f.Log.Warn("stream ended, reconnecting",
			"upstream", f.URL, "remote", f.Remote, "error", err, "wait", backoff.String())
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		backoff = min(backoff*2, f.MaxBackoff)
	}
}

// newClient returns a client that gives up quickly on an upstream that does
// not answer. A Service without ready endpoints can swallow the connection
// attempt, and the default dial timeout would then delay the reconnect by
// half a minute after the upstream is back. There is no overall timeout,
// because the response is an endless stream.
func newClient(insecureSkipVerify bool) *http.Client {
	return &http.Client{Transport: &http.Transport{
		TLSClientConfig:       &tls.Config{InsecureSkipVerify: insecureSkipVerify}, //nolint:gosec // opt-in setting of a remote
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           (&net.Dialer{Timeout: 3 * time.Second}).DialContext,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
	}}
}

// stream reads one connection until it ends. It reports whether a snapshot
// was received, which resets the reconnect backoff.
func (f *Follower) stream(ctx context.Context) (connected bool, err error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	// Cancel the request when nothing, not even a heartbeat, arrives in time.
	idle := time.AfterFunc(f.IdleTimeout, cancel)
	defer idle.Stop()

	url := strings.TrimRight(f.URL, "/") + "/api/v1/events"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Accept", "text/event-stream")
	for name, value := range f.Headers {
		req.Header.Set(name, value)
	}
	client := *f.Client
	previousRedirect := client.CheckRedirect
	client.CheckRedirect = func(next *http.Request, via []*http.Request) error {
		if err := safeRedirect(next, via); err != nil {
			return err
		}
		if previousRedirect != nil {
			return previousRedirect(next, via)
		}
		return nil
	}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("unexpected status %s", resp.Status)
	}

	reader := bufio.NewReader(resp.Body)
	limit := f.eventLimit()
	var eventBytes int
	var name string
	var data strings.Builder
	for {
		line, err := readLine(reader, limit)
		if err != nil {
			if errors.Is(err, io.EOF) {
				err = errors.New("stream closed by upstream")
			}
			return connected, err
		}
		eventBytes += len(line)
		if eventBytes > limit {
			return connected, fmt.Errorf("event exceeds %d bytes", limit)
		}
		idle.Reset(f.IdleTimeout)
		line = strings.TrimRight(line, "\r\n")
		switch {
		case line == "":
			if data.Len() > 0 {
				if !connected && (strings.HasPrefix(name, "tile.") || strings.HasPrefix(name, "cluster.")) {
					return false, errors.New("upstream sent a change before its snapshot")
				}
				if err := f.apply(name, data.String()); err != nil {
					return connected, err
				}
				if name == api.EventSnapshot {
					connected = true
					f.problem.Store(nil)
				}
			}
			name = ""
			data.Reset()
			eventBytes = 0
		case strings.HasPrefix(line, ":"):
			// Comment, used as heartbeat.
		case strings.HasPrefix(line, "event:"):
			name = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		case strings.HasPrefix(line, "data:"):
			if data.Len() > 0 {
				data.WriteByte('\n')
			}
			data.WriteString(strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
		}
	}
}

// feed is the name under which this follower's tiles are kept in the store.
func (f *Follower) feed() string {
	if f.Remote == "" {
		return store.LocalFeed
	}
	return "remote:" + f.Remote
}

// remote keeps track of which of a remote's clusters are its own. A remote
// may itself be a hub, and only what it reads from its own cluster is taken:
// tiles are never passed on a second time, which rules out loops and
// duplicates.
type remote struct {
	local map[string]bool
}

// adopt turns a remote's tile into one of this hub's: under the name the
// hub gives the remote, and read-only. It reports false for a tile that the
// remote received from somewhere else.
func (f *Follower) adopt(t tile.Tile) (tile.Tile, bool) {
	if !f.own.local[t.Cluster] || !f.Filter.Allows(t) {
		return t, false
	}
	t.ID = f.Remote + strings.TrimPrefix(t.ID, t.Cluster)
	t.Cluster = f.Remote
	t.Editable = false
	return t, true
}

// adoptID rewrites the id of a remote's tile the way adopt does. Ids start
// with the cluster name.
func (f *Follower) adoptID(id string) (string, bool) {
	for name := range f.own.local {
		if strings.HasPrefix(id, name+"/") {
			return f.Remote + strings.TrimPrefix(id, name), true
		}
	}
	return id, false
}

// state is the state of the remote as one cluster of this hub: the state of
// its own cluster, or syncing while it reports none.
func remoteState(clusters []store.Cluster) string {
	for _, c := range clusters {
		if c.Local {
			return c.State
		}
	}
	return store.StateSyncing
}

func (f *Follower) apply(name, data string) error {
	if len(data) > f.eventLimit() {
		return fmt.Errorf("event exceeds %d bytes", f.eventLimit())
	}
	if f.Remote != "" {
		return f.applyRemote(name, data)
	}
	switch name {
	case api.EventSnapshot:
		var state api.State
		if err := json.Unmarshal([]byte(data), &state); err != nil {
			return fmt.Errorf("decoding snapshot: %w", err)
		}
		if err := f.validateState(state); err != nil {
			return err
		}
		if state.SchemaVersion != api.SchemaVersion {
			return fmt.Errorf("upstream speaks schema version %d, this process %d",
				state.SchemaVersion, api.SchemaVersion)
		}
		f.clusters = make(map[string]bool, len(state.Clusters))
		for _, c := range state.Clusters {
			f.clusters[c.Name] = true
		}
		f.received = make(map[string]bool, len(state.Tiles))
		for _, t := range state.Tiles {
			f.received[t.ID] = true
		}
		f.Store.Mirror(store.Snapshot{Tiles: state.Tiles, Clusters: state.Clusters})
		f.Log.Info("snapshot received", "upstream", f.URL, "tiles", len(state.Tiles))
	case string(store.EventUpsert):
		var t tile.Tile
		if err := json.Unmarshal([]byte(data), &t); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if err := f.trackID(t.ID); err != nil {
			return err
		}
		f.Store.Upsert(t)
	case string(store.EventDelete):
		var d api.TileDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		delete(f.received, d.ID)
		f.Store.Remove(d.ID)
	case string(store.EventCluster):
		var c store.Cluster
		if err := json.Unmarshal([]byte(data), &c); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if err := validateCluster(c); err != nil {
			return err
		}
		if f.clusters == nil {
			f.clusters = map[string]bool{}
		}
		if !f.clusters[c.Name] && len(f.clusters) >= 1024 {
			return errors.New("upstream exceeds 1024 clusters")
		}
		f.clusters[c.Name] = true
		f.Store.SetCluster(c)
	case string(store.EventClusterDelete):
		var d api.ClusterDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		delete(f.clusters, d.Name)
		f.Store.RemoveCluster(d.Name)
	default:
		// Unknown events are ignored so that an upstream can add new ones.
	}
	return nil
}

// applyRemote applies an event of a federated remote.
func (f *Follower) applyRemote(name, data string) error {
	feed := f.feed()
	switch name {
	case api.EventSnapshot:
		var state api.State
		if err := json.Unmarshal([]byte(data), &state); err != nil {
			return fmt.Errorf("decoding snapshot: %w", err)
		}
		if err := f.validateState(state); err != nil {
			return err
		}
		if state.SchemaVersion != api.SchemaVersion {
			return fmt.Errorf("remote speaks schema version %d, this process %d",
				state.SchemaVersion, api.SchemaVersion)
		}
		f.clusters = make(map[string]bool, len(state.Clusters))
		for _, c := range state.Clusters {
			f.clusters[c.Name] = true
		}
		f.received = make(map[string]bool, len(state.Tiles))
		for _, t := range state.Tiles {
			f.received[t.ID] = true
		}
		f.pending = map[string]tile.Tile{}
		f.own.local = map[string]bool{}
		for _, c := range state.Clusters {
			if c.Local {
				f.own.local[c.Name] = true
			}
		}
		tiles := make([]tile.Tile, 0, len(state.Tiles))
		for _, t := range state.Tiles {
			if adopted, ok := f.adopt(t); ok {
				tiles = append(tiles, adopted)
			}
		}
		f.Store.MirrorFrom(feed, store.Snapshot{
			Tiles:    tiles,
			Clusters: []store.Cluster{{Name: f.Remote, Local: false, State: remoteState(state.Clusters)}},
		})
		f.Log.Info("snapshot received", "remote", f.Remote, "tiles", len(tiles))
	case string(store.EventUpsert):
		var t tile.Tile
		if err := json.Unmarshal([]byte(data), &t); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if err := validateTile(t); err != nil {
			return err
		}
		if err := f.trackID(t.ID); err != nil {
			return err
		}
		if !f.clusters[t.Cluster] {
			if f.pending == nil {
				f.pending = map[string]tile.Tile{}
			}
			f.pending[t.ID] = t
			return nil
		}
		if adopted, ok := f.adopt(t); ok {
			f.Store.UpsertFrom(feed, adopted)
		} else if id, own := f.adoptID(t.ID); own {
			// The tile changed into one that is not taken over.
			f.Store.Remove(id)
		}
	case string(store.EventDelete):
		var d api.TileDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		delete(f.received, d.ID)
		delete(f.pending, d.ID)
		if id, ok := f.adoptID(d.ID); ok {
			f.Store.Remove(id)
		}
	case string(store.EventCluster):
		var c store.Cluster
		if err := json.Unmarshal([]byte(data), &c); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if err := validateCluster(c); err != nil {
			return err
		}
		if f.clusters == nil {
			f.clusters = map[string]bool{}
		}
		if !f.clusters[c.Name] && len(f.clusters) >= 1024 {
			return errors.New("too many remote clusters")
		}
		if c.Local && f.clusters[c.Name] && !f.own.local[c.Name] {
			// A formerly federated cluster became the remote's own. Its
			// earlier upserts were intentionally ignored, so read a snapshot
			// instead of silently retaining an incomplete view.
			return errors.New("remote cluster ownership changed; resynchronizing")
		}
		f.clusters[c.Name] = true
		if c.Local {
			if f.own.local == nil {
				f.own.local = map[string]bool{}
			}
			if len(f.own.local) >= 1024 && !f.own.local[c.Name] {
				return errors.New("too many remote clusters")
			}
			f.own.local[c.Name] = true
			f.Store.SetClusterFrom(feed, store.Cluster{Name: f.Remote, Local: false, State: c.State})
		} else {
			delete(f.own.local, c.Name)
		}
		for id, t := range f.pending {
			if t.Cluster != c.Name {
				continue
			}
			if adopted, ok := f.adopt(t); ok {
				f.Store.UpsertFrom(feed, adopted)
			}
			delete(f.pending, id)
		}
	case string(store.EventClusterDelete):
		var d api.ClusterDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		delete(f.own.local, d.Name)
		delete(f.clusters, d.Name)
		for id, t := range f.pending {
			if t.Cluster == d.Name {
				delete(f.pending, id)
			}
		}
	}
	return nil
}

// Configured headers can contain arbitrary credentials, not only Authorization.
// Never forward them across an origin change, including HTTPS downgrades.
func safeRedirect(req *http.Request, via []*http.Request) error {
	if len(via) >= 10 {
		return errors.New("too many redirects")
	}
	if len(via) > 0 && (req.URL.Scheme != via[0].URL.Scheme || !strings.EqualFold(req.URL.Host, via[0].URL.Host)) {
		return http.ErrUseLastResponse
	}
	return nil
}

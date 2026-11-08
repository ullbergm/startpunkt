// Package follow keeps a store in step with another Startpunkt process by
// subscribing to its event stream. It is how the api role tracks the
// controller role when the two run as separate processes, and how a hub
// shows the tiles of other clusters.
package follow

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/api"
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
	Client  *http.Client
	Log     *slog.Logger
	// IdleTimeout is how long the stream may be silent before it is
	// considered dead. It must exceed the upstream's heartbeat interval.
	IdleTimeout time.Duration
	// MinBackoff and MaxBackoff bound the wait between connection attempts.
	MinBackoff, MaxBackoff time.Duration

	own remote
}

// Run connects, applies the stream, and reconnects when it ends, until ctx
// is cancelled. While disconnected the store keeps the last known tiles and
// its clusters are marked stale.
func (f *Follower) Run(ctx context.Context) {
	if f.Log == nil {
		f.Log = slog.Default()
	}
	if f.Client == nil {
		f.Client = newClient()
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
		f.Store.MarkStaleFrom(f.feed())
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
func newClient() *http.Client {
	return &http.Client{Transport: &http.Transport{
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
	resp, err := f.Client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("unexpected status %s", resp.Status)
	}

	reader := bufio.NewReader(resp.Body)
	var name string
	var data strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if errors.Is(err, io.EOF) {
				err = errors.New("stream closed by upstream")
			}
			return connected, err
		}
		idle.Reset(f.IdleTimeout)
		line = strings.TrimRight(line, "\r\n")
		switch {
		case line == "":
			if data.Len() > 0 {
				if err := f.apply(name, data.String()); err != nil {
					return connected, err
				}
				if name == api.EventSnapshot {
					connected = true
				}
			}
			name = ""
			data.Reset()
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
	if !f.own.local[t.Cluster] {
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
	if f.Remote != "" {
		return f.applyRemote(name, data)
	}
	switch name {
	case api.EventSnapshot:
		var state api.State
		if err := json.Unmarshal([]byte(data), &state); err != nil {
			return fmt.Errorf("decoding snapshot: %w", err)
		}
		if state.SchemaVersion != api.SchemaVersion {
			return fmt.Errorf("upstream speaks schema version %d, this process %d",
				state.SchemaVersion, api.SchemaVersion)
		}
		f.Store.Mirror(store.Snapshot{Tiles: state.Tiles, Clusters: state.Clusters})
		f.Log.Info("snapshot received", "upstream", f.URL, "tiles", len(state.Tiles))
	case string(store.EventUpsert):
		var t tile.Tile
		if err := json.Unmarshal([]byte(data), &t); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		f.Store.Upsert(t)
	case string(store.EventDelete):
		var d api.TileDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		f.Store.Remove(d.ID)
	case string(store.EventCluster):
		var c store.Cluster
		if err := json.Unmarshal([]byte(data), &c); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		f.Store.SetCluster(c)
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
		if state.SchemaVersion != api.SchemaVersion {
			return fmt.Errorf("remote speaks schema version %d, this process %d",
				state.SchemaVersion, api.SchemaVersion)
		}
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
		if adopted, ok := f.adopt(t); ok {
			f.Store.UpsertFrom(feed, adopted)
		}
	case string(store.EventDelete):
		var d api.TileDelete
		if err := json.Unmarshal([]byte(data), &d); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if id, ok := f.adoptID(d.ID); ok {
			f.Store.Remove(id)
		}
	case string(store.EventCluster):
		var c store.Cluster
		if err := json.Unmarshal([]byte(data), &c); err != nil {
			return fmt.Errorf("decoding %s: %w", name, err)
		}
		if c.Local {
			f.own.local[c.Name] = true
			f.Store.SetClusterFrom(feed, store.Cluster{Name: f.Remote, Local: false, State: c.State})
		}
	}
	return nil
}

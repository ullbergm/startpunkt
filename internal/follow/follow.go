// Package follow keeps a store in step with another Startpunkt process by
// subscribing to its event stream. It is how the api role tracks the
// controller role when the two run as separate processes.
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
	URL    string
	Store  *store.Store
	Client *http.Client
	Log    *slog.Logger
	// IdleTimeout is how long the stream may be silent before it is
	// considered dead. It must exceed the upstream's heartbeat interval.
	IdleTimeout time.Duration
	// MinBackoff and MaxBackoff bound the wait between connection attempts.
	MinBackoff, MaxBackoff time.Duration
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
		f.MaxBackoff = 5 * time.Second
	}
	backoff := f.MinBackoff
	for ctx.Err() == nil {
		connected, err := f.stream(ctx)
		if ctx.Err() != nil {
			return
		}
		f.Store.MarkStale()
		if connected {
			backoff = f.MinBackoff
		}
		f.Log.Warn("upstream stream ended, reconnecting",
			"upstream", f.URL, "error", err, "wait", backoff.String())
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

func (f *Follower) apply(name, data string) error {
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

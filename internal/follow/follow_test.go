package follow

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func ids(s *store.Store) map[string]bool {
	out := map[string]bool{}
	for _, tl := range s.Snapshot().Tiles {
		out[tl.ID] = true
	}
	return out
}

func clusterState(s *store.Store) string {
	clusters := s.Snapshot().Clusters
	if len(clusters) != 1 {
		return ""
	}
	return clusters[0].State
}

func mk(id string) tile.Tile {
	return tile.Tile{ID: id, Name: id, Cluster: "prod", Tags: []string{}}
}

func TestFollowsUpstreamAndResynchronises(t *testing.T) {
	upstream := store.New()
	upstream.SetCluster(store.Cluster{Name: "prod", Local: true, State: store.StateSyncing})
	upstream.Upsert(mk("a"))
	handler := (&api.Server{Store: upstream, Heartbeat: 20 * time.Millisecond}).Handler()

	// The gate lets the test take the upstream away and bring it back.
	var down atomic.Bool
	var hijack atomic.Pointer[context.CancelFunc]
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if down.Load() {
			http.Error(w, "down", http.StatusServiceUnavailable)
			return
		}
		ctx, cancel := context.WithCancel(r.Context())
		hijack.Store(&cancel)
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer ts.Close()

	local := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Follower{
		URL: ts.URL + "/", Store: local,
		IdleTimeout: time.Second, MinBackoff: 5 * time.Millisecond, MaxBackoff: 20 * time.Millisecond,
	}).Run(ctx)

	eventually(t, "the snapshot", func() bool { return ids(local)["a"] })
	if local.Ready() {
		t.Fatal("must not be ready while the upstream is still syncing")
	}

	upstream.SetCluster(store.Cluster{Name: "prod", Local: true, State: store.StateConnected})
	upstream.Upsert(mk("b"))
	upstream.Remove("a")
	eventually(t, "live events", func() bool {
		got := ids(local)
		return got["b"] && !got["a"] && local.Ready()
	})

	// Upstream goes away: tiles stay, the cluster becomes stale.
	down.Store(true)
	(*hijack.Load())()
	eventually(t, "stale marking", func() bool { return clusterState(local) == store.StateStale })
	if !ids(local)["b"] || !local.Ready() {
		t.Fatal("the last known tiles must be kept and served while stale")
	}

	// Changes made while disconnected arrive with the next snapshot.
	upstream.Upsert(mk("c"))
	upstream.Remove("b")
	down.Store(false)
	eventually(t, "resynchronisation", func() bool {
		got := ids(local)
		return got["c"] && !got["b"] && clusterState(local) == store.StateConnected
	})
}

func TestReconnectsWhenStreamGoesSilent(t *testing.T) {
	var connections atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		connections.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_ = http.NewResponseController(w).Flush()
		<-r.Context().Done() // never sends anything
	}))
	defer ts.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Follower{
		URL: ts.URL, Store: store.New(),
		IdleTimeout: 30 * time.Millisecond, MinBackoff: time.Millisecond, MaxBackoff: 2 * time.Millisecond,
	}).Run(ctx)
	eventually(t, "a second connection", func() bool { return connections.Load() >= 2 })
}

func TestRejectsOtherSchemaVersion(t *testing.T) {
	f := &Follower{Store: store.New()}
	if err := f.apply(api.EventSnapshot, `{"schemaVersion":99,"tiles":[],"clusters":[]}`); err == nil {
		t.Error("a snapshot of another schema version must be rejected")
	}
	if err := f.apply("something.new", `{}`); err != nil {
		t.Errorf("unknown events must be ignored: %v", err)
	}
}

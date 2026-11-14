package follow

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
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

// A remote that is itself a hub: its own cluster is called "local" there,
// and it also carries tiles it received from a third cluster.
func remoteInstance() (*store.Store, http.Handler) {
	s := store.New()
	s.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
	s.SetClusterFrom("remote:third", store.Cluster{Name: "third", Local: false, State: store.StateConnected})
	own := tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "local/apps/ns/grafana", Name: "Grafana", Cluster: "local", Editable: true, Tags: []string{}}
	foreign := tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "third/apps/ns/wiki", Name: "Wiki", Cluster: "third", Tags: []string{}}
	s.Upsert(own)
	s.UpsertFrom("remote:third", foreign)
	return s, (&api.Server{Store: s, Heartbeat: 20 * time.Millisecond}).Handler()
}

func find(s *store.Store, id string) (tile.Tile, bool) {
	for _, tl := range s.Snapshot().Tiles {
		if tl.ID == id {
			return tl, true
		}
	}
	return tile.Tile{}, false
}

func stateOf(s *store.Store, name string) string {
	for _, c := range s.Snapshot().Clusters {
		if c.Name == name {
			return c.State
		}
	}
	return ""
}

func TestFederationAdoptsARemotesOwnTiles(t *testing.T) {
	remote, handler := remoteInstance()
	var down atomic.Bool
	var hijack atomic.Pointer[context.CancelFunc]
	var header atomic.Value
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header.Store(r.Header.Get("X-Token"))
		if down.Load() {
			http.Error(w, "down", http.StatusServiceUnavailable)
			return
		}
		ctx, cancel := context.WithCancel(r.Context())
		hijack.Store(&cancel)
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer ts.Close()

	// The hub has a cluster and a tile of its own, also called "local".
	hub := store.New()
	hub.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
	hub.Upsert(tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "local/apps/ns/grafana", Name: "Grafana", Cluster: "local", Editable: true, Tags: []string{}})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Follower{
		URL: ts.URL, Remote: "prod", Store: hub, Headers: map[string]string{"X-Token": "secret"},
		IdleTimeout: time.Second, MinBackoff: 5 * time.Millisecond, MaxBackoff: 20 * time.Millisecond,
	}).Run(ctx)

	eventually(t, "the remote's tile", func() bool { _, ok := find(hub, "prod/apps/ns/grafana"); return ok })
	adopted, _ := find(hub, "prod/apps/ns/grafana")
	if adopted.Cluster != "prod" || adopted.Editable || adopted.Name != "Grafana" {
		t.Errorf("adopted tile: %+v", adopted)
	}
	if own, ok := find(hub, "local/apps/ns/grafana"); !ok || !own.Editable || own.Cluster != "local" {
		t.Errorf("the hub's own tile of the same name must be untouched: %+v", own)
	}
	if _, ok := find(hub, "prod/apps/ns/wiki"); ok {
		t.Error("a tile the remote received from elsewhere must not be passed on")
	}
	if _, ok := find(hub, "third/apps/ns/wiki"); ok {
		t.Error("a foreign tile must not arrive under its own name either")
	}
	if got := header.Load(); got != "secret" {
		t.Errorf("configured headers were not sent: %q", got)
	}
	clusters := hub.Snapshot().Clusters
	if len(clusters) != 2 || stateOf(hub, "prod") != store.StateConnected || stateOf(hub, "local") != store.StateConnected {
		t.Fatalf("clusters: %+v", clusters)
	}
	for _, c := range clusters {
		if c.Name == "prod" && c.Local {
			t.Error("a remote must not count as local")
		}
	}

	// Live changes on the remote, including one to a foreign tile.
	remote.Upsert(tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "local/apps/ns/plex", Name: "Plex", Cluster: "local", Tags: []string{}})
	remote.UpsertFrom("remote:third", tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "third/apps/ns/more", Name: "More", Cluster: "third", Tags: []string{}})
	remote.Remove("local/apps/ns/grafana")
	eventually(t, "live changes", func() bool {
		_, plex := find(hub, "prod/apps/ns/plex")
		_, grafana := find(hub, "prod/apps/ns/grafana")
		return plex && !grafana
	})
	if _, ok := find(hub, "prod/apps/ns/more"); ok {
		t.Error("a foreign tile arrived through a live event")
	}
	if _, ok := find(hub, "local/apps/ns/grafana"); !ok {
		t.Error("deleting the remote's tile deleted the hub's own")
	}

	// The remote goes away: its tiles stay and it is marked stale. The
	// hub's own cluster is not affected.
	down.Store(true)
	(*hijack.Load())()
	eventually(t, "stale marking", func() bool { return stateOf(hub, "prod") == store.StateStale })
	if _, ok := find(hub, "prod/apps/ns/plex"); !ok || stateOf(hub, "local") != store.StateConnected || !hub.Ready() {
		t.Error("the last known tiles must stay and the hub must stay ready")
	}

	remote.Remove("local/apps/ns/plex")
	remote.Upsert(tile.Tile{Kind: tile.KindApplication, URL: "https://example.test", ID: "local/apps/ns/new", Name: "New", Cluster: "local", Tags: []string{}})
	down.Store(false)
	eventually(t, "resynchronisation", func() bool {
		_, plex := find(hub, "prod/apps/ns/plex")
		_, added := find(hub, "prod/apps/ns/new")
		return !plex && added && stateOf(hub, "prod") == store.StateConnected
	})
}

func TestRemoteIsKnownBeforeItIsReached(t *testing.T) {
	ts := httptest.NewServer(http.NotFoundHandler())
	ts.Close()
	hub := store.New()
	hub.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Follower{URL: ts.URL, Remote: "prod", Store: hub, MinBackoff: time.Millisecond, MaxBackoff: 2 * time.Millisecond}).Run(ctx)
	eventually(t, "the remote to be listed", func() bool { return stateOf(hub, "prod") != "" })
	if !hub.Ready() {
		t.Error("an unreachable remote must not make the hub unready")
	}
}

func TestTwoRemotesDoNotDisturbEachOther(t *testing.T) {
	hub := store.New()
	a := &Follower{Remote: "a", Store: hub, Log: slog.Default()}
	b := &Follower{Remote: "b", Store: hub, Log: slog.Default()}
	a.own.local, b.own.local = map[string]bool{}, map[string]bool{}
	snapshot := func(name string) string {
		return `{"schemaVersion":1,"tiles":[{"id":"local/apps/ns/` + name + `","kind":"application","url":"https://example.test","cluster":"local","name":"` + name + `","tags":[]}],` +
			`"clusters":[{"name":"local","local":true,"state":"connected"}]}`
	}
	if err := a.apply(api.EventSnapshot, snapshot("one")); err != nil {
		t.Fatal(err)
	}
	if err := b.apply(api.EventSnapshot, snapshot("two")); err != nil {
		t.Fatal(err)
	}
	// A new snapshot of a replaces only what a brought.
	if err := a.apply(api.EventSnapshot, snapshot("three")); err != nil {
		t.Fatal(err)
	}
	got := ids(hub)
	if len(got) != 2 || !got["a/apps/ns/three"] || !got["b/apps/ns/two"] {
		t.Errorf("tiles: %v", got)
	}
}

func testLogger() *slog.Logger { return slog.Default() }

func TestRemoteCertificateIsCheckedUnlessToldNotTo(t *testing.T) {
	_, handler := remoteInstance()
	// A certificate that nothing here trusts, like a self-signed one.
	ts := httptest.NewTLSServer(handler)
	defer ts.Close()
	follow := func(insecure bool) (*store.Store, *Follower, context.CancelFunc) {
		hub := store.New()
		hub.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
		ctx, cancel := context.WithCancel(context.Background())
		f := &Follower{
			URL: ts.URL, Remote: "prod", Store: hub, InsecureSkipVerify: insecure,
			IdleTimeout: time.Second, MinBackoff: 5 * time.Millisecond, MaxBackoff: 20 * time.Millisecond,
		}
		go f.Run(ctx)
		return hub, f, cancel
	}

	hub, strict, cancel := follow(false)
	defer cancel()
	eventually(t, "the refusal", func() bool { return strings.Contains(strict.Problem(), "certificate") })
	if _, ok := find(hub, "prod/apps/ns/grafana"); ok {
		t.Error("tiles were taken from a remote whose certificate does not verify")
	}

	hub, _, cancel = follow(true)
	defer cancel()
	eventually(t, "the remote's tile", func() bool { _, ok := find(hub, "prod/apps/ns/grafana"); return ok })
}

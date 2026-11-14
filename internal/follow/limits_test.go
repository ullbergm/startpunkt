package follow

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func validRemoteTile(name string) tile.Tile {
	return tile.Tile{ID: "local/apps/ns/" + name, Cluster: "local", Kind: tile.KindApplication, Name: name, URL: "https://example.test", Tags: []string{}}
}
func encoded(t *testing.T, value any) string {
	t.Helper()
	b, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}
func remoteSnapshot(tiles ...tile.Tile) api.State {
	return api.State{SchemaVersion: api.SchemaVersion, Tiles: tiles, Clusters: []store.Cluster{{Name: "local", Local: true, State: store.StateConnected}}}
}
func boundedFollower() *Follower {
	return &Follower{Remote: "prod", Store: store.New(), MaxTiles: 1, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
}

func TestRejectsInvalidRemoteWithoutReplacingLastState(t *testing.T) {
	for name, mutate := range map[string]func(*tile.Tile){
		"scheme":        func(t *tile.Tile) { t.URL = "javascript:alert(1)" },
		"identity":      func(t *tile.Tile) { t.ID = "another/apps/ns/a" },
		"kind":          func(t *tile.Tile) { t.Kind = "unknown" },
		"length":        func(t *tile.Tile) { t.Info = strings.Repeat("x", 4097) },
		"secondary URL": func(t *tile.Tile) { t.Links = []tile.Link{{Name: "Docs", URL: "data:text/html,bad"}} },
	} {
		t.Run(name, func(t *testing.T) {
			f := boundedFollower()
			if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(validRemoteTile("good")))); err != nil {
				t.Fatal(err)
			}
			bad := validRemoteTile("bad")
			mutate(&bad)
			if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(bad))); err == nil {
				t.Fatal("invalid snapshot accepted")
			}
			if !ids(f.Store)["prod/apps/ns/good"] {
				t.Fatal("invalid snapshot replaced last known tiles")
			}
			if err := f.apply(string(store.EventUpsert), encoded(t, bad)); err == nil {
				t.Fatal("invalid upsert accepted")
			}
		})
	}
}
func TestTileLimitCoversSnapshotAndCumulativeUpserts(t *testing.T) {
	f := boundedFollower()
	if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(validRemoteTile("a"), validRemoteTile("b")))); err == nil {
		t.Fatal("oversized snapshot accepted")
	}
	if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(validRemoteTile("a")))); err != nil {
		t.Fatal(err)
	}
	if err := f.apply(string(store.EventUpsert), encoded(t, validRemoteTile("b"))); err == nil {
		t.Fatal("cumulative tile limit ignored")
	}
	if err := f.apply(string(store.EventUpsert), encoded(t, validRemoteTile("a"))); err != nil {
		t.Fatal("replacement should not consume tile budget", err)
	}
	if err := f.apply(string(store.EventDelete), `{"id":"local/apps/ns/a"}`); err != nil {
		t.Fatal(err)
	}
	if err := f.apply(string(store.EventUpsert), encoded(t, validRemoteTile("b"))); err != nil {
		t.Fatal("delete should release budget", err)
	}
}
func TestReadLineStopsAtBoundWithoutNewline(t *testing.T) {
	if _, err := readLine(bufio.NewReader(strings.NewReader(strings.Repeat("x", 1<<20))), 64); err == nil {
		t.Fatal("unbounded line accepted")
	}
	if got, err := readLine(bufio.NewReader(strings.NewReader("data: ok\n")), 9); err != nil || got != "data: ok\n" {
		t.Fatalf("bounded line: %q %v", got, err)
	}
}
func TestMultilineEventLimit(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		for range 100 {
			fmt.Fprint(w, "data: 1234567890\n")
		}
	}))
	defer ts.Close()
	f := &Follower{URL: ts.URL, Store: store.New(), Client: ts.Client(), IdleTimeout: time.Second, MaxEventBytes: 64}
	if _, err := f.stream(context.Background()); err == nil || !strings.Contains(err.Error(), "exceeds") {
		t.Fatalf("oversized multiline event: %v", err)
	}
}

func TestControllerFeedAlsoBoundsCumulativeTiles(t *testing.T) {
	f := boundedFollower()
	f.Remote = ""
	if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(validRemoteTile("a")))); err != nil {
		t.Fatal(err)
	}
	if err := f.apply(string(store.EventUpsert), encoded(t, validRemoteTile("b"))); err == nil {
		t.Fatal("controller upserts bypassed tile limit")
	}
	if len(f.Store.Snapshot().Tiles) != 1 {
		t.Fatal("oversized update changed store")
	}
}
func TestStreamRejectsChangesBeforeSnapshot(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "event: cluster.status\ndata: {\"name\":\"local\",\"local\":true,\"state\":\"connected\"}\n\n")
	}))
	defer ts.Close()
	f := &Follower{URL: ts.URL, Remote: "prod", Store: store.New(), Client: ts.Client(), IdleTimeout: time.Second}
	if _, err := f.stream(context.Background()); err == nil || !strings.Contains(err.Error(), "before its snapshot") {
		t.Fatalf("change before snapshot: %v", err)
	}
}

func TestControllerClusterEventsAreCumulativelyBounded(t *testing.T) {
	f := boundedFollower()
	f.Remote = ""
	if err := f.apply(api.EventSnapshot, encoded(t, api.State{SchemaVersion: api.SchemaVersion})); err != nil {
		t.Fatal(err)
	}
	for i := range 1024 {
		c := store.Cluster{Name: fmt.Sprintf("c%d", i), State: store.StateConnected}
		if err := f.apply(string(store.EventCluster), encoded(t, c)); err != nil {
			t.Fatal(err)
		}
	}
	extra := encoded(t, store.Cluster{Name: "overflow", State: store.StateConnected})
	if err := f.apply(string(store.EventCluster), extra); err == nil {
		t.Fatal("cluster cap ignored")
	}
	if len(f.Store.Snapshot().Clusters) != 1024 {
		t.Fatal("cluster cap changed state")
	}
	if err := f.apply(string(store.EventClusterDelete), `{"name":"c0"}`); err != nil {
		t.Fatal(err)
	}
	if err := f.apply(string(store.EventCluster), extra); err != nil {
		t.Fatal("cluster delete did not release budget", err)
	}
}

func TestRejectsInvalidWorkloadAndConsoleMetadata(t *testing.T) {
	for name, change := range map[string]func(*tile.Tile){
		"console scheme":  func(t *tile.Tile) { t.ConsoleURL = "javascript:alert(1)" },
		"console length":  func(t *tile.Tile) { t.ConsoleURL = "https://console.test/" + strings.Repeat("x", 4096) },
		"source kind":     func(t *tile.Tile) { t.Source.Kind = strings.Repeat("x", 4097) },
		"workload state":  func(t *tile.Tile) { t.Workload = &tile.Workload{State: "arbitrary"} },
		"negative counts": func(t *tile.Tile) { t.Workload = &tile.Workload{State: "ready", Ready: -1} },
		"excess ready":    func(t *tile.Tile) { t.Workload = &tile.Workload{State: "ready", Ready: 2, Desired: 1} },
	} {
		t.Run(name, func(t *testing.T) {
			entry := validRemoteTile("a")
			change(&entry)
			if validateTile(entry) == nil {
				t.Fatal("invalid optional tile metadata accepted")
			}
		})
	}
}

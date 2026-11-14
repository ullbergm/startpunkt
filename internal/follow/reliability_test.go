package follow

import (
	"context"
	"fmt"
	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRedirectNeverForwardsConfiguredHeadersAcrossOrigins(t *testing.T) {
	var reached atomic.Bool
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached.Store(true)
		t.Error("cross-origin redirect was followed with", r.Header.Get("X-API-Key"))
	}))
	defer target.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, strings.Replace(target.URL, "127.0.0.1", "localhost", 1), http.StatusFound)
	}))
	defer origin.Close()
	f := &Follower{URL: origin.URL, Client: origin.Client(), Headers: map[string]string{"X-API-Key": "test-only-secret"}, Store: store.New(), IdleTimeout: time.Second}
	if _, err := f.stream(context.Background()); err == nil {
		t.Fatal("redirect did not fail")
	}
	if reached.Load() {
		t.Fatal("credential target was reached")
	}
}

func TestSameOriginRedirectCanReachEventStream(t *testing.T) {
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/stream" {
			http.Redirect(w, r, "/stream", http.StatusTemporaryRedirect)
			return
		}
		if r.Header.Get("X-API-Key") != "test-only-secret" {
			t.Error("same-origin header missing")
		}
		fmt.Fprintf(w, "event: snapshot\ndata: %s\n\n", encoded(t, remoteSnapshot()))
	}))
	defer origin.Close()
	f := &Follower{URL: origin.URL, Client: origin.Client(), Store: store.New(), IdleTimeout: time.Second}
	f.Headers = map[string]string{"X-API-Key": "test-only-secret"}
	f.Log = testLogger()
	connected, _ := f.stream(context.Background())
	if !connected {
		t.Fatal("same-origin redirect rejected")
	}
}

func TestRemoteRenameBuffersTilesUntilClusterIdentityArrives(t *testing.T) {
	f := &Follower{Remote: "prod", Store: store.New(), Log: testLogger()}
	old := validRemoteTile("a")
	if err := f.apply(api.EventSnapshot, encoded(t, remoteSnapshot(old))); err != nil {
		t.Fatal(err)
	}
	renamed := old
	renamed.Cluster = "renamed"
	renamed.ID = "renamed/apps/ns/a"
	renamed.URL = "https://new.test"
	for _, event := range []struct {
		name string
		data any
	}{
		{string(store.EventUpsert), renamed},
		{string(store.EventDelete), api.TileDelete{ID: old.ID}},
		{string(store.EventCluster), store.Cluster{Name: "renamed", Local: true, State: store.StateConnected}},
		{string(store.EventClusterDelete), api.ClusterDelete{Name: "local"}},
	} {
		if err := f.apply(event.name, encoded(t, event.data)); err != nil {
			t.Fatal(err)
		}
	}
	tiles := f.Store.Snapshot().Tiles
	if len(tiles) != 1 || tiles[0].ID != "prod/apps/ns/a" || tiles[0].URL != "https://new.test" {
		t.Fatalf("renamed tiles lost: %+v", tiles)
	}
}

func TestFormerForeignClusterPromotionRequestsResync(t *testing.T) {
	f := &Follower{Remote: "prod", Store: store.New(), Log: testLogger()}
	first := remoteSnapshot(validRemoteTile("a"))
	first.Clusters = append(first.Clusters, store.Cluster{Name: "renamed", State: store.StateConnected})
	if err := f.apply(api.EventSnapshot, encoded(t, first)); err != nil {
		t.Fatal(err)
	}
	promoted := validRemoteTile("a")
	promoted.Cluster = "renamed"
	promoted.ID = "renamed/apps/ns/a"
	if err := f.apply(string(store.EventUpsert), encoded(t, promoted)); err != nil {
		t.Fatal(err)
	}
	if err := f.apply(string(store.EventCluster), encoded(t, store.Cluster{Name: "renamed", Local: true, State: store.StateConnected})); err == nil {
		t.Fatal("ownership promotion kept an incomplete stream instead of resynchronizing")
	}
	next := api.State{SchemaVersion: api.SchemaVersion, Clusters: []store.Cluster{{Name: "renamed", Local: true, State: store.StateConnected}}, Tiles: []tile.Tile{promoted}}
	if err := f.apply(api.EventSnapshot, encoded(t, next)); err != nil {
		t.Fatal(err)
	}
	if len(f.Store.Snapshot().Tiles) != 1 {
		t.Fatal("promotion snapshot lost tile")
	}
}

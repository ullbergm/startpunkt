package follow

import (
	"context"
	"log/slog"
	"sync"
	"testing"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func TestManagerFollowsTheConfiguredRemotes(t *testing.T) {
	hub := store.New()
	var mu sync.Mutex
	started := map[string]int{}
	stopped := map[string]int{}
	m := &Manager{Store: hub, Log: slog.Default(), Start: func(ctx context.Context, f *Follower) {
		mu.Lock()
		started[f.Remote+" "+f.URL]++
		mu.Unlock()
		// Stand in for a follower: bring one tile, then wait to be stopped.
		hub.SetClusterFrom(f.feed(), store.Cluster{Name: f.Remote, State: store.StateConnected})
		hub.UpsertFrom(f.feed(), tile.Tile{ID: f.Remote + "/x", Cluster: f.Remote, Tags: []string{}})
		<-ctx.Done()
		mu.Lock()
		stopped[f.Remote+" "+f.URL]++
		mu.Unlock()
	}}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	count := func(m map[string]int, key string) int {
		mu.Lock()
		defer mu.Unlock()
		return m[key]
	}
	has := func(id string) bool { return ids(hub)[id] }

	a := RemoteConfig{Name: "a", URL: "http://a"}
	b := RemoteConfig{Name: "b", URL: "http://b"}
	m.Sync(ctx, []RemoteConfig{a, b})
	eventually(t, "both remotes", func() bool { return has("a/x") && has("b/x") })

	// The same configuration again starts nothing new.
	m.Sync(ctx, []RemoteConfig{a, b})
	if count(started, "a http://a") != 1 || count(started, "b http://b") != 1 {
		t.Errorf("unchanged remotes were restarted: %v", started)
	}

	// One removed: its follower stops and its tiles and cluster go.
	m.Sync(ctx, []RemoteConfig{a})
	if has("b/x") || stateOf(hub, "b") != "" || count(stopped, "b http://b") != 1 {
		t.Errorf("a removed remote must leave nothing behind: tiles %v", ids(hub))
	}
	if !has("a/x") {
		t.Error("the other remote must be untouched")
	}

	// One changed: restarted with the new settings.
	a.URL = "http://elsewhere"
	a.Filter = Filter{Exclude: Selector{Tags: []string{"private"}}}
	m.Sync(ctx, []RemoteConfig{a})
	eventually(t, "the restart", func() bool { return count(started, "a http://elsewhere") == 1 })
	if count(stopped, "a http://a") != 1 {
		t.Error("the old follower must have been stopped first")
	}

	m.Sync(ctx, nil)
	if len(ids(hub)) != 0 || len(hub.Snapshot().Clusters) != 0 {
		t.Errorf("no remotes: %v %v", ids(hub), hub.Snapshot().Clusters)
	}
}

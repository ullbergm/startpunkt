package store

import (
	"testing"

	"github.com/ullbergm/startpunkt/internal/tile"
)

func mk(id, name string, loc int) tile.Tile {
	return tile.Tile{ID: id, Name: name, Location: loc, Cluster: "c", Tags: []string{}}
}

func drain(ch <-chan []Event) []Event {
	var out []Event
	for {
		select {
		case batch, ok := <-ch:
			if !ok {
				return out
			}
			out = append(out, batch...)
		default:
			return out
		}
	}
}

func TestSetEmitsOnlyDifferences(t *testing.T) {
	s := New()
	owner := Owner{Cluster: "c", Type: "applications.x", Namespace: "ns", Name: "a"}
	_, events, cancel := s.Subscribe()
	defer cancel()

	s.Set(owner, []tile.Tile{mk("a", "A", 1), mk("a/1", "A1", 2)})
	if got := drain(events); len(got) != 2 || got[0].Type != EventUpsert {
		t.Fatalf("first set: got %+v", got)
	}

	s.Set(owner, []tile.Tile{mk("a", "A", 1), mk("a/1", "A1", 2)})
	if got := drain(events); len(got) != 0 {
		t.Fatalf("identical set must be silent, got %+v", got)
	}

	s.Set(owner, []tile.Tile{mk("a", "renamed", 1)})
	got := drain(events)
	if len(got) != 2 || got[0].Type != EventUpsert || got[0].Tile.Name != "renamed" ||
		got[1].Type != EventDelete || got[1].ID != "a/1" {
		t.Fatalf("changed set: got %+v", got)
	}

	s.Delete(owner)
	if got := drain(events); len(got) != 1 || got[0].Type != EventDelete || got[0].ID != "a" {
		t.Fatalf("delete: got %+v", got)
	}
	if n := len(s.Snapshot().Tiles); n != 0 {
		t.Fatalf("store should be empty, has %d tiles", n)
	}
}

func TestSnapshotOrder(t *testing.T) {
	s := New()
	s.Set(Owner{Name: "1"}, []tile.Tile{mk("1", "zeta", 1000)})
	s.Set(Owner{Name: "2"}, []tile.Tile{mk("2", "Alpha", 1000)})
	s.Set(Owner{Name: "3"}, []tile.Tile{mk("3", "last-by-name", 5)})
	var names []string
	for _, tl := range s.Snapshot().Tiles {
		names = append(names, tl.Name)
	}
	want := []string{"last-by-name", "Alpha", "zeta"}
	for i := range want {
		if names[i] != want[i] {
			t.Fatalf("order: got %v, want %v", names, want)
		}
	}
}

func TestRetainDropsOnlyMatchingType(t *testing.T) {
	s := New()
	keepOwner := Owner{Cluster: "c", Type: "apps", Name: "keep"}
	dropOwner := Owner{Cluster: "c", Type: "apps", Name: "drop"}
	other := Owner{Cluster: "c", Type: "bookmarks", Name: "other"}
	s.Set(keepOwner, []tile.Tile{mk("keep", "k", 1)})
	s.Set(dropOwner, []tile.Tile{mk("drop", "d", 1)})
	s.Set(other, []tile.Tile{mk("other", "o", 1)})

	s.Retain("c", "apps", func(o Owner) bool { return o == keepOwner })

	ids := map[string]bool{}
	for _, tl := range s.Snapshot().Tiles {
		ids[tl.ID] = true
	}
	if !ids["keep"] || ids["drop"] || !ids["other"] {
		t.Fatalf("unexpected tiles after retain: %v", ids)
	}
}

func TestReadyFollowsLocalClusterState(t *testing.T) {
	s := New()
	if s.Ready() {
		t.Fatal("an empty store must not be ready")
	}
	s.SetCluster(Cluster{Name: "c", Local: true, State: StateSyncing})
	if s.Ready() {
		t.Fatal("a syncing cluster must not be ready")
	}
	s.SetCluster(Cluster{Name: "c", Local: true, State: StateConnected})
	if !s.Ready() {
		t.Fatal("a connected cluster must be ready")
	}
	s.MarkStale()
	if !s.Ready() {
		t.Fatal("a stale cluster keeps serving its last known tiles")
	}
}

func TestMirrorReplacesContent(t *testing.T) {
	s := New()
	s.Upsert(mk("old", "old", 1), mk("same", "same", 1))
	s.SetCluster(Cluster{Name: "gone", Local: true, State: StateConnected})
	_, events, cancel := s.Subscribe()
	defer cancel()

	s.Mirror(Snapshot{
		Tiles:    []tile.Tile{mk("same", "same", 1), mk("new", "new", 1)},
		Clusters: []Cluster{{Name: "c", Local: true, State: StateConnected}},
	})

	types := map[string]EventType{}
	for _, e := range drain(events) {
		types[e.ID+e.Cluster.Name] = e.Type
	}
	if len(types) != 3 || types["new"] != EventUpsert || types["old"] != EventDelete ||
		types["c"] != EventCluster {
		t.Fatalf("unexpected events: %v", types)
	}
	snap := s.Snapshot()
	if len(snap.Tiles) != 2 || len(snap.Clusters) != 1 || snap.Clusters[0].Name != "c" {
		t.Fatalf("unexpected snapshot: %+v", snap)
	}
}

func TestSlowSubscriberIsDisconnected(t *testing.T) {
	s := New()
	_, events, cancel := s.Subscribe()
	defer cancel()
	for i := 0; i < 200; i++ {
		s.Upsert(mk("t", "t", i))
	}
	n := 0
	for range events {
		n++
	}
	if n == 0 || n >= 200 {
		t.Fatalf("expected the channel to be closed after its buffer filled, read %d", n)
	}
}

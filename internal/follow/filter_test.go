package follow

import (
	"testing"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func sample(name, group string, kind tile.Kind, tags ...string) tile.Tile {
	return tile.Tile{Name: name, Group: group, Kind: kind, Tags: tags}
}

func TestFilter(t *testing.T) {
	grafana := sample("Grafana", "observability", tile.KindApplication, "admin")
	plex := sample("Plex", "media", tile.KindApplication)
	home := sample("Home Assistant", "home automation", tile.KindApplication, "home", "admin")
	docs := sample("Docs", "reference", tile.KindBookmark)

	cases := []struct {
		name   string
		filter Filter
		want   map[string]bool
	}{
		{"nothing set takes everything", Filter{},
			map[string]bool{"Grafana": true, "Plex": true, "Home Assistant": true, "Docs": true}},
		{"include by name, case ignored", Filter{Include: Selector{Names: []string{"grafana", "PLEX"}}},
			map[string]bool{"Grafana": true, "Plex": true}},
		{"include by name pattern", Filter{Include: Selector{Names: []string{"home*"}}},
			map[string]bool{"Home Assistant": true}},
		{"include by group pattern", Filter{Include: Selector{Groups: []string{"*a"}}},
			map[string]bool{"Plex": true}},
		{"include by tag", Filter{Include: Selector{Tags: []string{" Admin "}}},
			map[string]bool{"Grafana": true, "Home Assistant": true}},
		{"include by kind", Filter{Include: Selector{Kinds: []string{"bookmark"}}},
			map[string]bool{"Docs": true}},
		{"every given field must match", Filter{Include: Selector{Tags: []string{"admin"}, Groups: []string{"observability"}}},
			map[string]bool{"Grafana": true}},
		{"exclude by tag", Filter{Exclude: Selector{Tags: []string{"admin"}}},
			map[string]bool{"Plex": true, "Docs": true}},
		{"exclude wins over include", Filter{Include: Selector{Kinds: []string{"application"}}, Exclude: Selector{Names: []string{"p*"}}},
			map[string]bool{"Grafana": true, "Home Assistant": true}},
	}
	for _, c := range cases {
		for _, tl := range []tile.Tile{grafana, plex, home, docs} {
			if got := c.filter.Allows(tl); got != c.want[tl.Name] {
				t.Errorf("%s: %s allowed=%v, want %v", c.name, tl.Name, got, c.want[tl.Name])
			}
		}
	}
}

func TestFilterValidate(t *testing.T) {
	if err := (Filter{Include: Selector{Names: []string{"a*", "b?"}, Kinds: []string{"bookmark"}}}).Validate(); err != nil {
		t.Errorf("valid filter: %v", err)
	}
	for name, filter := range map[string]Filter{
		"bad pattern": {Include: Selector{Names: []string{"[a"}}},
		"bad kind":    {Exclude: Selector{Kinds: []string{"widget"}}},
	} {
		if err := filter.Validate(); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestRemoteFilterAppliesToSnapshotsAndChanges(t *testing.T) {
	hub := store.New()
	f := &Follower{Remote: "prod", Store: hub, Filter: Filter{Exclude: Selector{Tags: []string{"private"}}}}
	f.own.local = map[string]bool{}
	snapshot := `{"schemaVersion":1,"clusters":[{"name":"local","local":true,"state":"connected"}],"tiles":[` +
		`{"id":"local/apps/ns/open","cluster":"local","name":"Open","tags":[]},` +
		`{"id":"local/apps/ns/secret","cluster":"local","name":"Secret","tags":["private"]}]}`
	f.Log = testLogger()
	if err := f.apply("snapshot", snapshot); err != nil {
		t.Fatal(err)
	}
	if got := ids(hub); len(got) != 1 || !got["prod/apps/ns/open"] {
		t.Fatalf("after snapshot: %v", got)
	}

	// A tile that starts to match the exclusion disappears from the hub...
	if err := f.apply("tile.upsert", `{"id":"local/apps/ns/open","cluster":"local","name":"Open","tags":["private"]}`); err != nil {
		t.Fatal(err)
	}
	if got := ids(hub); len(got) != 0 {
		t.Fatalf("a tile that is now excluded must go: %v", got)
	}
	// ...and one that stops matching appears.
	if err := f.apply("tile.upsert", `{"id":"local/apps/ns/secret","cluster":"local","name":"Secret","tags":[]}`); err != nil {
		t.Fatal(err)
	}
	if got := ids(hub); len(got) != 1 || !got["prod/apps/ns/secret"] {
		t.Fatalf("a tile that is no longer excluded must appear: %v", got)
	}
}

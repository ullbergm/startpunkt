package store

import (
	"github.com/ullbergm/startpunkt/internal/tile"
	"testing"
)

func TestDiagnosticLifecycleAndGeneration(t *testing.T) {
	source := tile.Source{Type: "applications.example.com", Namespace: "apps", Name: "bad", Version: "v1"}
	owner := Owner{Cluster: "prod", Type: source.Type, Namespace: source.Namespace, Name: source.Name}
	staging, live := New(), New()
	staging.SetDiagnostic(owner, source, "missing reference")
	snap, events, cancel := staging.Subscribe()
	defer cancel()
	live.Mirror(snap)
	if got := live.Snapshot().Diagnostics; len(got) != 1 || got[0].Message != "missing reference" {
		t.Fatalf("snapshot: %+v", got)
	}
	staging.SetDiagnostic(owner, source, "still missing")
	live.ApplyFeed(LocalFeed, <-events)
	if got := live.Snapshot().Diagnostics; len(got) != 1 || got[0].Message != "still missing" {
		t.Fatalf("live: %+v", got)
	}
	staging.SetDiagnostic(owner, source, "")
	live.ApplyFeed(LocalFeed, <-events)
	if len(live.Snapshot().Diagnostics) != 0 {
		t.Fatal("resolved diagnostic retained")
	}
	staging.SetDiagnostic(owner, source, "missing")
	staging.Delete(owner)
	if len(staging.Snapshot().Diagnostics) != 0 {
		t.Fatal("deleted resource retained")
	}
	staging.SetDiagnostic(owner, source, "missing")
	staging.Retain("prod", source.Type, func(Owner) bool { return false })
	if len(staging.Snapshot().Diagnostics) != 0 {
		t.Fatal("removed source retained")
	}
}

func TestDiagnosticFeedIsolation(t *testing.T) {
	s := New()
	d := tile.Diagnostic{ID: "prod/apps/ns/bad", Cluster: "prod", Source: tile.Source{Type: "apps", Namespace: "ns", Name: "bad"}, Message: "bad"}
	s.MirrorFrom("other", Snapshot{Diagnostics: []tile.Diagnostic{d}})
	s.Mirror(Snapshot{})
	s.ApplyFeed(LocalFeed, []Event{{Type: EventDiagnosticDelete, ID: d.ID}})
	if len(s.Snapshot().Diagnostics) != 1 {
		t.Fatal("another feed removed a diagnostic")
	}
	s.DropFeed("other")
	if len(s.Snapshot().Diagnostics) != 0 {
		t.Fatal("dropped feed retained diagnostic")
	}
}

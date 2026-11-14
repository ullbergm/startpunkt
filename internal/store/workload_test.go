package store

import (
	"testing"

	"github.com/ullbergm/startpunkt/internal/tile"
)

func TestWorkloadEnrichmentSurvivesSourceRefreshAndRejectsOldDependencies(t *testing.T) {
	s := New()
	owner := Owner{Cluster: "local", Type: "apps", Namespace: "ns", Name: "web"}
	original := tile.Tile{ID: "web", URL: "https://web.test", Source: tile.Source{Type: "apps", Name: "web"}, WorkloadRefs: []tile.WorkloadRef{{Resource: "deployments", Name: "web"}}}
	s.Set(owner, []tile.Tile{original})
	s.SetWorkload(original, "https://console.test/web", &tile.Workload{State: "ready", Ready: 1, Desired: 1})
	s.Set(owner, []tile.Tile{original})
	got := s.Owned(owner)[0]
	if got.Workload == nil || got.Workload.State != "ready" || got.ConsoleURL == "" {
		t.Fatal("source refresh lost enrichment")
	}
	changed := original
	changed.WorkloadRefs = []tile.WorkloadRef{{Resource: "deployments", Name: "another"}}
	s.Set(owner, []tile.Tile{changed})
	s.SetWorkload(original, "https://console.test/old", &tile.Workload{State: "degraded"})
	got = s.Owned(owner)[0]
	if got.Workload != nil || got.ConsoleURL != "" {
		t.Fatal("outdated enrichment overwrote new dependencies")
	}
}

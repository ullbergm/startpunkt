package tile

import "testing"

func TestID(t *testing.T) {
	src := Source{Type: "applications.startpunkt.ullberg.us", Version: "v1alpha4", Namespace: "media", Name: "plex"}
	if got, want := ID("prod", src, 0), "prod/applications.startpunkt.ullberg.us/media/plex"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
	if got, want := ID("prod", src, 2), "prod/applications.startpunkt.ullberg.us/media/plex/2"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
	other := src
	other.Version = "v1"
	if ID("prod", src, 0) != ID("prod", other, 0) {
		t.Error("the id must not depend on the watched version")
	}
}

func TestEqual(t *testing.T) {
	yes, no := true, false
	a := Tile{ID: "x", Tags: []string{"a"}, Available: &yes}
	b := Tile{ID: "x", Tags: []string{"a"}, Available: &yes}
	if !Equal(a, b) {
		t.Error("identical tiles must be equal")
	}
	b.Available = &no
	if Equal(a, b) {
		t.Error("availability must be compared by value")
	}
	b = a
	b.Tags = []string{"b"}
	if Equal(a, b) {
		t.Error("tags must be compared")
	}
}

func TestWorkloadMetadataAffectsEquality(t *testing.T) {
	a := Tile{ID: "a", ConsoleURL: "https://console.test/a", Workload: &Workload{State: "ready", Ready: 1, Desired: 1}, WorkloadRefs: []WorkloadRef{{Resource: "deployments", Name: "web"}}}
	b := a
	b.Workload = &Workload{State: "degraded", Ready: 0, Desired: 1}
	if Equal(a, b) {
		t.Fatal("readiness change was ignored")
	}
	b = a
	b.ConsoleURL = "https://console.test/b"
	if Equal(a, b) {
		t.Fatal("console URL change was ignored")
	}
	b = a
	b.WorkloadRefs = []WorkloadRef{{Resource: "deployments", Name: "other"}}
	if Equal(a, b) {
		t.Fatal("dependency change was ignored")
	}
}

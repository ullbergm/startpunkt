package kube

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakediscovery "k8s.io/client-go/discovery/fake"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	clienttesting "k8s.io/client-go/testing"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
)

const group = "startpunkt.ullberg.us"

func gvr(version, resource string) schema.GroupVersionResource {
	return schema.GroupVersionResource{Group: group, Version: version, Resource: resource}
}

func app(version, namespace, name, url string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": group + "/" + version,
		"kind":       "Application",
		"metadata":   map[string]any{"namespace": namespace, "name": name},
		"spec":       map[string]any{"name": name, "url": url},
	}}
}

func bookmark(version, namespace, name string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": group + "/" + version,
		"kind":       "Bookmark",
		"metadata":   map[string]any{"namespace": namespace, "name": name},
		"spec":       map[string]any{"name": name, "group": "links", "url": "https://" + name},
	}}
}

// cluster is a fake API server whose served versions can change.
type cluster struct {
	mu        sync.Mutex
	discovery *fakediscovery.FakeDiscovery
	dynamic   *dynamicfake.FakeDynamicClient
}

func newCluster(objects ...runtime.Object) *cluster {
	kinds := map[schema.GroupVersionResource]string{}
	for _, v := range []string{"v1", "v1alpha4"} {
		kinds[gvr(v, "applications")] = "ApplicationList"
		kinds[gvr(v, "bookmarks")] = "BookmarkList"
	}
	return &cluster{
		discovery: &fakediscovery.FakeDiscovery{Fake: &clienttesting.Fake{}},
		dynamic:   dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), kinds, objects...),
	}
}

// serve sets which versions of the Startpunkt resources discovery reports.
func (c *cluster) serve(versions ...string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	var lists []*metav1.APIResourceList
	for _, v := range versions {
		lists = append(lists, &metav1.APIResourceList{
			GroupVersion: group + "/" + v,
			APIResources: []metav1.APIResource{
				{Name: "applications", Kind: "Application", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
				{Name: "applications/status", Kind: "Application", Namespaced: true, Verbs: metav1.Verbs{"get", "update"}},
				{Name: "bookmarks", Kind: "Bookmark", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
			},
		})
	}
	c.discovery.Resources = lists
}

func (c *cluster) run(t *testing.T) *store.Store {
	t.Helper()
	s := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go (&Controller{
		Cluster:           "test",
		Store:             s,
		Sources:           source.Builtin(),
		Discovery:         lockedDiscovery{c},
		Dynamic:           c.dynamic,
		DiscoveryInterval: 10 * time.Millisecond,
		Log:               slog.New(slog.NewTextHandler(io.Discard, nil)),
	}).Run(ctx)
	return s
}

// lockedDiscovery guards the fake's resource list, which the test changes
// while the controller reads it.
type lockedDiscovery struct{ c *cluster }

func (d lockedDiscovery) ServerResourcesForGroupVersion(gv string) (*metav1.APIResourceList, error) {
	d.c.mu.Lock()
	defer d.c.mu.Unlock()
	return d.c.discovery.ServerResourcesForGroupVersion(gv)
}

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

func versions(s *store.Store) map[string]string {
	out := map[string]string{}
	for _, tl := range s.Snapshot().Tiles {
		out[tl.ID] = tl.Source.Version
	}
	return out
}

func TestFallsBackToV1alpha4(t *testing.T) {
	c := newCluster(
		app("v1alpha4", "media", "plex", "https://plex"),
		bookmark("v1alpha4", "default", "docs"),
	)
	c.serve("v1alpha4")
	s := c.run(t)

	eventually(t, "the initial sync", s.Ready)
	snap := s.Snapshot()
	if len(snap.Tiles) != 2 {
		t.Fatalf("got %d tiles: %+v", len(snap.Tiles), snap.Tiles)
	}
	got := versions(s)
	if got["test/applications.startpunkt.ullberg.us/media/plex"] != "v1alpha4" ||
		got["test/bookmarks.startpunkt.ullberg.us/default/docs"] != "v1alpha4" {
		t.Errorf("unexpected tiles: %v", got)
	}
	for _, tl := range snap.Tiles {
		if tl.Cluster != "test" || !tl.Editable || tl.Source.Namespace == "" {
			t.Errorf("tile not stamped: %+v", tl)
		}
	}
	if len(snap.Clusters) != 1 || snap.Clusters[0].State != store.StateConnected || !snap.Clusters[0].Local {
		t.Errorf("clusters = %+v", snap.Clusters)
	}
}

func TestFollowsAddUpdateDelete(t *testing.T) {
	c := newCluster()
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", s.Ready)

	ctx := context.Background()
	apps := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace("ns")
	if _, err := apps.Create(ctx, app("v1alpha4", "ns", "a", "https://one"), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	url := func() string {
		for _, tl := range s.Snapshot().Tiles {
			return tl.URL
		}
		return ""
	}
	eventually(t, "the added tile", func() bool { return url() == "https://one" })

	if _, err := apps.Update(ctx, app("v1alpha4", "ns", "a", "https://two"), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the updated tile", func() bool { return url() == "https://two" })

	// An object that stops being valid loses its tile.
	broken := app("v1alpha4", "ns", "a", "https://two")
	broken.Object["spec"] = map[string]any{"url": "https://two"}
	if _, err := apps.Update(ctx, broken, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the invalid object to lose its tile", func() bool { return len(s.Snapshot().Tiles) == 0 })

	if _, err := apps.Update(ctx, app("v1alpha4", "ns", "a", "https://three"), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the tile to return", func() bool { return url() == "https://three" })

	if err := apps.Delete(ctx, "a", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the deleted tile", func() bool { return len(s.Snapshot().Tiles) == 0 })
}

func TestSwitchesToV1WhenItAppears(t *testing.T) {
	// A real API server returns every object in whichever version is asked
	// for. The fake does not convert, so each version gets its own copy; the
	// "gone" object exists only in the old version, standing in for an
	// object deleted during the switch.
	c := newCluster(
		app("v1alpha4", "ns", "kept", "https://kept"),
		app("v1alpha4", "ns", "gone", "https://gone"),
		app("v1", "ns", "kept", "https://kept"),
	)
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", func() bool { return s.Ready() && len(s.Snapshot().Tiles) == 2 })

	_, events, cancel := s.Subscribe()
	defer cancel()
	c.serve("v1", "v1alpha4")
	const kept = "test/applications.startpunkt.ullberg.us/ns/kept"
	eventually(t, "the switch to v1", func() bool {
		got := versions(s)
		return len(got) == 1 && got[kept] == "v1"
	})
	if !s.Ready() {
		t.Error("a version switch must not make the instance unready")
	}
	// The kept tile is updated in place, never deleted and re-added.
	cancel()
	for batch := range events {
		for _, e := range batch {
			if e.Type == store.EventDelete && e.ID == kept {
				t.Error("the tile was deleted during the version switch")
			}
		}
	}
}

func TestRemovesTilesWhenTypeDisappears(t *testing.T) {
	c := newCluster(app("v1alpha4", "ns", "a", "https://a"))
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", func() bool { return len(s.Snapshot().Tiles) == 1 })

	c.serve()
	eventually(t, "the tiles to be removed", func() bool { return len(s.Snapshot().Tiles) == 0 })
	if !s.Ready() {
		t.Error("an absent resource type is a normal state")
	}

	c.serve("v1alpha4")
	eventually(t, "the tiles to return", func() bool { return len(s.Snapshot().Tiles) == 1 })
}

func TestReadyWithoutAnyResourceType(t *testing.T) {
	c := newCluster()
	c.serve()
	s := c.run(t)
	eventually(t, "readiness", s.Ready)
}

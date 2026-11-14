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
	mu         sync.Mutex
	extra      []*metav1.APIResourceList
	namespaces []string
	discovery  *fakediscovery.FakeDiscovery
	dynamic    *dynamicfake.FakeDynamicClient
}

func newCluster(objects ...runtime.Object) *cluster {
	kinds := map[schema.GroupVersionResource]string{}
	for _, v := range []string{"v1", "v1alpha4"} {
		kinds[gvr(v, "applications")] = "ApplicationList"
		kinds[gvr(v, "bookmarks")] = "BookmarkList"
	}
	kinds[schema.GroupVersionResource{Version: "v1", Resource: "configmaps"}] = "ConfigMapList"
	kinds[schema.GroupVersionResource{Group: "route.openshift.io", Version: "v1", Resource: "routes"}] = "RouteList"
	return &cluster{
		extra: []*metav1.APIResourceList{
			{GroupVersion: "v1", APIResources: []metav1.APIResource{
				{Name: "configmaps", Kind: "ConfigMap", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
			}},
			{GroupVersion: "route.openshift.io/v1", APIResources: []metav1.APIResource{
				{Name: "routes", Kind: "Route", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
				{Name: "routes/status", Kind: "Route", Namespaced: true, Verbs: metav1.Verbs{"get"}},
			}},
		},
		discovery: &fakediscovery.FakeDiscovery{Fake: &clienttesting.Fake{}},
		dynamic:   dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), kinds, objects...),
	}
}

// serve sets which versions of the Startpunkt resources discovery reports.
func (c *cluster) serve(versions ...string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	lists := append([]*metav1.APIResourceList{}, c.extra...)
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
		Sources:           source.Builtin(source.DefaultOptions()),
		Namespaces:        c.namespaces,
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
	eventually(t, "the initial sync", func() bool { return s.Ready() && len(s.Snapshot().Tiles) == 1 })

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

func configMap(namespace, name, url string) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "v1",
		"kind":       "ConfigMap",
		"metadata":   map[string]any{"namespace": namespace, "name": name},
		"data":       map[string]any{"url": url},
	}}
}

func route(namespace, name, host string, annotations map[string]any) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "route.openshift.io/v1",
		"kind":       "Route",
		"metadata":   map[string]any{"namespace": namespace, "name": name, "annotations": annotations},
		"spec":       map[string]any{"host": host, "tls": map[string]any{"termination": "edge"}},
	}}
}

func urlOf(s *store.Store, id string) string {
	for _, tl := range s.Snapshot().Tiles {
		if tl.ID == id {
			return tl.URL
		}
	}
	return ""
}

func TestURLFromFollowsTheReferencedObject(t *testing.T) {
	withRef := app("v1alpha4", "ns", "a", "")
	withRef.Object["spec"] = map[string]any{
		"name": "a",
		"urlFrom": map[string]any{
			"apiVersion": "v1", "kind": "ConfigMap", "name": "links", "property": "data.url",
		},
	}
	c := newCluster(withRef, configMap("ns", "other", "https://unrelated"))
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", s.Ready)
	const id = "test/applications.startpunkt.ullberg.us/ns/a"
	if got := urlOf(s, id); got != "" {
		t.Fatalf("no tile is expected before the reference exists, got %q", got)
	}

	ctx := context.Background()
	cms := c.dynamic.Resource(schema.GroupVersionResource{Version: "v1", Resource: "configmaps"}).Namespace("ns")
	if _, err := cms.Create(ctx, configMap("ns", "links", "https://one"), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the tile to appear with the reference", func() bool { return urlOf(s, id) == "https://one" })

	if _, err := cms.Update(ctx, configMap("ns", "links", "https://two"), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the tile to follow the reference", func() bool { return urlOf(s, id) == "https://two" })

	if err := cms.Delete(ctx, "links", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the tile to go with the reference", func() bool { return urlOf(s, id) == "" })
}

func TestReferenceWatchesAreReleased(t *testing.T) {
	withRef := app("v1alpha4", "ns", "a", "")
	withRef.Object["spec"] = map[string]any{
		"name": "a",
		"urlFrom": map[string]any{
			"apiVersion": "v1", "kind": "ConfigMap", "name": "links", "property": "data.url",
		},
	}
	c := newCluster(withRef, configMap("ns", "links", "https://one"))
	c.serve("v1alpha4")
	s := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	ctrl := &Controller{
		Cluster: "test", Store: s, Sources: source.Builtin(source.DefaultOptions()),
		Discovery: lockedDiscovery{c}, Dynamic: c.dynamic, DiscoveryInterval: 10 * time.Millisecond,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	go ctrl.Run(ctx)
	refs := func() int {
		ctrl.refMu.Lock()
		defer ctrl.refMu.Unlock()
		return len(ctrl.refs)
	}
	eventually(t, "the reference to be watched", func() bool { return refs() == 1 && len(s.Snapshot().Tiles) == 1 })

	apps := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace("ns")
	if _, err := apps.Update(ctx, app("v1alpha4", "ns", "a", "https://direct"), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the watch to stop when urlFrom is removed", func() bool { return refs() == 0 })

	if _, err := apps.Update(ctx, withRef, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the watch to return", func() bool { return refs() == 1 })
	if err := apps.Delete(ctx, "a", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the watch to stop when the application is deleted", func() bool { return refs() == 0 })
}

func TestAnnotatedRoutes(t *testing.T) {
	enabled := map[string]any{"startpunkt.ullberg.us/enable": "true", "startpunkt.ullberg.us/appName": "Console"}
	c := newCluster(
		route("platform", "console", "console.example.com", enabled),
		route("platform", "internal", "internal.example.com", nil),
	)
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", s.Ready)
	tiles := s.Snapshot().Tiles
	if len(tiles) != 1 {
		t.Fatalf("got %d tiles: %+v", len(tiles), tiles)
	}
	tl := tiles[0]
	if tl.ID != "test/routes.route.openshift.io/platform/console" || tl.Name != "Console" ||
		tl.URL != "https://console.example.com" || tl.Editable || tl.Source.Version != "v1" {
		t.Errorf("unexpected tile: %+v", tl)
	}

	// Annotating the second route publishes it; removing the annotation
	// takes it away again.
	routes := c.dynamic.Resource(schema.GroupVersionResource{
		Group: "route.openshift.io", Version: "v1", Resource: "routes"}).Namespace("platform")
	ctx := context.Background()
	if _, err := routes.Update(ctx, route("platform", "internal", "internal.example.com",
		map[string]any{"startpunkt.ullberg.us/enable": "true"}), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the annotated route", func() bool { return len(s.Snapshot().Tiles) == 2 })
	if _, err := routes.Update(ctx, route("platform", "internal", "internal.example.com", nil), metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the route to be withdrawn", func() bool { return len(s.Snapshot().Tiles) == 1 })
}

func TestNamespaceSelector(t *testing.T) {
	c := newCluster(
		app("v1alpha4", "team-a", "a", "https://a"),
		app("v1alpha4", "team-b", "b", "https://b"),
		app("v1alpha4", "other", "c", "https://c"),
	)
	c.namespaces = []string{"team-a", "team-b"}
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", s.Ready)
	got := versions(s)
	if len(got) != 2 || got["test/applications.startpunkt.ullberg.us/team-a/a"] == "" ||
		got["test/applications.startpunkt.ullberg.us/team-b/b"] == "" {
		t.Fatalf("unexpected tiles: %v", got)
	}

	// Changes in a namespace that is not selected are not seen.
	ctx := context.Background()
	if _, err := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace("other").
		Create(ctx, app("v1alpha4", "other", "d", "https://d"), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	if _, err := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace("team-a").
		Create(ctx, app("v1alpha4", "team-a", "e", "https://e"), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the new tile", func() bool { return len(s.Snapshot().Tiles) == 3 })
	if _, ok := versions(s)["test/applications.startpunkt.ullberg.us/other/d"]; ok {
		t.Error("an application outside the selected namespaces was read")
	}
}

func TestURLFromRetriesWhenKindAppears(t *testing.T) {
	withRef := app("v1", "ns", "a", "")
	withRef.Object["spec"] = map[string]any{"name": "a", "urlFrom": map[string]any{
		"apiVersion": "v1", "kind": "ConfigMap", "name": "links", "property": "data.url"}}
	c := newCluster(withRef, configMap("ns", "links", "https://resolved.test"))
	c.extra = nil // the target's kind is not installed at initial conversion
	c.serve("v1")
	s := c.run(t)
	eventually(t, "initial sync", s.Ready)
	if len(s.Snapshot().Tiles) != 0 {
		t.Fatal("unexpected resolved tile before target kind exists")
	}
	c.mu.Lock()
	c.extra = []*metav1.APIResourceList{{GroupVersion: "v1", APIResources: []metav1.APIResource{{Name: "configmaps", Kind: "ConfigMap", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}}}}}
	c.mu.Unlock()
	c.serve("v1")
	eventually(t, "reference to resolve without modifying its application", func() bool {
		return urlOf(s, "test/applications.startpunkt.ullberg.us/ns/a") == "https://resolved.test"
	})
}

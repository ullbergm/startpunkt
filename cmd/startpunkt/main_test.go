package main

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
	discoveryfake "k8s.io/client-go/discovery/fake"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	clienttesting "k8s.io/client-go/testing"

	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/settings"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func waitFor(t *testing.T, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !condition() {
		if time.Now().After(deadline) {
			t.Fatal("condition was not reached")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestClusterRebuildPreservesReadyStateAndRemoteFeed(t *testing.T) {
	gvr := schema.GroupVersionResource{Group: "startpunkt.ullberg.us", Version: "v1", Resource: "applications"}
	app := func(ns string) *unstructured.Unstructured {
		return &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "startpunkt.ullberg.us/v1", "kind": "Application",
			"metadata": map[string]any{"name": ns, "namespace": ns},
			"spec":     map[string]any{"name": ns, "url": "https://" + ns + ".test"},
		}}
	}
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{gvr: "ApplicationList"}, app("old"), app("new"))
	discovery := &discoveryfake.FakeDiscovery{Fake: &clienttesting.Fake{}}
	discovery.Resources = []*metav1.APIResourceList{{GroupVersion: gvr.GroupVersion().String(), APIResources: []metav1.APIResource{{Name: "applications", Kind: "Application", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}}}}}
	entered, release := make(chan struct{}), make(chan struct{})
	var enteredOnce, releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(release) })
	client.PrependReactor("list", "applications", func(action clienttesting.Action) (bool, runtime.Object, error) {
		if action.GetNamespace() == "new" {
			enteredOnce.Do(func() { close(entered) })
			<-release
		}
		return false, nil, nil
	})
	cfg := config.Default()
	cfg.Sources = config.Sources{Application: config.Source{Enabled: true}}
	cfg.NamespaceSelector = config.NamespaceSelector{MatchNames: []string{"old"}}
	cfg.Availability.Enabled = false
	cfg.Status.Enabled = false
	holder := settings.New(cfg)
	serving := store.New()
	remote := tile.Tile{ID: "remote/apps/ns/r", Cluster: "remote", Name: "remote", URL: "https://remote.test"}
	serving.SetClusterFrom("remote:r", store.Cluster{Name: "remote", State: store.StateConnected})
	serving.UpsertFrom("remote:r", remote)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		watchCluster(ctx, holder, serving, client, discovery, slog.New(slog.NewTextHandler(io.Discard, nil)))
	}()
	defer func() {
		releaseOnce.Do(func() { close(release) })
		cancel()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			t.Error("watchCluster did not stop")
		}
	}()
	has := func(name string) bool {
		for _, tl := range serving.Snapshot().Tiles {
			if tl.Name == name {
				return true
			}
		}
		return false
	}
	waitFor(t, func() bool { return serving.Ready() && has("old") })
	_, events, unsubscribe := serving.Subscribe()
	defer unsubscribe()
	cfg.NamespaceSelector.MatchNames = []string{"new"}
	holder.Set(cfg)
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("replacement did not begin listing")
	}
	if !serving.Ready() || !has("old") || !has("remote") {
		t.Fatal("rebuild interrupted the old ready state")
	}
	releaseOnce.Do(func() { close(release) })
	waitFor(t, func() bool { return has("new") && !has("old") })
	if !serving.Ready() || !has("remote") {
		t.Fatal("replacement lost readiness or remote tiles")
	}
	for {
		select {
		case batch := <-events:
			for _, e := range batch {
				if e.Type == store.EventCluster && e.Cluster.Local && e.Cluster.State != store.StateConnected {
					t.Fatalf("published incomplete replacement: %+v", e)
				}
			}
		default:
			goto drained
		}
	}
drained:
	updated := app("new")
	updated.Object["spec"].(map[string]any)["name"] = "changed"
	if _, err := client.Resource(gvr).Namespace("new").Update(ctx, updated, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	waitFor(t, func() bool { return has("changed") && !has("new") })
	if err := client.Resource(gvr).Namespace("new").Delete(ctx, "new", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	waitFor(t, func() bool { return !has("changed") })
}

// Gate outside the fake client's reactor lock, so cancelling one list does
// not prevent another generation from listing a different namespace.
type listGate struct {
	entered chan struct{}
	release chan struct{}
	once    sync.Once
}

type gatedDynamic struct {
	dynamic.Interface
	gates map[string]*listGate
}

func (d gatedDynamic) IsWatchListSemanticsUnSupported() bool { return true }

func (d gatedDynamic) Resource(gvr schema.GroupVersionResource) dynamic.NamespaceableResourceInterface {
	return gatedNamespaces{NamespaceableResourceInterface: d.Interface.Resource(gvr), gates: d.gates}
}

type gatedNamespaces struct {
	dynamic.NamespaceableResourceInterface
	gates map[string]*listGate
}

func (r gatedNamespaces) Namespace(namespace string) dynamic.ResourceInterface {
	return gatedResource{ResourceInterface: r.NamespaceableResourceInterface.Namespace(namespace), gate: r.gates[namespace]}
}

type gatedResource struct {
	dynamic.ResourceInterface
	gate *listGate
}

func (r gatedResource) List(ctx context.Context, options metav1.ListOptions) (*unstructured.UnstructuredList, error) {
	if r.gate != nil {
		r.gate.once.Do(func() { close(r.gate.entered) })
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-r.gate.release:
		}
	}
	return r.ResourceInterface.List(ctx, options)
}

func stagedClusterFixture() (config.Config, gatedDynamic, *discoveryfake.FakeDiscovery) {
	gvr := schema.GroupVersionResource{Group: "startpunkt.ullberg.us", Version: "v1", Resource: "applications"}
	var objects []runtime.Object
	for _, namespace := range []string{"old", "middle", "new"} {
		objects = append(objects, &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "startpunkt.ullberg.us/v1", "kind": "Application",
			"metadata": map[string]any{"name": namespace, "namespace": namespace},
			"spec":     map[string]any{"name": namespace, "url": "https://" + namespace + ".test"},
		}})
	}
	client := gatedDynamic{
		Interface: dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{gvr: "ApplicationList"}, objects...),
		gates:     map[string]*listGate{},
	}
	for _, namespace := range []string{"middle", "new"} {
		client.gates[namespace] = &listGate{entered: make(chan struct{}), release: make(chan struct{})}
	}
	discovery := &discoveryfake.FakeDiscovery{Fake: &clienttesting.Fake{}}
	discovery.Resources = []*metav1.APIResourceList{{GroupVersion: gvr.GroupVersion().String(), APIResources: []metav1.APIResource{{Name: "applications", Kind: "Application", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}}}}}
	cfg := config.Default()
	cfg.Sources = config.Sources{Application: config.Source{Enabled: true}}
	cfg.NamespaceSelector = config.NamespaceSelector{MatchNames: []string{"old"}}
	cfg.Availability.Enabled, cfg.Status.Enabled = false, false
	return cfg, client, discovery
}

func waitChannel(t *testing.T, ch <-chan struct{}, description string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", description)
	}
}

func hasTile(s *store.Store, name string) bool {
	for _, tl := range s.Snapshot().Tiles {
		if tl.Name == name {
			return true
		}
	}
	return false
}

func TestRapidClusterSettingsNeverPublishSupersededCandidate(t *testing.T) {
	cfg, client, discovery := stagedClusterFixture()
	holder, serving := settings.New(cfg), store.New()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		watchCluster(ctx, holder, serving, client, discovery, slog.New(slog.NewTextHandler(io.Discard, nil)))
	}()
	t.Cleanup(func() { cancel(); waitChannel(t, done, "watchCluster shutdown") })
	waitFor(t, func() bool { return serving.Ready() && hasTile(serving, "old") })
	_, events, unsubscribe := serving.Subscribe()
	defer unsubscribe()

	cfg.NamespaceSelector.MatchNames = []string{"middle"}
	holder.Set(cfg)
	waitChannel(t, client.gates["middle"].entered, "middle candidate list")
	cfg.NamespaceSelector.MatchNames = []string{"new"}
	holder.Set(cfg)
	waitChannel(t, client.gates["new"].entered, "new candidate list after cancelling middle")
	if !serving.Ready() || !hasTile(serving, "old") || hasTile(serving, "middle") {
		t.Fatal("superseding a pending candidate interrupted the active state")
	}
	// Let even the superseded list's gate open: cancellation must have
	// prevented it from ever becoming the public generation.
	close(client.gates["middle"].release)
	close(client.gates["new"].release)
	waitFor(t, func() bool { return serving.Ready() && hasTile(serving, "new") && !hasTile(serving, "old") })
	unsubscribe()
	for batch := range events {
		for _, event := range batch {
			if event.Type == store.EventUpsert && event.Tile.Name == "middle" {
				t.Fatal("superseded candidate was published")
			}
			if event.Type == store.EventCluster && event.Cluster.Local && event.Cluster.State != store.StateConnected {
				t.Fatalf("published a not-ready generation: %+v", event)
			}
		}
	}
}

func TestCancelWhileReplacementIsListing(t *testing.T) {
	cfg, client, discovery := stagedClusterFixture()
	holder, serving := settings.New(cfg), store.New()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		watchCluster(ctx, holder, serving, client, discovery, slog.New(slog.NewTextHandler(io.Discard, nil)))
	}()
	t.Cleanup(func() { cancel(); waitChannel(t, done, "watchCluster shutdown") })
	waitFor(t, func() bool { return serving.Ready() && hasTile(serving, "old") })
	cfg.NamespaceSelector.MatchNames = []string{"middle"}
	holder.Set(cfg)
	waitChannel(t, client.gates["middle"].entered, "replacement list")
	cancel()
	// The fake list blocks until its context is cancelled; its release
	// channel stays unreleased to prove shutdown does not need the initial list.
	waitChannel(t, done, "cancellation while listing")
	if !serving.Ready() || !hasTile(serving, "old") || hasTile(serving, "middle") {
		t.Fatal("cancellation published the unfinished replacement")
	}
}

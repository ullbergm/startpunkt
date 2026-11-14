package kube

import (
	"context"
	"log/slog"
	"net/url"
	"strings"
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8swatch "k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/tools/cache"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// WorkloadWatcher enriches local tiles from shared, read-only informer
// caches. It never probes an address or follows a remote's references.
// Console resource links work without the workload watches being enabled.
type WorkloadWatcher struct {
	Store      *store.Store
	Dynamic    dynamic.Interface
	Discovery  Discovery
	Cluster    string
	Namespaces []string
	Enabled    bool
	ConsoleURL string
	Log        *slog.Logger

	informers map[string]cache.SharedIndexInformer
	mu        sync.Mutex
	health    map[string]bool
	changed   chan struct{}
}

var workloadResources = []schema.GroupVersionResource{
	{Version: "v1", Resource: "services"},
	{Group: "apps", Version: "v1", Resource: "deployments"},
	{Group: "apps", Version: "v1", Resource: "statefulsets"},
}

// Run tracks source changes and changes to the workloads behind them until
// ctx is cancelled. Informer retries restore unknown readiness after an API
// outage; a failed watch never leaves a claim of ready in place.
func (w *WorkloadWatcher) Run(ctx context.Context) {
	if w.Log == nil {
		w.Log = slog.Default()
	}
	w.informers = map[string]cache.SharedIndexInformer{}
	w.health = map[string]bool{}
	w.changed = make(chan struct{}, 1)
	if w.Enabled {
		namespaces := w.Namespaces
		if len(namespaces) == 0 {
			namespaces = []string{metav1.NamespaceAll}
		}
		var synced []cache.InformerSynced
		for _, gvr := range workloadResources {
			for _, namespace := range namespaces {
				informer := w.start(ctx, gvr, namespace)
				w.informers[workloadKey(gvr.Resource, namespace)] = informer
				synced = append(synced, informer.HasSynced)
			}
		}
		go func() {
			if cache.WaitForCacheSync(ctx.Done(), synced...) {
				w.notify()
			}
		}()
	}
	for ctx.Err() == nil {
		snap, events, cancel := w.Store.Subscribe()
		w.reconcile(snap.Tiles)
	stream:
		for {
			select {
			case <-ctx.Done():
				cancel()
				return
			case <-w.changed:
				w.reconcile(w.Store.Snapshot().Tiles)
			case batch, ok := <-events:
				if !ok {
					break stream
				}
				for _, e := range batch {
					if e.Type == store.EventUpsert {
						w.enrich(e.Tile)
					}
				}
			}
		}
		cancel()
	}
}

func workloadKey(resource, namespace string) string { return resource + "/" + namespace }
func (w *WorkloadWatcher) notify() {
	select {
	case w.changed <- struct{}{}:
	default:
	}
}
func (w *WorkloadWatcher) healthy(key string, ok bool) {
	w.mu.Lock()
	changed := w.health[key] != ok
	w.health[key] = ok
	w.mu.Unlock()
	if changed {
		w.notify()
	}
}
func (w *WorkloadWatcher) start(ctx context.Context, gvr schema.GroupVersionResource, namespace string) cache.SharedIndexInformer {
	key := workloadKey(gvr.Resource, namespace)
	client := w.Dynamic.Resource(gvr).Namespace(namespace)
	lw := &cache.ListWatch{
		ListWithContextFunc: func(ctx context.Context, opts metav1.ListOptions) (runtime.Object, error) {
			obj, err := client.List(ctx, opts)
			w.healthy(key, err == nil)
			return obj, err
		},
		WatchFuncWithContext: func(ctx context.Context, opts metav1.ListOptions) (k8swatch.Interface, error) {
			stream, err := client.Watch(ctx, opts)
			w.healthy(key, err == nil)
			return stream, err
		},
	}
	informer := cache.NewSharedIndexInformer(cache.ToListWatcherWithWatchListSemantics(lw, w.Dynamic), &unstructured.Unstructured{}, 0, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	_ = informer.SetWatchErrorHandlerWithContext(func(_ context.Context, _ *cache.Reflector, err error) {
		w.healthy(key, false)
		w.Log.Warn("watching workload readiness failed, retrying", "resource", gvr.Resource, "namespace", namespace, "error", err)
	})
	_, _ = informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(any) { w.notify() }, UpdateFunc: func(any, any) { w.notify() }, DeleteFunc: func(any) { w.notify() },
	})
	go informer.RunWithContext(ctx)
	return informer
}

func (w *WorkloadWatcher) reconcile(tiles []tile.Tile) {
	for _, t := range tiles {
		w.enrich(t)
	}
}
func (w *WorkloadWatcher) enrich(t tile.Tile) {
	if t.Cluster != w.Cluster {
		return
	}
	var readiness *tile.Workload
	if w.Enabled && t.Kind == tile.KindApplication {
		readiness = w.readiness(t.WorkloadRefs)
	}
	w.Store.SetWorkload(t, ResourceConsoleURL(w.ConsoleURL, t.Source), readiness)
}

// objects returns a complete, current informer list for one namespace. A
// permission failure, disconnected watch or namespace outside the selector
// gives unknown readiness rather than using partial or stale data.
func (w *WorkloadWatcher) objects(resource, namespace string) ([]*unstructured.Unstructured, bool) {
	key := workloadKey(resource, namespace)
	informer := w.informers[key]
	if informer == nil {
		key = workloadKey(resource, metav1.NamespaceAll)
		informer = w.informers[key]
	}
	w.mu.Lock()
	healthy := w.health[key]
	w.mu.Unlock()
	if informer == nil || !informer.HasSynced() || !healthy {
		return nil, false
	}
	objects, err := informer.GetIndexer().ByIndex(cache.NamespaceIndex, namespace)
	if err != nil {
		return nil, false
	}
	var out []*unstructured.Unstructured
	for _, obj := range objects {
		if u, ok := obj.(*unstructured.Unstructured); ok && u.GetNamespace() == namespace {
			out = append(out, u)
		}
	}
	return out, true
}

func (w *WorkloadWatcher) readiness(refs []tile.WorkloadRef) *tile.Workload {
	unknown := &tile.Workload{State: "unknown"}
	if len(refs) == 0 {
		return unknown
	}
	workloads := map[tile.WorkloadRef]*unstructured.Unstructured{}
	for _, ref := range refs {
		objects, ok := w.objects(ref.Resource, ref.Namespace)
		if !ok {
			return unknown
		}
		var target *unstructured.Unstructured
		for _, obj := range objects {
			if obj.GetName() == ref.Name {
				target = obj
				break
			}
		}
		if target == nil {
			return unknown
		}
		if ref.Resource != "services" {
			workloads[ref] = target
			continue
		}
		selector, _, _ := unstructured.NestedStringMap(target.Object, "spec", "selector")
		if len(selector) == 0 {
			return unknown
		}
		matched := false
		for _, resource := range []string{"deployments", "statefulsets"} {
			objects, ok := w.objects(resource, ref.Namespace)
			if !ok {
				return unknown
			}
			for _, obj := range objects {
				templateLabels, _, _ := unstructured.NestedStringMap(obj.Object, "spec", "template", "metadata", "labels")
				if labels.SelectorFromSet(selector).Matches(labels.Set(templateLabels)) {
					matched = true
					workloads[tile.WorkloadRef{Resource: resource, Namespace: ref.Namespace, Name: obj.GetName()}] = obj
				}
			}
		}
		if !matched {
			return unknown
		}
	}
	result := &tile.Workload{State: "ready"}
	for _, obj := range workloads {
		current := workloadReadiness(obj)
		result.Ready += current.Ready
		result.Desired += current.Desired
		if current.State == "degraded" || result.State == "ready" && current.State == "starting" {
			result.State = current.State
		}
	}
	return result
}

func workloadReadiness(obj *unstructured.Unstructured) tile.Workload {
	desired, found, _ := unstructured.NestedInt64(obj.Object, "spec", "replicas")
	if !found {
		desired = 1
	}
	if desired < 0 {
		desired = 0
	}
	ready, _, _ := unstructured.NestedInt64(obj.Object, "status", "readyReplicas")
	if ready < 0 {
		ready = 0
	}
	if ready > desired {
		ready = desired
	}
	observed, _, _ := unstructured.NestedInt64(obj.Object, "status", "observedGeneration")
	state := "starting"
	if observed >= obj.GetGeneration() && ready >= desired {
		state = "ready"
	} else if ready > 0 && ready < desired {
		state = "degraded"
	}
	for _, condition := range nestedObjects(obj.Object, "status", "conditions") {
		typ, _, _ := unstructured.NestedString(condition, "type")
		status, _, _ := unstructured.NestedString(condition, "status")
		if typ == "ReplicaFailure" && status == "True" || typ == "Progressing" && status == "False" {
			state = "degraded"
		}
	}
	return tile.Workload{State: state, Ready: ready, Desired: desired}
}

// ResourceConsoleURL follows the OpenShift console's native-resource paths
// and its group~version~Kind reference for custom resources. The base is an
// operator setting, never an address derived from an untrusted service.
func ResourceConsoleURL(base string, src tile.Source) string {
	if base == "" || !tile.ValidURL(base) || src.Namespace == "" || src.Name == "" {
		return ""
	}
	u, err := url.Parse(base)
	if err != nil || u.RawQuery != "" || u.Fragment != "" {
		return ""
	}
	plural, group, _ := strings.Cut(src.Type, ".")
	if plural == "" {
		return ""
	}
	resource := ""
	switch src.Type {
	case "services", "pods", "configmaps", "secrets", "deployments.apps", "statefulsets.apps", "routes.route.openshift.io", "ingresses.networking.k8s.io":
		resource = plural
	default:
		if src.Kind == "" || src.Version == "" {
			return ""
		}
		if group == "" {
			group = "core"
		}
		resource = group + "~" + src.Version + "~" + src.Kind
	}
	return strings.TrimRight(base, "/") + "/k8s/ns/" + url.PathEscape(src.Namespace) + "/" + url.PathEscape(resource) + "/" + url.PathEscape(src.Name)
}

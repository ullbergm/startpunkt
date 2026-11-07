// Package kube watches the cluster and keeps the store in step with it.
package kube

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// DefaultDiscoveryInterval is how often the served resource types are
// re-read to notice types and versions that appear or disappear.
const DefaultDiscoveryInterval = 30 * time.Second

// Discovery is the part of the discovery client the controller uses.
type Discovery interface {
	ServerResourcesForGroupVersion(groupVersion string) (*metav1.APIResourceList, error)
}

// Controller runs one informer per source whose resource type is served, and
// writes the resulting tiles into the store.
type Controller struct {
	Cluster string
	Store   *store.Store
	Sources []source.Source
	// Namespaces limits every source to these namespaces. Empty means all.
	Namespaces        []string
	Discovery         Discovery
	Dynamic           dynamic.Interface
	DiscoveryInterval time.Duration
	Log               *slog.Logger

	mu      sync.Mutex
	watches map[string]*watch
	synced  atomic.Bool
	ctx     context.Context

	// refMu guards refs and deps. It is never held together with mu.
	refMu sync.Mutex
	refs  map[source.Ref]*refWatch
	deps  map[store.Owner][]source.Ref
}

// watch is the running informers of one source: one per watched namespace,
// or a single one for all namespaces.
type watch struct {
	src       source.Source
	version   string
	cancel    context.CancelFunc
	synced    atomic.Bool
	informers []cache.SharedIndexInformer
}

// Synced reports whether discovery has run and every informer started by it
// has delivered its initial list. Until then a snapshot may be incomplete.
func (c *Controller) Synced() bool {
	if !c.synced.Load() {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, w := range c.watches {
		if !w.synced.Load() {
			return false
		}
	}
	return true
}

// reportSynced marks the cluster as connected in the store once the initial
// sync is complete. A version switch later on does not go back to syncing,
// because the tiles of the previous version stay in place meanwhile.
func (c *Controller) reportSynced() {
	if c.Synced() {
		c.Store.SetCluster(store.Cluster{Name: c.Cluster, Local: true, State: store.StateConnected})
	}
}

// Run blocks until ctx is cancelled.
func (c *Controller) Run(ctx context.Context) {
	if c.Log == nil {
		c.Log = slog.Default()
	}
	if c.DiscoveryInterval <= 0 {
		c.DiscoveryInterval = DefaultDiscoveryInterval
	}
	// Set before any informer starts, and read-only afterwards.
	c.ctx = ctx
	c.mu.Lock()
	c.watches = map[string]*watch{}
	c.mu.Unlock()
	c.refMu.Lock()
	c.refs = map[source.Ref]*refWatch{}
	c.deps = map[store.Owner][]source.Ref{}
	c.refMu.Unlock()
	c.Store.SetCluster(store.Cluster{Name: c.Cluster, Local: true, State: store.StateSyncing})

	ticker := time.NewTicker(c.DiscoveryInterval)
	defer ticker.Stop()
	for {
		if c.reconcile(ctx) {
			c.synced.Store(true)
		}
		c.reportSynced()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// reconcile starts, switches or stops informers to match what the API server
// serves. It reports whether discovery succeeded for every source.
func (c *Controller) reconcile(ctx context.Context) bool {
	ok := true
	for _, src := range c.Sources {
		typ := source.Type(src)
		version, err := c.servedVersion(src)
		if err != nil {
			// Keep whatever is running: a failed discovery call says nothing
			// about whether the type still exists.
			c.Log.Warn("discovery failed", "type", typ, "error", err)
			ok = false
			continue
		}

		removed := false
		c.mu.Lock()
		current := c.watches[typ]
		switch {
		case current != nil && current.version == version:
			// Already watching the right version.
		case version == "":
			if current != nil {
				c.Log.Info("resource type is no longer served, removing its tiles", "type", typ)
				current.cancel()
				delete(c.watches, typ)
				removed = true
			}
		default:
			if current != nil {
				c.Log.Info("switching watched version",
					"type", typ, "from", current.version, "to", version)
				current.cancel()
			} else {
				c.Log.Info("watching resource type", "type", typ, "version", version)
			}
			c.watches[typ] = c.start(ctx, src, version)
		}
		c.mu.Unlock()
		if removed {
			c.Store.Retain(c.Cluster, typ, func(store.Owner) bool { return false })
			c.releaseType(typ)
		}
	}
	return ok
}

// servedVersion returns the most preferred version of the source's resource
// that the API server serves with list and watch, or "" when there is none.
func (c *Controller) servedVersion(src source.Source) (string, error) {
	for _, version := range src.Versions() {
		gv := schema.GroupVersion{Group: src.Group(), Version: version}
		list, err := c.Discovery.ServerResourcesForGroupVersion(gv.String())
		if apierrors.IsNotFound(err) {
			continue
		}
		if err != nil {
			return "", err
		}
		for _, r := range list.APIResources {
			if r.Name == src.Resource() && hasVerbs(r.Verbs, "list", "watch") {
				return version, nil
			}
		}
	}
	return "", nil
}

func hasVerbs(have []string, want ...string) bool {
	set := make(map[string]bool, len(have))
	for _, v := range have {
		set[v] = true
	}
	for _, v := range want {
		if !set[v] {
			return false
		}
	}
	return true
}

// start runs the informers for one version of a source. Called with c.mu
// held.
func (c *Controller) start(ctx context.Context, src source.Source, version string) *watch {
	ctx, cancel := context.WithCancel(ctx)
	w := &watch{src: src, version: version, cancel: cancel}
	typ := source.Type(src)
	gvr := schema.GroupVersionResource{Group: src.Group(), Version: version, Resource: src.Resource()}
	log := c.Log.With("type", typ, "version", version)

	apply := func(obj any) {
		if u, ok := obj.(*unstructured.Unstructured); ok {
			c.apply(src, version, u)
		}
	}
	handler := cache.ResourceEventHandlerFuncs{
		AddFunc:    apply,
		UpdateFunc: func(_, obj any) { apply(obj) },
		DeleteFunc: func(obj any) {
			if tomb, ok := obj.(cache.DeletedFinalStateUnknown); ok {
				obj = tomb.Obj
			}
			if u, ok := obj.(*unstructured.Unstructured); ok {
				owner := c.owner(typ, u)
				c.Store.Delete(owner)
				c.setDeps(owner, nil)
			}
		},
	}

	namespaces := c.Namespaces
	if len(namespaces) == 0 {
		namespaces = []string{metav1.NamespaceAll}
	}
	synced := make([]cache.InformerSynced, 0, len(namespaces))
	for _, namespace := range namespaces {
		informer := dynamicinformer.NewFilteredDynamicInformer(
			c.Dynamic, gvr, namespace, 0, cache.Indexers{}, nil).Informer()
		_ = informer.SetWatchErrorHandlerWithContext(
			func(_ context.Context, _ *cache.Reflector, err error) {
				log.Warn("watch failed, retrying", "namespace", namespace, "error", err)
			})
		_, _ = informer.AddEventHandler(handler)
		w.informers = append(w.informers, informer)
		synced = append(synced, informer.HasSynced)
		go informer.RunWithContext(ctx)
	}

	go func() {
		if !cache.WaitForCacheSync(ctx.Done(), synced...) {
			return
		}
		// Drop tiles of objects that were deleted while this type was not
		// being watched, for example across a version switch.
		present := map[store.Owner]bool{}
		for _, informer := range w.informers {
			for _, obj := range informer.GetStore().List() {
				if u, ok := obj.(*unstructured.Unstructured); ok {
					present[c.owner(typ, u)] = true
				}
			}
		}
		c.Store.Retain(c.Cluster, typ, func(o store.Owner) bool { return present[o] })
		w.synced.Store(true)
		log.Info("initial list complete", "objects", len(present))
		c.reportSynced()
	}()
	return w
}

func (c *Controller) owner(typ string, obj *unstructured.Unstructured) store.Owner {
	return store.Owner{
		Cluster:   c.Cluster,
		Type:      typ,
		Namespace: obj.GetNamespace(),
		Name:      obj.GetName(),
	}
}

// apply converts one object and writes its tiles to the store. An object
// that cannot be converted loses its tiles and is logged; other objects are
// not affected.
func (c *Controller) apply(src source.Source, version string, obj *unstructured.Unstructured) {
	typ := source.Type(src)
	owner := c.owner(typ, obj)
	var used []source.Ref
	tiles, err := src.Tiles(obj, func(ref source.Ref) (*unstructured.Unstructured, error) {
		used = append(used, ref)
		return c.lookup(owner, ref)
	})
	c.setDeps(owner, used)
	if err != nil {
		c.Log.Warn("skipping object",
			"type", typ, "namespace", owner.Namespace, "name", owner.Name, "error", err)
		c.Store.Delete(owner)
		return
	}
	ref := tile.Source{Type: typ, Version: version, Namespace: owner.Namespace, Name: owner.Name}
	for i := range tiles {
		tiles[i].ID = tile.ID(c.Cluster, ref, i)
		tiles[i].Cluster = c.Cluster
		tiles[i].Source = ref
		if tiles[i].Tags == nil {
			tiles[i].Tags = []string{}
		}
	}
	c.Store.Set(owner, tiles)
}

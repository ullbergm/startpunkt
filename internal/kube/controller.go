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
	// WriteStatus keeps the status of Application resources up to date.
	WriteStatus bool
	Log         *slog.Logger

	mu      sync.Mutex
	watches map[string]*watch
	synced  atomic.Bool
	ctx     context.Context
	status  *statusWriter

	// life lets Close wait for conversions that are under way and turn
	// later ones away.
	life   sync.RWMutex
	closed bool

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
	// gate serializes invalidation with final mutations, without waiting for
	// a slow conversion to finish before the replacement watcher can start.
	gate   sync.RWMutex
	active bool
}

func (w *watch) stop() {
	w.gate.Lock()
	w.active = false
	w.cancel()
	w.gate.Unlock()
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

// Close makes the controller stop writing to the store. Call it after the
// context passed to Run has been cancelled: informers may still deliver a
// last event after that, and it must not land in a store that has since
// been cleared for another reading of the cluster.
func (c *Controller) Close() {
	c.life.Lock()
	c.closed = true
	c.life.Unlock()
	c.mu.Lock()
	for _, w := range c.watches {
		w.stop()
	}
	c.mu.Unlock()
}

// reportSynced marks the cluster as connected in the store once the initial
// sync is complete. A version switch later on does not go back to syncing,
// because the tiles of the previous version stay in place meanwhile.
func (c *Controller) reportSynced() {
	c.life.RLock()
	defer c.life.RUnlock()
	if c.closed {
		return
	}
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
	if c.WriteStatus {
		c.status = newStatusWriter(c)
		go c.status.run(ctx)
	}
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
		c.retryUnwatchedRefs()
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
				current.stop()
				delete(c.watches, typ)
				removed = true
			}
		default:
			if current != nil {
				c.Log.Info("switching watched version",
					"type", typ, "from", current.version, "to", version)
				current.stop()
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
	w := &watch{src: src, version: version, cancel: cancel, active: true}
	typ := source.Type(src)
	gvr := schema.GroupVersionResource{Group: src.Group(), Version: version, Resource: src.Resource()}
	log := c.Log.With("type", typ, "version", version)

	apply := func(obj any) {
		if u, ok := obj.(*unstructured.Unstructured); ok {
			c.apply(w, u)
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
				c.life.RLock()
				defer c.life.RUnlock()
				if c.closed {
					return
				}
				w.gate.RLock()
				defer w.gate.RUnlock()
				if !w.active {
					return
				}
				owner := c.owner(typ, u)
				c.Store.Delete(owner)
				c.setDeps(owner, nil)
				if c.status != nil && typ == statusType {
					c.status.forget(owner)
				}
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
		registration, _ := informer.AddEventHandler(handler)
		w.informers = append(w.informers, informer)
		// Cache sync alone can precede delivery to our handler. Readiness
		// requires every initial conversion to have reached the staging store.
		synced = append(synced, registration.HasSynced)
		go informer.RunWithContext(ctx)
	}

	go func() {
		if !cache.WaitForCacheSync(ctx.Done(), synced...) {
			return
		}
		// Drop tiles of objects that were deleted while this type was not
		// being watched, for example across a version switch.
		w.gate.Lock()
		if !w.active {
			w.gate.Unlock()
			return
		}
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
		w.gate.Unlock()
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
func (c *Controller) apply(w *watch, obj *unstructured.Unstructured) {
	src, version := w.src, w.version
	c.life.RLock()
	defer c.life.RUnlock()
	if c.closed {
		return
	}
	typ := source.Type(src)
	owner := c.owner(typ, obj)
	var used []source.Ref
	tiles, err := src.Tiles(obj, func(ref source.Ref) (*unstructured.Unstructured, error) {
		used = append(used, ref)
		return c.lookup(w, owner, ref)
	})
	w.gate.RLock()
	defer w.gate.RUnlock()
	if !w.active {
		c.discardDeps(w, owner, used)
		return
	}
	c.setDeps(owner, used)
	if c.status != nil && typ == statusType {
		// Reported after the store is updated below, so the status is
		// built from the new tiles.
		res := resolution{generation: obj.GetGeneration()}
		if err != nil {
			res.reason, res.message = reasonInvalid, err.Error()
		}
		defer c.status.resolved(owner, res)
	}
	if err != nil {
		c.Log.Warn("skipping object",
			"type", typ, "namespace", owner.Namespace, "name", owner.Name, "error", err)
		c.Store.Delete(owner)
		return
	}
	ref := tile.Source{Type: typ, Version: version, Kind: obj.GetKind(), Namespace: owner.Namespace, Name: owner.Name}
	for i := range tiles {
		tiles[i].ID = tile.ID(c.Cluster, ref, i)
		tiles[i].Cluster = c.Cluster
		tiles[i].Source = ref
		tiles[i].WorkloadRefs = WorkloadReferences(obj, typ, tiles[i].URL)
		if tiles[i].Tags == nil {
			tiles[i].Tags = []string{}
		}
	}
	c.Store.Set(owner, tiles)
}

package kube

import (
	"context"
	"fmt"
	"slices"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
)

// refWatch watches one object that tiles are derived from without it being
// a source object itself, such as the target of an Application's urlFrom.
type refWatch struct {
	gvr        schema.GroupVersionResource
	namespaced bool
	informer   cache.SharedIndexInformer
	cancel     context.CancelFunc
	dependents map[store.Owner]bool
}

// lookup returns the object a reference points at, or nil when it does not
// exist, and from then on converts owner again whenever that object changes.
func (c *Controller) lookup(owner store.Owner, ref source.Ref) (*unstructured.Unstructured, error) {
	c.refMu.Lock()
	rw := c.refs[ref]
	if rw == nil {
		gvr, namespaced, err := c.resourceFor(ref)
		if err != nil {
			c.refMu.Unlock()
			return nil, err
		}
		namespace := ref.Namespace
		if !namespaced {
			namespace = metav1.NamespaceAll
		}
		rw = c.startRef(ref, gvr, namespace)
		rw.namespaced = namespaced
		c.refs[ref] = rw
	}
	rw.dependents[owner] = true
	c.refMu.Unlock()

	if rw.informer.HasSynced() {
		for _, obj := range rw.informer.GetStore().List() {
			if u, ok := obj.(*unstructured.Unstructured); ok && u.GetName() == ref.Name {
				return u, nil
			}
		}
		return nil, nil
	}
	// The watch has only just been started. Read the object directly so the
	// first conversion does not have to wait for it.
	var obj *unstructured.Unstructured
	var err error
	if rw.namespaced {
		obj, err = c.Dynamic.Resource(rw.gvr).Namespace(ref.Namespace).Get(c.ctx, ref.Name, metav1.GetOptions{})
	} else {
		obj, err = c.Dynamic.Resource(rw.gvr).Get(c.ctx, ref.Name, metav1.GetOptions{})
	}
	if apierrors.IsNotFound(err) {
		return nil, nil
	}
	return obj, err
}

// resourceFor finds the resource that serves a reference's kind.
func (c *Controller) resourceFor(ref source.Ref) (schema.GroupVersionResource, bool, error) {
	gv, err := schema.ParseGroupVersion(ref.APIVersion)
	if err != nil {
		return schema.GroupVersionResource{}, false, err
	}
	list, err := c.Discovery.ServerResourcesForGroupVersion(ref.APIVersion)
	if err != nil {
		return schema.GroupVersionResource{}, false,
			fmt.Errorf("API version %s is not available: %w", ref.APIVersion, err)
	}
	for _, r := range list.APIResources {
		if strings.EqualFold(r.Kind, ref.Kind) && !strings.Contains(r.Name, "/") {
			return gv.WithResource(r.Name), r.Namespaced, nil
		}
	}
	return schema.GroupVersionResource{}, false,
		fmt.Errorf("kind %s is not part of API version %s", ref.Kind, ref.APIVersion)
}

// startRef watches a single object by name. Called with refMu held.
func (c *Controller) startRef(ref source.Ref, gvr schema.GroupVersionResource, namespace string) *refWatch {
	ctx, cancel := context.WithCancel(c.ctx)
	selector := fields.OneTermEqualSelector("metadata.name", ref.Name).String()
	informer := dynamicinformer.NewFilteredDynamicInformer(
		c.Dynamic, gvr, namespace, 0, cache.Indexers{},
		func(o *metav1.ListOptions) { o.FieldSelector = selector }).Informer()
	rw := &refWatch{gvr: gvr, informer: informer, cancel: cancel, dependents: map[store.Owner]bool{}}
	log := c.Log.With("kind", ref.Kind, "namespace", ref.Namespace, "name", ref.Name)
	_ = informer.SetWatchErrorHandlerWithContext(
		func(_ context.Context, _ *cache.Reflector, err error) {
			log.Warn("watching a referenced object failed, retrying", "error", err)
		})
	changed := func(obj any) {
		if tomb, ok := obj.(cache.DeletedFinalStateUnknown); ok {
			obj = tomb.Obj
		}
		// The fake client used in tests ignores field selectors.
		if u, ok := obj.(*unstructured.Unstructured); !ok || u.GetName() != ref.Name {
			return
		}
		c.refMu.Lock()
		owners := make([]store.Owner, 0, len(rw.dependents))
		for owner := range rw.dependents {
			owners = append(owners, owner)
		}
		c.refMu.Unlock()
		for _, owner := range owners {
			c.reapply(owner)
		}
	}
	_, _ = informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    changed,
		UpdateFunc: func(_, obj any) { changed(obj) },
		DeleteFunc: changed,
	})
	go informer.RunWithContext(ctx)
	return rw
}

// reapply converts the source object of owner again, if it still exists.
func (c *Controller) reapply(owner store.Owner) {
	c.mu.Lock()
	w := c.watches[owner.Type]
	c.mu.Unlock()
	if obj, _ := c.current(owner); obj != nil && w != nil {
		c.apply(w.src, w.version, obj)
	}
}

// setDeps records which references owner used in its last conversion and
// stops watching the ones nothing uses any more.
func (c *Controller) setDeps(owner store.Owner, used []source.Ref) {
	c.refMu.Lock()
	defer c.refMu.Unlock()
	for _, ref := range c.deps[owner] {
		if slices.Contains(used, ref) {
			continue
		}
		if rw := c.refs[ref]; rw != nil {
			delete(rw.dependents, owner)
			if len(rw.dependents) == 0 {
				rw.cancel()
				delete(c.refs, ref)
			}
		}
	}
	if len(used) == 0 {
		delete(c.deps, owner)
	} else {
		c.deps[owner] = used
	}
}

// releaseType drops the references of every owner of a resource type that
// is no longer watched.
func (c *Controller) releaseType(typ string) {
	c.refMu.Lock()
	var owners []store.Owner
	for owner := range c.deps {
		if owner.Type == typ {
			owners = append(owners, owner)
		}
	}
	c.refMu.Unlock()
	for _, owner := range owners {
		c.setDeps(owner, nil)
	}
}

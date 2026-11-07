package kube

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/store"
)

// statusType is the only resource type that has a status written.
const statusType = apiv1.ApplicationResource + "." + apiv1.Group

// resolution is the outcome of converting one Application.
type resolution struct {
	generation int64
	// reason and message describe why there is no tile. Both are empty
	// when there is one.
	reason  string
	message string
}

// statusWriter keeps the status of Application resources in step with what
// the controller and the prober know. Writes are best-effort: nothing else
// depends on them.
type statusWriter struct {
	c *Controller

	mu      sync.Mutex
	known   map[store.Owner]resolution
	pending map[store.Owner]bool
	wake    chan struct{}
	// stopped names the watched version for which writing was given up,
	// because the API server drops or refuses the status. A switch to
	// another version tries again.
	stopped string
}

func newStatusWriter(c *Controller) *statusWriter {
	return &statusWriter{
		c:       c,
		known:   map[store.Owner]resolution{},
		pending: map[store.Owner]bool{},
		wake:    make(chan struct{}, 1),
	}
}

// resolved records the outcome of a conversion and schedules a write.
func (w *statusWriter) resolved(owner store.Owner, r resolution) {
	w.mu.Lock()
	w.known[owner] = r
	w.mu.Unlock()
	w.enqueue(owner)
}

func (w *statusWriter) forget(owner store.Owner) {
	w.mu.Lock()
	delete(w.known, owner)
	delete(w.pending, owner)
	w.mu.Unlock()
}

func (w *statusWriter) enqueue(owner store.Owner) {
	w.mu.Lock()
	w.pending[owner] = true
	w.mu.Unlock()
	select {
	case w.wake <- struct{}{}:
	default:
	}
}

// run writes pending statuses until ctx is cancelled. Probe results reach
// it through the store's events.
func (w *statusWriter) run(ctx context.Context) {
	for ctx.Err() == nil {
		_, events, cancel := w.c.Store.Subscribe()
		// Results may have been missed while not subscribed.
		w.mu.Lock()
		for owner := range w.known {
			w.pending[owner] = true
		}
		w.mu.Unlock()
		w.flush(ctx)
	loop:
		for {
			select {
			case <-ctx.Done():
				cancel()
				return
			case <-w.wake:
			case batch, ok := <-events:
				if !ok {
					break loop
				}
				for _, e := range batch {
					if e.Type == store.EventUpsert && e.Tile.Source.Type == statusType &&
						e.Tile.Cluster == w.c.Cluster {
						w.mu.Lock()
						w.pending[store.Owner{
							Cluster: w.c.Cluster, Type: statusType,
							Namespace: e.Tile.Source.Namespace, Name: e.Tile.Source.Name,
						}] = true
						w.mu.Unlock()
					}
				}
			}
			w.flush(ctx)
		}
		cancel()
	}
}

func (w *statusWriter) flush(ctx context.Context) {
	w.mu.Lock()
	owners := make([]store.Owner, 0, len(w.pending))
	for owner := range w.pending {
		owners = append(owners, owner)
	}
	w.pending = map[store.Owner]bool{}
	w.mu.Unlock()
	for _, owner := range owners {
		if ctx.Err() != nil {
			return
		}
		w.write(ctx, owner)
	}
}

// write patches the status of one Application if it differs from what the
// object already says.
func (w *statusWriter) write(ctx context.Context, owner store.Owner) {
	w.mu.Lock()
	res, ok := w.known[owner]
	stopped := w.stopped
	w.mu.Unlock()
	if !ok {
		return
	}
	obj, version := w.c.current(owner)
	if obj == nil || version == stopped || obj.GetGeneration() != res.generation {
		// Gone, not writable, or about to be converted again.
		return
	}

	var current apiv1.ApplicationStatus
	if raw, found, _ := unstructured.NestedMap(obj.Object, "status"); found {
		_ = runtime.DefaultUnstructuredConverter.FromUnstructured(raw, &current)
	}
	desired := w.desired(owner, res, current)
	if statusEqual(current, desired) {
		return
	}

	body, err := json.Marshal(map[string]any{"status": desired})
	if err != nil {
		return
	}
	gvr := schema.GroupVersionResource{Group: apiv1.Group, Version: version, Resource: apiv1.ApplicationResource}
	updated, err := w.c.Dynamic.Resource(gvr).Namespace(owner.Namespace).
		Patch(ctx, owner.Name, types.MergePatchType, body, metav1.PatchOptions{}, "status")
	log := w.c.Log.With("namespace", owner.Namespace, "name", owner.Name, "version", version)
	switch {
	case apierrors.IsNotFound(err) && w.c.exists(owner):
		w.stop(version, "the custom resource definition has no status subresource")
	case apierrors.IsNotFound(err):
		// Deleted in the meantime.
	case apierrors.IsForbidden(err):
		w.stop(version, "the service account may not patch applications/status")
	case err != nil:
		log.Warn("writing status failed", "error", err)
	default:
		if _, kept, _ := unstructured.NestedSlice(updated.Object, "status", "conditions"); !kept {
			// The 4.x definitions declare an empty status, so the API
			// server prunes every field. Availability is then visible in
			// the API and the page only.
			w.stop(version, "the custom resource definition does not declare the status fields")
		}
	}
}

// stop gives up writing for one version and says so once.
func (w *statusWriter) stop(version, why string) {
	w.mu.Lock()
	already := w.stopped == version
	w.stopped = version
	w.mu.Unlock()
	if !already {
		w.c.Log.Info("not writing Application status: "+why, "version", version)
	}
}

// desired builds the status from the conversion outcome and the tile in the
// store. Transition times are carried over from the current status while a
// condition keeps its value.
func (w *statusWriter) desired(owner store.Owner, res resolution, current apiv1.ApplicationStatus) apiv1.ApplicationStatus {
	var out apiv1.ApplicationStatus
	now := time.Now().UTC().Format(time.RFC3339)
	condition := func(typ, status, reason, message string) apiv1.Condition {
		c := apiv1.Condition{
			Type: typ, Status: status, Reason: reason, Message: message,
			LastTransitionTime: now, ObservedGeneration: res.generation,
		}
		for _, old := range current.Conditions {
			if old.Type == typ && old.Status == status && old.LastTransitionTime != "" {
				c.LastTransitionTime = old.LastTransitionTime
			}
		}
		return c
	}

	tiles := w.c.Store.Owned(owner)
	if res.reason != "" || len(tiles) == 0 {
		reason, message := res.reason, res.message
		if reason == "" {
			reason, message = reasonNoTile, "The application is disabled or has no URL."
		}
		status := "False"
		if reason == reasonNoTile {
			// Nothing is wrong with the spec; there is just nothing to show.
			status = "True"
		}
		out.Conditions = []apiv1.Condition{
			condition(apiv1.ConditionResolved, status, reason, message),
			condition(apiv1.ConditionAvailable, "Unknown", "NotProbed", "There is no URL to probe."),
		}
		return out
	}

	t := tiles[0]
	out.URL = t.URL
	out.Available = t.Available
	available := condition(apiv1.ConditionAvailable, "Unknown", "NotProbed", "The URL has not been probed.")
	if t.Available != nil && *t.Available {
		available = condition(apiv1.ConditionAvailable, "True", "Responding", "The URL answered the last probe.")
	} else if t.Available != nil {
		available = condition(apiv1.ConditionAvailable, "False", "NotResponding",
			"The URL did not answer the last probe, or answered with a server error.")
	}
	out.Conditions = []apiv1.Condition{
		condition(apiv1.ConditionResolved, "True", "Resolved", "The application has a tile."),
		available,
	}
	return out
}

const (
	reasonNoTile  = "NoTile"
	reasonInvalid = "Invalid"
)

// statusEqual compares what matters. Transition times follow from the rest.
func statusEqual(a, b apiv1.ApplicationStatus) bool {
	if a.URL != b.URL || (a.Available == nil) != (b.Available == nil) ||
		(a.Available != nil && *a.Available != *b.Available) || len(a.Conditions) != len(b.Conditions) {
		return false
	}
	for i := range a.Conditions {
		x, y := a.Conditions[i], b.Conditions[i]
		if x.Type != y.Type || x.Status != y.Status || x.Reason != y.Reason ||
			x.Message != y.Message || x.ObservedGeneration != y.ObservedGeneration {
			return false
		}
	}
	return true
}

// current returns the watched copy of an owner's source object and the
// version it is watched at, or nil when it is not there.
func (c *Controller) current(owner store.Owner) (*unstructured.Unstructured, string) {
	c.mu.Lock()
	w := c.watches[owner.Type]
	c.mu.Unlock()
	if w == nil {
		return nil, ""
	}
	key := owner.Name
	if owner.Namespace != "" {
		key = owner.Namespace + "/" + owner.Name
	}
	for _, informer := range w.informers {
		if obj, exists, err := informer.GetStore().GetByKey(key); err == nil && exists {
			if u, ok := obj.(*unstructured.Unstructured); ok {
				return u, w.version
			}
		}
	}
	return nil, w.version
}

func (c *Controller) exists(owner store.Owner) bool {
	obj, _ := c.current(owner)
	return obj != nil
}

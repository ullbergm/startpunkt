package kube

import (
	"context"
	"encoding/json"
	"github.com/ullbergm/startpunkt/internal/metrics"
	"log/slog"
	"sync"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/store"
)

// RemoteStatusWriter keeps the status of the Remote resources in one
// namespace in step with what the process that follows the remotes reports.
// That process may be another one, without access to the cluster, so the
// reports are handed in through Report.
//
// Writes are best-effort: nothing else depends on them.
type RemoteStatusWriter struct {
	Dynamic   dynamic.Interface
	Namespace string
	Log       *slog.Logger
	// Expiry is how long a report is believed. When no newer one has come
	// by then, every remote's connection is reported as unknown. It must
	// exceed the interval between reports.
	Expiry time.Duration

	mu      sync.Mutex
	reports map[string]follow.RemoteReport
	wake    chan struct{}
	stopped bool
}

// Report hands in the state of every remote that is being followed.
func (w *RemoteStatusWriter) Report(reports []follow.RemoteReport) {
	byName := make(map[string]follow.RemoteReport, len(reports))
	for _, r := range reports {
		byName[r.Name] = r
	}
	w.mu.Lock()
	w.reports = byName
	if w.wake == nil {
		w.wake = make(chan struct{}, 1)
	}
	wake := w.wake
	w.mu.Unlock()
	select {
	case wake <- struct{}{}:
	default:
	}
}

// Run blocks until ctx is cancelled.
func (w *RemoteStatusWriter) Run(ctx context.Context) {
	if w.Log == nil {
		w.Log = slog.Default()
	}
	if w.Expiry <= 0 {
		w.Expiry = 3 * follow.DefaultReportInterval
	}
	w.mu.Lock()
	if w.wake == nil {
		w.wake = make(chan struct{}, 1)
	}
	wake := w.wake
	w.mu.Unlock()
	expired := time.NewTimer(w.Expiry)
	defer expired.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-wake:
			expired.Reset(w.Expiry)
		case <-expired.C:
			// Nobody is reporting: what the statuses say may no longer
			// be true.
			w.mu.Lock()
			w.reports = nil
			w.mu.Unlock()
		}
		w.writeAll(ctx)
	}
}

// writeAll brings the status of every Remote resource up to date. One that
// no report mentions is not being followed, as far as is known here.
func (w *RemoteStatusWriter) writeAll(ctx context.Context) {
	w.mu.Lock()
	reports, stopped := w.reports, w.stopped
	w.mu.Unlock()
	if stopped {
		return
	}
	list, err := w.Dynamic.Resource(remoteGVR).Namespace(w.Namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if !apierrors.IsNotFound(err) && ctx.Err() == nil {
			w.Log.Warn("listing the remotes failed", "error", err)
		}
		return
	}
	for i := range list.Items {
		if ctx.Err() != nil {
			return
		}
		resource := &list.Items[i]
		report, reported := reports[resource.GetName()]
		w.write(ctx, resource, report, reported)
	}
}

func (w *RemoteStatusWriter) write(ctx context.Context, resource *unstructured.Unstructured, report follow.RemoteReport, reported bool) {
	var current apiv1.RemoteStatus
	if raw, found, _ := unstructured.NestedMap(resource.Object, "status"); found {
		_ = runtime.DefaultUnstructuredConverter.FromUnstructured(raw, &current)
	}
	status, reason, message := "Unknown", "NoReport", "Nothing has reported on this remote yet."
	// Without a report the tile count is left as it was.
	tiles := current.Tiles
	lastSeen, staleSince := current.LastSeen, current.StaleSince
	if reported {
		lastSeen, staleSince = report.LastSeen, report.StaleSince
		count := int32(report.Tiles)
		tiles = &count
		switch report.State {
		case store.StateConnected:
			status, reason, message = "True", "Connected", "The remote's tiles are received as they change."
		case store.StateSyncing:
			status, reason, message = "False", "Connecting", "The remote has not been reached yet."
		default:
			status, reason, message = "False", "Unreachable", "The remote cannot be reached; its last known tiles are shown."
		}
		if report.Problem != "" && status != "True" {
			message += " Last error: " + report.Problem
		}
	}

	since := time.Now().UTC().Format(time.RFC3339)
	for _, c := range current.Conditions {
		if c.Type != apiv1.ConditionConnected {
			continue
		}
		sameTiles := (tiles == nil) == (current.Tiles == nil) && (tiles == nil || *tiles == *current.Tiles)
		if c.Status == status && c.Reason == reason && c.Message == message &&
			c.ObservedGeneration == resource.GetGeneration() && sameTiles && current.LastSeen == lastSeen && current.StaleSince == staleSince {
			return
		}
		if c.Status == status && c.LastTransitionTime != "" {
			since = c.LastTransitionTime
		}
	}
	statusDoc := map[string]any{
		"tiles":      tiles,
		"lastSeen":   nil,
		"staleSince": nil,
		"conditions": []apiv1.Condition{{Type: apiv1.ConditionConnected, Status: status, Reason: reason, Message: message, LastTransitionTime: since, ObservedGeneration: resource.GetGeneration()}},
	}
	// Merge-patch omission preserves old keys. Explicit null removes a stale
	// timestamp on recovery instead of leaving the old value in Kubernetes.
	if lastSeen != "" {
		statusDoc["lastSeen"] = lastSeen
	}
	if staleSince != "" {
		statusDoc["staleSince"] = staleSince
	}
	body, _ := json.Marshal(map[string]any{"status": statusDoc})
	updated, err := w.Dynamic.Resource(remoteGVR).Namespace(w.Namespace).
		Patch(ctx, resource.GetName(), types.MergePatchType, body, metav1.PatchOptions{}, "status")
	if err != nil && ctx.Err() == nil {
		metrics.Inc("startpunkt_status_errors_total")
	}
	switch {
	case apierrors.IsForbidden(err):
		w.stop("the service account may not patch remotes/status")
	case apierrors.IsNotFound(err):
		// Deleted in the meantime, or the definition is an older one
		// without a status. The next step tells which.
		if _, getErr := w.Dynamic.Resource(remoteGVR).Namespace(w.Namespace).
			Get(ctx, resource.GetName(), metav1.GetOptions{}); getErr == nil {
			w.stop("the custom resource definition has no status subresource; update the definitions")
		}
	case err != nil:
		if ctx.Err() == nil {
			w.Log.Warn("writing the status of a remote failed", "remote", resource.GetName(), "error", err)
		}
	default:
		if _, kept, _ := unstructured.NestedSlice(updated.Object, "status", "conditions"); !kept {
			w.stop("the custom resource definition does not declare the status; update the definitions")
		}
	}
}

// stop gives up writing and says so once. Writing starts again when the
// process is restarted after the cause is fixed.
func (w *RemoteStatusWriter) stop(why string) {
	w.mu.Lock()
	already := w.stopped
	w.stopped = true
	w.mu.Unlock()
	if !already {
		w.Log.Info("not writing Remote status: " + why)
	}
}

package kube

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/ullbergm/startpunkt/internal/metrics"
	"log/slog"
	"sort"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/settings"
)

// ConfigWatcher keeps the settings in step with the Startpunkt resource of
// the given name and the Remote resources, all in one namespace.
//
// Base is the configuration from the environment and the file. The
// resources are applied on top of it, so anything they leave out comes from
// there, and when there are no resources at all Base is what is in use.
// Settings that are not valid are not applied: the instance carries on with
// the last valid ones and says so in the resource's status.
type ConfigWatcher struct {
	Base      config.Config
	Holder    *settings.Holder
	Dynamic   dynamic.Interface
	Discovery Discovery
	Namespace string
	Name      string
	Log       *slog.Logger
	// Interval is how often to look for the resource types while they are
	// not installed.
	Interval time.Duration
}

var (
	startpunktGVR = schema.GroupVersionResource{Group: apiv1.Group, Version: apiv1.Version, Resource: apiv1.StartpunktResource}
	remoteGVR     = schema.GroupVersionResource{Group: apiv1.Group, Version: apiv1.Version, Resource: apiv1.RemoteResource}
)

// Run blocks until ctx is cancelled.
func (w *ConfigWatcher) Run(ctx context.Context) {
	if w.Log == nil {
		w.Log = slog.Default()
	}
	if w.Interval <= 0 {
		w.Interval = DefaultDiscoveryInterval
	}
	// The resource types may not be installed, now or ever. That is a
	// supported way to run: the environment then holds the settings.
	said := false
	for !w.served() {
		if !said {
			w.Log.Info("the Startpunkt and Remote resource types are not installed; using the settings from the environment")
			said = true
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(w.Interval):
		}
	}
	w.Log.Info("reading settings from resources", "namespace", w.Namespace, "startpunkt", w.Name)

	changed := make(chan struct{}, 1)
	notify := func(any) {
		select {
		case changed <- struct{}{}:
		default:
		}
	}
	handler := cache.ResourceEventHandlerFuncs{
		AddFunc: notify, UpdateFunc: func(_, obj any) { notify(obj) }, DeleteFunc: notify,
	}
	selector := fields.OneTermEqualSelector("metadata.name", w.Name).String()
	own := dynamicinformer.NewFilteredDynamicInformer(w.Dynamic, startpunktGVR, w.Namespace, 0, cache.Indexers{},
		func(o *metav1.ListOptions) { o.FieldSelector = selector }).Informer()
	remotes := dynamicinformer.NewFilteredDynamicInformer(w.Dynamic, remoteGVR, w.Namespace, 0, cache.Indexers{}, nil).Informer()
	for name, informer := range map[string]cache.SharedIndexInformer{"startpunkts": own, "remotes": remotes} {
		_ = informer.SetWatchErrorHandlerWithContext(func(_ context.Context, _ *cache.Reflector, err error) {
			metrics.Inc("startpunkt_settings_errors_total")
			w.Log.Warn("watching settings failed, retrying", "resource", name, "error", err)
		})
		_, _ = informer.AddEventHandler(handler)
		go informer.RunWithContext(ctx)
	}
	if !cache.WaitForCacheSync(ctx.Done(), own.HasSynced, remotes.HasSynced) {
		return
	}
	for {
		w.apply(ctx, own.GetStore(), remotes.GetStore())
		select {
		case <-ctx.Done():
			return
		case <-changed:
		}
	}
}

// served reports whether the API server serves both resource types.
func (w *ConfigWatcher) served() bool {
	list, err := w.Discovery.ServerResourcesForGroupVersion(startpunktGVR.GroupVersion().String())
	if err != nil {
		return false
	}
	found := map[string]bool{}
	for _, r := range list.APIResources {
		found[r.Name] = true
	}
	return found[apiv1.StartpunktResource] && found[apiv1.RemoteResource]
}

// apply builds the configuration from what the stores hold and puts it to
// use if it is valid.
func (w *ConfigWatcher) apply(ctx context.Context, own, remoteStore cache.Store) {
	var resource *unstructured.Unstructured
	for _, obj := range own.List() {
		// The fake client used in tests ignores field selectors.
		if u, ok := obj.(*unstructured.Unstructured); ok && u.GetName() == w.Name {
			resource = u
		}
	}
	var spec []byte
	if resource != nil {
		if raw, found, _ := unstructured.NestedMap(resource.Object, "spec"); found {
			spec, _ = json.Marshal(raw)
		}
	}

	// Remote resources replace the remotes of the environment as soon as
	// there is one. With none, the environment's are used.
	var remotes []config.Remote
	var invalid error
	for _, obj := range remoteStore.List() {
		u, ok := obj.(*unstructured.Unstructured)
		if !ok {
			continue
		}
		var r apiv1.Remote
		if err := runtime.DefaultUnstructuredConverter.FromUnstructured(u.Object, &r); err != nil {
			invalid = fmt.Errorf("remote %s: %w", u.GetName(), err)
			continue
		}
		remote := config.Remote{Name: r.Name, URL: r.Spec.URL, InsecureSkipVerify: r.Spec.InsecureSkipVerify}
		if r.Spec.Include != nil {
			remote.Include = *r.Spec.Include
		}
		if r.Spec.Exclude != nil {
			remote.Exclude = *r.Spec.Exclude
		}
		remotes = append(remotes, remote)
	}
	sort.Slice(remotes, func(i, j int) bool { return remotes[i].Name < remotes[j].Name })

	cfg, err := w.Base.WithResources(spec, remotes)
	if err == nil {
		err = invalid
	}
	if err != nil {
		metrics.Inc("startpunkt_settings_errors_total")
		w.Log.Warn("the settings in the cluster are not valid; keeping the last valid ones", "error", err)
		w.report(ctx, resource, false, "Invalid", err.Error())
		return
	}
	if w.Holder.Set(cfg) {
		w.Log.Info("settings changed", "remotes", len(cfg.Federation.Remotes))
	}
	w.report(ctx, resource, true, "InUse", "The settings are in use.")
}

// report writes the Configured condition to the Startpunkt resource, when
// there is one and the condition is not already what it should be.
func (w *ConfigWatcher) report(ctx context.Context, resource *unstructured.Unstructured, ok bool, reason, message string) {
	if resource == nil {
		return
	}
	status := "False"
	if ok {
		status = "True"
	}
	var current apiv1.StartpunktStatus
	if raw, found, _ := unstructured.NestedMap(resource.Object, "status"); found {
		_ = runtime.DefaultUnstructuredConverter.FromUnstructured(raw, &current)
	}
	since := time.Now().UTC().Format(time.RFC3339)
	for _, c := range current.Conditions {
		if c.Type != apiv1.ConditionConfigured {
			continue
		}
		if c.Status == status && c.Reason == reason && c.Message == message &&
			current.ObservedGeneration == resource.GetGeneration() {
			return
		}
		if c.Status == status && c.LastTransitionTime != "" {
			since = c.LastTransitionTime
		}
	}
	body, _ := json.Marshal(map[string]any{"status": apiv1.StartpunktStatus{
		ObservedGeneration: resource.GetGeneration(),
		Conditions: []apiv1.Condition{{
			Type: apiv1.ConditionConfigured, Status: status, Reason: reason, Message: message,
			LastTransitionTime: since, ObservedGeneration: resource.GetGeneration(),
		}},
	}})
	_, err := w.Dynamic.Resource(startpunktGVR).Namespace(w.Namespace).
		Patch(ctx, w.Name, types.MergePatchType, body, metav1.PatchOptions{}, "status")
	if err != nil && !apierrors.IsNotFound(err) {
		metrics.Inc("startpunkt_status_errors_total")
		w.Log.Warn("writing the status of the settings failed", "error", err)
	}
}

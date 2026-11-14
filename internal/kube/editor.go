package kube

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/edit"
	"github.com/ullbergm/startpunkt/internal/source"
)

// Editor writes Application and Bookmark resources to the cluster. It
// implements edit.Editor.
type Editor struct {
	Dynamic   dynamic.Interface
	Discovery Discovery
	// Namespace is where a resource is created when the request names
	// none.
	Namespace string
	// Allowed reports whether a namespace is one the instance reads. A
	// resource anywhere else would be written and never shown. Nil allows
	// every namespace.
	Allowed func(namespace string) bool
}

var editedKinds = map[string]string{
	edit.Applications: "Application",
	edit.Bookmarks:    "Bookmark",
}

// client returns the client for a kind in a namespace, at the newest
// version the cluster serves: v1, or v1alpha4 next to a 4.x installation.
func (e *Editor) client(kind, namespace string) (dynamic.ResourceInterface, string, error) {
	if _, ok := editedKinds[kind]; !ok {
		return nil, "", edit.Errorf(http.StatusNotFound, "not found")
	}
	if !edit.ValidName(namespace) {
		return nil, "", edit.Errorf(http.StatusBadRequest, "%q is not a namespace name", namespace)
	}
	if e.Allowed != nil && !e.Allowed(namespace) {
		return nil, "", edit.Errorf(http.StatusForbidden, "this instance does not read the namespace %q", namespace)
	}
	for _, version := range []string{apiv1.Version, apiv1.FallbackVersion} {
		list, err := e.Discovery.ServerResourcesForGroupVersion(apiv1.Group + "/" + version)
		if err != nil {
			continue
		}
		for _, r := range list.APIResources {
			if r.Name == kind {
				gvr := schema.GroupVersionResource{Group: apiv1.Group, Version: version, Resource: kind}
				return e.Dynamic.Resource(gvr).Namespace(namespace), version, nil
			}
		}
	}
	return nil, "", edit.Errorf(http.StatusServiceUnavailable, "the cluster does not have the %s resource type", kind)
}

// Get implements edit.Editor.
func (e *Editor) Get(ctx context.Context, kind, namespace, name string) (edit.Resource, error) {
	client, _, err := e.client(kind, namespace)
	if err != nil {
		return edit.Resource{}, err
	}
	obj, err := client.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return edit.Resource{}, translate(err, name)
	}
	return resource(obj)
}

// Create implements edit.Editor.
func (e *Editor) Create(ctx context.Context, kind string, r edit.Resource) (edit.Resource, error) {
	spec, err := edit.Validate(kind, r.Spec)
	if err != nil {
		return edit.Resource{}, err
	}
	if r.Namespace == "" {
		r.Namespace = e.Namespace
	}
	client, version, err := e.client(kind, r.Namespace)
	if err != nil {
		return edit.Resource{}, err
	}
	// A name that was asked for is used or refused. One that is derived
	// from the title gets a number when it is taken.
	names := []string{r.Name}
	if r.Name == "" {
		title, _ := spec["name"].(string)
		base := edit.NameFor(title)
		names = []string{base}
		for i := 2; i <= 20; i++ {
			names = append(names, fmt.Sprintf("%s-%d", base, i))
		}
	} else if !edit.ValidName(r.Name) {
		return edit.Resource{}, edit.Errorf(http.StatusBadRequest, "%q is not a resource name", r.Name)
	}
	for _, name := range names {
		obj := &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": apiv1.Group + "/" + version,
			"kind":       editedKinds[kind],
			"metadata":   map[string]any{"namespace": r.Namespace, "name": name},
			"spec":       spec,
		}}
		created, err := client.Create(ctx, obj, metav1.CreateOptions{})
		if apierrors.IsAlreadyExists(err) && r.Name == "" {
			continue
		}
		if err != nil {
			return edit.Resource{}, translate(err, name)
		}
		return resource(created)
	}
	return edit.Resource{}, edit.Errorf(http.StatusConflict, "there are too many resources of that name already")
}

// Update implements edit.Editor.
func (e *Editor) Update(ctx context.Context, kind string, r edit.Resource) (edit.Resource, error) {
	spec, err := edit.Validate(kind, r.Spec)
	if err != nil {
		return edit.Resource{}, err
	}
	client, _, err := e.client(kind, r.Namespace)
	if err != nil {
		return edit.Resource{}, err
	}
	obj, err := client.Get(ctx, r.Name, metav1.GetOptions{})
	if err != nil {
		return edit.Resource{}, translate(err, r.Name)
	}
	if err := changeable(obj); err != nil {
		return edit.Resource{}, err
	}
	if r.ResourceVersion == "" {
		return edit.Resource{}, edit.Errorf(http.StatusBadRequest, "resourceVersion is required; open the resource again")
	}
	if r.ResourceVersion != obj.GetResourceVersion() {
		return edit.Resource{}, edit.Errorf(http.StatusConflict, "%q was changed by someone else; open it again", r.Name)
	}
	obj.Object["spec"] = spec
	// The update carries the version that was read, so a change made by
	// someone else in between is not overwritten.
	updated, err := client.Update(ctx, obj, metav1.UpdateOptions{})
	if err != nil {
		return edit.Resource{}, translate(err, r.Name)
	}
	return resource(updated)
}

// Delete implements edit.Editor.
func (e *Editor) Delete(ctx context.Context, kind, namespace, name string) error {
	client, _, err := e.client(kind, namespace)
	if err != nil {
		return err
	}
	obj, err := client.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return translate(err, name)
	}
	if err := changeable(obj); err != nil {
		return err
	}
	// Only the object that was looked at: one that was replaced in between
	// by another of the same name is left alone.
	uid := obj.GetUID()
	return translate(client.Delete(ctx, name, metav1.DeleteOptions{Preconditions: &metav1.Preconditions{UID: &uid}}), name)
}

// changeable refuses a resource that Argo CD or Helm deploys. The page offers no
// change to one, since its tile is not editable, but the endpoints can be
// called without the page.
func changeable(obj *unstructured.Unstructured) error {
	if source.Deployed(obj) {
		return edit.Errorf(http.StatusConflict, "%q is deployed by Argo CD or Helm; change it where it is deployed from", obj.GetName())
	}
	return nil
}

func resource(obj *unstructured.Unstructured) (edit.Resource, error) {
	spec, _, _ := unstructured.NestedMap(obj.Object, "spec")
	data, err := json.Marshal(spec)
	if err != nil {
		return edit.Resource{}, err
	}
	return edit.Resource{Namespace: obj.GetNamespace(), Name: obj.GetName(), ResourceVersion: obj.GetResourceVersion(), Spec: data}, nil
}

// translate turns an error of the API server into one for the caller of
// the endpoints.
func translate(err error, name string) error {
	switch {
	case err == nil:
		return nil
	case apierrors.IsNotFound(err):
		return edit.Errorf(http.StatusNotFound, "%q does not exist", name)
	case apierrors.IsAlreadyExists(err):
		return edit.Errorf(http.StatusConflict, "%q exists already", name)
	case apierrors.IsConflict(err):
		return edit.Errorf(http.StatusConflict, "%q was changed by someone else; open it again", name)
	case apierrors.IsForbidden(err):
		return edit.Errorf(http.StatusForbidden, "the service account is not allowed to make this change")
	case apierrors.IsInvalid(err), apierrors.IsBadRequest(err):
		return edit.Errorf(http.StatusBadRequest, "the cluster refused the resource: %v", err)
	}
	return err
}

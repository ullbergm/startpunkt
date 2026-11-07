package kube

import (
	"context"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clienttesting "k8s.io/client-go/testing"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
)

func (c *cluster) runWithStatus(t *testing.T) *store.Store {
	t.Helper()
	s := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go (&Controller{
		Cluster:           "test",
		Store:             s,
		Sources:           source.Builtin(source.DefaultOptions()),
		Discovery:         lockedDiscovery{c},
		Dynamic:           c.dynamic,
		DiscoveryInterval: 10 * time.Millisecond,
		WriteStatus:       true,
		Log:               slog.New(slog.NewTextHandler(io.Discard, nil)),
	}).Run(ctx)
	return s
}

// countPatches counts status patches sent to the API server.
func (c *cluster) countPatches() *atomic.Int32 {
	var n atomic.Int32
	c.dynamic.PrependReactor("patch", "applications", func(a clienttesting.Action) (bool, runtime.Object, error) {
		if a.GetSubresource() == "status" {
			n.Add(1)
		}
		return false, nil, nil
	})
	return &n
}

func (c *cluster) status(t *testing.T, namespace, name string) map[string]any {
	t.Helper()
	obj, err := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace(namespace).
		Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	status, _, _ := unstructured.NestedMap(obj.Object, "status")
	return status
}

func condition(status map[string]any, typ string) map[string]any {
	conditions, _, _ := unstructured.NestedSlice(status, "conditions")
	for _, c := range conditions {
		if m, ok := c.(map[string]any); ok && m["type"] == typ {
			return m
		}
	}
	return map[string]any{}
}

func withGeneration(obj *unstructured.Unstructured, generation int64) *unstructured.Unstructured {
	obj.SetGeneration(generation)
	return obj
}

const appID = "test/applications.startpunkt.ullberg.us/ns/a"

func TestStatusFollowsResolutionAndAvailability(t *testing.T) {
	c := newCluster(withGeneration(app("v1alpha4", "ns", "a", "https://a.example.com"), 1))
	patches := c.countPatches()
	c.serve("v1alpha4")
	s := c.runWithStatus(t)

	eventually(t, "the first status", func() bool {
		return condition(c.status(t, "ns", "a"), "Resolved")["status"] == "True"
	})
	st := c.status(t, "ns", "a")
	if st["url"] != "https://a.example.com" || st["available"] != nil ||
		condition(st, "Available")["status"] != "Unknown" ||
		condition(st, "Resolved")["observedGeneration"] != int64(1) {
		t.Errorf("unexpected first status: %v", st)
	}
	since := condition(st, "Resolved")["lastTransitionTime"]

	s.SetProbe([]string{appID}, true, time.Now())
	eventually(t, "availability in status", func() bool {
		return c.status(t, "ns", "a")["available"] == true
	})
	st = c.status(t, "ns", "a")
	if condition(st, "Available")["reason"] != "Responding" ||
		condition(st, "Resolved")["lastTransitionTime"] != since {
		t.Errorf("unexpected status after probe: %v", st)
	}

	s.SetProbe([]string{appID}, false, time.Now())
	eventually(t, "unavailability in status", func() bool {
		return condition(c.status(t, "ns", "a"), "Available")["status"] == "False"
	})

	// Nothing changes any more, so nothing is written any more.
	time.Sleep(100 * time.Millisecond)
	before := patches.Load()
	s.SetProbe([]string{appID}, false, time.Now())
	time.Sleep(100 * time.Millisecond)
	if after := patches.Load(); after != before {
		t.Errorf("status was written %d more times without a change", after-before)
	}
	if before > 6 {
		t.Errorf("%d writes for three changes", before)
	}
}

func TestStatusReportsInvalidSpec(t *testing.T) {
	broken := withGeneration(app("v1alpha4", "ns", "a", ""), 1)
	broken.Object["spec"] = map[string]any{
		"name": "a",
		"urlFrom": map[string]any{
			"apiVersion": "v1", "kind": "ConfigMap", "name": "absent", "property": "data.url",
		},
	}
	c := newCluster(broken)
	c.serve("v1alpha4")
	c.runWithStatus(t)

	eventually(t, "the failure to be reported", func() bool {
		return condition(c.status(t, "ns", "a"), "Resolved")["status"] == "False"
	})
	resolved := condition(c.status(t, "ns", "a"), "Resolved")
	if resolved["reason"] != "Invalid" || resolved["message"] != "urlFrom: ConfigMap ns/absent does not exist" {
		t.Errorf("unexpected condition: %v", resolved)
	}

	// The reference appears: the tile and the status follow.
	if _, err := c.dynamic.Resource(schema.GroupVersionResource{Version: "v1", Resource: "configmaps"}).
		Namespace("ns").Create(context.Background(), configMap("ns", "absent", "https://found"), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the recovery to be reported", func() bool {
		st := c.status(t, "ns", "a")
		return condition(st, "Resolved")["status"] == "True" && st["url"] == "https://found"
	})
}

func TestStatusOfDisabledApplication(t *testing.T) {
	disabled := withGeneration(app("v1alpha4", "ns", "a", "https://a"), 1)
	_ = unstructured.SetNestedField(disabled.Object, false, "spec", "enabled")
	c := newCluster(disabled)
	c.serve("v1alpha4")
	c.runWithStatus(t)
	eventually(t, "the status", func() bool {
		return condition(c.status(t, "ns", "a"), "Resolved")["reason"] == "NoTile"
	})
	st := c.status(t, "ns", "a")
	if condition(st, "Resolved")["status"] != "True" || st["url"] != nil {
		t.Errorf("unexpected status: %v", st)
	}
}

func TestStatusGivesUpWhenTheServerDropsIt(t *testing.T) {
	c := newCluster(
		withGeneration(app("v1alpha4", "ns", "a", "https://a"), 1),
		withGeneration(app("v1alpha4", "ns", "b", "https://b"), 1),
	)
	// Behave like the 4.x definitions: accept the patch, keep nothing.
	var patches atomic.Int32
	c.dynamic.PrependReactor("patch", "applications", func(a clienttesting.Action) (bool, runtime.Object, error) {
		patches.Add(1)
		return true, app("v1alpha4", "ns", a.(clienttesting.PatchAction).GetName(), "https://x"), nil
	})
	c.serve("v1alpha4")
	s := c.runWithStatus(t)
	eventually(t, "the first attempt", func() bool { return patches.Load() >= 1 })

	s.SetProbe([]string{appID, "test/applications.startpunkt.ullberg.us/ns/b"}, true, time.Now())
	time.Sleep(150 * time.Millisecond)
	if n := patches.Load(); n != 1 {
		t.Errorf("%d writes were sent to a server that drops them, want 1", n)
	}
}

func TestStatusGivesUpWhenForbidden(t *testing.T) {
	c := newCluster(withGeneration(app("v1alpha4", "ns", "a", "https://a"), 1))
	var patches atomic.Int32
	c.dynamic.PrependReactor("patch", "applications", func(clienttesting.Action) (bool, runtime.Object, error) {
		patches.Add(1)
		return true, nil, apierrors.NewForbidden(
			schema.GroupResource{Group: group, Resource: "applications"}, "a", nil)
	})
	c.serve("v1alpha4")
	s := c.runWithStatus(t)
	eventually(t, "the first attempt", func() bool { return patches.Load() >= 1 })
	s.SetProbe([]string{appID}, true, time.Now())
	time.Sleep(150 * time.Millisecond)
	if n := patches.Load(); n != 1 {
		t.Errorf("%d writes after being refused, want 1", n)
	}
	if len(s.Snapshot().Tiles) != 1 {
		t.Error("a refused status write must not affect the tiles")
	}
}

func TestNoStatusWritesWhenDisabled(t *testing.T) {
	c := newCluster(withGeneration(app("v1alpha4", "ns", "a", "https://a"), 1))
	patches := c.countPatches()
	c.serve("v1alpha4")
	s := c.run(t)
	eventually(t, "the initial sync", s.Ready)
	s.SetProbe([]string{appID}, true, time.Now())
	time.Sleep(100 * time.Millisecond)
	if n := patches.Load(); n != 0 {
		t.Errorf("%d status writes with writing turned off", n)
	}
}

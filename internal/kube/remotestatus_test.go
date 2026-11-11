package kube

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"

	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/store"
)

func remoteStatusOf(t *testing.T, client *dynamicfake.FakeDynamicClient, name string) (condition map[string]any, tiles any) {
	t.Helper()
	obj, err := client.Resource(remoteGVR).Namespace("home").Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	tiles, _, _ = unstructured.NestedFieldNoCopy(obj.Object, "status", "tiles")
	conditions, _, _ := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if len(conditions) == 0 {
		return map[string]any{}, tiles
	}
	return conditions[0].(map[string]any), tiles
}

func TestRemoteStatusFollowsTheReports(t *testing.T) {
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
		map[schema.GroupVersionResource]string{remoteGVR: "RemoteList"},
		remoteResource("prod", "https://prod.example.com", nil),
		remoteResource("dev", "https://dev.example.com", nil),
	)
	w := &RemoteStatusWriter{
		Dynamic: client, Namespace: "home", Expiry: 150 * time.Millisecond,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	// A report that comes before the writer runs is not lost.
	w.Report([]follow.RemoteReport{{Name: "prod", State: store.StateConnected, Tiles: 42}})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go w.Run(ctx)

	status := func(name string) string {
		c, _ := remoteStatusOf(t, client, name)
		s, _ := c["status"].(string)
		return s
	}
	eventually(t, "the connected remote", func() bool { return status("prod") == "True" })
	if c, tiles := remoteStatusOf(t, client, "prod"); c["type"] != "Connected" || c["reason"] != "Connected" || tiles != int64(42) {
		t.Errorf("prod: condition %v, tiles %v", c, tiles)
	}
	// A remote that no report mentions is not known to be followed.
	eventually(t, "the unreported remote", func() bool { return status("dev") == "Unknown" })
	if c, tiles := remoteStatusOf(t, client, "dev"); c["reason"] != "NoReport" || tiles != nil {
		t.Errorf("dev: condition %v, tiles %v", c, tiles)
	}

	// Lost: false, with the reason, and the tiles that are still shown.
	w.Report([]follow.RemoteReport{
		{Name: "prod", State: store.StateStale, Tiles: 42, Problem: "connection refused"},
		{Name: "dev", State: store.StateSyncing},
	})
	eventually(t, "the lost remote", func() bool { return status("prod") == "False" && status("dev") == "False" })
	c, tiles := remoteStatusOf(t, client, "prod")
	if c["reason"] != "Unreachable" || !strings.HasSuffix(c["message"].(string), "Last error: connection refused") || tiles != int64(42) {
		t.Errorf("prod: condition %v, tiles %v", c, tiles)
	}
	if c, tiles := remoteStatusOf(t, client, "dev"); c["reason"] != "Connecting" || tiles != int64(0) {
		t.Errorf("dev: condition %v, tiles %v", c, tiles)
	}

	// The same report again writes nothing.
	writes := func() int {
		n := 0
		for _, a := range client.Actions() {
			if a.GetVerb() == "patch" {
				n++
			}
		}
		return n
	}
	before := writes()
	w.Report([]follow.RemoteReport{
		{Name: "prod", State: store.StateStale, Tiles: 42, Problem: "connection refused"},
		{Name: "dev", State: store.StateSyncing},
	})
	time.Sleep(40 * time.Millisecond)
	if writes() != before {
		t.Errorf("an unchanged report was written %d times", writes()-before)
	}

	// When the reports stop, the status no longer claims to know, and
	// keeps the last count.
	eventually(t, "the reports to expire", func() bool { return status("prod") == "Unknown" && status("dev") == "Unknown" })
	if _, tiles := remoteStatusOf(t, client, "prod"); tiles != int64(42) {
		t.Errorf("tiles after expiry = %v", tiles)
	}
}

func TestRemoteStatusKeepsTheTimeOfTheLastChange(t *testing.T) {
	existing := remoteResource("prod", "https://prod.example.com", nil)
	existing.Object["status"] = map[string]any{
		"tiles": int64(1),
		"conditions": []any{map[string]any{
			"type": "Connected", "status": "True", "reason": "Connected", "message": "old words",
			"lastTransitionTime": "2020-01-02T03:04:05Z",
		}},
	}
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
		map[schema.GroupVersionResource]string{remoteGVR: "RemoteList"}, existing)
	w := &RemoteStatusWriter{Dynamic: client, Namespace: "home", Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go w.Run(ctx)
	w.Report([]follow.RemoteReport{{Name: "prod", State: store.StateConnected, Tiles: 7}})
	eventually(t, "the new count", func() bool { _, tiles := remoteStatusOf(t, client, "prod"); return tiles == int64(7) })
	if c, _ := remoteStatusOf(t, client, "prod"); c["lastTransitionTime"] != "2020-01-02T03:04:05Z" {
		t.Errorf("still connected, so the time must stay: %v", c)
	}
}

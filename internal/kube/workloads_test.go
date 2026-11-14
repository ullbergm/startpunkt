package kube

import (
	"context"
	"io"
	"log/slog"
	"reflect"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	kjson "k8s.io/apimachinery/pkg/util/json"
	dynamicfake "k8s.io/client-go/dynamic/fake"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func workloadObject(t *testing.T, text string) *unstructured.Unstructured {
	t.Helper()
	obj := &unstructured.Unstructured{}
	if err := kjson.Unmarshal([]byte(text), &obj.Object); err != nil {
		t.Fatal(err)
	}
	return obj
}
func workloadClient(objects ...runtime.Object) *dynamicfake.FakeDynamicClient {
	kinds := map[schema.GroupVersionResource]string{}
	for _, gvr := range workloadResources {
		switch gvr.Resource {
		case "services":
			kinds[gvr] = "ServiceList"
		case "deployments":
			kinds[gvr] = "DeploymentList"
		case "statefulsets":
			kinds[gvr] = "StatefulSetList"
		}
	}
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), kinds, objects...)
}
func readinessOf(s *store.Store, id string) *tile.Workload {
	for _, t := range s.Snapshot().Tiles {
		if t.ID == id {
			return t.Workload
		}
	}
	return nil
}

func TestWorkloadWatcherFollowsServiceAndDeployment(t *testing.T) {
	service := workloadObject(t, `{"apiVersion":"v1","kind":"Service","metadata":{"name":"web","namespace":"ns"},"spec":{"selector":{"app":"demo"}}}`)
	deployment := workloadObject(t, `{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"name":"web","namespace":"ns","generation":1},"spec":{"replicas":2,"template":{"metadata":{"labels":{"app":"demo"}}}},"status":{"observedGeneration":1,"readyReplicas":1}}`)
	client := workloadClient(service, deployment)
	s := store.New()
	offline := false
	src := tile.Source{Type: "applications.startpunkt.ullberg.us", Kind: "Application", Version: "v1", Namespace: "ns", Name: "web"}
	local := tile.Tile{ID: "local/apps/ns/web", Kind: tile.KindApplication, Cluster: "local", Name: "web", URL: "https://web.test", Source: src, Available: &offline, WorkloadRefs: []tile.WorkloadRef{{Resource: "services", Namespace: "ns", Name: "web"}}}
	s.Upsert(local)
	remote := local
	remote.ID = "remote/apps/ns/web"
	remote.Cluster = "remote"
	s.UpsertFrom("remote:r", remote)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&WorkloadWatcher{Store: s, Dynamic: client, Cluster: "local", Enabled: true, ConsoleURL: "https://console.test", Log: slog.New(slog.NewTextHandler(io.Discard, nil))}).Run(ctx)
	eventually(t, "degraded workload", func() bool {
		w := readinessOf(s, local.ID)
		return w != nil && w.State == "degraded" && w.Ready == 1 && w.Desired == 2
	})
	for _, current := range s.Snapshot().Tiles {
		if current.ID == local.ID && (current.Available == nil || *current.Available || current.ConsoleURL != "https://console.test/k8s/ns/ns/startpunkt.ullberg.us~v1~Application/web") {
			t.Fatalf("HTTP/console values changed: %+v", current)
		}
		if current.ID == remote.ID && (current.Workload != nil || current.ConsoleURL != "") {
			t.Fatal("remote tile enriched locally")
		}
	}
	deployment.Object["status"].(map[string]any)["readyReplicas"] = int64(2)
	apps := client.Resource(schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}).Namespace("ns")
	if _, err := apps.Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "ready workload", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "ready" && w.Ready == 2 })
	deployment.SetGeneration(2)
	if _, err := apps.Update(ctx, deployment, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "starting until latest generation observed", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "starting" })
	service.Object["spec"].(map[string]any)["selector"] = map[string]any{"app": "missing"}
	services := client.Resource(schema.GroupVersionResource{Version: "v1", Resource: "services"}).Namespace("ns")
	if _, err := services.Update(ctx, service, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "unknown without a matching workload", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "unknown" })
}

func TestConsoleLinksWithoutWorkloadWatches(t *testing.T) {
	s := store.New()
	src := tile.Source{Type: "routes.route.openshift.io", Kind: "Route", Version: "v1", Namespace: "ns", Name: "site"}
	s.Upsert(tile.Tile{ID: "a", Cluster: "local", Kind: tile.KindBookmark, Source: src})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	// A nil Dynamic client proves console-only mode needs no workload API calls.
	go (&WorkloadWatcher{Store: s, Cluster: "local", ConsoleURL: "https://console.test/base"}).Run(ctx)
	eventually(t, "source console link", func() bool {
		t := s.Snapshot().Tiles[0]
		return t.ConsoleURL == "https://console.test/base/k8s/ns/ns/routes/site" && t.Workload == nil
	})
}

func TestResourceConsoleURL(t *testing.T) {
	src := tile.Source{Type: "widgets.example.test", Kind: "Widget", Version: "v1alpha1", Namespace: "team", Name: "web"}
	if got := ResourceConsoleURL("https://console.test", src); got != "https://console.test/k8s/ns/team/example.test~v1alpha1~Widget/web" {
		t.Fatalf("custom resource URL: %s", got)
	}
	for _, base := range []string{"javascript:alert(1)", "/relative", "https://console.test?redirect=x", "https://console.test#x"} {
		if got := ResourceConsoleURL(base, src); got != "" {
			t.Errorf("invalid base %q produced %q", base, got)
		}
	}
	src.Namespace = ""
	if got := ResourceConsoleURL("https://console.test", src); got != "" {
		t.Errorf("namespaceless source: %q", got)
	}
}

func TestWorkloadReadinessStates(t *testing.T) {
	for name, c := range map[string]struct{ json, want string }{
		"default replicas starting": {`{"spec":{},"status":{}}`, "starting"},
		"zero desired":              {`{"spec":{"replicas":0},"status":{}}`, "ready"},
		"stateful ready":            {`{"metadata":{"generation":2},"spec":{"replicas":3},"status":{"observedGeneration":2,"readyReplicas":3}}`, "ready"},
		"partial":                   {`{"spec":{"replicas":3},"status":{"readyReplicas":2}}`, "degraded"},
		"failed rollout":            {`{"spec":{"replicas":3},"status":{"conditions":[{"type":"Progressing","status":"False"}]}}`, "degraded"},
	} {
		t.Run(name, func(t *testing.T) {
			got := workloadReadiness(workloadObject(t, c.json))
			if got.State != c.want {
				t.Fatalf("%+v, want %s", got, c.want)
			}
		})
	}
}

func TestWorkloadReferences(t *testing.T) {
	for name, c := range map[string]struct {
		typ, address, json string
		want               []tile.WorkloadRef
	}{
		"route":                       {typ: "routes.route.openshift.io", json: `{"metadata":{"namespace":"ns"},"spec":{"to":{"kind":"Service","name":"web"},"alternateBackends":[{"name":"canary","weight":0}]}}`, want: []tile.WorkloadRef{{Resource: "services", Namespace: "ns", Name: "web"}}},
		"ingress per host":            {typ: "ingresses.networking.k8s.io", address: "https://two.test", json: `{"metadata":{"namespace":"ns"},"spec":{"rules":[{"host":"one.test","http":{"paths":[{"backend":{"service":{"name":"one"}}}]}},{"host":"two.test","http":{"paths":[{"backend":{"service":{"name":"two"}}}]}}]}}`, want: []tile.WorkloadRef{{Resource: "services", Namespace: "ns", Name: "two"}}},
		"HTTPRoute cross namespace":   {typ: "httproutes.gateway.networking.k8s.io", json: `{"metadata":{"namespace":"ns"},"spec":{"rules":[{"backendRefs":[{"name":"web","namespace":"other"},{"name":"external","kind":"Bucket"}]}]}}`, want: []tile.WorkloadRef{{Resource: "services", Namespace: "other", Name: "web"}}},
		"virtual service FQDN":        {typ: "virtualservices.networking.istio.io", json: `{"metadata":{"namespace":"ns"},"spec":{"http":[{"route":[{"destination":{"host":"web.other.svc.cluster.local"}}]}]}}`, want: []tile.WorkloadRef{{Resource: "services", Namespace: "other", Name: "web"}}},
		"application URLFrom Service": {typ: "applications.startpunkt.ullberg.us", json: `{"metadata":{"namespace":"ns"},"spec":{"urlFrom":{"kind":"Service","name":"web"}}}`, want: []tile.WorkloadRef{{Resource: "services", Namespace: "ns", Name: "web"}}},
		"explicit workload wins":      {typ: "routes.route.openshift.io", json: `{"metadata":{"namespace":"ns","annotations":{"startpunkt.ullberg.us/workload":"statefulset/database"}},"spec":{"to":{"name":"ignored"}}}`, want: []tile.WorkloadRef{{Resource: "statefulsets", Namespace: "ns", Name: "database"}}},
	} {
		t.Run(name, func(t *testing.T) {
			got := WorkloadReferences(workloadObject(t, c.json), c.typ, c.address)
			if !reflect.DeepEqual(got, c.want) {
				t.Fatalf("refs %+v, want %+v", got, c.want)
			}
		})
	}
}

func TestExplicitStatefulSetScopeAndWatchFailure(t *testing.T) {
	stateful := workloadObject(t, `{"apiVersion":"apps/v1","kind":"StatefulSet","metadata":{"name":"database","namespace":"allowed","generation":1},"spec":{"replicas":1},"status":{"observedGeneration":1,"readyReplicas":1}}`)
	hidden := stateful.DeepCopy()
	hidden.SetNamespace("hidden")
	client := workloadClient(stateful, hidden)
	s := store.New()
	local := tile.Tile{ID: "database", Kind: tile.KindApplication, Cluster: "local", URL: "https://database.test", WorkloadRefs: []tile.WorkloadRef{{Resource: "statefulsets", Namespace: "allowed", Name: "database"}}}
	outside := local
	outside.ID = "outside"
	outside.WorkloadRefs = []tile.WorkloadRef{{Resource: "statefulsets", Namespace: "hidden", Name: "database"}}
	s.Upsert(local, outside)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	watcher := &WorkloadWatcher{Store: s, Dynamic: client, Cluster: "local", Namespaces: []string{"allowed"}, Enabled: true, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	go watcher.Run(ctx)
	eventually(t, "explicit StatefulSet readiness", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "ready" })
	if w := readinessOf(s, outside.ID); w == nil || w.State != "unknown" {
		t.Fatalf("out-of-scope readiness: %+v", w)
	}
	watcher.healthy(workloadKey("statefulsets", "allowed"), false)
	eventually(t, "unknown while watch is unreliable", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "unknown" })
	watcher.healthy(workloadKey("statefulsets", "allowed"), true)
	eventually(t, "readiness restored after watch recovery", func() bool { w := readinessOf(s, local.ID); return w != nil && w.State == "ready" })
}

// browser-server runs the real controller and HTTP API against fake Kubernetes
// clients. It binds loopback only and must never be deployed.
package main

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakediscovery "k8s.io/client-go/discovery/fake"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	clienttesting "k8s.io/client-go/testing"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/edit"
	"github.com/ullbergm/startpunkt/internal/kube"
	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
	"github.com/ullbergm/startpunkt/web"
)

func main() {
	group := "startpunkt.ullberg.us"
	appGVR := schema.GroupVersionResource{Group: group, Version: "v1", Resource: "applications"}
	bookmarkGVR := schema.GroupVersionResource{Group: group, Version: "v1", Resource: "bookmarks"}
	object := func(name, kind string, spec map[string]any) *unstructured.Unstructured {
		return &unstructured.Unstructured{Object: map[string]any{"apiVersion": group + "/v1", "kind": kind,
			"metadata": map[string]any{"namespace": "demo", "name": name, "resourceVersion": "1"}, "spec": spec}}
	}
	initial := object("grafana", "Application", map[string]any{"name": "Grafana", "url": "https://grafana.example.com", "info": "Dashboards and metrics. Review workloads, logs and alerts.",
		"links": []any{map[string]any{"name": "Documentation", "url": "https://grafana.example.com/docs"}}})
	docs := object("docs", "Bookmark", map[string]any{"name": "Kubernetes docs", "url": "https://kubernetes.io"})
	broken := object("broken", "Application", map[string]any{"name": "Broken reference", "urlFrom": map[string]any{"apiVersion": "v1", "kind": "Service", "name": "absent", "property": "spec.clusterIP"}})
	dynamic := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{appGVR: "ApplicationList", bookmarkGVR: "BookmarkList"}, initial, docs, broken)
	discovery := &fakediscovery.FakeDiscovery{Fake: &clienttesting.Fake{}}
	discovery.Resources = []*metav1.APIResourceList{{GroupVersion: group + "/v1", APIResources: []metav1.APIResource{
		{Name: "applications", Kind: "Application", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
		{Name: "bookmarks", Kind: "Bookmark", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
	}}}
	s := store.New()
	options := source.Options{Application: source.Toggle{Enabled: true}, Bookmark: source.Toggle{Enabled: true}}
	go (&kube.Controller{Cluster: "demo", Store: s, Sources: source.Builtin(options), Dynamic: dynamic, Discovery: discovery}).Run(context.Background())
	// Enrich the fixture through the same store methods as the real watchers.
	go func() {
		for {
			for _, t := range s.Snapshot().Tiles {
				if t.Name == "Grafana" {
					s.SetWorkload(t, "https://console.example.com/k8s/ns/demo/applications/grafana", &tile.Workload{State: "ready", Ready: 2, Desired: 2})
					s.SetProbe([]string{t.ID}, true, time.Now())
				}
			}
			time.Sleep(50 * time.Millisecond)
		}
	}()
	editor := &edit.Handler{Key: "browser-test-edit-key", Editor: &kube.Editor{Dynamic: dynamic, Discovery: discovery, Namespace: "demo"}}
	defaults := config.Default()
	server := (&api.Server{Store: s, Assets: web.Assets(), UI: api.UIConfig{Title: "Browser tests", SearchEngine: "https://example.com/?q=", Theme: api.Theme{Light: api.Palette(defaults.Web.Theme.Light), Dark: api.Palette(defaults.Web.Theme.Dark)}, DefaultLanguage: "en-US"},
		Edit: editor.Routes, Editing: api.Editing{Available: true, Namespace: "demo"}, Heartbeat: 100 * time.Millisecond}).Handler()
	var mu sync.Mutex
	down := false
	streams := map[*context.CancelFunc]bool{}
	mux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/__test/stream" && r.Method == http.MethodPost {
			mu.Lock()
			down = r.URL.Query().Get("down") == "true"
			if down {
				for cancel := range streams {
					(*cancel)()
				}
			}
			mu.Unlock()
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.URL.Path == "/api/v1/events" {
			mu.Lock()
			if down {
				mu.Unlock()
				http.Error(w, "test disconnect", http.StatusServiceUnavailable)
				return
			}
			ctx, cancel := context.WithCancel(r.Context())
			streams[&cancel] = true
			mu.Unlock()
			defer func() { cancel(); mu.Lock(); delete(streams, &cancel); mu.Unlock() }()
			server.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		server.ServeHTTP(w, r)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:18089", mux))
}

package kube

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakediscovery "k8s.io/client-go/discovery/fake"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	clienttesting "k8s.io/client-go/testing"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
)

func TestGatewayUpdatesRebuildRouteURLs(t *testing.T) {
	routeGVR := schema.GroupVersionResource{Group: "gateway.networking.k8s.io", Version: "v1", Resource: "httproutes"}
	gatewayGVR := routeGVR
	gatewayGVR.Resource = "gateways"
	route := &unstructured.Unstructured{}
	if err := route.UnmarshalJSON([]byte(`{"apiVersion":"gateway.networking.k8s.io/v1","kind":"HTTPRoute","metadata":{"name":"app","namespace":"apps","annotations":{"startpunkt.ullberg.us/enable":"true"}},"spec":{"hostnames":["app.example.com"],"parentRefs":[{"name":"edge"}]}}`)); err != nil {
		t.Fatal(err)
	}
	gateway := &unstructured.Unstructured{}
	if err := gateway.UnmarshalJSON([]byte(`{"apiVersion":"gateway.networking.k8s.io/v1","kind":"Gateway","metadata":{"name":"edge","namespace":"apps"},"spec":{"listeners":[{"name":"http","protocol":"HTTP","port":8080}]}}`)); err != nil {
		t.Fatal(err)
	}
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{routeGVR: "HTTPRouteList", gatewayGVR: "GatewayList"}, route)
	if _, err := client.Resource(gatewayGVR).Namespace("apps").Create(context.Background(), gateway, metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	discovery := &fakediscovery.FakeDiscovery{Fake: &clienttesting.Fake{}}
	discovery.Resources = []*metav1.APIResourceList{{GroupVersion: "gateway.networking.k8s.io/v1", APIResources: []metav1.APIResource{
		{Name: "httproutes", Kind: "HTTPRoute", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
		{Name: "gateways", Kind: "Gateway", Namespaced: true, Verbs: metav1.Verbs{"get", "list", "watch"}},
	}}}
	s := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	controller := &Controller{Cluster: "test", Store: s, Dynamic: client, Discovery: discovery, Sources: []source.Source{source.HTTPRoute{Options: source.Routed{Annotated: source.Annotated{OnlyAnnotated: true}, DefaultProtocol: "http"}}}, DiscoveryInterval: time.Hour, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	done := make(chan struct{})
	go func() { defer close(done); controller.Run(ctx) }()
	defer func() { cancel(); controller.Close(); <-done }()
	urlIs := func(want string) func() bool {
		return func() bool { tiles := s.Snapshot().Tiles; return len(tiles) == 1 && tiles[0].URL == want }
	}

	eventually(t, "initial Gateway URL", urlIs("http://app.example.com:8080"))
	_ = unstructured.SetNestedSlice(gateway.Object, []any{map[string]any{"name": "https", "protocol": "HTTPS", "port": int64(8443)}}, "spec", "listeners")
	if _, err := client.Resource(gatewayGVR).Namespace("apps").Update(ctx, gateway, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "updated Gateway URL", urlIs("https://app.example.com:8443"))
	if err := client.Resource(gatewayGVR).Namespace("apps").Delete(ctx, "edge", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "Gateway deletion fallback", urlIs("http://app.example.com"))
}

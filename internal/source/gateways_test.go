package source

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"testing"
)

func TestHTTPRouteGatewayAddress(t *testing.T) {
	route := object(t, `
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: app, namespace: apps}
spec:
  hostnames: [app.example.com]
  parentRefs: [{name: edge, namespace: infra, sectionName: secure}]
`)
	gateway := object(t, `
spec:
  listeners:
    - {name: plain, protocol: HTTP, port: 80}
    - name: secure
      protocol: HTTPS
      port: 8443
      hostname: "*.example.com"
      allowedRoutes: {namespaces: {from: All}}
`)
	lookup := func(ref Ref) (*unstructured.Unstructured, error) {
		if ref.Kind != "Gateway" || ref.Name != "edge" || ref.Namespace != "infra" {
			t.Fatalf("unexpected ref: %+v", ref)
		}
		return gateway, nil
	}
	got, err := (HTTPRoute{Options: Routed{Annotated: everything, DefaultProtocol: "http"}}).Tiles(route, lookup)
	if err != nil || !equal(urls(got), []string{"https://app.example.com:8443"}) {
		t.Fatalf("tiles %v, %v", urls(got), err)
	}
}

func TestGatewaySelectionAndOverrides(t *testing.T) {
	for _, tc := range []struct{ name, route, gateway, want string }{
		{"prefer TLS regardless of order",
			"spec: {hostnames: [app.example.com], parentRefs: [{name: edge}]}",
			"spec: {listeners: [{name: plain, protocol: HTTP, port: 80}, {name: secure, protocol: HTTPS, port: 443}]}",
			"https://app.example.com"},
		{"unmatched listener falls back",
			"spec: {hostnames: [app.example.com], parentRefs: [{name: edge, sectionName: missing}]}",
			"spec: {listeners: [{name: secure, protocol: HTTPS, port: 443}]}",
			"http://app.example.com"},
		{"namespace defaults to same",
			"spec: {hostnames: [app.example.com], parentRefs: [{name: edge, namespace: other}]}",
			"spec: {listeners: [{name: secure, protocol: HTTPS, port: 443}]}",
			"http://app.example.com"},
		{"explicit port selects listener",
			"spec: {hostnames: [app.example.com], parentRefs: [{name: edge, port: 8080}]}",
			"spec: {listeners: [{name: plain, protocol: HTTP, port: 8080}, {name: secure, protocol: HTTPS, port: 443}]}",
			"http://app.example.com:8080"},
		{"concrete listener hostname without route host",
			"spec: {parentRefs: [{name: edge}]}",
			"spec: {listeners: [{name: secure, hostname: app.example.com, protocol: HTTPS, port: 443}]}",
			"https://app.example.com"},
		{"hostname mismatch falls back",
			"spec: {hostnames: [app.example.com], parentRefs: [{name: edge}]}",
			"spec: {listeners: [{name: secure, hostname: other.example.com, protocol: HTTPS, port: 443}]}",
			"http://app.example.com"},
		{"annotations override Gateway",
			"metadata: {name: app, namespace: apps, annotations: {startpunkt.ullberg.us/protocol: http, startpunkt.ullberg.us/port: '9090'}}\nspec: {hostnames: [app.example.com], parentRefs: [{name: edge}]}",
			"spec: {listeners: [{name: secure, protocol: HTTPS, port: 443}]}",
			"http://app.example.com:9090"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			route := object(t, tc.route)
			if route.GetNamespace() == "" {
				route.SetNamespace("apps")
			}
			got, err := (HTTPRoute{Options: Routed{Annotated: everything, DefaultProtocol: "http"}}).Tiles(route, func(Ref) (*unstructured.Unstructured, error) { return object(t, tc.gateway), nil })
			if err != nil || !equal(urls(got), []string{tc.want}) {
				t.Fatalf("got %v, %v; want %s", urls(got), err, tc.want)
			}
		})
	}
}

func TestIstioGatewayAddress(t *testing.T) {
	route := object(t, `
apiVersion: networking.istio.io/v1
metadata: {name: app, namespace: apps}
spec: {hosts: [app.example.com], gateways: [infra/edge, mesh]}
`)
	gateway := object(t, `
spec:
  servers:
    - port: {number: 8443, protocol: HTTPS}
      hosts: ["apps/*.example.com"]
    - port: {number: 9443, protocol: HTTPS}
      hosts: ["other/*.example.com"]
`)
	got, err := (VirtualService{Options: Routed{Annotated: everything, DefaultProtocol: "http"}}).Tiles(route, func(ref Ref) (*unstructured.Unstructured, error) {
		if ref.APIVersion != "networking.istio.io/v1" || ref.Namespace != "infra" || ref.Name != "edge" {
			t.Fatalf("ref %+v", ref)
		}
		return gateway, nil
	})
	if err != nil || !equal(urls(got), []string{"https://app.example.com:8443"}) {
		t.Fatalf("got %v, %v", urls(got), err)
	}
}

func TestHTTPRouteAllowedNamespaceSelector(t *testing.T) {
	route := object(t, "metadata: {namespace: apps}\nspec: {hostnames: [app.example.com], parentRefs: [{name: edge, namespace: infra}]}")
	gateway := object(t, `
spec:
 listeners:
 - name: secure
   protocol: HTTPS
   port: 443
   allowedRoutes:
    namespaces:
     from: Selector
     selector: {matchLabels: {expose: "yes"}}
`)
	for _, allowed := range []bool{false, true} {
		got, err := (HTTPRoute{Options: Routed{Annotated: everything, DefaultProtocol: "http"}}).Tiles(route, func(ref Ref) (*unstructured.Unstructured, error) {
			if ref.Kind == "Namespace" {
				ns := object(t, "metadata: {name: apps}")
				if allowed {
					ns.SetLabels(map[string]string{"expose": "yes"})
				}
				return ns, nil
			}
			return gateway, nil
		})
		want := "http://app.example.com"
		if allowed {
			want = "https://app.example.com"
		}
		if err != nil || !equal(urls(got), []string{want}) {
			t.Fatalf("allowed=%v: %v %v", allowed, urls(got), err)
		}
	}
}

package source

import (
	"strings"
	"testing"

	"github.com/ullbergm/startpunkt/internal/tile"
)

var (
	annotatedOnly = Annotated{Enabled: true, OnlyAnnotated: true}
	everything    = Annotated{Enabled: true}
)

func urls(tiles []tile.Tile) []string {
	out := []string{}
	for _, t := range tiles {
		out = append(out, t.URL)
	}
	return out
}

func equal(a, b []string) bool {
	return strings.Join(a, "|") == strings.Join(b, "|")
}

func TestRoute(t *testing.T) {
	const route = `
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: console
  namespace: openshift-console
  annotations:
    startpunkt.ullberg.us/enable: "true"
    startpunkt.ullberg.us/appName: OpenShift Console
    startpunkt.ullberg.us/group: Platform
    startpunkt.ullberg.us/icon: mdi:console
    startpunkt.ullberg.us/iconColor: red
    startpunkt.ullberg.us/info: Cluster console
    startpunkt.ullberg.us/location: "3"
    startpunkt.ullberg.us/targetBlank: "true"
    startpunkt.ullberg.us/tags: "Admin, ops"
spec:
  host: console.apps.example.com
  path: /dashboards
  tls: {termination: edge}
`
	got, err := Route{Options: annotatedOnly}.Tiles(object(t, route), nil)
	if err != nil || len(got) != 1 {
		t.Fatalf("got %v, %v", got, err)
	}
	tl := got[0]
	if tl.Kind != tile.KindApplication || tl.Name != "OpenShift Console" || tl.Group != "platform" ||
		tl.URL != "https://console.apps.example.com/dashboards" || tl.Icon != "mdi:console" ||
		tl.IconColor != "red" || tl.Info != "Cluster console" || tl.Location != 3 ||
		!tl.TargetBlank || !equal(tl.Tags, []string{"admin", "ops"}) || tl.Editable {
		t.Errorf("unexpected tile: %+v", tl)
	}
}

func TestRouteDefaultsAndScheme(t *testing.T) {
	got, err := Route{Options: everything}.Tiles(object(t, `
metadata: {name: plain, namespace: Web}
spec: {host: plain.example.com}
`), nil)
	if err != nil || len(got) != 1 {
		t.Fatalf("got %v, %v", got, err)
	}
	tl := got[0]
	if tl.Name != "plain" || tl.Group != "web" || tl.URL != "http://plain.example.com" ||
		tl.Location != 1000 || tl.TargetBlank || len(tl.Tags) != 0 {
		t.Errorf("unexpected defaults: %+v", tl)
	}
}

func TestEnableAnnotation(t *testing.T) {
	route := func(enable string) string {
		ann := ""
		if enable != "" {
			ann = `annotations: {startpunkt.ullberg.us/enable: "` + enable + `"}`
		}
		return "metadata:\n  name: r\n  namespace: ns\n  " + ann + "\nspec: {host: r.example.com}\n"
	}
	cases := []struct {
		name    string
		options Annotated
		enable  string
		tiles   int
	}{
		{"only annotated, not annotated", annotatedOnly, "", 0},
		{"only annotated, enabled", annotatedOnly, "true", 1},
		{"only annotated, disabled", annotatedOnly, "false", 0},
		{"everything, not annotated", everything, "", 1},
		{"everything, disabled", everything, "false", 0},
		{"everything, enabled", everything, "TRUE", 1},
	}
	for _, c := range cases {
		got, err := Route{Options: c.options}.Tiles(object(t, route(c.enable)), nil)
		if err != nil || len(got) != c.tiles {
			t.Errorf("%s: got %d tiles, %v; want %d", c.name, len(got), err, c.tiles)
		}
	}
	if _, err := (Route{Options: everything}).Tiles(object(t, route("maybe")), nil); err == nil {
		t.Error("an unparsable enable annotation must be reported")
	}
}

func TestURLOverrides(t *testing.T) {
	route := func(annotations string) string {
		return "metadata:\n  name: r\n  namespace: ns\n  annotations: {" + annotations +
			"}\nspec: {host: r.example.com, tls: {termination: edge}}\n"
	}
	cases := map[string]string{
		`startpunkt.ullberg.us/url: "https://Other.example.com/X"`:                                    "https://Other.example.com/X",
		`startpunkt.ullberg.us/url: "https://other.example.com", startpunkt.ullberg.us/rootPath: app`: "https://other.example.com/app",
		`startpunkt.ullberg.us/rootPath: /app`:                                                        "https://r.example.com/app",
		`startpunkt.ullberg.us/protocol: http`:                                                        "http://r.example.com",
		`startpunkt.ullberg.us/protocol: "http://"`:                                                   "http://r.example.com",
		`startpunkt.ullberg.us/port: "8443"`:                                                          "https://r.example.com:8443",
		`startpunkt.ullberg.us/port: "443"`:                                                           "https://r.example.com",
		`startpunkt.ullberg.us/protocol: http, startpunkt.ullberg.us/port: "80"`:                      "http://r.example.com",
	}
	for annotations, want := range cases {
		got, err := Route{Options: everything}.Tiles(object(t, route(annotations)), nil)
		if err != nil || len(got) != 1 || got[0].URL != want {
			t.Errorf("%s: got %v, %v; want %s", annotations, urls(got), err, want)
		}
	}
	for _, bad := range []string{
		`startpunkt.ullberg.us/port: "0"`,
		`startpunkt.ullberg.us/port: "http"`,
		`startpunkt.ullberg.us/location: first`,
		`startpunkt.ullberg.us/targetBlank: sometimes`,
	} {
		if got, err := (Route{Options: everything}).Tiles(object(t, route(bad)), nil); err == nil {
			t.Errorf("%s: expected an error, got %v", bad, urls(got))
		}
	}
}

func TestRouteWithoutHostHasNoTile(t *testing.T) {
	got, err := Route{Options: everything}.Tiles(object(t, `{metadata: {name: r, namespace: ns}, spec: {}}`), nil)
	if err != nil || len(got) != 0 {
		t.Errorf("got %v, %v", got, err)
	}
}

const ingress = `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: shop
spec:
  ingressClassName: nginx
  tls:
    - hosts: [secure.example.com, "*.wild.example.com"]
      secretName: tls
  rules:
    - host: secure.example.com
    - host: plain.example.com
    - host: a.wild.example.com
    - host: secure.example.com
    - host: "*.skipped.example.com"
    - http: {paths: []}
`

func TestIngressOneTilePerHost(t *testing.T) {
	got, err := Ingress{Options: IngressOptions{Annotated: everything}}.Tiles(object(t, ingress), nil)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"https://secure.example.com", "http://plain.example.com", "https://a.wild.example.com"}
	if !equal(urls(got), want) {
		t.Errorf("got %v, want %v", urls(got), want)
	}
	for _, tl := range got {
		if tl.Name != "web" || tl.Group != "shop" {
			t.Errorf("tiles of one object share its fields: %+v", tl)
		}
	}
}

func TestIngressTLSWithoutHostsCoversAll(t *testing.T) {
	got, err := Ingress{Options: IngressOptions{Annotated: everything}}.Tiles(object(t, `
metadata: {name: web, namespace: shop}
spec:
  tls: [{secretName: default}]
  rules: [{host: a.example.com}]
`), nil)
	if err != nil || !equal(urls(got), []string{"https://a.example.com"}) {
		t.Errorf("got %v, %v", urls(got), err)
	}
}

func TestIngressClassFilter(t *testing.T) {
	withClass := ingress
	withoutClass := strings.Replace(ingress, "  ingressClassName: nginx\n", "", 1)
	legacy := strings.Replace(withoutClass, "  namespace: shop\n",
		"  namespace: shop\n  annotations: {kubernetes.io/ingress.class: traefik}\n", 1)
	cases := []struct {
		name     string
		options  IngressOptions
		manifest string
		visible  bool
	}{
		{"no filter", IngressOptions{}, withClass, true},
		{"matching class", IngressOptions{ClassNames: []string{"nginx"}}, withClass, true},
		{"other class", IngressOptions{ClassNames: []string{"traefik"}}, withClass, false},
		{"unclassified included", IngressOptions{ClassNames: []string{"nginx"}, IncludeUnclassified: true}, withoutClass, true},
		{"unclassified excluded", IngressOptions{ClassNames: []string{"nginx"}}, withoutClass, false},
		{"legacy annotation matches", IngressOptions{ClassNames: []string{"traefik"}}, legacy, true},
		{"legacy annotation differs", IngressOptions{ClassNames: []string{"nginx"}, IncludeUnclassified: true}, legacy, false},
	}
	for _, c := range cases {
		c.options.Annotated = everything
		got, err := Ingress{Options: c.options}.Tiles(object(t, c.manifest), nil)
		if err != nil || (len(got) > 0) != c.visible {
			t.Errorf("%s: got %d tiles, %v; want visible=%v", c.name, len(got), err, c.visible)
		}
	}
}

func TestHTTPRoute(t *testing.T) {
	const manifest = `
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api
  namespace: gw
  annotations: {ANNOTATIONS}
spec:
  hostnames: [api.example.com, "*.example.org", api.example.net]
`
	render := func(annotations string) string { return strings.Replace(manifest, "ANNOTATIONS", annotations, 1) }

	got, err := HTTPRoute{Options: Routed{Annotated: everything, DefaultProtocol: "https"}}.Tiles(object(t, render("")), nil)
	if err != nil || !equal(urls(got), []string{"https://api.example.com", "https://api.example.net"}) {
		t.Errorf("default protocol: got %v, %v", urls(got), err)
	}
	got, err = HTTPRoute{Options: Routed{Annotated: everything, DefaultProtocol: "https"}}.Tiles(
		object(t, render(`startpunkt.ullberg.us/protocol: http, startpunkt.ullberg.us/port: "8080"`)), nil)
	if err != nil || !equal(urls(got), []string{"http://api.example.com:8080", "http://api.example.net:8080"}) {
		t.Errorf("overrides: got %v, %v", urls(got), err)
	}
	got, err = HTTPRoute{Options: Routed{Annotated: annotatedOnly, DefaultProtocol: "http"}}.Tiles(object(t, render("")), nil)
	if err != nil || len(got) != 0 {
		t.Errorf("only annotated: got %v, %v", urls(got), err)
	}
}

func TestVirtualService(t *testing.T) {
	got, err := VirtualService{Options: Routed{Annotated: annotatedOnly, DefaultProtocol: "http"}}.Tiles(object(t, `
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: bookinfo
  namespace: mesh
  annotations:
    startpunkt.ullberg.us/enable: "true"
    startpunkt.ullberg.us/protocol: https
spec:
  hosts: [bookinfo.example.com]
`), nil)
	if err != nil || !equal(urls(got), []string{"https://bookinfo.example.com"}) {
		t.Errorf("got %v, %v", urls(got), err)
	}
}

func TestBuiltinHonoursToggles(t *testing.T) {
	if n := len(Builtin(DefaultOptions())); n != 6 {
		t.Errorf("default: %d sources", n)
	}
	o := DefaultOptions()
	o.Ingress.Enabled = false
	o.Bookmark.Enabled = false
	for _, s := range Builtin(o) {
		if typ := Type(s); typ == "ingresses.networking.k8s.io" || strings.HasPrefix(typ, "bookmarks.") {
			t.Errorf("%s should be disabled", typ)
		}
	}
}

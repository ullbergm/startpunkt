package source

import (
	"reflect"
	"strings"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

func ingressRoute(annotations map[string]any, matches ...string) *unstructured.Unstructured {
	routes := []any{}
	for _, m := range matches {
		routes = append(routes, map[string]any{"match": m, "kind": "Rule"})
	}
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "traefik.io/v1alpha1", "kind": "IngressRoute",
		"metadata": map[string]any{"namespace": "media", "name": "plex", "annotations": annotations},
		"spec":     map[string]any{"routes": routes},
	}}
}

func traefik(change func(*apiv1.CustomSource)) apiv1.CustomSource {
	spec := apiv1.CustomSource{
		Name: "traefik", APIGroup: "traefik.io", Version: "v1alpha1", Resource: "ingressroutes",
		DefaultProtocol: "https",
		URL:             "object.spec.routes.map(r, hostFromRule(r.match))",
	}
	if change != nil {
		change(&spec)
	}
	return spec
}

func one(t *testing.T, spec apiv1.CustomSource) Source {
	t.Helper()
	sources, err := NewCustom([]apiv1.CustomSource{spec}, nil)
	if err != nil || len(sources) != 1 {
		t.Fatalf("NewCustom: %v, %v", sources, err)
	}
	return sources[0]
}

func customURLs(t *testing.T, s Source, obj *unstructured.Unstructured) []string {
	t.Helper()
	tiles, err := s.Tiles(obj, nil)
	if err != nil {
		t.Fatal(err)
	}
	out := []string{}
	for _, tile := range tiles {
		out = append(out, tile.URL)
	}
	return out
}

func TestHostsFromRule(t *testing.T) {
	for rule, want := range map[string][]string{
		"Host(`plex.example.com`)":                                     {"plex.example.com"},
		"Host(`a.example.com`) || Host(`b.example.com`)":               {"a.example.com", "b.example.com"},
		"Host(`a.example.com`, `b.example.com`) && PathPrefix(`/api`)": {"a.example.com", "b.example.com"},
		`Host("quoted.example.com") && Headers("X-A", "b")`:            {"quoted.example.com"},
		"HostSNI(`tcp.example.com`)":                                   {"tcp.example.com"},
		"PathPrefix(`/only`)":                                          {},
		"":                                                             {},
		"Host(`a.example.com`) && ClientIP(`10.0.0.0/8`) || Host(`b.io`)": {"a.example.com", "b.io"},
	} {
		if got := hostsFromRule(rule); !reflect.DeepEqual(got, want) {
			t.Errorf("hostsFromRule(%q) = %v, want %v", rule, got, want)
		}
	}
}

func TestCustomSourceMakesTilesLikeABuiltInOne(t *testing.T) {
	s := one(t, traefik(nil))
	if Type(s) != "ingressroutes.traefik.io" || !reflect.DeepEqual(s.Versions(), []string{"v1alpha1"}) {
		t.Errorf("type %s, versions %v", Type(s), s.Versions())
	}

	// Not annotated: not shown, as for the built-in sources.
	if got := customURLs(t, s, ingressRoute(nil, "Host(`plex.example.com`)")); len(got) != 0 {
		t.Errorf("an object without the annotation was shown: %v", got)
	}

	// Annotated: one tile per host, named by the annotations.
	obj := ingressRoute(map[string]any{
		"startpunkt.ullberg.us/enable":   "true",
		"startpunkt.ullberg.us/appName":  "Plex",
		"startpunkt.ullberg.us/group":    "Media",
		"startpunkt.ullberg.us/rootPath": "/web",
		"startpunkt.ullberg.us/tags":     "home",
	}, "Host(`plex.example.com`)", "Host(`plex.internal`) && PathPrefix(`/x`)", "Host(`plex.example.com`)")
	tiles, err := s.Tiles(obj, nil)
	if err != nil || len(tiles) != 2 {
		t.Fatalf("tiles = %+v, %v", tiles, err)
	}
	if tiles[0].URL != "https://plex.example.com/web" || tiles[1].URL != "https://plex.internal/web" {
		t.Errorf("urls = %s, %s", tiles[0].URL, tiles[1].URL)
	}
	if tiles[0].Name != "Plex" || tiles[0].Group != "media" || tiles[0].Tags[0] != "home" || tiles[0].Editable {
		t.Errorf("tile = %+v", tiles[0])
	}

	// The annotations that change the address apply to hosts.
	obj = ingressRoute(map[string]any{
		"startpunkt.ullberg.us/enable": "true", "startpunkt.ullberg.us/protocol": "http", "startpunkt.ullberg.us/port": "8080",
	}, "Host(`plex.example.com`)")
	if got := customURLs(t, s, obj); !reflect.DeepEqual(got, []string{"http://plex.example.com:8080"}) {
		t.Errorf("with protocol and port: %v", got)
	}
	// The url annotation replaces the expression altogether, even one that
	// would fail on this object.
	broken := ingressRoute(map[string]any{"startpunkt.ullberg.us/enable": "true", "startpunkt.ullberg.us/url": "https://elsewhere.example.com"})
	delete(broken.Object, "spec")
	if got := customURLs(t, s, broken); !reflect.DeepEqual(got, []string{"https://elsewhere.example.com"}) {
		t.Errorf("with the url annotation: %v", got)
	}
	// And enable: "false" hides it.
	if got := customURLs(t, s, ingressRoute(map[string]any{"startpunkt.ullberg.us/enable": "false"}, "Host(`plex.example.com`)")); len(got) != 0 {
		t.Errorf("a hidden object was shown: %v", got)
	}
}

func TestCustomSourceSettings(t *testing.T) {
	off := false
	enabled := map[string]any{"startpunkt.ullberg.us/enable": "true"}

	// Every object, without annotations, and named by expressions.
	s := one(t, traefik(func(c *apiv1.CustomSource) {
		c.OnlyAnnotated = &off
		c.DefaultProtocol = ""
		c.TileName = "object.metadata.name.upperAscii()"
		c.TileGroup = "'Routes'"
		c.Icon = "'mdi:router'"
		c.Info = "'From ' + object.metadata.namespace"
	}))
	tiles, err := s.Tiles(ingressRoute(nil, "Host(`plex.example.com`)"), nil)
	if err != nil || len(tiles) != 1 {
		t.Fatalf("tiles = %+v, %v", tiles, err)
	}
	if got := tiles[0]; got.URL != "http://plex.example.com" || got.Name != "PLEX" || got.Group != "routes" || got.Icon != "mdi:router" || got.Info != "From media" {
		t.Errorf("tile = %+v", got)
	}
	// An annotation still wins over an expression.
	tiles, _ = s.Tiles(ingressRoute(map[string]any{"startpunkt.ullberg.us/appName": "By hand", "startpunkt.ullberg.us/icon": "mdi:home"}, "Host(`plex.example.com`)"), nil)
	if tiles[0].Name != "By hand" || tiles[0].Icon != "mdi:home" || tiles[0].Group != "routes" {
		t.Errorf("tile = %+v", tiles[0])
	}

	// One address with its scheme, as a plain string, and a host with a
	// path.
	whole := one(t, traefik(func(c *apiv1.CustomSource) { c.URL = "'https://' + object.metadata.name + '.example.com/ui'" }))
	if got := customURLs(t, whole, ingressRoute(enabled)); !reflect.DeepEqual(got, []string{"https://plex.example.com/ui"}) {
		t.Errorf("whole address: %v", got)
	}
	hostPath := one(t, traefik(func(c *apiv1.CustomSource) { c.URL = "object.metadata.name + '.example.com/ui'" }))
	if got := customURLs(t, hostPath, ingressRoute(enabled)); !reflect.DeepEqual(got, []string{"https://plex.example.com/ui"}) {
		t.Errorf("host with a path: %v", got)
	}
	// Nothing to link to is not an error.
	if got := customURLs(t, one(t, traefik(nil)), ingressRoute(enabled, "PathPrefix(`/x`)")); len(got) != 0 {
		t.Errorf("without a host: %v", got)
	}
}

func TestCustomSourceProblemsWithOneObject(t *testing.T) {
	enabled := map[string]any{"startpunkt.ullberg.us/enable": "true"}
	for name, c := range map[string]struct {
		url  string
		want string
	}{
		"a field that is not there": {"object.spec.missing.host", "no such key"},
		"not a string":              {"object.spec.routes.size()", "string or a list of strings"},
		"a list of other things":    {"object.spec.routes", "string or a list of strings"},
		"another scheme":            {"'javascript://alert(1)'", "not an http or https address"},
	} {
		s := one(t, traefik(func(spec *apiv1.CustomSource) { spec.URL = c.url }))
		_, err := s.Tiles(ingressRoute(enabled, "Host(`plex.example.com`)"), nil)
		if err == nil || !strings.Contains(err.Error(), c.want) || !strings.Contains(err.Error(), `"traefik"`) {
			t.Errorf("%s: %v", name, err)
		}
		// An object that is not shown is not evaluated at all.
		if _, err := s.Tiles(ingressRoute(nil, "Host(`plex.example.com`)"), nil); err != nil {
			t.Errorf("%s: an object that is not shown gave %v", name, err)
		}
	}
	// A fallback that fails is a problem too, and says which.
	s := one(t, traefik(func(spec *apiv1.CustomSource) { spec.Info = "object.spec.nope" }))
	if _, err := s.Tiles(ingressRoute(enabled, "Host(`plex.example.com`)"), nil); err == nil || !strings.Contains(err.Error(), "info") {
		t.Errorf("failing fallback: %v", err)
	}
}

func TestCustomSourcesThatCannotBeUsed(t *testing.T) {
	for name, c := range map[string]struct {
		change func(*apiv1.CustomSource)
		want   string
	}{
		"no name":              {func(c *apiv1.CustomSource) { c.Name = "" }, "name is required"},
		"no version":           {func(c *apiv1.CustomSource) { c.Version = "" }, "version is required"},
		"a kind, not a plural": {func(c *apiv1.CustomSource) { c.Resource = "IngressRoute" }, "plural resource name"},
		"no url":               {func(c *apiv1.CustomSource) { c.URL = " " }, "url is required"},
		"a protocol":           {func(c *apiv1.CustomSource) { c.DefaultProtocol = "ftp" }, "not http or https"},
		"does not parse":       {func(c *apiv1.CustomSource) { c.URL = "object.spec.(" }, "does not compile"},
		"unknown function":     {func(c *apiv1.CustomSource) { c.URL = "hostOf(object)" }, "does not compile"},
		"unknown variable":     {func(c *apiv1.CustomSource) { c.Icon = "self.metadata.name" }, "icon"},
		"a type with a source": {func(c *apiv1.CustomSource) {
			c.APIGroup, c.Version, c.Resource = "networking.k8s.io", "v1", "ingresses"
		}, "built-in source"},
		"a type that is turned": {func(c *apiv1.CustomSource) { c.APIGroup, c.Version, c.Resource = "route.openshift.io", "v1", "routes" }, "built-in source"},
	} {
		_, err := All(Options{}, []apiv1.CustomSource{traefik(c.change)})
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: %v", name, err)
		}
	}
	// The message names the mapping and shows the expression.
	_, err := All(Options{}, []apiv1.CustomSource{traefik(func(c *apiv1.CustomSource) { c.URL = "object.spec.(" })})
	if err == nil || !strings.Contains(err.Error(), `"traefik"`) || !strings.Contains(err.Error(), "object.spec.(") {
		t.Errorf("message: %v", err)
	}
	// Two mappings need two names and two types.
	two := []apiv1.CustomSource{traefik(nil), traefik(nil)}
	if _, err := All(Options{}, two); err == nil || !strings.Contains(err.Error(), "used twice") {
		t.Errorf("same name: %v", err)
	}
	two[1].Name = "again"
	if _, err := All(Options{}, two); err == nil || !strings.Contains(err.Error(), "one source per resource type") {
		t.Errorf("same type: %v", err)
	}
	// Custom sources come after the built-in ones that are on.
	all, err := All(DefaultOptions(), []apiv1.CustomSource{traefik(nil)})
	if err != nil || len(all) != len(Builtin(DefaultOptions()))+1 || Type(all[len(all)-1]) != "ingressroutes.traefik.io" {
		t.Errorf("All: %d sources, %v", len(all), err)
	}
}

func TestAnExpressionCannotRunAway(t *testing.T) {
	s := one(t, traefik(func(c *apiv1.CustomSource) {
		// Quadratic in the number of routes; with enough of them it has
		// to be stopped.
		c.URL = "object.spec.routes.map(a, object.spec.routes.map(b, object.spec.routes.map(c, a.match + b.match + c.match))).size() > 0 ? 'x.example.com' : ''"
	}))
	matches := make([]string, 200)
	for i := range matches {
		matches[i] = "Host(`a.example.com`)"
	}
	if _, err := s.Tiles(ingressRoute(map[string]any{"startpunkt.ullberg.us/enable": "true"}, matches...), nil); err == nil || !strings.Contains(err.Error(), "cost") {
		t.Errorf("an expensive expression was not stopped: %v", err)
	}
}

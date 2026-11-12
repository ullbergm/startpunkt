package source

import (
	"path"
	"slices"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// Route is the adapter for the OpenShift Route.
type Route struct {
	Options Annotated
}

// Group implements Source.
func (Route) Group() string { return "route.openshift.io" }

// Resource implements Source.
func (Route) Resource() string { return "routes" }

// Versions implements Source.
func (Route) Versions() []string { return []string{"v1"} }

// Tiles implements Source. A Route has one host, and it is served over TLS
// when the Route has a tls section.
func (r Route) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	host, _, _ := unstructured.NestedString(obj.Object, "spec", "host")
	routePath, _, _ := unstructured.NestedString(obj.Object, "spec", "path")
	_, hasTLS, _ := unstructured.NestedMap(obj.Object, "spec", "tls")
	return annotatedTiles(obj, r.Options, "http",
		[]endpoint{{host: host, path: routePath, tls: boolPtr(hasTLS)}})
}

// Ingress is the adapter for the Kubernetes Ingress.
type Ingress struct {
	Options IngressOptions
}

// Group implements Source.
func (Ingress) Group() string { return "networking.k8s.io" }

// Resource implements Source.
func (Ingress) Resource() string { return "ingresses" }

// Versions implements Source.
func (Ingress) Versions() []string { return []string{"v1"} }

// legacyIngressClass is the annotation that named the class before
// spec.ingressClassName existed. Some controllers still rely on it.
const legacyIngressClass = "kubernetes.io/ingress.class"

// Tiles implements Source. There is one tile per host in the rules. A host
// is served over TLS when a tls entry lists it.
func (i Ingress) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	if len(i.Options.ClassNames) > 0 {
		class, _, _ := unstructured.NestedString(obj.Object, "spec", "ingressClassName")
		if class == "" {
			class = obj.GetAnnotations()[legacyIngressClass]
		}
		if class == "" && !i.Options.IncludeUnclassified {
			return nil, nil
		}
		if class != "" && !slices.Contains(i.Options.ClassNames, class) {
			return nil, nil
		}
	}

	var tlsHosts []string
	tlsEverything := false
	tlsEntries, _, _ := unstructured.NestedSlice(obj.Object, "spec", "tls")
	for _, entry := range tlsEntries {
		m, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		hosts, _, _ := unstructured.NestedStringSlice(m, "hosts")
		if len(hosts) == 0 {
			// A tls entry without hosts covers every host of the Ingress.
			tlsEverything = true
		}
		tlsHosts = append(tlsHosts, hosts...)
	}

	var endpoints []endpoint
	rules, _, _ := unstructured.NestedSlice(obj.Object, "spec", "rules")
	for _, rule := range rules {
		m, ok := rule.(map[string]any)
		if !ok {
			continue
		}
		host, _, _ := unstructured.NestedString(m, "host")
		if host == "" {
			continue
		}
		endpoints = append(endpoints, endpoint{
			host: host,
			tls:  boolPtr(tlsEverything || matchesAnyHost(tlsHosts, host)),
		})
	}
	return annotatedTiles(obj, i.Options.Annotated, "http", endpoints)
}

// matchesAnyHost reports whether host equals one of the patterns, where a
// pattern may start with "*." to cover one more label.
func matchesAnyHost(patterns []string, host string) bool {
	for _, pattern := range patterns {
		if strings.EqualFold(pattern, host) {
			return true
		}
		if strings.HasPrefix(pattern, "*.") {
			if ok, _ := path.Match(strings.ToLower(pattern), strings.ToLower(host)); ok {
				return true
			}
		}
	}
	return false
}

// HTTPRoute is the adapter for the Gateway API HTTPRoute.
type HTTPRoute struct {
	Options Routed
}

// Group implements Source.
func (HTTPRoute) Group() string { return "gateway.networking.k8s.io" }

// Resource implements Source.
func (HTTPRoute) Resource() string { return "httproutes" }

// Versions implements Source.
func (HTTPRoute) Versions() []string { return []string{"v1", "v1beta1"} }

// Tiles implements Source. There is one tile per hostname. Whether a
// hostname is served over TLS is decided by the Gateway's listeners, not by
// the route, so the scheme comes from the protocol annotation or the
// configured default.
func (h HTTPRoute) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	return annotatedTiles(obj, h.Options.Annotated, h.Options.DefaultProtocol,
		hostEndpoints(stringList(obj, "spec", "hostnames")))
}

// VirtualService is the adapter for the Istio VirtualService.
type VirtualService struct {
	Options Routed
}

// Group implements Source.
func (VirtualService) Group() string { return "networking.istio.io" }

// Resource implements Source.
func (VirtualService) Resource() string { return "virtualservices" }

// Versions implements Source.
func (VirtualService) Versions() []string { return []string{"v1", "v1beta1", "v1alpha3"} }

// Tiles implements Source. There is one tile per host. As with HTTPRoute,
// the scheme comes from the protocol annotation or the configured default.
func (v VirtualService) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	return annotatedTiles(obj, v.Options.Annotated, v.Options.DefaultProtocol,
		hostEndpoints(stringList(obj, "spec", "hosts")))
}

func hostEndpoints(hosts []string) []endpoint {
	out := make([]endpoint, 0, len(hosts))
	for _, host := range hosts {
		out = append(out, endpoint{host: host})
	}
	return out
}

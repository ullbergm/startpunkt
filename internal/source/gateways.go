package source

import (
	"sort"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
)

// gatewayEndpoints keeps one address per concrete host. Prefer HTTPS, then
// the lowest port, so listener ordering does not change tile identities.
func gatewayEndpoints(fallback, candidates []endpoint) []endpoint {
	byHost := map[string][]endpoint{}
	for _, e := range candidates {
		byHost[e.host] = append(byHost[e.host], e)
	}
	out := make([]endpoint, 0, len(fallback))
	for _, e := range fallback {
		choices := byHost[e.host]
		if len(choices) > 0 {
			sort.SliceStable(choices, func(i, j int) bool {
				if *choices[i].tls != *choices[j].tls {
					return *choices[i].tls
				}
				return choices[i].port < choices[j].port
			})
			e = choices[0]
		}
		out = append(out, e)
		delete(byHost, e.host)
	}
	// Routes without hostnames can use a concrete listener hostname.
	if len(fallback) == 0 {
		hosts := make([]string, 0, len(byHost))
		for host := range byHost {
			if host != "" && !strings.Contains(host, "*") {
				hosts = append(hosts, host)
			}
		}
		sort.Strings(hosts)
		for _, host := range hosts {
			out = append(out, gatewayEndpoints([]endpoint{{host: host}}, byHost[host])...)
		}
	}
	return out
}

func httpGatewayEndpoints(obj *unstructured.Unstructured, lookup Lookup) []endpoint {
	fallback := hostEndpoints(stringList(obj, "spec", "hostnames"))
	if lookup == nil || strings.TrimSpace(obj.GetAnnotations()[annURL]) != "" {
		return fallback
	}
	var candidates []endpoint
	parents, _, _ := unstructured.NestedSlice(obj.Object, "spec", "parentRefs")
	for _, raw := range parents {
		parent, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		group, hasGroup, _ := unstructured.NestedString(parent, "group")
		kind := stringField(parent, "kind")
		if (hasGroup && group != "gateway.networking.k8s.io") || (kind != "" && kind != "Gateway") {
			continue
		}
		namespace := stringField(parent, "namespace")
		if namespace == "" {
			namespace = obj.GetNamespace()
		}
		name := stringField(parent, "name")
		if name == "" {
			continue
		}
		version := obj.GetAPIVersion()
		if version == "" {
			version = "gateway.networking.k8s.io/v1"
		}
		gateway, err := lookup(Ref{APIVersion: version, Kind: "Gateway", Namespace: namespace, Name: name})
		if err != nil || gateway == nil {
			continue
		}
		listeners, _, _ := unstructured.NestedSlice(gateway.Object, "spec", "listeners")
		for _, raw := range listeners {
			listener, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			if section := stringField(parent, "sectionName"); section != "" && section != stringField(listener, "name") {
				continue
			}
			port, _, _ := gatewayNumber(listener, "port")
			if requested, found, _ := gatewayNumber(parent, "port"); found && requested != port {
				continue
			}
			protocol := stringField(listener, "protocol")
			if (protocol != "HTTP" && protocol != "HTTPS") || port < 1 || port > 65535 {
				continue
			}
			if !allowsHTTPRoute(listener, namespace, obj.GetNamespace(), lookup) {
				continue
			}
			host := stringField(listener, "hostname")
			hosts := stringList(obj, "spec", "hostnames")
			if len(hosts) == 0 {
				hosts = []string{host}
			}
			for _, h := range hosts {
				if host != "" && !matchesAnyHost([]string{host}, h) {
					continue
				}
				candidates = append(candidates, endpoint{host: h, tls: boolPtr(protocol == "HTTPS"), port: int(port)})
			}
		}
	}
	return gatewayEndpoints(fallback, candidates)
}

func allowsHTTPRoute(listener map[string]any, gatewayNS, routeNS string, lookup Lookup) bool {
	kinds, found, _ := unstructured.NestedSlice(listener, "allowedRoutes", "kinds")
	if found && len(kinds) > 0 {
		allowed := false
		for _, raw := range kinds {
			k, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			if stringField(k, "kind") == "HTTPRoute" && (stringField(k, "group") == "" || stringField(k, "group") == "gateway.networking.k8s.io") {
				allowed = true
			}
		}
		if !allowed {
			return false
		}
	}
	from, _, _ := unstructured.NestedString(listener, "allowedRoutes", "namespaces", "from")
	switch from {
	case "All":
		return true
	case "Selector":
		raw, _, _ := unstructured.NestedMap(listener, "allowedRoutes", "namespaces", "selector")
		var selector metav1.LabelSelector
		if raw == nil || runtime.DefaultUnstructuredConverter.FromUnstructured(raw, &selector) != nil {
			return false
		}
		parsed, err := metav1.LabelSelectorAsSelector(&selector)
		if err != nil {
			return false
		}
		ns, err := lookup(Ref{APIVersion: "v1", Kind: "Namespace", Name: routeNS})
		return err == nil && ns != nil && parsed.Matches(labels.Set(ns.GetLabels()))
	default:
		return gatewayNS == routeNS
	}
}

func istioGatewayEndpoints(obj *unstructured.Unstructured, lookup Lookup) []endpoint {
	fallback := hostEndpoints(stringList(obj, "spec", "hosts"))
	if lookup == nil || strings.TrimSpace(obj.GetAnnotations()[annURL]) != "" {
		return fallback
	}
	var candidates []endpoint
	for _, name := range stringList(obj, "spec", "gateways") {
		if name == "mesh" {
			continue
		}
		namespace := obj.GetNamespace()
		if parts := strings.SplitN(name, "/", 2); len(parts) == 2 {
			namespace, name = parts[0], parts[1]
		}
		version := obj.GetAPIVersion()
		if version == "" {
			version = "networking.istio.io/v1"
		}
		gateway, err := lookup(Ref{APIVersion: version, Kind: "Gateway", Namespace: namespace, Name: name})
		if err != nil || gateway == nil {
			continue
		}
		servers, _, _ := unstructured.NestedSlice(gateway.Object, "spec", "servers")
		for _, raw := range servers {
			server, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			protocol, _, _ := unstructured.NestedString(server, "port", "protocol")
			if protocol != "HTTP" && protocol != "HTTP2" && protocol != "HTTPS" {
				continue
			}
			port, _, _ := gatewayNumber(server, "port", "number")
			if port < 1 || port > 65535 {
				continue
			}
			patterns, _, _ := unstructured.NestedStringSlice(server, "hosts")
			for _, pattern := range patterns {
				if parts := strings.SplitN(pattern, "/", 2); len(parts) == 2 {
					if parts[0] != "*" && parts[0] != obj.GetNamespace() && !(parts[0] == "." && namespace == obj.GetNamespace()) {
						continue
					}
					pattern = parts[1]
				}
				for _, e := range fallback {
					if pattern != "*" && !matchesAnyHost([]string{pattern}, e.host) {
						continue
					}
					candidates = append(candidates, endpoint{host: e.host, tls: boolPtr(protocol == "HTTPS"), port: int(port)})
				}
			}
		}
	}
	return gatewayEndpoints(fallback, candidates)
}

func stringField(m map[string]any, field string) string {
	v, _, _ := unstructured.NestedString(m, field)
	return v
}

// YAML fixtures and JSON decoders may represent a number as float64.
func gatewayNumber(m map[string]any, fields ...string) (int64, bool, error) {
	value, found, err := unstructured.NestedFieldNoCopy(m, fields...)
	if err != nil || !found {
		return 0, found, err
	}
	switch v := value.(type) {
	case int64:
		return v, true, nil
	case float64:
		if v >= 0 && v <= 65535 && v == float64(int64(v)) {
			return int64(v), true, nil
		}
	}
	return 0, false, nil
}

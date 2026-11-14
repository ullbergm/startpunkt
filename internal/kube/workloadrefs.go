package kube

import (
	"net/url"
	"sort"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/ullbergm/startpunkt/internal/tile"
)

const workloadAnnotation = "startpunkt.ullberg.us/workload"

// WorkloadReferences records the object dependencies of one tile, before
// its source object leaves the informer callback. They are internal data,
// not something a remote can ask this controller to watch.
func WorkloadReferences(obj *unstructured.Unstructured, typ, address string) []tile.WorkloadRef {
	ns := obj.GetNamespace()
	if value := strings.TrimSpace(obj.GetAnnotations()[workloadAnnotation]); value != "" {
		kind, name, ok := strings.Cut(value, "/")
		if !ok || name == "" || strings.Contains(name, "/") {
			return nil
		}
		resource := ""
		switch strings.ToLower(kind) {
		case "deployment", "deployments":
			resource = "deployments"
		case "statefulset", "statefulsets":
			resource = "statefulsets"
		}
		if resource == "" {
			return nil
		}
		return []tile.WorkloadRef{{Resource: resource, Namespace: ns, Name: name}}
	}
	refs := []tile.WorkloadRef{}
	service := func(namespace, name string) {
		if name != "" {
			refs = append(refs, tile.WorkloadRef{Resource: "services", Namespace: namespace, Name: name})
		}
	}
	resource, _, _ := strings.Cut(typ, ".")
	switch resource {
	case "applications":
		kind, _, _ := unstructured.NestedString(obj.Object, "spec", "urlFrom", "kind")
		if strings.EqualFold(kind, "Service") {
			name, _, _ := unstructured.NestedString(obj.Object, "spec", "urlFrom", "name")
			namespace, _, _ := unstructured.NestedString(obj.Object, "spec", "urlFrom", "namespace")
			if namespace == "" {
				namespace = ns
			}
			service(namespace, name)
		}
	case "routes":
		kind, _, _ := unstructured.NestedString(obj.Object, "spec", "to", "kind")
		weight, weighted, _ := unstructured.NestedInt64(obj.Object, "spec", "to", "weight")
		if (kind == "" || kind == "Service") && (!weighted || weight != 0) {
			name, _, _ := unstructured.NestedString(obj.Object, "spec", "to", "name")
			service(ns, name)
		}
		for _, entry := range nestedObjects(obj.Object, "spec", "alternateBackends") {
			if kind, _, _ := unstructured.NestedString(entry, "kind"); kind != "" && kind != "Service" {
				continue
			}
			if weight, found, _ := unstructured.NestedInt64(entry, "weight"); found && weight == 0 {
				continue
			}
			name, _, _ := unstructured.NestedString(entry, "name")
			service(ns, name)
		}
	case "ingresses":
		backend := func(m map[string]any) {
			name, _, _ := unstructured.NestedString(m, "service", "name")
			if name == "" {
				name, _, _ = unstructured.NestedString(m, "serviceName")
			}
			service(ns, name)
		}
		if m, found, _ := unstructured.NestedMap(obj.Object, "spec", "defaultBackend"); found {
			backend(m)
		}
		rules := nestedObjects(obj.Object, "spec", "rules")
		host := ""
		if u, err := url.Parse(address); err == nil {
			host = u.Hostname()
		}
		matched := false
		for _, rule := range rules {
			h, _, _ := unstructured.NestedString(rule, "host")
			if strings.EqualFold(h, host) {
				matched = true
			}
		}
		for _, rule := range rules {
			h, _, _ := unstructured.NestedString(rule, "host")
			if matched && !strings.EqualFold(h, host) {
				continue
			}
			for _, path := range nestedObjects(rule, "http", "paths") {
				if m, found, _ := unstructured.NestedMap(path, "backend"); found {
					backend(m)
				}
			}
		}
	case "httproutes":
		for _, rule := range nestedObjects(obj.Object, "spec", "rules") {
			for _, backend := range nestedObjects(rule, "backendRefs") {
				kind, _, _ := unstructured.NestedString(backend, "kind")
				group, _, _ := unstructured.NestedString(backend, "group")
				if (kind != "" && kind != "Service") || group != "" {
					continue
				}
				if weight, found, _ := unstructured.NestedInt64(backend, "weight"); found && weight == 0 {
					continue
				}
				name, _, _ := unstructured.NestedString(backend, "name")
				namespace, _, _ := unstructured.NestedString(backend, "namespace")
				if namespace == "" {
					namespace = ns
				}
				service(namespace, name)
			}
		}
	case "virtualservices":
		for _, protocol := range []string{"http", "tcp", "tls"} {
			for _, rule := range nestedObjects(obj.Object, "spec", protocol) {
				for _, route := range nestedObjects(rule, "route") {
					if weight, found, _ := unstructured.NestedInt64(route, "weight"); found && weight == 0 {
						continue
					}
					host, _, _ := unstructured.NestedString(route, "destination", "host")
					parts := strings.Split(host, ".")
					switch {
					case len(parts) == 1:
						service(ns, host)
					case len(parts) >= 3 && parts[2] == "svc":
						service(parts[1], parts[0])
					}
				}
			}
		}
	}
	sort.Slice(refs, func(i, j int) bool {
		a, b := refs[i], refs[j]
		if a.Resource != b.Resource {
			return a.Resource < b.Resource
		}
		if a.Namespace != b.Namespace {
			return a.Namespace < b.Namespace
		}
		return a.Name < b.Name
	})
	unique := refs[:0]
	for _, ref := range refs {
		if len(unique) == 0 || unique[len(unique)-1] != ref {
			unique = append(unique, ref)
		}
	}
	return unique
}

func nestedObjects(obj map[string]any, fields ...string) []map[string]any {
	list, _, _ := unstructured.NestedSlice(obj, fields...)
	out := make([]map[string]any, 0, len(list))
	for _, item := range list {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

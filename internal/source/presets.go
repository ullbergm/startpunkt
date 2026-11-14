package source

import (
	"fmt"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

// PresetMappings expands the selected named mappings. The mappings use the
// same CEL evaluator, annotations and cost limit as user-defined sources.
// A preset owns its resource type; use a custom mapping instead when its
// expression needs changing.
func PresetMappings(names []string) ([]apiv1.CustomSource, error) {
	seen := map[string]bool{}
	out := make([]apiv1.CustomSource, 0, len(names))
	for _, name := range names {
		if seen[name] {
			return nil, fmt.Errorf("sources.presets: %q is enabled twice", name)
		}
		seen[name] = true
		var spec apiv1.CustomSource
		switch name {
		case "traefik":
			spec = apiv1.CustomSource{
				Name: "traefik", APIGroup: "traefik.io", Version: "v1alpha1", Resource: "ingressroutes",
				URL: `has(object.spec) && has(object.spec.routes) ? object.spec.routes.filter(r, has(r.match)).map(r, hostsFromRule(r.match)).flatten().filter(host, host != '' && !host.contains('*')).map(host, (has(object.spec.tls) ? 'https://' : 'http://') + host) : []`,
			}
		case "contour":
			spec = apiv1.CustomSource{
				Name: "contour", APIGroup: "projectcontour.io", Version: "v1", Resource: "httpproxies",
				URL: `has(object.spec) && has(object.spec.virtualhost) && has(object.spec.virtualhost.fqdn) && object.spec.virtualhost.fqdn != '' && !object.spec.virtualhost.fqdn.contains('*') ? [(has(object.spec.virtualhost.tls) ? 'https://' : 'http://') + object.spec.virtualhost.fqdn] : []`,
			}
		case "knative":
			spec = apiv1.CustomSource{
				Name: "knative", APIGroup: "serving.knative.dev", Version: "v1", Resource: "services",
				URL: `has(object.status) && has(object.status.url) && object.status.url != '' ? [object.status.url] : []`,
			}
		case "nginx":
			spec = apiv1.CustomSource{
				Name: "nginx", APIGroup: "k8s.nginx.org", Version: "v1", Resource: "virtualservers",
				URL: `has(object.spec) && has(object.spec.host) && object.spec.host != '' && !object.spec.host.contains('*') ? [(has(object.spec.tls) ? 'https://' : 'http://') + object.spec.host] : []`,
			}
		case "apisix":
			spec = apiv1.CustomSource{
				Name: "apisix", APIGroup: "apisix.apache.org", Version: "v2", Resource: "apisixroutes",
				URL: `has(object.spec) && has(object.spec.http) ? object.spec.http.filter(r, has(r.match) && has(r.match.hosts)).map(r, r.match.hosts).flatten().filter(host, host != '' && !host.contains('*')) : []`,
			}
		default:
			return nil, fmt.Errorf("sources.presets: unknown mapping %q; choose traefik, contour, knative, nginx or apisix", name)
		}
		out = append(out, spec)
	}
	return out, nil
}

// Configured returns built-in sources plus the selected presets and custom
// mappings. All performs the shared one-source-per-type and name checks.
func Configured(o Options, custom []apiv1.CustomSource, presets []string) ([]Source, error) {
	mappings, err := PresetMappings(presets)
	if err != nil {
		return nil, err
	}
	mappings = append(mappings, custom...)
	return All(o, mappings)
}

package source

import (
	"fmt"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

// PresetMappings expands the named, opt-in mappings. The mappings use the
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
		default:
			return nil, fmt.Errorf("sources.presets: unknown mapping %q; choose traefik or contour", name)
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

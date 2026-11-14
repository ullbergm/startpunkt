# Source presets

`sources.presets` selects ready-made CEL mappings. Traefik is enabled by default; Contour, Knative, F5 NGINX and APISIX are opt-in. Each selected preset still requires the Startpunkt enable annotation on an object.

```yaml
sources:
  presets: [traefik, contour, knative, nginx, apisix]
```

Use that section in chart values, the configuration file, or the `Startpunkt` resource's spec. Outside the chart, `STARTPUNKT_SOURCES_PRESETS=traefik,contour` selects those two mappings. A list replaces the defaults; it is not appended to them. Set `sources.presets: []` to disable every preset, or `STARTPUNKT_SOURCES_PRESETS='[]'` through the environment. This also lets a custom Traefik mapping replace the default preset without a resource-type conflict.

| Name | Resource | Address |
| --- | --- | --- |
| `traefik` | `traefik.io/v1alpha1` IngressRoute | Each literal host in each route's `match` rule, including several hosts in a `Host` call. |
| `contour` | `projectcontour.io/v1` HTTPProxy | The root proxy's `spec.virtualhost.fqdn`. A delegated proxy has no host of its own. |
| `knative` | `serving.knative.dev/v1` Service | The controller-resolved `status.url`. No tile before a URL is present. |
| `nginx` | `k8s.nginx.org/v1` VirtualServer | `spec.host`, with HTTPS when `spec.tls` is present. This is the F5 NGINX resource, not the community ingress-nginx controller. |
| `apisix` | `apisix.apache.org/v2` ApisixRoute | Concrete hosts from `spec.http[].match.hosts`. Defaults to HTTP; set the protocol annotation for HTTPS. |

The mappings follow the shapes in the [Traefik IngressRoute reference](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/), [Contour TLS reference](https://projectcontour.io/docs/main/config/tls-termination/), [Knative Serving API](https://knative.dev/docs/serving/reference/serving-api/), [NGINX VirtualServer reference](https://docs.nginx.com/nginx-ingress-controller/configuration/virtualserver-and-virtualserverroute-resources/) and [APISIX API reference](https://apisix.apache.org/docs/ingress-controller/reference/apisix-ingress-controller/api-reference/).

Only resources annotated `startpunkt.ullberg.us/enable: "true"` are shown. Display annotations such as `appName`, `group`, `tags`, `icon`, `info` and `links` work as for other annotated sources. Traefik, Contour and NGINX use `https` when the resource has its own TLS section, otherwise `http`. Knative uses the scheme in its resolved URL. APISIX exposes hosts without a scheme, so `startpunkt.ullberg.us/protocol` and `startpunkt.ullberg.us/port` can override its HTTP default. If TLS is configured elsewhere, set `startpunkt.ullberg.us/url` to the address to use. That annotation replaces all derived hosts with one address. `rootPath` is appended to the chosen address.

Duplicate hosts produce one tile. Wildcard hosts, routes without a literal host and HTTPProxy objects without a virtual host produce no tile. Presets do not interpret regular-expression host rules, entry point configuration, custom listener ports or delegated routing graphs. APISIX path patterns are not guessed as link paths; use `rootPath` or the URL override for a service that needs a specific path.

The chart grants read access to the types selected by presets. A type that is not installed is skipped until discovery finds it. A change to the selected presets takes effect without restarting the instance.

A resource type can have only one mapping. To change a preset's expression or annotation policy, leave that preset out of the selected list and supply a mapping under `sources.custom` instead. Selecting an unknown or repeated preset, or mapping its type again under `sources.custom`, is a configuration error. Custom expressions can use the CEL list extension, including `flatten()`, alongside the string and routing-rule helpers.

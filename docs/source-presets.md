# Source presets

`sources.presets` enables ready-made CEL mappings. No preset is enabled by default.

```yaml
sources:
  presets: [traefik, contour]
```

Use that section in chart values, the configuration file, or the `Startpunkt` resource's spec. Outside the chart, `STARTPUNKT_SOURCES_PRESETS=traefik,contour` selects the same mappings.

| Name | Resource | Address |
| --- | --- | --- |
| `traefik` | `traefik.io/v1alpha1` IngressRoute | Each literal host in each route's `match` rule, including several hosts in a `Host` call. |
| `contour` | `projectcontour.io/v1` HTTPProxy | The root proxy's `spec.virtualhost.fqdn`. A delegated proxy has no host of its own. |

The mappings follow the shapes in the [Traefik IngressRoute reference](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/) and [Contour TLS reference](https://projectcontour.io/docs/main/config/tls-termination/).

Only resources annotated `startpunkt.ullberg.us/enable: "true"` are shown. Display annotations such as `appName`, `group`, `tags`, `icon`, `info` and `links` work as for other annotated sources. The scheme is `https` when the resource has its own TLS section, otherwise `http`. If TLS is configured elsewhere, set `startpunkt.ullberg.us/url` to the address to use. That annotation replaces all derived hosts with one address. `rootPath` is appended to the chosen address.

Duplicate hosts produce one tile. Wildcard hosts, routes without a literal host and HTTPProxy objects without a virtual host produce no tile. Presets do not interpret regular-expression host rules, entry point configuration or delegated routing graphs.

The chart grants read access to the types selected by presets. A type that is not installed is skipped until discovery finds it. A change to the selected presets takes effect without restarting the instance.

A resource type can have only one mapping. To change a preset's protocol or annotation policy, leave that preset disabled and supply a mapping under `sources.custom` instead. Selecting an unknown or repeated preset, or mapping its type again under `sources.custom`, is a configuration error. Custom expressions can use the CEL list extension, including `flatten()`, alongside the string and routing-rule helpers.

# Workload readiness and OpenShift resource links

HTTP availability and Kubernetes workload readiness answer different questions. The HTTP probe says whether the address answers. Workload readiness says whether the Deployment or StatefulSet behind it has its desired ready replicas. A service can answer an HTTP request while its workload is still starting, and a ready workload can have an unavailable HTTP address.

Both features are off by default. Configure them in chart values, the configuration file, or a `Startpunkt` resource's spec:

```yaml
workloads:
  enabled: true
  consoleURL: https://console-openshift-console.apps.example.com
```

`STARTPUNKT_WORKLOADS_ENABLED=true` and `STARTPUNKT_WORKLOADS_CONSOLEURL=https://console-openshift-console.apps.example.com` set the same fields through the environment. `consoleURL` works independently of `enabled`; resource links need no workload watches. The URL must be an absolute HTTP or HTTPS base address, with no query or fragment. It is configured by the operator, not guessed from the address of a service.

## How a workload is found

The controller records the source object's backend references as it converts the object into tiles. It then follows changes to Services, Deployments and StatefulSets through shared informer caches.

- A Route names its nonzero-weight primary and alternate Services.
- An Ingress names the Services behind the tile's host, plus its default backend.
- An HTTPRoute names the Service backend references of its rules. Non-Service backend kinds are not followed.
- A VirtualService names the Services in its HTTP, TCP and TLS route destinations. Bare Service names and `service.namespace.svc…` addresses are understood. Other DNS names are left unresolved to avoid mistaking an external host for an in-cluster Service.
- An Application can name a Service through `spec.urlFrom`.

A Service's nonempty selector is matched against the pod-template labels of Deployments and StatefulSets in its namespace. Duplicate references are counted once. With multiple backends, the badge summarizes all their matched workloads. Source changes, Service selector changes and workload status changes update the result without a polling loop.

An explicit annotation takes precedence over inferred Services:

```yaml
metadata:
  annotations:
    startpunkt.ullberg.us/workload: deployment/grafana
```

`deployment/name` and `statefulset/name` refer to a workload in the source object's namespace. They work on any source type, including custom CEL mappings. An invalid or missing reference gives unknown readiness. Cross-namespace Service backend references can be resolved only when the instance already watches the referenced namespace.

## What the badge means

| State | Meaning |
| --- | --- |
| Ready | The latest workload generation is observed and all desired replicas are ready. A workload scaled to zero satisfies its desired count. |
| Starting | No replica is ready yet, or the controller has not observed the latest workload generation. |
| Degraded | Some desired replicas are missing, or a Deployment reports a failed rollout or replica failure. |
| Unknown | No supported workload can be found, a Service has no selector, a reference is missing, or the workload APIs cannot be read reliably. |

The badge includes ready and desired replica counts when known. Combined cards show readiness separately for each cluster. The badge and the HTTP offline indicator have separate settings under Settings → Tiles. Workload readiness and console links are hidden by default in the browser, even when the controller supplies them; turn on each visual option there. Bookmarks have no workload badge.

Enabling readiness grants read access to Services, Deployments and StatefulSets in the chart. It adds no write permission. Only the controller reads them; the API and web roles receive the resulting optional `workload` tile field. A hub displays the owning instance's result and never resolves remote references against its own cluster. After a workload watch fails, readiness becomes unknown until the watch recovers.

## OpenShift links

When `consoleURL` is set, every local tile with a source reference gets a separate link to that resource in the configured OpenShift console. Native Routes and Ingresses use their console resource paths; custom resources use the console's `group~version~Kind` reference. The path convention follows the OpenShift console's [resource-link implementation](https://github.com/openshift/console/blob/master/frontend/public/components/utils/resource-link.tsx) and [GVK reference implementation](https://github.com/openshift/console/blob/master/frontend/packages/console-dynamic-plugin-sdk/src/utils/k8s/k8s-ref.ts).

The link follows the tile's new-tab preference. It is independently reachable from the keyboard, and is hidden during edit mode like other tile links. Combined cards retain a console link for each member. Remote console links are supplied by their owning instance, so the hub does not send a visitor to the wrong cluster's console.

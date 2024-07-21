# startpunkt

Deploy the Startpunkt application

## Configuration

The following table lists the configurable parameters and their default values.

| Parameter | Description | Default |
|  ---  |  ---  |  ---  |
| `startpunkt.labels.version` | The version label for the deployment. | `0.9.4` |
| `startpunkt.namespace` | The namespace in which to deploy Startpunkt. | `default` |
| `startpunkt.image.name` | The container image to use. | `ghcr.io/ullbergm/startpunkt` |
| `startpunkt.image.tag` | The container image tag to use. | `v0.9.4` |
| `startpunkt.deployment.replicas` | Number of replicas for the deployment. | `2` |
| `startpunkt.deployment.revisionHistoryLimit` | The number of old ReplicaSets to retain. | `2` |
| `startpunkt.deployment.annotations` | Annotations for the deployment. | `{}` |
| `startpunkt.deployment.affinity` | Affinity settings for the deployment. | `{}` |
| `startpunkt.deployment.nodeSelector` | Node selector for the deployment. | `{}` |
| `startpunkt.deployment.podSecurityContext` | Security context for the pods. | `{}` |
| `startpunkt.deployment.securityContext` | Security context for the containers. | `{}` |
| `startpunkt.deployment.tolerations` | Tolerations for the pods. | `{}` |
| `startpunkt.deployment.resources` | Resource requests and limits. | `{}` |
| `startpunkt.podDisruptionBudget` | Pod Disruption Budget settings. | `{}` |
| `startpunkt.service.annotations` | Annotations for the service. | `{}` |
| `startpunkt.service.expose` | Whether to expose the service. | `"false"` |
| `startpunkt.ingress.enabled` | Whether to enable Ingress. | `false` |
| `startpunkt.ingress.annotations` | Annotations for the Ingress. | `{}` |
| `startpunkt.ingress.className` | Class name for the Ingress. | `~` |
| `startpunkt.ingress.hosts[0].host` | Hostname for the Ingress. | `startpunkt.example.com` |
| `startpunkt.ingress.hosts[0].paths[0].path` | Path for the Ingress. | `/` |
| `startpunkt.ingress.hosts[0].paths[0].pathType` | Path type for the Ingress. | `Prefix` |
| `startpunkt.route.enabled` | Whether to enable OpenShift Route. | `false` |
| `startpunkt.route.annotations` | Annotations for the Route. | `{}` |
| `startpunkt.route.additionalLabels` | Additional labels for the Route. | `{}` |
| `startpunkt.route.host` | Hostname for the Route. | `""` |
| `startpunkt.route.port.targetPort` | Target port for the Route. | `http` |
| `startpunkt.route.wildcardPolicy` | Wildcard policy for the Route. | `None` |
| `startpunkt.route.tls.termination` | TLS termination for the Route. | `edge` |
| `startpunkt.route.tls.insecureEdgeTerminationPolicy` | Insecure edge termination policy. | `Redirect` |
| `startpunkt.livenessProbe.failureThreshold` | The failure threshold to use for liveness probe. | `3` |
| `startpunkt.livenessProbe.httpGet.path` | The HTTP path to use for liveness probe. | `/q/health/live` |
| `startpunkt.livenessProbe.httpGet.scheme` | The HTTP scheme to use for liveness probe. | `HTTP` |
| `startpunkt.livenessProbe.initialDelaySeconds` | The amount of time to wait before starting to probe. | `5` |
| `startpunkt.livenessProbe.periodSeconds` | The period in which the action should be called. | `10` |
| `startpunkt.livenessProbe.successThreshold` | The success threshold to use. | `1` |
| `startpunkt.livenessProbe.timeoutSeconds` | The amount of time to wait for each action. | `10` |
| `startpunkt.ports.http` | The HTTP port to use for the probe. | `8080` |
| `startpunkt.readinessProbe.failureThreshold` | The failure threshold to use for readiness probe. | `3` |
| `startpunkt.readinessProbe.httpGet.path` | The HTTP path to use for readiness probe. | `/q/health/ready` |
| `startpunkt.readinessProbe.httpGet.scheme` | The HTTP scheme to use for readiness probe. | `HTTP` |
| `startpunkt.readinessProbe.initialDelaySeconds` | The amount of time to wait before starting to probe. | `5` |
| `startpunkt.readinessProbe.periodSeconds` | The period in which the action should be called. | `10` |
| `startpunkt.readinessProbe.successThreshold` | The success threshold to use. | `1` |
| `startpunkt.readinessProbe.timeoutSeconds` | The amount of time to wait for each action. | `10` |
| `startpunkt.startupProbe.failureThreshold` | The failure threshold to use for startup probe. | `3` |
| `startpunkt.startupProbe.httpGet.path` | The HTTP path to use for startup probe. | `/q/health/started` |
| `startpunkt.startupProbe.httpGet.scheme` | The HTTP scheme to use for startup probe. | `HTTP` |
| `startpunkt.startupProbe.initialDelaySeconds` | The amount of time to wait before starting to probe. | `5` |
| `startpunkt.startupProbe.periodSeconds` | The period in which the action should be called. | `10` |
| `startpunkt.startupProbe.successThreshold` | The success threshold to use. | `1` |
| `startpunkt.startupProbe.timeoutSeconds` | The amount of time to wait for each action. | `10` |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. Alternatively, a YAML file that specifies the values for the above parameters can be provided while installing the chart. For example,

```shell
$ helm install --name chart-name -f values.yaml .
```

> **Tip**: You can use the default [values.yaml](values.yaml)

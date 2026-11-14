# Monitoring Startpunkt

Every process serves Prometheus text metrics at `/metrics` on its HTTP port.
No extra server, credentials or runtime dependency is needed. The endpoint
contains counts, durations, source names and cluster names. It contains no
probe response bodies, URLs, headers or edit keys.

## Prometheus Operator

Enable the chart's ServiceMonitor:

```yaml
metrics:
  serviceMonitor:
    enabled: true
    # Add labels if your Prometheus selects ServiceMonitors by label.
    labels: {}
    interval: 30s
    scrapeTimeout: 10s
```

The ServiceMonitor is in the release's namespace and discovers only that
release's Services. It scrapes the `all` role in single mode, and both
`controller` and `api` in split mode. The controller holds source and probe
metrics; the API holds browser streams and federation state. It does not
scrape the web role or go through an Ingress or Route. The monitor attaches
`startpunkt_role` and `startpunkt_release` target labels for dashboard filters.
The scrape timeout must be no longer than the interval.

## OpenShift

A cluster administrator first enables user workload monitoring in the
`openshift-monitoring/cluster-monitoring-config` ConfigMap, by merging
`enableUserWorkload: true` into its existing `data.config.yaml`. Keep the
existing monitoring settings. Install Startpunkt in an application project,
not an `openshift-*` project. The project must not carry the label
`openshift.io/user-monitoring=false`.

Then enable the ServiceMonitor above. OpenShift user workload monitoring
selects ServiceMonitors in application projects; no `release: prometheus`
label or cluster monitoring namespace is needed. Check the monitor and its
target in the console, and query `startpunkt_ready` in Observe → Metrics.
These steps follow the [OpenShift user workload monitoring guide](https://docs.redhat.com/en/documentation/monitoring_stack_for_red_hat_openshift/4.20/html-single/configuring_user_workload_monitoring/configuring_user_workload_monitoring).

The dashboard uses a Prometheus data source. For a Grafana installation on
OpenShift, configure that data source to query the cluster's Thanos Querier,
with a service account allowed to read the relevant monitoring data and the
cluster's trusted CA. The chart does not provision Grafana, grant it cluster
roles, or copy monitoring tokens into values. See Red Hat's
[Grafana on OpenShift guide](https://cloud.redhat.com/experts/o11y/ocp-grafana/)
for connecting a separate Grafana installation to OpenShift monitoring.

## Grafana dashboard

The dashboard is in
[`charts/startpunkt/files/dashboards/startpunkt.json`](../charts/startpunkt/files/dashboards/startpunkt.json).
Import that file into Grafana and select its Prometheus data source,
namespace and Helm release. It shows tile counts, readiness, stale clusters,
open streams, probe rates and durations, reconnects and settings/status
errors. Tile and cluster queries use the maximum across mirrored roles and
replicas, so split mode does not count the same tile twice. Probe rates count
actual requests from all replicas.

For a Grafana installation with a dashboard ConfigMap sidecar:

```yaml
metrics:
  serviceMonitor:
    enabled: true
  grafanaDashboard:
    enabled: true
    labels:
      grafana_dashboard: "1"
```

The sidecar must watch the Startpunkt namespace and match those labels.
The chart creates a ConfigMap named `<fullname>-dashboard`, using the
chart's normal resource-name overrides. Its `startpunkt.json` key holds the
same dashboard as the file above.

For Grafana Operator v5, including installations on OpenShift, label the
Grafana resource you want to use and configure the matching labels:

```yaml
metrics:
  serviceMonitor:
    enabled: true
  grafanaDashboard:
    enabled: true
    operator:
      enabled: true
      matchLabels:
        dashboards: startpunkt
      folder: Startpunkt
```

This also creates a `grafana.integreatly.org/v1beta1` `GrafanaDashboard` that
reads the ConfigMap. The Grafana instance and the dashboard are in the same
namespace. The operator's definitions must already be installed. An empty
instance selector is refused, to avoid selecting every Grafana instance.
The data source is chosen by the dashboard's Prometheus selector. See the
[Grafana Operator dashboard API](https://grafana.github.io/grafana-operator/docs/api/#grafanadashboardspecconfigmapref).

## Metric reference

| Metric | Type | Labels | Meaning |
| --- | --- | --- | --- |
| `startpunkt_tiles` | Gauge | `cluster`, `source` | Tiles in the process's current snapshot. A source without tiles has no series. |
| `startpunkt_cluster_state` | Gauge | `cluster`, `state`, `local` | One for the cluster's current state, zero for the other states (`syncing`, `connected`, `stale`). |
| `startpunkt_ready` | Gauge | None | One when a complete local snapshot is available, including last known state while an upstream is unreachable. Absent on the web role. |
| `startpunkt_event_streams` | Gauge | None | Open outgoing SSE connections, including connections from browsers and other Startpunkt processes. |
| `startpunkt_probes_total` | Counter | `result` | Completed probes, by `available` or `unavailable`. |
| `startpunkt_probe_duration_seconds` | Histogram | `result` | Probe duration, including failures, with buckets from 5 ms through 30 s and an overflow bucket. |
| `startpunkt_follower_reconnects_total` | Counter | `kind` | Reconnection attempts after a stream ends, for `controller` or `remote`. Initial connections are excluded. |
| `startpunkt_settings_errors_total` | Counter | None | Rejected settings or failures reading/following settings. |
| `startpunkt_status_errors_total` | Counter | None | Failed Kubernetes status writes. |

Counters reset when a process restarts. Store metrics represent each
replica's view, which can differ during reconnects. Open streams and probe
counts are per process; sum them for the requests the release actually
handles. Until probe leader election is added, each controller replica
probes independently.

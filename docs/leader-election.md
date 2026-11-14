# One prober and status writer per instance

When an instance has several controller replicas, optional leader election keeps
one replica responsible for availability probes and status writes. Every replica
continues reading its own informer state and serving requests. The leader writes
Application, Startpunkt and Remote statuses; editing remains available on every
controller and still uses the edit key and optimistic concurrency checks.

Enable it in the chart:

```yaml
replicas:
  all: 2
leaderElection:
  enabled: true
```

In split mode, scale `replicas.controller` instead. The chart creates a
namespace-scoped Role for the Lease and gives each controller its pod identity
and an HTTP address from the downward API. The Lease name defaults to the
release's resource name. The setting works with either resource or environment
configuration. API and web roles do not receive a Kubernetes token or participate
in the election.

The leader advertises its pod address in the Lease's
`startpunkt.ullberg.us/leader-url` annotation. Other controllers follow that
address's existing event stream and copy only probe results whose tile ID, local
cluster and URL match their own state. This includes annotated Routes and custom
sources, whose probe results are not stored in Application status. A follower
never copies source content, editability or another cluster's tiles. Network
rules must allow controllers to reach each other's advertised HTTP ports.

In split mode, an API replica's remote-status report can arrive at any controller.
A nonleader forwards the newest report to the leader through the controller's
existing internal reporting endpoint, using a bounded queue. Single-process
replicas already follow their own remotes and need no report forwarding.

A Lease lasts 15 seconds, renewals have a 10-second deadline, and acquisition is
retried every two seconds. On lease loss, the process cancels its probe and status
operations. During normal shutdown it waits for them to finish before releasing
the Lease, allowing another replica to take over. A crashed process cannot release
its Lease, so takeover waits for expiry. Last known availability remains visible
while a replacement leader starts probing.

## Running outside the chart

These are process settings, read from a configuration file or environment at
startup. They are not changed through the Startpunkt resource: each pod needs its
own identity and advertised address, while replicas must agree on the Lease.

```yaml
leaderElection:
  enabled: true
  leaseName: startpunkt-prod
  namespace: startpunkt
  identity: controller-a
  advertiseURL: http://10.0.0.10:8080
```

The corresponding environment variables are
`STARTPUNKT_LEADERELECTION_ENABLED`, `STARTPUNKT_LEADERELECTION_LEASENAME`,
`STARTPUNKT_LEADERELECTION_NAMESPACE`, `STARTPUNKT_LEADERELECTION_IDENTITY` and
`STARTPUNKT_LEADERELECTION_ADVERTISEURL`. An empty namespace uses the process's
namespace, or `default` outside a pod. An empty identity gets a hostname-based
random identity. The advertised URL must be reachable by the other controllers
and must not include credentials, a query or a fragment. A controller needs
`get`, `list`, `watch`, `create` and `update` on the instance's Lease in that
namespace. No cluster-wide Lease permission is needed.

Election is disabled by default, so an existing single-replica installation
keeps working without Lease permissions. With election disabled, each controller
replica continues probing and writing statuses independently.

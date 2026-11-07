# Startpunkt v2 design

Status: draft. This document describes a ground-up rewrite developed on the `v2` branch. It does not reuse v1 code or keep v1 design choices, with one fixed requirement: the start page is still populated from Kubernetes resources (Startpunkt custom resources, annotated Ingresses, Routes, HTTPRoutes, VirtualServices).

## Summary

Startpunkt v2 is a small controller that keeps one in-memory model of its own cluster and streams it to a static frontend.

- One Go binary with the frontend embedded.
- One normalized store fed by Kubernetes informers, with one read path out of it.
- A REST snapshot plus a Server-Sent Events (SSE) change stream instead of GraphQL.
- Resource types described as declarative mappings instead of one wrapper class per type.
- Multi-cluster by federation: each instance is authoritative for its own cluster, and a hub subscribes to other instances through the same API the browser uses.

## Goals

- Keep every user-visible v1 capability: applications and bookmarks from cluster resources, grouping, tags, availability indicators, live updates, in-UI editing, multi-cluster, themes, i18n, spotlight search, favorites and layout preferences.
- Make supporting a new resource type a configuration change.
- Remove polling between browser and server, and between instances.
- Hold no cross-cluster Kubernetes credentials.
- Small footprint: a container image in the tens of megabytes, fast startup, low idle memory.

## Non-goals

- API compatibility with the v1 GraphQL endpoint.
- Source compatibility with v1 Java or JSX code.
- Server-side storage of per-user preferences. There are no user accounts.

## Architecture

```text
Kubernetes API
     │ watch
     ▼
source adapters ──> normalized store ──> GET  /api/v1/state   (snapshot)
(declarative            ▲      │         GET  /api/v1/events  (SSE diffs)
 mappings)              │      │         POST/PUT/DELETE /api/v1/applications|bookmarks
                        │      ▼
                        └── prober (availability of local tiles)

remote instances ──SSE──> federation client ──> same store, keyed by cluster
```

### Components

| Component | Responsibility |
| --- | --- |
| Source adapters | Run one dynamic informer per configured resource type and turn each object into zero or more tiles. |
| Store | Holds all tiles in memory, keyed by cluster and resource identity. Computes diffs and notifies subscribers. It is the only source the API reads from. |
| Prober | Checks availability of local tiles and writes the result into the store. |
| API | Serves the snapshot, the event stream, the write endpoints and the embedded frontend. |
| Federation client | Subscribes to remote instances and mirrors their tiles into the store. |

There is no cache layer and no cache invalidation. The store is always the current informer state, and every consumer learns about a change from the same event.

### Data model

Applications and bookmarks are one type, `Tile`, with a `kind` field.

| Field | Notes |
| --- | --- |
| `id` | Stable identity: cluster, source, namespace, name, and an index when one object yields several tiles. |
| `kind` | `application` or `bookmark`. |
| `cluster` | Name of the owning instance. |
| `name`, `group`, `url`, `icon`, `iconColor`, `info`, `targetBlank`, `location`, `tags` | Display fields, matching the v1 annotation and spec fields. |
| `source` | Resource type and object reference the tile was derived from. |
| `editable` | True when the tile is backed by a Startpunkt custom resource on the local cluster. |
| `available`, `lastProbe` | Set by the prober of the owning instance. Absent when probing is disabled. |

## Kubernetes integration

### Sources as declarative mappings

A source is a mapping from a resource type to tile fields. Each mapping names a group, version and kind, and gives CEL expressions for the tile fields.

```yaml
sources:
  - name: ingress
    group: networking.k8s.io
    version: v1
    kind: Ingress
    onlyAnnotated: true
    tiles: "object.spec.rules"            # one tile per rule
    url: "scheme(object, item) + '://' + item.host + rootPath(object)"
    name: "annotation(object, 'appName', object.metadata.name)"
    group: "annotation(object, 'group', object.metadata.namespace)"
```

- Mappings for Ingress, OpenShift Route, Gateway API HTTPRoute and Istio VirtualService ship as built-in defaults. Operators can override them or add their own, for example for Traefik `IngressRoute`.
- A small set of helper functions (`annotation`, `scheme`, `rootPath`) covers the logic every mapping shares.
- A mapping that fails to compile is rejected at startup with the expression and error. A mapping that fails on a specific object is logged with the object reference and skips that object only.
- The v1 `urlFrom` feature (read a URL from a field of another object) is expressed as a mapping, or as a `urlFrom` field on the Application resource that the controller resolves with the same expression engine.

### Discovery

The controller watches API discovery and starts or stops informers as resource types appear or disappear. An absent type (Istio not installed) is a normal state, not an error. This replaces the per-integration `enabled` flags; a source is disabled by removing or disabling its mapping.

### Annotations

The existing `startpunkt.ullberg.us/*` annotations keep their meaning: `enable`, `appName`, `group`, `icon`, `iconColor`, `info`, `location`, `port`, `protocol`, `rootPath`, `tags`, `targetBlank`, `url`. They remain the way to publish an app without creating a custom resource.

### Custom resources

- One served version, `startpunkt.ullberg.us/v1`, for `Application` and `Bookmark`. Types are defined once in Go and the CRD YAML is generated with controller-gen.
- A `status` subresource carries the resolved URL, availability, last probe time and conditions. `kubectl get applications` shows the same state as the UI.
- Mapping and resolution errors are reported as status conditions on the resource.

### Namespace scope and tags

The namespace selector (`any` or `matchNames`) and the tag filtering rules in `docs/object-tag-filtering.md` carry over unchanged: untagged tiles are always visible, and tagged tiles are visible when one of their tags is requested.

### RBAC

Read access to the configured source types and namespaces. Write access only to `applications` and `bookmarks` in `startpunkt.ullberg.us`, and only when editing is enabled.

## API

All paths are under `/api/v1`. The JSON schema is versioned, because other Startpunkt instances depend on it as well as the browser.

| Endpoint | Purpose |
| --- | --- |
| `GET /state` | Full snapshot: tiles, clusters with their connection state, and UI configuration (title, theme, default language, search engine). Supports `ETag`. |
| `GET /events` | SSE stream. Sends the snapshot revision on connect, then `tile.upsert`, `tile.delete` and `cluster.status` events. Supports `Last-Event-ID` so a reconnecting client receives only what it missed, or a reset if the gap is too large. |
| `POST /applications`, `PUT`/`DELETE /applications/{namespace}/{name}` | Create, update and delete Application resources on the local cluster. Same for `/bookmarks`. |
| `GET /background` | Proxy for the Bing image of the day, kept server-side because of CORS. |

Write endpoints only change the custom resource. The UI updates when the resulting watch event arrives on the stream, so there is one code path for changes made in the UI and changes made with `kubectl`.

### Why not GraphQL

There is one client shape: the UI always needs every tile plus configuration. A fixed snapshot serves that, is cacheable, and needs no client library. Live updates over SSE are a plain HTTP response that browsers reconnect automatically and that passes through ingress controllers without WebSocket configuration. The tile schema is defined once and shared by the browser and by federation.

## Availability probing

- Each instance probes only its own tiles. It can reach in-cluster and internal-only services, and it checks from the vantage point that matters for that cluster.
- Results are stored on the tile and, for Application resources, written to `status`.
- v1 semantics carry over: 2xx, 3xx and 4xx count as available; 5xx and connection failures count as unavailable; failing targets use exponential backoff up to a cap, and a success resets it.
- A hub never probes remote tiles. It displays what the owning instance reports.

## Federation

Each instance is fully authoritative for its own cluster. A hub is another client of the same API.

- The hub is configured with a list of remotes: name, base URL and an optional read-only bearer token.
- For each remote, the hub opens `GET /api/v1/events`, takes the snapshot, and applies events to its own store under that cluster's key.
- A remote needs no configuration to be federated and does not know it is being consumed.
- If a stream drops, the hub keeps the last known tiles, marks the cluster as stale with a last-seen time, and reconnects with backoff. The UI shows the cluster as unreachable instead of dropping its tiles.
- Remote tiles are read-only on the hub. The UI links to the owning instance for editing. Proxying writes would require a write token per remote on the hub.
- A hub does not re-export tiles it received from remotes when it is itself consumed by another instance, which prevents loops and duplicate tiles.

```text
cluster A: informers ─> store ─> prober ─┐
                                         ├─ /api/v1/state + /api/v1/events ──> browser
cluster B: informers ─> store ─> prober ─┤                              └───> hub store (cluster=B)
                                         └─ same API
```

## Frontend

- Preact with signals and TypeScript, built with Vite, output embedded in the binary.
- One signal holds the server state. It is initialised from `/state` and updated from `/events`.
- Themes are CSS custom properties, with a light and a dark palette supplied by configuration.
- Per-user state (favorites, layout, background choice, collapsed groups, cluster filter) lives in `localStorage` behind one typed preferences module.
- Translations are static JSON files served with the bundle. Icons are fetched from Iconify by the browser.
- Accessibility requirements from v1 carry over: keyboard navigation, ARIA labelling, visible focus, high-contrast mode.

## Configuration

A single YAML file mounted from a ConfigMap, with environment variable overrides. Sections: `cluster` (name), `namespaceSelector`, `sources`, `availability`, `federation.remotes`, `web` (title, theme, default language, search engine, update check) and `editing.enabled`.

## Deployment

- Multi-stage container build producing a static binary on a distroless base.
- Helm chart with the generated CRDs, Deployment, Service, optional Ingress or Route, ServiceAccount and RBAC, and a ServiceMonitor for Prometheus metrics.
- The process is stateless. More than one replica is safe: each builds its own store from the API server. Probing then runs once per replica; leader election for the prober is a later optimisation.

## Testing

- Unit tests for each built-in mapping against fixture objects, including the annotation and tag rules.
- Integration tests against `envtest` (a real API server without a cluster): create resources, assert on the snapshot and the event stream.
- Federation tests with two in-process instances, covering disconnect, stale marking and resynchronisation.
- Frontend component tests with Vitest and Testing Library.
- Tests never point at a real cluster.

## Migration from v1

- Annotated resources need no changes.
- `Application` and `Bookmark` resources at `v1alpha1` to `v1alpha4` are converted to `v1`, either by a conversion webhook or by a one-shot migration job shipped with the chart.
- v1 remote cluster configuration (`graphql-url`, `graphql-token`) maps to `federation.remotes`. A v2 hub cannot consume a v1 instance, so remotes are upgraded before the hub.
- The v1 GraphQL endpoint and the WebSocket endpoint are removed.

## Decisions and open questions

Decided:

- Single store with snapshot plus SSE; no GraphQL.
- Sources as declarative mappings.
- Federation between instances instead of cross-cluster credentials, with probing done by the owning instance.

Proposed, not yet confirmed:

- Go as the implementation language. The same architecture is possible in Quarkus with the Java Operator SDK, keeping the design and giving up the footprint gains.
- Remote tiles are read-only on the hub.

Open:

- Connection direction for federation. The default here is that the hub subscribes to remotes. Remotes pushing to the hub would support clusters the hub cannot reach, at the cost of an ingest endpoint and per-remote configuration.
- Hajimari compatibility: ship `hajimari.io` resources and annotations as built-in mappings, or drop them.
- Conversion webhook or one-shot migration job for existing custom resources.

## Milestones

1. Skeleton: binary, store, Application and Bookmark `v1` types, snapshot endpoint, minimal UI that renders tiles.
2. Sources: mapping engine, built-in mappings, discovery, annotations, tags, namespace selector.
3. Live updates: SSE stream with resume, UI driven by events.
4. Availability: prober, status subresource.
5. Editing: write endpoints and editors in the UI.
6. Federation: remote subscription, stale handling, cluster filter in the UI.
7. UI parity: spotlight search, favorites, layout and background preferences, themes, i18n, accessibility.
8. Packaging: Helm chart, migration path, documentation.

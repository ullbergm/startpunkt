# Startpunkt v2 design

Status: accepted. This document describes a ground-up rewrite developed on the `v2` branch. It does not reuse v1 code or keep v1 design choices, with one fixed requirement: the start page is still populated from Kubernetes resources (Startpunkt custom resources, annotated Ingresses, Routes, HTTPRoutes, VirtualServices).

## Summary

Startpunkt v2 is a small controller that keeps one in-memory model of its own cluster and streams it to a static frontend.

- One Go binary with the frontend embedded.
- One normalized store fed by Kubernetes informers, with one read path out of it.
- A REST snapshot plus a Server-Sent Events (SSE) change stream instead of GraphQL.
- Built-in source adapters for the natively supported resource types, with user-defined mappings for other types as a later addition.
- Multi-cluster by federation: each instance is authoritative for its own cluster, and a hub subscribes to other instances through the same API the browser uses.
- Open for reading by default. Editing is unlocked in the UI with an API key.

## Goals

- Keep the user-visible v1 capabilities: applications and bookmarks from cluster resources, grouping, tags, availability indicators, live updates, in-UI editing, multi-cluster, themes, i18n, spotlight search, favorites and layout preferences.
- Allow operators to add support for a resource type through configuration, without a new release.
- Remove polling between browser and server, and between instances.
- Hold no cross-cluster Kubernetes credentials.
- Small footprint: a container image in the tens of megabytes, fast startup, low idle memory.

## Non-goals

- API compatibility with the v1 GraphQL endpoint.
- Source compatibility with v1 Java or JSX code.
- User accounts, or server-side storage of per-user preferences.
- Hajimari compatibility.

## Architecture

```text
Kubernetes API
     │ watch
     ▼
source adapters ──> normalized store ──> GET  /api/v1/state   (snapshot)
                        ▲      │         GET  /api/v1/events  (SSE: snapshot, then diffs)
                        │      │         POST/PUT/DELETE /api/v1/applications|bookmarks
                        │      ▼
                        └── prober (availability of local tiles)

remote instances ──SSE──> federation client ──> same store, keyed by cluster
```

### Components

| Component | Responsibility |
| --- | --- |
| Source adapters | Run one informer per supported resource type and turn each object into zero or more tiles. |
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

### Source adapters

Every source implements one Go interface: it names the resource type to watch and converts an object into tiles.

Built-in adapters, written in plain Go:

- `Application` and `Bookmark` (`startpunkt.ullberg.us`)
- Ingress (`networking.k8s.io`), with ingress class filtering
- OpenShift Route
- Gateway API HTTPRoute
- Istio VirtualService

Each adapter owns the quirks of its type: TLS detection for the URL scheme, one tile per host or rule, the `rootPath`, `port` and `protocol` overrides. Each is unit tested against fixture objects.

Every built-in source can be disabled, and the non-Startpunkt ones have an `onlyAnnotated` setting as in v1.

### User-defined mappings (later)

After the built-in adapters are complete, operators can add sources for other resource types, for example Traefik `IngressRoute`, through configuration. A mapping names a group, version and kind, and gives CEL expressions for the tile fields. It is implemented as one more adapter behind the same interface, so the store, API and UI are unaffected.

```yaml
sources:
  custom:
    - name: traefik-ingressroute
      group: traefik.io
      version: v1alpha1
      kind: IngressRoute
      onlyAnnotated: true
      url: "'https://' + hostFromRule(object.spec.routes[0].match)"
      name: "annotation(object, 'appName', object.metadata.name)"
      group: "annotation(object, 'group', object.metadata.namespace)"
```

- A mapping that fails to compile is rejected at startup with the expression and the error.
- A mapping that fails on a specific object is logged with the object reference and skips that object only.

### urlFrom

`Application.spec.urlFrom` keeps its v1 behaviour: the URL is read from a field of another object (`apiGroup`, `apiVersion`, `kind`, `name`, `namespace`, `property`), optionally formatted with `urlTemplate`. The controller watches the referenced object so the tile updates when it changes.

### Discovery

The controller watches API discovery and starts or stops informers as resource types appear or disappear. An absent type (Istio not installed) is a normal state, not an error.

### Annotations

The existing `startpunkt.ullberg.us/*` annotations keep their meaning: `enable`, `appName`, `group`, `icon`, `iconColor`, `info`, `location`, `port`, `protocol`, `rootPath`, `tags`, `targetBlank`, `url`. They remain the way to publish an app without creating a custom resource.

### Custom resources

- `startpunkt.ullberg.us/v1` is the storage version for `Application` and `Bookmark`. Types are defined once in Go and the CRD YAML is generated with controller-gen.
- `v1` keeps the field names and shapes of `v1alpha4`. In particular `tags` stays a comma-separated string.
- `v1alpha1` to `v1alpha4` stay served, marked deprecated, with `conversion: None`. This works without a webhook because the versions only ever added fields. Every served version carries the same schema as `v1`, so no field is lost when an object is read or written through an older version.
- A `status` subresource carries the resolved URL, availability and conditions. Resolution errors, such as a `urlFrom` target that does not exist, are reported as conditions.
- Status is written only when a value changes. The time of the last probe is not stored in status, because each write produces a watch event.

### Namespace scope and tags

The namespace selector (`any` or `matchNames`) and the tag rules in `docs/object-tag-filtering.md` carry over unchanged: untagged tiles are always visible, and tagged tiles are visible when one of their tags is in the URL path.

Tags are a view filter, not access control. The snapshot contains every tile and the browser applies the filter.

### RBAC

Read access to the supported source types and namespaces. Write access only to `applications` and `bookmarks` in `startpunkt.ullberg.us`, and only when an edit key is configured.

## API

All paths are under `/api/v1`. The JSON schema is versioned, because other Startpunkt instances depend on it as well as the browser.

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /state` | Open | Full snapshot: tiles, clusters with their connection state, UI configuration (title, theme, default language, search engine), and whether editing is available. Supports `ETag`. |
| `GET /events` | Open | SSE stream. Sends a full snapshot on every connect, then `tile.upsert`, `tile.delete` and `cluster.status` events. |
| `GET /unlock` | Edit key | Returns success when the supplied key is valid. Used by the UI to check a key when it is entered. |
| `POST /applications`, `PUT`/`DELETE /applications/{namespace}/{name}` | Edit key | Create, update and delete Application resources on the local cluster. Same for `/bookmarks`. |
| `GET /background` | Open | Proxy for the Bing image of the day, kept server-side because of CORS. |

A reconnecting client receives a fresh snapshot instead of a replay of missed events. The state is a few hundred tiles, so the server keeps no event log and there is no gap handling.

Write endpoints only change the custom resource. The UI updates when the resulting watch event arrives on the stream, so there is one code path for changes made in the UI and changes made with `kubectl`.

### Why not GraphQL

There is one client shape: the UI always needs every tile plus configuration. A fixed snapshot serves that, is cacheable, and needs no client library. Live updates over SSE are a plain HTTP response that browsers reconnect automatically and that passes through ingress controllers without WebSocket configuration. The tile schema is defined once and shared by the browser and by federation.

## Access and editing

- Reading is open by default. Anyone who can reach the page sees the tiles, and there are no user accounts.
- Personal preferences (favorites, layout, background, collapsed groups, cluster filter) can be changed by anyone. They are stored in that browser only and never reach the server.
- Editing applications and bookmarks requires an edit key. The operator supplies the key from a Kubernetes Secret.
- When no edit key is configured, editing is disabled: the write endpoints reject every request and the UI shows no unlock button.
- When a key is configured, the UI shows an unlock button. It prompts for the key, checks it against `GET /unlock`, and stores it in `localStorage`. While unlocked, tiles with `editable: true` show edit and delete controls, and the UI can create new applications and bookmarks. A lock action removes the stored key.
- The key is sent as `Authorization: Bearer <key>` on write requests. The server compares it in constant time and rate-limits failed attempts.
- The key is a shared secret, not a per-user identity. Anyone who has it can edit, and changes are not attributed to a person.
- A key in `localStorage` can be read by any script running on the page's origin. The UI therefore loads no third-party scripts, and all tile content is rendered as text.
- Operators who want to restrict reading put an authenticating proxy in front of the instance.

## Availability probing

- Each instance probes only its own tiles. It can reach in-cluster and internal-only services, and it checks from the vantage point that matters for that cluster.
- Results are stored on the tile. For Application resources, a change in availability is also written to `status`.
- v1 semantics carry over: 2xx, 3xx and 4xx count as available; 5xx and connection failures count as unavailable; failing targets use exponential backoff up to a cap, and a success resets it.
- A hub never probes remote tiles. It displays what the owning instance reports.

## Federation

Each instance is fully authoritative for its own cluster. A hub is another client of the same API.

- The hub is configured with a list of remotes: name, base URL, and optional request headers for remotes that sit behind an authenticating proxy.
- For each remote, the hub opens `GET /api/v1/events`, receives the snapshot, and applies events to its own store under that cluster's key.
- The cluster key is the name in the hub's own configuration, not the name the remote reports. Names must be unique within a hub, because they are part of the tile id.
- A remote needs no configuration to be federated and does not know it is being consumed.
- If a stream drops, the hub keeps the last known tiles, marks the cluster as stale with a last-seen time, and reconnects with backoff. The snapshot sent on reconnect replaces that cluster's tiles, which resynchronises it. The UI shows a stale cluster as unreachable instead of dropping its tiles.
- Remote tiles are read-only on the hub, whether or not the hub is unlocked. The UI links to the owning instance for editing. The hub holds no edit keys for remotes.
- A hub does not re-export tiles it received from remotes when it is itself consumed by another instance, which prevents loops and duplicate tiles.
- The hub always initiates the connection. A push mode, where a remote the hub cannot reach sends its state to an ingest endpoint on the hub, is a possible later addition. The store is keyed by cluster and fed by events either way, so adding it does not change the model.

### Identical tiles across clusters

The same service is often deployed to several clusters with the same name, group, icon and description. The design treats this as the normal case.

- Tiles are never merged or deduplicated by name. Two tiles are the same only when their `id` matches, and the id includes the cluster.
- Everything that refers to a tile uses the id: favorites, ordering, and edit and delete requests.
- Spotlight search results show the cluster next to the name, and the cluster name is searchable, so "grafana prod" finds one tile.
- The cluster filter is a personal preference. A configuration setting chooses whether a new visitor sees only the local cluster or all clusters, as in v1.

Two layouts are offered as a personal preference.

Cluster first: one section per cluster, with groups inside it. Each tile is its own card. No cluster pill is shown, because the section heading names the cluster.

Group only: groups contain tiles from all visible clusters. Each card shows a pill with its cluster name when more than one cluster is visible. In this layout, cards for the same service can be combined, which is a personal preference that is on by default:

```text
┌──────────────────────────────┐
│ ◉ Grafana                    │
│ Dashboards and metrics       │
│ [● prod] [● staging] [○ dev] │
└──────────────────────────────┘
```

- Tiles are combined when their name, group and kind match.
- The card shows one pill per cluster. Each pill is a link to that cluster's URL and carries that cluster's availability indicator, so every instance is one click away and its state is visible without expanding anything.
- Activating the card body opens the local cluster's tile when there is one, otherwise the tile of the first cluster in the hub's configured order. The icon and description are taken from the same tile.
- Combining is display only. The store, the API and the stored preferences still hold separate tiles.
- The favorite control on a combined card applies to the whole card: it adds or removes every member tile, and the card counts as a favorite when any member is one. With combining off, favorites are per tile.
- Edit and delete controls on a combined card act on the local cluster's tile only, since remote tiles are read-only.
- Each pill has an accessible name containing the service and the cluster, for example "Grafana on prod, available", so the links are distinguishable to screen readers and reachable by keyboard.

```text
cluster A: informers ─> store ─> prober ─┐
                                         ├─ /api/v1/state + /api/v1/events ──> browser
cluster B: informers ─> store ─> prober ─┤                              └───> hub store (cluster=B)
                                         └─ same API
```

## Frontend

- Preact with signals and TypeScript, built with Vite, output embedded in the binary.
- One signal holds the server state. It is fed by the `/events` stream.
- Themes are CSS custom properties, with a light and a dark palette supplied by configuration.
- Per-user state lives in `localStorage` behind one typed preferences module. The edit key is stored separately from preferences.
- Translations are static JSON files served with the bundle. Icons are fetched from the Iconify API as image data.
- Accessibility requirements from v1 carry over: keyboard navigation, ARIA labelling, visible focus, high-contrast mode.

## Configuration

A single YAML file mounted from a ConfigMap, with environment variable overrides. Sections: `namespaceSelector`, `sources` (built-in toggles, later `custom`), `availability`, `federation.remotes`, `web` (title, theme, default language, search engine, update check) and `editing` (reference to the edit key). The edit key itself comes from a Secret through an environment variable or a mounted file, never from the ConfigMap.

## Deployment

- Multi-stage container build producing a static binary on a distroless base.
- Helm chart with the generated CRDs, Deployment, Service, optional Ingress or Route, ServiceAccount and RBAC, an optional Secret for the edit key, and a ServiceMonitor for Prometheus metrics.
- No admission or conversion webhooks, so no certificates to manage.
- CRD installation can be turned off with `crds.install`, for running next to a v1 installation. All resource names derive from the release name and namespace.
- The process is stateless. More than one replica is safe: each builds its own store from the API server. Probing then runs once per replica; leader election for the prober and for status writes is a later optimisation.

## Testing

- Unit tests for each built-in adapter against fixture objects, including the annotation and tag rules.
- Integration tests against `envtest` (a real API server without a cluster): create resources, assert on the snapshot and the event stream. These include reading and writing through each deprecated CRD version, and running against the v1 definitions where `v1` is not served.
- API tests for the edit key: missing, wrong and valid keys, and editing disabled when no key is configured.
- Federation tests with two in-process instances, covering disconnect, stale marking and resynchronisation.
- Frontend component tests with Vitest and Testing Library.
- Tests never point at a real cluster.

## Coexistence with v1

A v2 instance can run next to a v1 instance on the same cluster, for evaluation before a cutover. Both only watch the cluster, so the same annotated resources and the same `Application` and `Bookmark` resources feed both. Either can edit the custom resources, and the other sees the change through its watch.

The custom resource definitions are the one shared, cluster-scoped piece. The v1 chart installs them as part of its release, serving `v1alpha1` to `v1alpha4` with an empty `status` schema. v2 is designed to run against those definitions unchanged:

- The controller uses the newest served version it supports: `v1` when it is served, otherwise `v1alpha4`. The schemas are identical, so only the watched version differs. Discovery already tells the controller which versions exist, and it switches when `v1` appears.
- The chart has a `crds.install` setting. When it is false, the release creates nothing cluster-scoped except its own RBAC, and the v1 installation is not touched.
- Status writes are best-effort. Against the v1 definitions the API server drops the status fields, so availability is visible in the v2 UI and API but not through `kubectl`. This is logged once at startup, not per write.
- All chart resources, including the ClusterRole and ClusterRoleBinding, are named from the release name and namespace, so they cannot collide with v1's fixed names.
- The two instances use different release names and hostnames. Running them in separate namespaces is recommended.

Limits while both are running:

- Hajimari resources appear in v1 and not in v2.
- Editing is open in v1 and needs the edit key in v2.
- Federation does not cross versions: a v2 hub cannot subscribe to a v1 instance, and a v1 instance cannot fetch from a v2 instance.
- Both instances probe the same applications, which doubles the probe traffic.

### Cutover

Uninstalling the v1 release deletes the custom resource definitions, because they are part of that release, and Kubernetes then deletes every `Application` and `Bookmark`. The cutover keeps the definitions in place:

1. Annotate both definitions with `helm.sh/resource-policy: keep`.
2. Uninstall the v1 release. The definitions and all custom resources remain.
3. Change the Helm ownership annotations and label on the definitions to the v2 release, and upgrade the v2 release with `crds.install: true`. This adds the `v1` version as the storage version and the status schema.
4. The controller switches to `v1` and status writes take effect.

Once `v1` is the storage version, going back to the v1 chart's definitions is not supported, because they do not serve the version the objects are stored in.

## Migration from v1

- Annotated resources need no changes.
- v1 and v2 can run side by side before the switch; see Coexistence with v1.
- `Application` and `Bookmark` resources at `v1alpha1` to `v1alpha4` keep working unchanged. Manifests can be moved to `v1` at any time by changing `apiVersion`.
- Hajimari is not supported. `hajimari.io` resources and annotations are ignored, and no migration is provided for them.
- v1 remote cluster configuration (`graphql-url`, `graphql-token`) maps to `federation.remotes`. A v2 hub cannot consume a v1 instance, so remotes are upgraded before the hub.
- Editing was open in v1. In v2 it requires an edit key to be configured.
- The v1 GraphQL endpoint and the WebSocket endpoint are removed.

## Decisions

- Go as the implementation language.
- Single store with snapshot plus SSE; no GraphQL.
- Every SSE connection starts with a full snapshot; no event replay.
- Built-in sources are plain Go adapters. CEL mappings for user-defined sources come later.
- No conversion webhook. Older CRD versions are served with `conversion: None` and a shared schema.
- Status is written only on change.
- v2 can run next to v1 on one cluster: it falls back to `v1alpha4` when `v1` is not served, and the chart can skip installing the CRDs.
- Reading is open by default. Editing requires an edit key entered through an unlock button and stored in `localStorage`.
- Federation between instances instead of cross-cluster credentials, with probing done by the owning instance.
- The hub subscribes to remotes. Push from remotes is optional future work.
- Remote tiles are read-only on the hub.
- Hajimari is not supported; its resources and annotations are ignored.

## Milestones

1. Skeleton: binary, store, Application and Bookmark `v1` types, snapshot endpoint, minimal UI that renders tiles.
2. Sources: built-in adapters, discovery, annotations, tags, namespace selector, `urlFrom`.
3. Live updates: SSE stream, UI driven by events.
4. Availability: prober, status subresource.
5. Editing: edit key, unlock flow, write endpoints and editors in the UI.
6. Federation: remote subscription, stale handling, cluster filter in the UI.
7. UI parity: spotlight search, favorites, layout and background preferences, themes, i18n, accessibility.
8. Packaging: Helm chart with all CRD versions and the `crds.install` setting, cutover and migration notes, documentation.
9. User-defined CEL mappings.

# Startpunkt v5 design

Status: accepted. This document describes a ground-up rewrite developed on the `v5` branch. It does not reuse 4.x code or keep 4.x design choices, with one fixed requirement: the start page is still populated from Kubernetes resources (Startpunkt custom resources, annotated Ingresses, Routes, HTTPRoutes, VirtualServices).

Version names in this document: "4.x" is the current Quarkus-based Startpunkt and "v5" is the rewrite. The API path `/api/v1` and the custom resource version `v1` are versioned on their own and are unrelated to the product version.

## Summary

Startpunkt v5 is a small controller that keeps one in-memory model of its own cluster and streams it to a static frontend.

- One Go binary with the frontend embedded. It runs as a single process, or split into roles that each do one job.
- One normalized store fed by Kubernetes informers, with one read path out of it.
- A REST snapshot plus a Server-Sent Events (SSE) change stream instead of GraphQL.
- Built-in source adapters for the natively supported resource types, with user-defined mappings for other types as a later addition.
- Multi-cluster by federation: each instance is authoritative for its own cluster, and a hub subscribes to other instances through the same API the browser uses.
- Open for reading by default. Editing is unlocked in the UI with an API key.

## Goals

- Keep the user-visible 4.x capabilities: applications and bookmarks from cluster resources, grouping, tags, availability indicators, live updates, in-UI editing, multi-cluster, themes, i18n, spotlight search, favorites and layout preferences.
- Allow operators to add support for a resource type through configuration, without a new release.
- Remove polling between browser and server, and between instances.
- Hold no cross-cluster Kubernetes credentials.
- Small footprint: a container image in the tens of megabytes, fast startup, low idle memory.

## Non-goals

- API compatibility with the 4.x GraphQL endpoint.
- Source compatibility with 4.x Java or JSX code.
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

### Process roles

The binary takes a role as its argument. Every role is the same image, and each is a stateless process configured through its environment.

| Role | Runs | Kubernetes credentials |
| --- | --- | --- |
| `all` | Everything in one process. The default. | Read access to the source types |
| `controller` | Source adapters and the store. Serves the API to other roles inside the cluster. | Read access to the source types |
| `api` | The API for browsers, from a store that follows a controller. | None |
| `web` | The frontend files. | None |

```text
single:  browser ──> all (informers, store, API, page)

split:   browser ──/api──> api ──SSE──> controller ──watch──> Kubernetes API
                 └──/────> web
```

- The roles talk to each other with the public protocol: `api` subscribes to the controller's `GET /api/v1/events`, receives a snapshot and then changes, and mirrors them into its own store. There is no broker and no shared database.
- In `all` the same components share one store in one process, so there is one code path and the split adds no logic of its own.
- The processes that are reachable from outside hold no Kubernetes credentials in split mode.
- When the controller is unreachable, `api` keeps serving the last known tiles, reports the cluster as stale, and reconnects with backoff. The snapshot sent on reconnect resynchronises it. This is the mechanism federation uses for a remote instance.
- Readiness follows the store: a process is ready once its local cluster has finished the initial list, whether it read the cluster itself or learned it from the controller.
- Later roles follow the same pattern: the prober and the write endpoints can each run as their own role, so that only the role that writes holds write access.

There is no cache layer and no cache invalidation. The store is always the current informer state, and every consumer learns about a change from the same event.

### Data model

Applications and bookmarks are one type, `Tile`, with a `kind` field.

| Field | Notes |
| --- | --- |
| `id` | Stable identity: cluster, source, namespace, name, and an index when one object yields several tiles. |
| `kind` | `application` or `bookmark`. |
| `cluster` | Name of the owning instance. |
| `name`, `group`, `url`, `icon`, `iconColor`, `info`, `targetBlank`, `location`, `tags` | Display fields, matching the 4.x annotation and spec fields. |
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

Every built-in source can be disabled, and the non-Startpunkt ones have an `onlyAnnotated` setting as in 4.x.

How each type becomes tiles:

| Type | Tiles | URL scheme |
| --- | --- | --- |
| Route | One, from `spec.host` and `spec.path`. | `https` when the Route has a `tls` section. |
| Ingress | One per host in `spec.rules`. | `https` for a host that a `tls` entry covers. |
| HTTPRoute | One per entry in `spec.hostnames`. | The `protocol` annotation, otherwise the source's `defaultProtocol`. The Gateway decides this, not the route. |
| VirtualService | One per entry in `spec.hosts`. | As for HTTPRoute. |

- Wildcard hosts yield no tile, because they name no single place to link to.
- The `url` annotation replaces everything derived from the spec with one tile.
- The tiles of one object share its name, group and other display fields. Their ids differ by index.
- With `onlyAnnotated` off, every object of the type is shown unless it is annotated `enable: "false"`.
- Ingresses can be limited to a list of ingress classes, read from `spec.ingressClassName` or the older `kubernetes.io/ingress.class` annotation.
- Tiles from annotated objects are not editable.

Differences from 4.x, which are deliberate:

- 4.x derives no URL from an Ingress and shows only the first host of an HTTPRoute or VirtualService.
- 4.x lower-cases names, URLs, icons and descriptions taken from annotations and names from custom resources. v5 keeps them as written. Group names are still lower-cased, so that `Media` and `media` are one group.
- 4.x returns disabled Applications to the page. v5 leaves them out of the snapshot.
- Only `startpunkt.ullberg.us/*` annotations are read. The `hajimari.io` and `forecastle.stakater.com` equivalents are ignored.
- An annotation that cannot be parsed, such as a `port` that is not a number, removes the object's tiles and is logged, instead of being silently ignored.

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

`Application.spec.urlFrom` keeps its 4.x behaviour: the URL is read from a field of another object (`apiGroup`, `apiVersion`, `kind`, `name`, `namespace`, `property`), optionally formatted with `urlTemplate`. The controller watches the referenced object so the tile updates when it changes.

- The kind is mapped to its resource through API discovery, not by guessing a plural.
- Each referenced object gets a watch limited to that one object by name. The watch stops when no Application refers to it any more.
- A reference that resolves wins over `spec.url`. When it does not resolve, `spec.url` is used if set; otherwise the Application has no tile until the reference resolves.
- The controller needs `get`, `list` and `watch` on the referenced type. The chart grants this for the source types and takes further rules from `rbac.extraRules`.

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
- The status holds `url`, `available`, and two conditions. `Resolved` is false with the reason when the spec cannot be turned into a tile, for example when a `urlFrom` target does not exist. `Available` is true, false, or unknown before the first probe.
- Status writes are best-effort and can be turned off. When the API server refuses them or drops the fields, the controller says so once and stops until the watched version changes.

### Namespace scope and tags

The namespace selector (`any` or `matchNames`) and the tag rules in `docs/object-tag-filtering.md` carry over unchanged: untagged tiles are always visible, and tagged tiles are visible when one of their tags is in the URL path. With `matchNames`, the controller runs one watch per listed namespace instead of a cluster-wide one.

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
| `GET /background` | Open | Address, title and copyright of the Bing picture of the day. The lookup is server-side because of CORS and is kept for an hour; the browser loads the picture itself from Bing. The page sends the size of the screen, and the answer names the size of picture that suits it. Served by the roles a browser talks to. |

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
- Only applications are probed. Bookmarks mostly point at sites outside the cluster and carry no availability, as in 4.x.
- The prober runs in the process that watches the cluster: the `all` role, or `controller` in split mode. It reads its targets from the store and writes results back to it, so it has no interface of its own.
- A URL shared by several tiles is probed once. Redirects are not followed: a redirect is an answer, and following it would probe some other place.
- A probe sends a GET to a URL taken from a cluster resource, from inside the cluster. Whoever can create an Application or annotate a Route can therefore make the controller send that request. Only whether an answer came back is kept; nothing from the response is exposed.
- Results are stored on the tile. For Application resources, a change in availability is also written to `status`.
- `lastProbe` is the time of the probe that established the current value. A probe that confirms what is known changes nothing, so it produces no event and no status write.
- 4.x semantics carry over: 2xx, 3xx and 4xx count as available; 5xx and connection failures count as unavailable; failing targets use exponential backoff up to a cap, and a success resets it.
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
- The cluster filter is a personal preference. A configuration setting chooses whether a new visitor sees only the local cluster or all clusters, as in 4.x.

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
- The page shows the last known tiles while the stream is down and, once it has been down for five seconds, says that it is reconnecting. Shorter drops are not announced: a server restart, a proxy reload or a laptop waking up are over before anyone needs to know. The browser reconnects a dropped stream on its own; when the server answers with an error instead, which a browser treats as final, the page opens a new stream with backoff.
- Browsers allow about six HTTP/1.1 connections per host, and each open tab holds one for the stream. Serving the page over HTTP/2 removes that limit.
- Icons without a colour of their own are drawn in the theme's secondary colour (`bodyColor`), so that they stand apart from the names. Content starts at the top of each tile, so icons and names line up across a row whatever the length of the descriptions.
- Themes are CSS custom properties, with a light and a dark palette supplied by configuration. A palette has the five colour names of 4.x (`bodyBgColor`, `bodyColor`, `emphasisColor`, `textPrimaryColor`, `textAccentColor`), so an existing theme carries over; surfaces and borders are derived from them in the stylesheet. The visitor chooses light, dark, or to follow the system.
- Per-user state lives in `localStorage` behind one typed preferences module. The edit key is stored separately from preferences. Whatever is read from storage is checked value by value and replaced by its default when it does not fit, so data from an older version or edited by hand cannot break the page.
- Applications and bookmarks are on two tabs at the top right of the content, above the favorites. The page opens on the applications, or on the bookmarks when there are no applications. A kind with nothing to show has no tab, and with only one kind there are no tabs at all.
- Until the first snapshot arrives the page shows placeholders in the shape of its content, and says in words that it is loading.
- With columns on "auto", each list gets the number of columns that needs the fewest rows, up to five, and among those the smallest, so rows come out even. Bookmark groups all use the columns of the largest group, so that their tiles line up under each other. A fixed number applies to every list. Neither exceeds what the window has room for, and a narrow screen fits what it can.
- Preferences: theme mode, language, a handwritten typeface, favorites and their order, collapsed groups, layout (columns, spacing, compact tiles, a box around each tile, which is off by default, descriptions, tags, status indicators, hiding unreachable applications), background, presets, and accessibility (text size, high contrast).
- Backgrounds: the Bing picture of the day, which is the default, the theme, a solid colour, a gradient, a gradient that follows the time of day, a mesh gradient that can move slowly, an image by URL, and a geometric pattern generated from a piece of text. Each can be made more transparent, pictures can be blurred, and a panel behind the content keeps text readable. As in 4.x the panel runs from solid white through none to solid black, and is 70% black by default. While there is a panel it decides the mode: the light theme on a white panel, the dark theme on a black one, whatever the visitor's theme setting. It blurs what shows through it, which can be turned off.
- A preset is a named snapshot of the layout and the background. Applying one restores both.
- A favorite is shown once: in the favorites row of its tab, in the visitor's order, and not in its group. The row has no heading, is as wide as its favorites need, and is centred. The order is changed by dragging one favorite onto another, or with the two buttons on each favorite, which do the same from the keyboard and announce the new position.
- Spotlight search opens with `/`, with Ctrl+K, or by simply starting to type anywhere on the page, in which case it starts with what was typed. Results show each tile's icon and tags. It matches every word of the query against name, group, description, tags, cluster and host. A query that starts with `?` goes to the configured search engine.
- Dialogs are native `dialog` elements, which keep focus inside, close on Escape and make the rest of the page inert. The settings dialog has one tab per area.
- The page fetches nothing but pictures from other hosts. The handwritten typeface is part of the bundle, not loaded from a font service, and the pattern is generated in the page. The mesh animation is off for visitors whose system asks for reduced motion.
- v5 replaces what 4.x does, not how: a pattern text gives a different pattern than in 4.x, and stored 4.x preferences are not read.
- Not carried over from 4.x: the Lorem Picsum picture provider, whose service no longer answers, the "what's new" dialog, the update check and the GitHub ribbon.
- Translations are static JSON files served with the bundle: English is part of it and is the fallback for any missing key, other languages are fetched when chosen. The language is the visitor's choice, else the first of the browser's languages that is available, else the configured default. A test checks that every language has the same keys and placeholders. Icons are fetched from the Iconify API as image data.
- Accessibility requirements from 4.x carry over: keyboard navigation, ARIA labelling, visible focus, high-contrast mode.

## Configuration

Every setting can be given as an environment variable named `STARTPUNKT_<SECTION>_<KEY>`, and the chart configures the processes that way. A YAML file with the same settings is an alternative for settings that do not fit a variable well, such as lists; the environment takes precedence over the file. The role is the process argument, or `STARTPUNKT_ROLE`. Sections: `namespaceSelector`, `sources` (built-in toggles, later `custom`), `availability`, `federation.remotes`, `web` (title, theme, default language, search engine, update check), `editing` (reference to the edit key), `cluster` (the name of this instance), `upstream` (the controller the `api` role follows), `server` and `log`. The edit key itself comes from a Secret through an environment variable or a mounted file, never from the ConfigMap.

## Deployment

- Multi-stage container build producing a static binary on a distroless base.
- The chart has a `mode` setting. `single` creates one Deployment running the `all` role. `split` creates one Deployment per role, mounts a service account token only in the controller, and routes `/api` to `api` and everything else to `web` on one host.
- Helm chart with the generated CRDs, Deployment, Service, optional Ingress or Route, ServiceAccount and RBAC, an optional Secret for the edit key, and a ServiceMonitor for Prometheus metrics.
- No admission or conversion webhooks, so no certificates to manage.
- CRD installation can be turned off with `crds.install`, for running next to a 4.x installation. All resource names derive from the release name and namespace.
- Every process is stateless and logs to standard output. More than one replica is safe: each builds its own store from the API server, or from the controller in split mode. In split mode `api` and `web` scale without adding informers. Probing then runs once per replica; leader election for the prober and for status writes is a later optimisation.

## Testing

- Unit tests for each built-in adapter against fixture objects, including the annotation and tag rules.
- Integration tests against `envtest` (a real API server without a cluster): create resources, assert on the snapshot and the event stream. These include reading and writing through each deprecated CRD version, and running against the 4.x definitions where `v1` is not served.
- API tests for the edit key: missing, wrong and valid keys, and editing disabled when no key is configured.
- Federation tests with two in-process instances, covering disconnect, stale marking and resynchronisation.
- Frontend component tests with Vitest and Testing Library.
- Tests never point at a real cluster.

## Coexistence with 4.x

A v5 instance can run next to a 4.x instance on the same cluster, for evaluation before a cutover. Both only watch the cluster, so the same annotated resources and the same `Application` and `Bookmark` resources feed both. Either can edit the custom resources, and the other sees the change through its watch.

The custom resource definitions are the one shared, cluster-scoped piece. The 4.x chart installs them as part of its release, serving `v1alpha1` to `v1alpha4` with an empty `status` schema. v5 is designed to run against those definitions unchanged:

- The controller uses the newest served version it supports: `v1` when it is served, otherwise `v1alpha4`. The schemas are identical, so only the watched version differs. Discovery already tells the controller which versions exist, and it switches when `v1` appears.
- The chart has a `crds.install` setting. When it is false, the release creates nothing cluster-scoped except its own RBAC, and the 4.x installation is not touched.
- Status writes are best-effort. Against the 4.x definitions the API server drops the status fields, so availability is visible in the v5 UI and API but not through `kubectl`. This is logged once at startup, not per write.
- All chart resources, including the ClusterRole and ClusterRoleBinding, are named from the release name and namespace, so they cannot collide with 4.x's fixed names.
- The two instances use different release names and hostnames. Running them in separate namespaces is recommended.

Limits while both are running:

- Hajimari resources appear in 4.x and not in v5.
- Editing is open in 4.x and needs the edit key in v5.
- Federation does not cross versions: a v5 hub cannot subscribe to a 4.x instance, and a 4.x instance cannot fetch from a v5 instance.
- Both instances probe the same applications, which doubles the probe traffic.

### Cutover

Uninstalling the 4.x release deletes the custom resource definitions, because they are part of that release, and Kubernetes then deletes every `Application` and `Bookmark`. The cutover keeps the definitions in place:

1. Annotate both definitions with `helm.sh/resource-policy: keep`.
2. Uninstall the 4.x release. The definitions and all custom resources remain.
3. Change the Helm ownership annotations and label on the definitions to the v5 release, and upgrade the v5 release with `crds.install: true`. This adds the `v1` version as the storage version and the status schema.
4. The controller switches to `v1` and status writes take effect.

Once `v1` is the storage version, going back to the 4.x chart's definitions is not supported, because they do not serve the version the objects are stored in.

## Migration from 4.x

- Annotated resources need no changes.
- 4.x and v5 can run side by side before the switch; see Coexistence with 4.x.
- `Application` and `Bookmark` resources at `v1alpha1` to `v1alpha4` keep working unchanged. Manifests can be moved to `v1` at any time by changing `apiVersion`.
- Hajimari is not supported. `hajimari.io` resources and annotations are ignored, and no migration is provided for them.
- 4.x remote cluster configuration (`graphql-url`, `graphql-token`) maps to `federation.remotes`. A v5 hub cannot consume a 4.x instance, so remotes are upgraded before the hub.
- Editing was open in 4.x. In v5 it requires an edit key to be configured.
- The 4.x GraphQL endpoint and the WebSocket endpoint are removed.

## Decisions

- Go as the implementation language.
- One image with roles. It runs as a single process or split into `controller`, `api` and `web`, and the roles talk to each other with the public snapshot and event stream.
- Configuration is environment-first, with a YAML file as an alternative.
- Single store with snapshot plus SSE; no GraphQL.
- Every SSE connection starts with a full snapshot; no event replay.
- Built-in sources are plain Go adapters. CEL mappings for user-defined sources come later.
- No conversion webhook. Older CRD versions are served with `conversion: None` and a shared schema.
- Status is written only on change.
- v5 can run next to 4.x on one cluster: it falls back to `v1alpha4` when `v1` is not served, and the chart can skip installing the CRDs.
- Reading is open by default. Editing requires an edit key entered through an unlock button and stored in `localStorage`.
- Federation between instances instead of cross-cluster credentials, with probing done by the owning instance.
- The hub subscribes to remotes. Push from remotes is optional future work.
- Remote tiles are read-only on the hub.
- Hajimari is not supported; its resources and annotations are ignored.

## Milestones

Every milestone ends with an image that runs next to a 4.x installation on a real cluster, so each step is compared against 4.x on the same data.

1. Skeleton, deployable: binary with its roles, store, `Application` and `Bookmark` types with the fallback to `v1alpha4`, snapshot endpoint, the server side of the event stream and the follower that the split mode needs, minimal UI that renders tiles, container build, and a minimal chart with both modes, `crds.install: false` and release-based names.
2. Sources: built-in adapters in the order Route, Ingress, HTTPRoute, VirtualService; discovery, annotations, tags, namespace selector, `urlFrom`. At the end of this milestone the page lists the same applications as 4.x, apart from Hajimari resources.
3. Live updates: UI driven by the event stream.
4. Availability: prober and status writes. Status cannot be verified through `kubectl` until the cutover, because the 4.x definitions have an empty status schema.
5. UI parity: spotlight search, favorites, layout and background preferences, themes, i18n, accessibility.
6. Editing: edit key, unlock flow, write endpoints and editors in the UI.
7. Federation: remote subscription, stale handling, cluster filter, cluster pill, both layouts and combined cards. Testing needs v5 on at least two clusters.
8. Release packaging: full chart with all CRD versions, the cutover procedure tested end to end, migration notes, documentation.
9. User-defined CEL mappings. This can follow the first release.

# Startpunkt v5 design

Status: implemented and released as 5.0.0. This document describes the ground-up rewrite that replaced 4.x, and is kept up to date as the design of the current code. It does not reuse 4.x code or keep 4.x design choices, with one fixed requirement: the start page is still populated from Kubernetes resources (Startpunkt custom resources, annotated Ingresses, Routes, HTTPRoutes, VirtualServices).

Version names in this document: "4.x" is the Quarkus-based Startpunkt that came before, whose code is in the history of the repository up to the tag `v4.8.0`, and "v5" is the rewrite. What may come next is in the [roadmap](roadmap.md). The API path `/api/v1` and the custom resource version `v1` are versioned on their own and are unrelated to the product version.

## Summary

Startpunkt v5 is a small controller that keeps one in-memory model of its own cluster and streams it to a static frontend.

- One Go binary with the frontend embedded. It runs as a single process, or split into roles that each do one job.
- One normalized store fed by Kubernetes informers, with one read path out of it.
- A REST snapshot plus a Server-Sent Events (SSE) change stream instead of GraphQL.
- Built-in source adapters for the natively supported resource types, and user-defined mappings, written as CEL expressions, for other types.
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
| `editable` | True when the tile is backed by a Startpunkt custom resource on the local cluster that neither Argo CD nor Helm deploys. |
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
- An `Application` or `Bookmark` that Argo CD or Helm deploys is not editable either: a change made in the cluster would be undone at the next sync or upgrade. It is recognised by what they put on the object: the annotations `argocd.argoproj.io/tracking-id` and `meta.helm.sh/release-name`, and the labels `argocd.argoproj.io/instance`, `app.kubernetes.io/instance` and `app.kubernetes.io/managed-by`. A resource made on the page or by hand carries none of them. The controller's editor checks the same thing before an update or a delete and answers 409, since the endpoints can be called without the page.

Differences from 4.x, which are deliberate:

- 4.x derives no URL from an Ingress and shows only the first host of an HTTPRoute or VirtualService.
- 4.x lower-cases names, URLs, icons and descriptions taken from annotations and names from custom resources. v5 keeps them as written. Group names are still lower-cased, so that `Media` and `media` are one group.
- 4.x returns disabled Applications to the page. v5 leaves them out of the snapshot.
- Only `startpunkt.ullberg.us/*` annotations are read. The `hajimari.io` and `forecastle.stakater.com` equivalents are ignored.
- An annotation that cannot be parsed, such as a `port` that is not a number, removes the object's tiles and is logged, instead of being silently ignored.

### User-defined mappings

Operators can add sources for other resource types, for example Traefik `IngressRoute`, through the settings. A mapping names a group, version and resource, and gives a CEL expression for where an object is served. It is one more adapter behind the same interface, so the store, API and UI are unaffected.

```yaml
sources:
  custom:
    - name: traefik
      apiGroup: traefik.io
      version: v1alpha1
      resource: ingressroutes
      onlyAnnotated: true
      defaultProtocol: https
      url: "object.spec.routes.map(r, hostFromRule(r.match))"
      tileName: "object.metadata.name"
```

- The mapping only has to say what is particular to the type: the address. Everything else is shared with the built-in annotated sources. The `startpunkt.ullberg.us` annotations name the tile, group it, show or hide it, and adjust the address, and `onlyAnnotated` means the same. The first sketch of this had expressions calling an `annotation()` function for each field; reusing the annotation handling made that unnecessary, and a mapping is usually one line.
- `url` gives a string or a list of strings. Each is an address with its scheme, or a bare host, optionally with a path. To a bare host the `protocol`, `port` and `rootPath` annotations apply as for a built-in source; to an address with its scheme only `rootPath` does. Only `http` and `https` addresses are accepted.
- `tileName`, `tileGroup`, `icon` and `info` are optional expressions for what a tile shows when the object has no annotation for it.
- Expressions see the object as `object`, the standard CEL functions, the string extensions, and `hostFromRule` and `hostsFromRule` for routing rules. An expression has a cost limit, so one that does far more work than a single object warrants is stopped.
- A mapping names the plural resource, not the kind: that is what is watched, and it needs no lookup.
- A mapping that fails to compile is rejected with the expression and the error. From a `Startpunkt` resource that means the settings are not applied and the status says why; from the environment the process does not start.
- A mapping that fails on a specific object is logged with the object reference and skips that object only. An object without the `enable` annotation, under `onlyAnnotated`, is not evaluated.
- A resource type that has a built-in source cannot be mapped, also while that source is turned off.
- The chart grants `get`, `list` and `watch` on each mapped type.

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

- `startpunkt.ullberg.us/v1` is the storage version for `Application` and `Bookmark`. Types are defined once in Go and the CRD YAML is generated with controller-gen. A small program, `hack/crdversions`, then adds the older versions as copies of `v1`; `make crds` runs both.
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
| `GET /state` | Open | Full snapshot: tiles, clusters with their connection state, UI configuration (title, theme, default language, search engine, whether every cluster is shown from the start, the default preferences), and whether editing is available and in which namespace new resources go. Supports `ETag`. |
| `GET /events` | Open | SSE stream. Sends a full `snapshot` on every connect, then `tile.upsert`, `tile.delete`, `cluster.status`, `cluster.delete` and, when the settings of the page change, `config` events. A comment line every 15 seconds keeps proxies from closing an idle stream. |
| `GET /unlock` | Edit key | Returns success when the supplied key is valid. Used by the UI to check a key when it is entered. |
| `POST /check` | Edit key | Probes an `http` or `https` address once, the way the availability prober does, and answers only whether something is there. The editor shows it next to the address. In split mode the `api` role asks the controller, which is the process that probes. |
| `GET /icons?query=` | Open | The names of icons that match a word, asked of the icon service by the server and kept for an hour. Only names of the form `set:name` are passed on. |
| `POST /applications`, `GET`/`PUT`/`DELETE /applications/{namespace}/{name}` | Edit key | Create, read, update and delete Application resources on the local cluster. Same for `/bookmarks`. Reading returns the spec as it is stored, which the editor needs because a tile does not carry all of it: `urlFrom` and `rootPath` are resolved into the tile's address. |
| `GET /version` | Open | The running version and, when update checking is on, the newer release if there is one. |
| `GET /changelog` | Open | What changed in each release, newest first, as lines of text under the headings of the changelog. The entries of the running version and of those before it come from `CHANGELOG.md`, which is embedded in the binary. When update checking has found a newer release, the entries between the running version and that release come first. |
| `GET /icons/{set}/{name}.svg` | Open | An Iconify icon, optionally in a given colour. The instance fetches each icon from the Iconify API once and keeps it in memory, a few at a time, so browsers never ask the icon service themselves. Icons of one set that are asked for within a moment of each other go out as one request, because the public API refuses a client that asks for icons one by one. The address of the Iconify API is a setting, so a self-hosted one can be used instead of the public one. An icon that does not exist is remembered as missing for an hour. |
| `GET /background` | Open | Address, title and copyright of the Bing picture of the day. The lookup is server-side because of CORS and is kept for an hour; the browser loads the picture itself from Bing. The page sends the size of the screen, and the answer names the size of picture that suits it. Served by the roles a browser talks to. |

A reconnecting client receives a fresh snapshot instead of a replay of missed events. The state is a few hundred tiles, so the server keeps no event log and there is no gap handling.

Write endpoints only change the custom resource. The UI updates when the resulting watch event arrives on the stream, so there is one code path for changes made in the UI and changes made with `kubectl`.

### Why not GraphQL

There is one client shape: the UI always needs every tile plus configuration. A fixed snapshot serves that, is cacheable, and needs no client library. Live updates over SSE are a plain HTTP response that browsers reconnect automatically and that passes through ingress controllers without WebSocket configuration. The tile schema is defined once and shared by the browser and by federation.

## Access and editing

- Reading is open by default. Anyone who can reach the page sees the tiles, and there are no user accounts.
- Personal preferences (favorites, layout, background, collapsed groups, cluster filter) can be changed by anyone. They are stored in that browser only and never reach the server.
- Editing applications and bookmarks requires an edit key. The operator supplies the key from a Kubernetes Secret.
- When no edit key is configured, editing is disabled: the write endpoints do not exist, so a request to one is answered with 404, and the UI shows no unlock button.
- When a key is configured, the UI shows an unlock button and a button that adds a tile while the page is in edit mode (see the frontend section). Unlocking prompts for the key, checks it against `GET /unlock`, and stores it in `localStorage`. Adding on a locked page asks for the key first and then goes on. While unlocked and in edit mode, tiles with `editable: true` show an edit control, whose form also deletes, and the UI can create new applications and bookmarks: the form for a new one opens on the kind of the tab that is shown and lets the other be chosen. A lock action removes the stored key; leaving edit mode keeps it.
- The key is sent as `Authorization: Bearer <key>` on write requests. The server compares it in constant time and rate-limits failed attempts. The limit is for the whole process, not per client, because behind a proxy a client's address is whatever the request claims: after ten wrong keys in a row every attempt is refused until one is earned back, six seconds each. Someone who keeps guessing can keep editing locked, and no more than that.
- Only the controller can write to the cluster. In split mode the `api` role checks the key and hands the request to the controller over the internal address, and the controller checks the key again, since anything inside the cluster can reach it. Both get the key from the same Secret.
- The editor's form checks the fields before sending them (what is required, the form of an address, a whole number, a colour) and says what is wrong next to the field; the server's validation remains what decides. The group field offers the groups in use, tags are entered one by one and stored as the comma-separated list the resource has, and the icon is chosen from a search of the icon sets or typed.
- What is written is validated first: the spec is decoded strictly against the resource's fields, required fields have to be there, and an address has to be `http` or `https`. A namespace has to be one the instance reads.
- A new resource is created in the namespace the instance is configured with, the release's own by default, under a name derived from the tile's name. A request to the API may name another namespace that the instance reads, and a name.
- The key is never part of the `Startpunkt` resource or the configuration file. It has to be at least 16 characters long.
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
- 4.x semantics carry over: 2xx, 3xx and 4xx count as available, and so does a server whose certificate cannot be verified, because it answered and nothing is sent to it; 5xx and connection failures count as unavailable; failing targets use exponential backoff up to a cap, and a success resets it.
- A hub never probes remote tiles. It displays what the owning instance reports.

## Federation

Each instance is fully authoritative for its own cluster. A hub is another client of the same API.

- The hub is configured with a list of remotes: name, base URL, and optional request headers for remotes that sit behind an authenticating proxy. A remote's TLS certificate is verified unless that remote is marked `insecureSkipVerify`, which is for certificates the hub cannot verify, such as self-signed ones.
- The roles a browser talks to are the hub: `all`, or `api` in split mode. The controller does not federate.
- Each source of mirrored tiles is a feed with a name of its own: the instance's own controller, and one per remote. A snapshot from one feed replaces only what that feed brought, so remotes cannot disturb each other or the local tiles.
- A remote is listed as a cluster before it has been reached, so the page can say that it is not connected.
- What is taken from a remote can be limited per remote with `include` and `exclude`: by name and group, as patterns, by tag and by kind. Without `include` everything is taken, and `exclude` leaves tiles out, also among the included. The filter is applied by the hub as tiles arrive, so a tile that changes into or out of the selection appears or disappears.
- For each remote, the hub opens `GET /api/v1/events`, receives the snapshot, and applies events to its own store under that cluster's key.
- The cluster key is the name in the hub's own configuration, not the name the remote reports. Names must be unique within a hub, because they are part of the tile id.
- A remote needs no configuration to be federated and does not know it is being consumed.
- If a stream drops, the hub keeps the last known tiles, marks the cluster as stale, and reconnects with backoff. The snapshot sent on reconnect replaces that cluster's tiles, which resynchronises it. The UI shows a stale cluster as unreachable instead of dropping its tiles.
- Remote tiles are read-only on the hub, whether or not the hub is unlocked. The UI links to the owning instance for editing. The hub holds no edit keys for remotes.
- A hub does not re-export tiles it received from remotes when it is itself consumed by another instance, which prevents loops and duplicate tiles. This is done on the receiving side: a hub takes from a remote only the tiles of the clusters that the remote marks as its own.
- The hub always initiates the connection. A push mode, where a remote the hub cannot reach sends its state to an ingest endpoint on the hub, is a possible later addition. The store is keyed by cluster and fed by events either way, so adding it does not change the model.

### Identical tiles across clusters

The same service is often deployed to several clusters with the same name, group, icon and description. The design treats this as the normal case.

- Tiles are never merged or deduplicated by name. Two tiles are the same only when their `id` matches, and the id includes the cluster.
- Everything that refers to a tile uses the id: favorites, ordering, and edit and delete requests.
- Spotlight search results name the cluster when more than one is shown, and the cluster name is searchable, so "grafana prod" finds one tile.
- The cluster filter is a personal preference. With more than one cluster, the page has one button per cluster above the tiles. A click shows that cluster alone, a second click on it shows all again, and a click with Shift, Ctrl or Command held adds or removes one. The settings have a checkbox per cluster for the same. A cluster that is not connected is marked on its button. A visitor who has made no choice sees the local cluster only, and the buttons of the other clusters are there to switch them on. The `web.showAllClusters` setting makes every cluster shown from the start instead. A choice the visitor has made about a cluster, either way, is kept.

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
- Every cluster has a colour of its own, taken from a fixed set of eight by its place in the list of clusters: the local one first, then the others by name. The colour is on the cluster's pills and on its button above the tiles, always next to its name.
- The card shows one pill per cluster. Each pill is a link to that cluster's URL and carries that cluster's availability indicator, so every instance is one click away and its state is visible without expanding anything.
- Activating the card body opens the local cluster's tile when there is one, otherwise the tile of the first cluster in that list. The icon and description are taken from the same tile.
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
- Icons without a colour of their own and group headings are drawn in the theme's secondary colour (`bodyColor`), names in `textPrimaryColor`, descriptions in `textAccentColor`, both in upper case, so that the three stand apart. A line under each group heading separates the groups. Keyboard focus is always shown, by an outline on the tile's link, whether or not the hover highlight is on. Content starts at the top of each tile, so icons and names line up across a row whatever the length of the descriptions.
- Themes are CSS custom properties, with a light and a dark palette supplied by configuration. A palette has the five colour names of 4.x (`bodyBgColor`, `bodyColor`, `emphasisColor`, `textPrimaryColor`, `textAccentColor`), so an existing theme carries over; surfaces and borders are derived from them in the stylesheet. The visitor chooses light, dark, or auto, and can replace the configured pair with one of ten pairs built into the page (`web/src/palettes.ts`), each held by a test to a contrast between its text colours and its background. Auto follows the system only where no panel is shown behind the content; with a panel, which the default background has, the panel decides, as described under backgrounds below.
- An instance can say what a browser's preferences start from: `web.defaultPreferences` is an object in the form the page stores preferences in, passed to the page with the rest of its configuration. The server only checks that it is an object of moderate size; the page checks every value the way it checks what it reads from storage, and uses its own default for what does not fit or is left out. A browser that has stored nothing uses these and follows them when they change, and a reset goes back to them, keeping favorites, collapsed groups, the cluster choice and presets. The setting is one opaque object and not a list of typed fields, so that a new preference of the page needs no change to the resource definition.
- Per-user state lives in `localStorage` behind one typed preferences module. The edit key is stored separately from preferences, and so is a copy of the colours last used, which the script that paints the first frame reads. Whatever is read from storage is checked value by value and replaced by its default when it does not fit, so data from an older version or edited by hand cannot break the page.
- Applications and bookmarks are on two tabs at the top right of the content, above the favorites. The page opens on the applications, or on the bookmarks when there are no applications. A kind with nothing to show has no tab, and with only one kind there are no tabs at all.
- Until the first snapshot arrives the page shows placeholders in the shape of its content, and says in words that it is loading.
- With columns on "auto", each list gets the number of columns that needs the fewest rows, up to five, and among those the smallest, so rows come out even. Bookmark groups all use the columns of the largest group, so that their tiles line up under each other. A fixed number applies to every list. Neither exceeds what the window has room for, and a narrow screen fits what it can.
- Preferences: theme mode, colour scheme, language, a handwritten typeface, favorites and their order, collapsed groups, layout (columns, how many lines a description may take, a box around each tile and a highlight of the tile under the pointer, both off by default, descriptions, tags, status indicators, hiding unreachable applications), background, presets, and accessibility (text size, high contrast).
- Backgrounds: the Bing picture of the day, which is the default, the theme, a solid colour, a gradient, a gradient that follows the time of day, a mesh gradient that can move slowly, an image by URL, and a geometric pattern generated from a piece of text. Each can be made more transparent, pictures can be blurred, and a panel behind the content keeps text readable. As in 4.x the panel runs from solid white through none to solid black, and is 70% black by default. Its slider has none in the middle, marked, and its bar grows from there to the side that is chosen. The theme and the panel have to agree, because dark text is unreadable on a black panel and light text on a white one. Choosing the light or dark theme therefore turns a shown panel white or black, keeping its strength, and moving the panel to the other colour switches the theme, unless it is on auto. With the theme on auto the panel decides the mode. If the two still disagree, for instance after a preset is applied, the panel wins. How much it blurs what shows through it is adjustable, down to none.
- A preset is a named snapshot of the layout and the background. Applying one restores both.
- A description is kept within a number of lines, two by default and one to three or unlimited by choice. One that is too long is first made smaller, in steps down to 70%, and only cut off with an ellipsis if it still does not fit; the whole text is then a tooltip.
- The page has an edit mode, entered and left with a button in the bottom right corner and left with Escape as well. It is not remembered: a page that is opened is not in it. Outside it a tile is only its link. In it every tile has its box, whatever the preference for boxes says, and shows its controls without having to be pointed at: the star that makes it a favorite and the buttons that move a favorite. With the edit key, a tile that can be changed is one button in place of its link, so that a click anywhere on it opens its form; a pencil on it says so. Favorites can be dragged only in edit mode. The mode exists whether or not the instance has an edit key, since favorites are the visitor's own.
- A favorite is shown once: in the favorites row of its tab, in the visitor's order, and not in its group. The row has no heading, is as wide as its favorites need, and is centred. In edit mode the order is changed by dragging one favorite onto another, or with the two buttons on each favorite, which do the same from the keyboard and announce the new position.
- As in 4.x there is no search field on the page. Spotlight search opens with `/`, with Ctrl+K, or by simply starting to type anywhere on the page, in which case it starts with what was typed. A touch screen, which has no keys to start typing on, gets a search button. The settings button is fixed in the bottom right corner of the window, next to the one for edit mode. The logo and the title are centred at the top, with no panel behind them. Results show each tile's icon and tags. As in 4.x it searches names only: each word of the query must be the start of a word in the name, so a short query stays short. A word may instead be the start of the cluster name, provided another word matches the name, which lets "grafana prod" pick one tile among several. A query that starts with `?` goes to the configured search engine.
- Dialogs are native `dialog` elements, which keep focus inside, close on Escape and make the rest of the page inert. The settings dialog has one tab per area. The controls inside the dialogs, such as switches, selects, sliders, fields, buttons and tabs, are drawn by daisyUI, a library of component classes for Tailwind CSS. Both are used at build time only: the result is part of the page's stylesheet, so the Content-Security-Policy is unchanged and no script is added. The classes are put on native elements, which keep their roles and keyboard behaviour, and the library's colours are derived from the five colours of the palette. The page outside the dialogs is styled by hand as before.
- The page fetches nothing but pictures from other hosts. The handwritten typeface is part of the bundle, not loaded from a font service, and the pattern is generated in the page. The mesh animation is off for visitors whose system asks for reduced motion.
- v5 replaces what 4.x does, not how: a pattern text gives a different pattern than in 4.x, and stored 4.x preferences are not read.
- A footer names the running version and links to the project and its author. It sits right under the content, not at the bottom of the window. When update checking is on, a newer release is announced by a ribbon across the top right corner and nowhere else. The check is made by the server a few times a day, not by the page, and the request does not say which version is running. When it finds a newer release, the server also reads `CHANGELOG.md` as it is at that release's tag, from `raw.githubusercontent.com`, and keeps the entries that are newer than the running version; without them the release is announced all the same.
- The page says what changed. The browser keeps the version it last opened the page with, in `localStorage` apart from the preferences. When the running version is newer than that one, the page opens a dialog with the changelog entries in between, once. A browser that has no version stored is told nothing, and neither is one that meets an older version or a development build. The version in the footer is a button that opens the entries up to the running version. The notice of a newer release, which is the ribbon across the top right corner, is a button that opens the entries after the running version, with a link to the release on GitHub. The server reduces the changelog to text: references to pull requests and commits are dropped, links become their words, and the page renders the lines as text.
- The page is in the right colours from its first frame. A small script, loaded as a file because the Content-Security-Policy allows no inline script, applies the colours the application last used before anything is drawn; a first visit starts dark.
- The top right corner is empty unless a newer release exists. Then a golden ribbon lies across it that reads "v5.8.0 available", with the version there is, and opens the list of what has changed. The corner that linked to the project on GitHub is gone, and with it the meaning of `web.githubLink`, which is still accepted so that existing configuration keeps working. The footer links to the project.
- Not carried over from 4.x: the Lorem Picsum picture provider, whose service no longer answers, and the "what's new" dialog.
- Translations are static JSON files served with the bundle: English is part of it and is the fallback for any missing key, other languages are fetched when chosen. The language is the visitor's choice, else the first of the browser's languages that is available, else the configured default. A test checks that every language has the same keys and placeholders. Icons named from an Iconify set are images served by the instance itself; an icon given as an address is loaded from that address.
- Accessibility requirements from 4.x carry over: keyboard navigation, ARIA labelling, visible focus, high-contrast mode.

## Configuration

Settings live in the cluster as custom resources. The environment holds only what a process needs to start: its role, its listen address, where the `api` role finds the controller, logging, and which resource to read.

| Kind | Holds | Read by |
| --- | --- | --- |
| `Startpunkt` | The settings of one instance: `cluster`, `web`, `namespaceSelector`, `sources`, `availability`, `status`, `icons`. | The instance, by its own name in its own namespace. |
| `Remote` | One federated instance: its URL and what to take from it. The resource's name is the cluster name its tiles get. | The instance in the same namespace. |

- The controller watches both and applies a change without a restart. A new title or theme reaches open pages over the stream they already hold. A remote that is added is followed, and one that is deleted is dropped together with its tiles.
- Settings that decide how the cluster is read, the sources, the namespaces, probing, status writes and the cluster's name, make the controller read the cluster again: its tiles are cleared and rebuilt, and the instance is not ready for the moment that takes.
- A setting that is left out keeps its default. The definitions are generated from the Go types in `api/v1`, which are also the sections of the configuration file, so there is one definition of every setting.
- What the schema can check is refused when the resource is applied. What it cannot, such as a search engine address that is not http, is reported in the `Startpunkt` resource's status as the `Configured` condition, and the instance carries on with the last valid settings.
- Only the controller has access to the cluster. In split mode it passes the settings the `api` role needs, those of the page, the icon source and the remotes, over an internal stream that is not routed from outside the cluster. Request headers of remotes are never in a resource or on that stream, because they may be secrets: they reach the pods that use them through the environment, by the remote's name.
- Without the definitions installed, or without a `Startpunkt` resource, the instance runs on the environment and the configuration file, which is also how it runs outside a cluster. The chart can be set to work this way.
- A `Remote` resource has a status: a `Connected` condition, with the last error in its message while the remote cannot be reached, and the number of its tiles that are shown. The process that follows the remotes knows this, and only the controller can write it. In split mode the `api` role therefore reports to the controller, over the same internal address it reads the settings from, when something changes and every 30 seconds. When the reports stop, the controller sets the condition to unknown rather than leave a claim it cannot stand behind.

### Environment and file

Every setting can be given as an environment variable named `STARTPUNKT_<SECTION>_<KEY>`, and the chart can be set to configure the processes that way instead of with resources. A YAML file with the same settings is an alternative for settings that do not fit a variable well, such as lists; the environment takes precedence over the file. The role is the process argument, or `STARTPUNKT_ROLE`. Sections: `namespaceSelector`, `sources` (built-in toggles and `custom`), `availability`, `status`, `icons`, `federation.remotes`, `web` (title, theme, default language, search engine, update check, whether every cluster is shown from the start, the default preferences of the page), `editing` (the edit key and the namespace for new resources), `cluster` (the name of this instance), `upstream` (the controller the `api` role follows), `resources` (which `Startpunkt` resource to read), `server` and `log`. The file is the one named by `-config` or `STARTPUNKT_CONFIG`, or `/etc/startpunkt/config.yaml` when it exists, and a key it does not know is an error. Where several say something about a setting, the `Startpunkt` resource wins over the environment, which wins over the file. The edit key itself comes from a Secret through an environment variable or a mounted file, never from the ConfigMap.

## Deployment

- Multi-stage container build producing a static binary on a distroless base.
- The chart has a `mode` setting. `single` creates one Deployment running the `all` role. `split` creates one Deployment per role, mounts a service account token only in the controller, and routes `/api` to `api` and everything else to `web` on one host.
- Helm chart with the generated CRDs, Deployment, Service, optional Ingress or Route, ServiceAccount and RBAC. An optional Secret for the edit key comes with editing. A metrics endpoint with a ServiceMonitor is not built; 4.x had one, and it is listed in the migration notes as gone.
- No admission or conversion webhooks, so no certificates to manage.
- The `Application` and `Bookmark` definitions are templates of the chart, so that an upgrade of the chart upgrades them. `crds.install` leaves them out, for running next to a 4.x installation. The `Startpunkt` and `Remote` definitions are in the chart's `crds` directory instead, because the release creates a `Startpunkt` resource and Helm needs its definition to exist before that. All resource names derive from the release name and namespace.
- Every process is stateless and writes its log, as text or JSON, to standard output; messages of the Kubernetes client library go to standard error in that library's own format. More than one replica is safe: each builds its own store from the API server, or from the controller in split mode. In split mode `api` and `web` scale without adding informers. Probing then runs once per replica; leader election for the prober and for status writes is a later optimisation.

## Testing

- Unit tests for each built-in adapter against fixture objects, including the annotation and tag rules.
- Controller tests against the fake clients of client-go: create resources, assert on the store and the event stream, including running against definitions where `v1` is not served. `envtest` was the plan; the fakes turned out to cover the controller's logic without needing an API server binary on every machine that runs the tests.
- What only a real API server can show is tested on a throwaway kind cluster by `hack/test-cutover.sh`: reading and writing through each deprecated version, the 4.x definitions, the cutover, pruning and status writes, and the chart itself. It is run by hand with `make test-cutover`; CI does not run it yet.
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

Uninstalling the 4.x release deletes the custom resource definitions, because they are part of that release, and Kubernetes then deletes every `Application` and `Bookmark`. A `helm.sh/resource-policy: keep` annotation put on the definitions afterwards does not prevent it: Helm goes by the manifest it stored when the release was installed. So 4.x is not uninstalled. It is taken away piece by piece, leaving the definitions:

1. Delete everything the 4.x release created except the definitions. All of it carries the label `app.kubernetes.io/name=startpunkt`, and the definitions carry no label, so `helm get manifest <release> | kubectl delete -f - -l app.kubernetes.io/name=startpunkt` does it.
2. Delete Helm's record of the 4.x release, the Secrets labelled `owner=helm,name=<release>` in its namespace. Nothing else is deleted with them, and Helm no longer knows a release that could take the definitions with it.
3. Change the Helm ownership annotations and label on the definitions to the v5 release, and upgrade the v5 release with `crds.install: true`. This adds the `v1` version as the storage version and the status schema.
4. The controller switches to `v1` and status writes take effect.

An installation that is managed by a GitOps tool follows the same idea with that tool's means: the tool has to stop managing the definitions before the 4.x application is removed from it, so that removing it does not delete them. For Argo CD that is the `Delete=false` and `Prune=false` sync options on the two definitions; the migration notes have the steps, which were rehearsed on a test cluster. The chart's definitions carry `Delete=false` themselves.

Once `v1` is the storage version, going back to the 4.x chart's definitions is not supported, because they do not serve the version the objects are stored in.

The chart's own definitions carry `helm.sh/resource-policy: keep` from the start (`crds.keep`), so uninstalling a v5 release leaves them and the resources in place.

`hack/test-cutover.sh` runs all of this on a throwaway kind cluster: 4.x from its last release, v5 next to it, the cutover, and what must hold afterwards.

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
- Settings are custom resources, `Startpunkt` and `Remote`, applied without a restart. The environment holds what a process needs to start and is the fallback when the resources are not there.
- Single store with snapshot plus SSE; no GraphQL.
- Every SSE connection starts with a full snapshot; no event replay.
- Built-in sources are plain Go adapters. Other resource types are added by the operator as CEL mappings.
- No conversion webhook. Older CRD versions are served with `conversion: None` and a shared schema.
- Status is written only on change.
- v5 can run next to 4.x on one cluster: it falls back to `v1alpha4` when `v1` is not served, and the chart can skip installing the CRDs.
- Reading is open by default. Editing requires an edit key entered through an unlock button and stored in `localStorage`.
- Federation between instances instead of cross-cluster credentials, with probing done by the owning instance.
- The hub subscribes to remotes. Push from remotes is optional future work.
- Remote tiles are read-only on the hub.
- Hajimari is not supported; its resources and annotations are ignored.

## Milestones

All nine milestones are done. They were built in the order 1 to 5, 7, 8, 6, 9.

Every milestone ends with an image that runs next to a 4.x installation on a real cluster, so each step is compared against 4.x on the same data.

1. Skeleton, deployable: binary with its roles, store, `Application` and `Bookmark` types with the fallback to `v1alpha4`, snapshot endpoint, the server side of the event stream and the follower that the split mode needs, minimal UI that renders tiles, container build, and a minimal chart with both modes, `crds.install: false` and release-based names.
2. Sources: built-in adapters in the order Route, Ingress, HTTPRoute, VirtualService; discovery, annotations, tags, namespace selector, `urlFrom`. At the end of this milestone the page lists the same applications as 4.x, apart from Hajimari resources.
3. Live updates: UI driven by the event stream.
4. Availability: prober and status writes. Status cannot be verified through `kubectl` until the cutover, because the 4.x definitions have an empty status schema.
5. UI parity: spotlight search, favorites, layout and background preferences, themes, i18n, accessibility.
6. Editing: edit key, unlock flow, write endpoints and editors in the UI. Done, after federation and packaging.
7. Federation: remote subscription, stale handling, cluster filter, cluster pill, both layouts and combined cards. Testing needs v5 on at least two clusters. Done.
8. Release packaging: full chart with all CRD versions, the cutover procedure tested end to end, migration notes, documentation. Done, together with CI and a release workflow that publishes the image and the chart when the release pull request is merged.
9. User-defined CEL mappings. Done.

Added along the way: configuration through the `Startpunkt` and `Remote` resources, built after federation. Its definitions are in the chart's `crds` directory and are generated with `make crds`.

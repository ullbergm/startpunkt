# Roadmap

Things Startpunkt might do next. None of it is promised, and the order within a section is a rough order of worth, not a schedule. What Startpunkt does today is in the [README](../README.md), and why it is built the way it is in the [design](v5-design.md).

An idea is judged against what Startpunkt is: a page of links to what runs in a cluster, read from the cluster's own resources, configured by resources, with no database and no accounts. Ideas that need to give one of those up are under [Not planned](#not-planned).

Size is a guess: **S** is a day or two, **M** about a week, **L** more than that.

To ask for one of these, or for something that is not here, open a [feature request](https://github.com/ullbergm/startpunkt/issues/new?template=02_FEATURE_REQUEST.md).

## Next

Small things that make what is there more dependable.

- [ ] **Metrics** (S). A Prometheus endpoint with the number of tiles by cluster and source, probe results and durations, open event streams, the state of each remote and the errors of the settings and status writers, and a ServiceMonitor in the chart. 4.x had one and v5 does not.
- [ ] **Read the cluster again without going unready** (M). A change to the sources, the namespaces or probing empties the store, and every replica reports itself not ready at once. Build the new state next to the old one and swap.
- [ ] **Try a failed `urlFrom` again** (S). A reference to a kind that is not installed yet stays unresolved until the Application is changed or the pod restarts.
- [ ] **A switch for type-to-search** (S). Opening search on any key is in the way of speech input and of some assistive tools. `/` and `Ctrl+K` stay.
- [ ] **Smaller fixes on the page** (S). The search button, which is meant for touch screens, showing on every screen; group names in lower case in search results; a key pressed before the first tiles arrive, descriptions that do not refit when the text size changes, heading levels on a page with tabs, a visible mark on required fields, the footer and the corner buttons on a narrow screen, translated error messages from the editor, and the keyboard list on a Mac.
- [ ] **Checks in CI** (S). `golangci-lint` and `govulncheck`, a linter for the page, rendering the chart against the Kubernetes schemas, Markdown and link checks, the pull request title, and the cutover test on a schedule.
- [ ] **A values schema for the whole chart** (S). The schema covers the settings sections but not `image`, `ingress`, `route`, `resources` and the rest, so a misspelt key there goes unnoticed.

## Later

### Reading the cluster

- [ ] **Readiness of the workload behind a service** (M). Find the Deployment or StatefulSet a tile's Service points at, and show "starting" or "degraded" next to what the probe says.
- [ ] **Ready-made mappings** (S). Traefik IngressRoute is one expression today. Ship it, and others such as Contour HTTPProxy, Kong and Tailscale Ingress, as values that can be switched on.
- [ ] **GRPCRoute and TLSRoute** (S). The Gateway API types that carry host names, as built-in sources.
- [ ] **The address of a VirtualService or HTTPRoute from its Gateway** (M). Whether the listener has TLS and on which port is the Gateway's to say; today it is a default and an annotation.
- [ ] **Namespaces by label** (S). `namespaceSelector` takes names. A label selector lets a namespace opt in on its own.
- [ ] **Annotations of other start pages** (S). Read `hajimari.io` and `forecastle.stakater.com` annotations as a source that is off by default, for those who move over. v5 dropped this from 4.x on purpose; whether it comes back depends on who asks.
- [ ] **Tags and status for Bookmarks** (S). Bookmarks cannot be filtered by tag and report nothing in their status.
- [ ] **`urlFrom` for keys with dots** (S). A property path cannot name an annotation or a label.

### What a tile shows

- [ ] **Response time and a short history** (M). The prober already measures. Keep the last hours in memory and show them on the tile and in a small status view. Nothing is stored, so a restart starts over.
- [ ] **Sync and health from Argo CD and Flux** (M). A badge from the `Application` or `Kustomization` that deploys a service, found by label.
- [ ] **A value from the service** (M). One generic, declared readout: an address, a path into its JSON answer, a label. Fetched by the instance, with the address limited to the tile's own host and secrets taken from Secrets. Not a catalogue of integrations.

### The page

- [ ] **Export and import of preferences** (S). Favorites, layout, background and presets as a file, to take to another browser.
- [ ] **Defaults from the operator** (M). The layout and the background a new visitor starts with, and presets offered to everyone, as part of the `Startpunkt` resource.
- [ ] **More languages** (S each). A language is one file. German, French, Spanish and Norwegian are the first that come to mind; contributions are welcome.
- [ ] **Search that does more** (M). Results that are links, so that they open in a new tab; matches in descriptions and tags as an option; recently opened first; several search engines by prefix.
- [ ] **A view to link to** (S). The open tab, the shown clusters and the tags in the address, so that a view can be bookmarked and shared.
- [ ] **A web app that fits the instance** (M). The manifest with the configured title and colours, and a service worker that shows the last known tiles when the instance cannot be reached.
- [ ] **Groups with more to them** (M). An order and an icon for a group, set by the operator, and groups inside groups.
- [ ] **A kiosk view** (S). No controls and a larger scale, for a screen on a wall.
- [ ] **Forgetting what is gone** (S). Favorites and cluster choices keep the names of tiles and clusters that no longer exist.

### Access

- [ ] **Who sees what, from the proxy in front** (L). Trust the user and group headers of an authenticating proxy, from addresses that are configured, and show a tile only to the groups it names. The filter has to be made by the server, on the snapshot, the stream and what remotes take, which tags do not do. This is the way to visibility by person without accounts in Startpunkt.
- [ ] **Edits by name** (M). With the same headers, allow editing by group instead of by a shared key, and write who changed what to the log.
- [ ] **More than one edit key** (S). Keys that can be handed out and taken back one at a time, each limited to a namespace.
- [ ] **Limits by client** (S). The slowing of wrong keys counts everyone together, because the client's address is not known behind a proxy. With a list of trusted proxies it can count each client.

### Several clusters

- [ ] **Remotes that report in** (M). A cluster the hub cannot reach sends its tiles to the hub instead. The design leaves room for it.
- [ ] **When a cluster was last seen** (S). The page says that a cluster cannot be reached, but not since when.
- [ ] **A remote's status from several replicas** (S). Each `api` replica reports what it sees, and the last report wins.
- [ ] **A remote's headers from a Secret** (S). Headers for a remote behind an authenticating proxy are written in the values and end up in the pod's environment. A reference to a Secret on the `Remote` resource would keep them out of both.
- [ ] **A check before following** (S). Say plainly when a remote speaks another version of the tile format, or is a 4.x instance.

### Running it

- [ ] **One prober among several replicas** (M). Leader election for probing and status writes, so that replicas do not multiply the requests. The prober and the writer as roles of their own, as the design foresees.
- [ ] **More in the chart** (S). A NetworkPolicy that lets only `api` reach the controller, a PodDisruptionBudget, topology spread, an autoscaler for `api` and `web`, and a Gateway API HTTPRoute next to the Ingress and the Route.
- [ ] **Signed releases** (S). Signatures, provenance and a bill of materials for the image and the chart.
- [ ] **The chart on Artifact Hub** (S). With its metadata, keywords and the range of Kubernetes versions it supports.
- [ ] **One log** (S). The messages of the Kubernetes client library in the same format and stream as the rest.
- [ ] **Events on the resources** (S). A Kubernetes event when an Application cannot be resolved or stops answering, next to the condition in its status.
- [ ] **Tests in a browser** (M). The page driven end to end against a kind cluster, with an automated accessibility check. The screenshots are made the same way and can share the setup.
- [ ] **Running outside a cluster** (S). The configuration file and the variables a process starts with, documented for those who do not use the chart.

## Not planned

- **Accounts, and preferences kept by the server.** Startpunkt has no database. Who someone is, is the business of the proxy in front.
- **Signing in with OIDC in Startpunkt itself.** An authenticating proxy does this, and Startpunkt can trust what it says.
- **A catalogue of integrations** with a widget for each application, and widgets for weather, feeds and calendars. Other start pages do this well. Startpunkt shows what is in the cluster.
- **Docker, Podman and other things that are not Kubernetes** as sources.
- **Dragging tiles into place.** Where a tile goes is said by the resource, with `group` and `location`, so that it is the same for everyone and lives in Git. Favorites are the part a visitor arranges.
- **Custom CSS and scripts.** The page runs nothing it did not ship with. Colours come from the theme.
- **Reading a 4.x instance, or the 4.x GraphQL API.**

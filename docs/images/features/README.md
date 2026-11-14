# Startpunkt feature screenshots

Screenshots of Startpunkt 5 with demo content. Every figure uses the generated GeoPattern background with the fixed text `startpunkt`; colours and panel strength vary between examples. They are taken by [hack/screenshots/run.sh](../../../hack/screenshots/run.sh), which runs two instances against a throwaway kind cluster.

## Light theme

![Light theme](01-light-theme.png)

The light theme with a generated GeoPattern background. The colours of both themes come from the instance's `web.theme` settings, and each visitor chooses light, dark or automatic.

## Dark theme

![Dark theme](02-dark-theme.png)

The dark theme with a generated GeoPattern background. The favorites are in the row at the top, and the applications are listed by group below it. Backup server does not answer its availability probe and is marked Offline.

## Search

![Search](03-search.png)

Typing anywhere on the page opens the search with what was typed. Characters match in order within the name, so `Osft` finds `OpenShift`; prefix matches rank first, and each result shows its cluster, group, description and whether it is an application or a bookmark. A query that starts with `?` goes to the configured search engine.

## Favorites

![Favorites](04-favorites.png)

The page is in edit mode here, which the pencil in the bottom right corner turns on and which shows the controls of the tiles. In edit mode a click on a tile opens its form, or says why it cannot be changed, in place of opening the service. The star on a tile puts it in the favorites row, which has no heading, and the arrows on a favorite move it; dragging one favorite onto another does the same.

## Bookmarks

![Bookmarks](05-bookmarks.png)

`Bookmark` resources are listed on a tab of their own. All bookmark groups use the same number of columns, so their tiles line up under each other.

## Layout settings

![Layout settings](06-settings-layout.png)

The settings dialog has one tab per area. Layout sets the columns, boxes, the hover highlight, descriptions and how many lines they may take, tags, status indicators and whether unreachable applications are hidden. The layout and the background can be saved as named presets.

## Background settings

![Background settings](07-settings-background.png)

The background tab, here for GeoPattern, with its pattern text and colour controls. Every background can be made more transparent, and the panel behind the content runs from solid white through none to solid black, with an adjustable blur.

## Pattern without a panel

![Blue GeoPattern without a panel](08-background-solid.png)

A blue GeoPattern with no panel behind the content. The file keeps its earlier name so existing links still work.

## Pattern with a light panel

![GeoPattern with a light panel](09-background-gradient.png)

A pale blue GeoPattern with the light theme and a white panel.

## Pattern with a dark panel

![GeoPattern with a dark panel](10-background-time-of-day.png)

A blue GeoPattern with a dark panel that reduces the background contrast behind the links.

## Purple pattern

![Purple GeoPattern](11-background-mesh.png)

The same fixed pattern text in purple, with a partly transparent dark panel.

## Pattern

![Pattern background](12-background-pattern.png)

A geometric pattern generated in the page from a piece of text and a colour. A different text gives a different pattern.

## Columns and boxes

![Columns and boxes](13-layout-columns.png)

Three columns, a box around each tile and descriptions kept to one line. With columns on Auto, each list gets the number of columns that gives the fewest rows.

## Several clusters

![Several clusters](14-clusters.png)

This instance follows a second one, "staging". The buttons above the tiles switch each cluster on and off. A service that runs on both clusters is one card with a pill per cluster, and each pill links to that cluster's instance and shows whether it answers: Prometheus answers on prod (filled dot) but not on staging (hollow dot). Groups can be collapsed.

## A section per cluster

![A section per cluster](15-cluster-sections.png)

With "A section for each cluster" on, each cluster's tiles are listed under its name and nothing is combined.

## Editing

![Editing an application](16-edit-application.png)

With an edit key configured, the page asks for it when edit mode is entered, unless the browser has it already. `Application` and `Bookmark` resources of this cluster can then be changed, deleted, and added with the plus button, unless Argo CD or Helm deploys them. A change is written to the resource in the cluster.

## Unavailable services and tags

![Unavailable services and tags](17-unavailable-and-tags.png)

A service whose probe fails is dimmed and marked Offline in words, and on a combined card its pill gets a hollow dot. The page is opened at `/admin`, so the tiles tagged `admin` (Longhorn and Traefik) are shown next to the untagged ones, with their tags.

## Phone

![Phone](18-mobile.png)

On a narrow screen the tiles are in one column. A touch screen gets a search button.

## What's new

![What's new](19-whats-new.png)

The first time the page is opened after the instance was updated, it lists what changed since the version that browser last saw, from the project's changelog. The version in the footer opens the same list, and the ribbon that announces a newer release lists what has changed since the running version.

## Adding a tile

![Adding a tile](20-add-tile.png)

In edit mode with the edit key, the plus button opens a form for a new application or bookmark. The form says what is wrong next to a field and whether something answers at the address. The group can be picked from those in use or typed, tags are pills, and the icon is found by searching the icon sets. What is saved is a resource in the cluster.

## A newer release

![A newer release](21-update-ribbon.png)

When the instance has found a newer release, a golden ribbon across the top right corner names it. A click on it lists what has changed since the running version.

## Fuzzy search

![Fuzzy search](22-fuzzy-search.png)

`Osft` finds the OpenShift bookmark by matching its characters in order. Matching ignores case and accents. The original full-name and word-prefix matches rank ahead of looser matches.

## Secondary links

The Grafana and NAS tiles in the screenshots carry Documentation and Logs links. These are separate keyboard-reachable links below the primary destination. The application editor can add, change and remove them.

## Workload readiness and OpenShift resources

![Workload readiness and OpenShift resource links](23-workload-readiness.png)

Workload readiness is shown independently from HTTP availability. Backup server's address is Offline while its demo Deployment satisfies its desired state of zero replicas, shown as Workload ready · 0/0. The demo workloads are scaled to zero so taking screenshots starts no application containers. An OpenShift link opens the source resource, as a separate keyboard-reachable link below the tile. Combined cards preserve the console links and readiness of each cluster.

## Remote freshness

![Remote last contact and stale duration](24-remote-freshness.png)

A remote with stale data shows its last successful contact and how long its data has been stale. Last contact is a semantic time, and the elapsed duration advances without repeatedly announcing the same warning. This screenshot keeps the demo tiles and supplies a fixed stale remote snapshot to demonstrate an earlier disconnect without waiting in real time.

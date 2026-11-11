<h1 align="center">Startpunkt</h1>
<p align="center">
  <i>Startpunkt is a clean start page that shows links to the self-hosted services in your Kubernetes clusters.</i>
  <br/><br/>
  <img width="175" alt="Startpunkt" src="docs/images/logo.svg"/>
  <br/><br/>
  <a target="_blank" href="https://github.com/ullbergm/startpunkt/releases"><img src="https://img.shields.io/github/v/release/ullbergm/startpunkt?logo=hackthebox&color=609966&logoColor=fff" alt="Current Version"/></a>
  <a target="_blank" href="https://github.com/ullbergm/startpunkt"><img src="https://img.shields.io/github/last-commit/ullbergm/startpunkt?logo=github&color=609966&logoColor=fff" alt="Last commit"/></a>
  <a href="https://github.com/ullbergm/startpunkt/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-609966?logo=opensourceinitiative&logoColor=fff" alt="License MIT"/></a>
  <br/>
  <a href="https://buymeacoffee.com/magnus.ullberg"><img src="https://img.shields.io/badge/Buy%20me%20a-coffee-ff1414.svg?color=aa1414&logoColor=fff&label=Buy%20me%20a" alt="buy me a coffee"/></a>
  <a href="https://ullberg.us/cv.pdf"><img src="https://img.shields.io/badge/Offer%20me%20a-job-00d414.svg?color=0000f4&logoColor=fff&label=Offer%20me%20a" alt="offer me a job"/></a>
  <br/><br/>
  <a href="https://github.com/ullbergm/startpunkt/issues/new?assignees=&labels=bug&template=01_BUG_REPORT.md&title=bug%3A+">Report a Bug</a> ·
  <a href="https://github.com/ullbergm/startpunkt/issues/new?assignees=&labels=enhancement&template=02_FEATURE_REQUEST.md&title=feat%3A+">Request a Feature</a> ·
  <a href="https://github.com/ullbergm/startpunkt/discussions">Ask a Question</a>
  <br/><br/>
  <img src="https://raw.githubusercontent.com/ullbergm/startpunkt/main/docs/images/screenshot.png" alt="Startpunkt" width="80%"/>
</p>

<details open="open">
<summary>Table of Contents</summary>

- [Features](#features)
- [Getting started](#getting-started)
- [Putting services on the page](#putting-services-on-the-page)
  - [Annotations](#annotations)
  - [Application resources](#application-resources)
  - [Bookmark resources](#bookmark-resources)
  - [Tags](#tags)
- [Configuration](#configuration)
- [Several clusters on one page](#several-clusters-on-one-page)
- [The page](#the-page)
- [Deployment modes](#deployment-modes)
- [API](#api)
- [Upgrading from 4.x](#upgrading-from-4x)
- [Development](#development)
- [Support](#support)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Acknowledgements](#acknowledgements)

</details>

## Features

- **Automatic.** Services appear on the page when they are deployed to the cluster and disappear when they are removed. The page updates while it is open.
- **Reads what you already have.** Kubernetes Ingresses, OpenShift Routes, Gateway API HTTPRoutes and Istio VirtualServices, published with an annotation, and `Application` and `Bookmark` resources for everything else.
- **Availability.** Each service is probed from inside the cluster, and the page shows which ones do not answer.
- **Several clusters.** One instance can show the services of other instances next to its own, and combines a service that runs on several clusters into one card.
- **Search.** Start typing anywhere on the page to find a service, or search the web with a `?` in front.
- **Yours to arrange.** Favorites, columns, spacing, backgrounds, themes and saved presets, per browser.
- **GitOps ready.** Services, bookmarks and the settings of the instance are Kubernetes resources. A change to the settings is applied without a restart.
- **Small.** One static binary in a distroless image. No database, no third-party scripts on the page.
- **Accessible.** Semantic HTML, full keyboard navigation, visible focus, a high contrast mode and adjustable text size.
- **Internationalized.** English and Swedish are included.

## Getting started

Startpunkt is installed with its Helm chart:

```shell
helm install startpunkt oci://ghcr.io/ullbergm/charts/startpunkt \
  --namespace startpunkt --create-namespace
```

That gives you a running instance without a way in from outside the cluster. To have the chart create one, set an Ingress:

```shell
helm upgrade startpunkt oci://ghcr.io/ullbergm/charts/startpunkt --namespace startpunkt \
  --set ingress.enabled=true --set ingress.host=start.example.com
```

or, on OpenShift, a Route:

```shell
helm upgrade startpunkt oci://ghcr.io/ullbergm/charts/startpunkt --namespace startpunkt \
  --set route.enabled=true
```

Every setting of the chart is described in its [values.yaml](charts/startpunkt/values.yaml).

The chart installs four custom resource definitions. Helm keeps them in place when the release is uninstalled, because deleting a definition deletes every resource of its kind. Two of them, `Startpunkt` and `Remote`, are in the chart's `crds` directory, which Helm installs once and does not upgrade. After upgrading to a chart version that changes them, apply them yourself:

```shell
helm show crds oci://ghcr.io/ullbergm/charts/startpunkt | kubectl apply -f -
```

## Putting services on the page

### Annotations

An Ingress, Route, HTTPRoute or VirtualService is shown when it carries the annotation `startpunkt.ullberg.us/enable: "true"`. Its address comes from the object itself. Further annotations describe the tile:

| Annotation | Meaning |
| --- | --- |
| `startpunkt.ullberg.us/enable` | `"true"` to show the object, `"false"` to hide it |
| `startpunkt.ullberg.us/appName` | Name of the tile. Defaults to the object's name. |
| `startpunkt.ullberg.us/group` | Group the tile is listed under. Defaults to the namespace. |
| `startpunkt.ullberg.us/icon` | An [Iconify](https://icon-sets.iconify.design/) icon such as `mdi:home`, or the URL of a picture |
| `startpunkt.ullberg.us/iconColor` | Colour of the icon, for example `red` or `#e95678` |
| `startpunkt.ullberg.us/info` | Description shown under the name |
| `startpunkt.ullberg.us/location` | Sort position within the group. Lower comes first; the default is 1000. |
| `startpunkt.ullberg.us/url` | Use this address instead of the one the object describes |
| `startpunkt.ullberg.us/protocol` | `http` or `https`, when the object does not say |
| `startpunkt.ullberg.us/port` | Port to add to the address |
| `startpunkt.ullberg.us/rootPath` | Path to add to the address |
| `startpunkt.ullberg.us/targetBlank` | `"true"` to open the link in a new tab |
| `startpunkt.ullberg.us/tags` | Comma-separated [tags](#tags) |

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  annotations:
    startpunkt.ullberg.us/enable: "true"
    startpunkt.ullberg.us/appName: Grafana
    startpunkt.ullberg.us/group: Monitoring
    startpunkt.ullberg.us/icon: simple-icons:grafana
    startpunkt.ullberg.us/rootPath: /dashboards
spec:
  rules:
    - host: grafana.example.com
      # ...
```

To show every object of a type without annotating each one, turn `onlyAnnotated` off for that source in the [settings](#configuration). An object is then hidden with `enable: "false"`.

### Application resources

An `Application` describes a tile by hand, for a service that none of the objects above describes:

```yaml
apiVersion: startpunkt.ullberg.us/v1
kind: Application
metadata:
  name: nas
  namespace: startpunkt
spec:
  name: NAS
  group: Infrastructure
  icon: mdi:nas
  url: https://nas.example.com
  info: Network storage
```

`spec` takes the same fields as the annotations: `name`, `group`, `icon`, `iconColor`, `url`, `info`, `targetBlank`, `location`, `rootPath`, `tags`, and `enabled` to hide the tile without deleting the resource.

Instead of a fixed `url`, `urlFrom` reads the address from a field of another object, and follows it when that object changes:

```yaml
spec:
  name: Database console
  urlFrom:
    apiVersion: v1
    kind: Service
    name: console
    property: status.loadBalancer.ingress[0].ip
    urlTemplate: "https://{0}:8443/"
```

`apiGroup` names the API group of an object outside the core group, `namespace` defaults to the Application's own, and without `urlTemplate` the value is used as it is. When both `urlFrom` and `url` are set, `url` is used while the reference cannot be resolved. The controller needs to be allowed to read the referenced type; grant it with `rbac.extraRules` in the chart's values.

The controller writes what it found to the resource's status:

```console
$ kubectl get applications -A
NAMESPACE    NAME   TITLE   GROUP            URL                       AVAILABLE   AGE
startpunkt   nas    NAS     Infrastructure   https://nas.example.com   true        3d
```

On a cluster that also runs Argo CD, `applications` on its own means Argo CD's kind; write `applications.startpunkt.ullberg.us`.

A `Resolved` condition says why an Application has no tile, for example when its `urlFrom` points at something that does not exist.

### Bookmark resources

A `Bookmark` is a link to somewhere outside the cluster. Bookmarks are listed on a tab of their own.

```yaml
apiVersion: startpunkt.ullberg.us/v1
kind: Bookmark
metadata:
  name: kubernetes-docs
  namespace: startpunkt
spec:
  name: Kubernetes documentation
  group: Reference
  icon: mdi:kubernetes
  url: https://kubernetes.io/docs/
```

`name`, `group` and `url` are required; `icon`, `info`, `targetBlank` and `location` are optional.

### Tags

Tags choose what a visitor sees by the address they open. A tile without tags is always shown. A tile with tags is shown when one of its tags is in the path: `https://start.example.com/admin` shows the untagged tiles and those tagged `admin`, and `/admin,dev` those tagged with either.

Tags are a way to keep the page tidy, not access control: every visitor can open any path. See [object tag filtering](docs/object-tag-filtering.md).

## Configuration

The settings of an instance are a `Startpunkt` resource, which the chart creates from its values. The instance watches it and applies a change without a restart, and reports in the resource's status whether the settings are valid and in use:

```console
$ kubectl get startpunkts -n startpunkt
NAME         CONFIGURED   REASON   AGE
startpunkt   True         InUse    3d
```

Invalid settings are not applied. The instance keeps running with the last valid ones, and the status says what is wrong.

The sections of the settings, all of which are documented with their defaults in [values.yaml](charts/startpunkt/values.yaml):

| Section | What it controls |
| --- | --- |
| `cluster` | The name this instance gives its own cluster |
| `namespaceSelector` | Which namespaces are read: all of them, or a list |
| `sources` | Which resource types tiles are built from, and whether they must be annotated |
| `availability` | Probing of the services' addresses: interval, timeout, back-off |
| `status` | Whether the status of `Application` resources is written |
| `icons` | Where icons come from. The public Iconify API by default; point it at one you host to depend on nothing outside the cluster. |
| `web` | Title, default language, search engine, colours of the light and the dark theme, the update check and the link to GitHub |

Every setting also has an environment variable, `STARTPUNKT_<SECTION>_<SETTING>`. With `customResources.enabled: false` the chart configures the pods through those instead of resources; a change then restarts the pods.

Startpunkt needs to read the resources it shows and nothing else. The chart creates a ClusterRole with `get`, `list` and `watch` on the enabled sources, and permission to write the status of its own resource types.

## Several clusters on one page

An instance can show the tiles of other Startpunkt instances next to its own. Each of them is a `Remote` resource in the instance's namespace, or an entry under `federation.remotes` in the chart's values:

```yaml
apiVersion: startpunkt.ullberg.us/v1
kind: Remote
metadata:
  name: prod
  namespace: startpunkt
spec:
  url: https://start.prod.example.com
  # Optional: take only some of the remote's tiles.
  include:
    kinds: [application]
    groups: [media, "home*"]
  exclude:
    tags: [private]
```

The instance subscribes to the remote the way a browser does. The remote needs no configuration and does not know that it is being followed, so the instance has to be able to reach it. The resource's name is the cluster name its tiles are shown under.

```console
$ kubectl get remotes -n startpunkt
NAME   URL                              CONNECTED   TILES   AGE
prod   https://start.prod.example.com   True        42      3d
```

On the page, each cluster has a button that switches its tiles on and off. A new visitor sees the local cluster only, unless `web.showAllClusters` is set. A service that exists on several clusters is one card with a link per cluster; a preference lists each cluster in a section of its own instead. While a remote cannot be reached its last known tiles stay on the page, and the page says so.

Tiles are never passed on a second time: an instance takes from a remote only what that remote reads from its own cluster.

## The page

- **Search**: start typing, or press `/` or `Ctrl+K`. A word finds the services whose name has a word that starts with it. `?` in front searches the web.
- **Favorites**: the star on a tile puts it in a row at the top, which can be reordered.
- **Settings**, bottom right: theme, language, number of columns, spacing, what a tile shows, the background (the Bing picture of the day, a colour, gradients, a pattern or a picture of your own), which clusters to show, text size and contrast. They are kept in the browser. Layout and background can be saved as named presets.

## Deployment modes

The chart's `mode` chooses between two ways of running the same image:

- `single`, the default: one Deployment watches the cluster and serves the page.
- `split`: three Deployments. `controller` watches the cluster and is the only one with Kubernetes credentials. `api` serves the tiles from the controller's state, and `web` serves the page. Only `api` and `web` are reachable from outside, and they scale without adding load on the Kubernetes API.

Every process is stateless, so more than one replica of each is safe.

## API

The page uses a small HTTP API, and so can anything else:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/state` | Every tile, the clusters with their connection state, and the settings of the page |
| `GET /api/v1/events` | The same as a server-sent event stream: a snapshot, then every change as it happens |
| `GET /api/v1/version` | The running version, and a newer release when there is one |
| `GET /healthz`, `GET /readyz` | Liveness and readiness |

## Upgrading from 4.x

Startpunkt 5 is a rewrite. Annotated resources and existing `Application` and `Bookmark` resources work unchanged, and v5 can run next to a 4.x installation before you switch. Some things are different or gone, and the definitions of the custom resources need care when 4.x is removed. Read [Migrating from 4.x](docs/migrating-from-4.x.md) first.

## Development

The design and the reasons behind it are in [docs/v5-design.md](docs/v5-design.md).

```shell
make check          # Go and frontend tests, vet, type check, chart lint
make build          # frontend, then the binary with the frontend embedded, in bin/
make image          # container image
make crds           # regenerate the custom resource definitions after changing api/v1
make test-cutover   # the move from 4.x to v5 on a throwaway kind cluster
```

The backend is Go and the page is Preact with TypeScript, built with Vite. To work on the page against a running instance, start `npm run dev` in `web/`.

## Support

Reach out to the maintainer at one of the following places:

- [GitHub Discussions](https://github.com/ullbergm/startpunkt/discussions)
- Contact options listed on [this GitHub profile](https://github.com/ullbergm)

If you want to say **thank you** or support active development of Startpunkt:

- Add a [GitHub Star](https://github.com/ullbergm/startpunkt) to the project.
- Buy me a [coffee](https://buymeacoffee.com/magnus.ullberg).

See the [open issues](https://github.com/ullbergm/startpunkt/issues) for proposed features and known issues.

## Contributing

First off, thanks for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make will benefit everybody else and are **greatly appreciated**.

Please read [our contribution guidelines](docs/CONTRIBUTING.md), and thank you for being involved!

The original setup of this repository is by [Magnus Ullberg](https://github.com/ullbergm). For a full list of all authors and contributors, see [the contributors page](https://github.com/ullbergm/startpunkt/contributors).

## Security

Startpunkt follows good practices of security, but 100% security cannot be assured.
Startpunkt is provided **"as is"** without any **warranty**. Use at your own risk.

_For more information and to report security issues, please refer to our [security documentation](docs/SECURITY.md)._

## License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for more information.

## Acknowledgements

- [SUI](https://github.com/jeroenpardon/sui)
- [Hajimari](https://hajimari.io/)
- [Forecastle](https://github.com/stakater/Forecastle)

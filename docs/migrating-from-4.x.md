# Migrating from 4.x

Startpunkt 5 is a rewrite of the server and the page. What you have published in your cluster keeps working: annotated resources need no changes, and so do `Application` and `Bookmark` resources. What changes is how Startpunkt is installed and configured, and a few features are different or not there.

The short version:

1. Read [what is different](#what-is-different) and decide whether anything you rely on is missing.
2. Install v5 [next to 4.x](#trying-v5-next-to-4x) and compare the two pages.
3. [Switch over](#switching-over), which takes care not to lose the custom resource definitions.

If your 4.x installation uses the image tag `latest`, pin it to a 4.x version such as `4.8.0`. Since the release of 5.0.0 the tag points at v5, and a 4.x installation cannot run the v5 image.

## What is different

### Not in v5

- **Hajimari.** `hajimari.io` resources and annotations are not read, and there is no conversion for them. Recreate them as `Application` and `Bookmark` resources or as `startpunkt.ullberg.us` annotations.
- **The GraphQL API and the WebSocket endpoint.** The API is now a snapshot at `/api/v1/state` and a server-sent event stream at `/api/v1/events`. See the README.
- **Metrics.** There is no Prometheus endpoint and the chart has no ServiceMonitor.
- **The Kubernetes and OpenShift manifests and the Docker Compose file** in the repository. v5 is installed with its Helm chart; `helm template` produces plain manifests if you need them.
- **The JVM and native images.** There is one image, a static binary, for amd64 and arm64.
- **The "what's new" dialog** and the **Lorem Picsum** background.

### Changed

- **Editing on the page is off until you give the instance an edit key.** In 4.x anyone who could open the page could create, change and delete Applications and Bookmarks. In v5 that takes a key, which you configure and hand to the people who should edit. See "Editing from the page" in the README.
- **Search** finds services by name: each word you type has to be the start of a word in the name. It no longer matches loosely or looks in descriptions. It opens when you start typing; there is no button for it on a device with a keyboard.
- **Text size** is chosen from a few steps between 85% and 150%, not on a slider.
- **Preferences are not carried over.** Favorites, layout, background and theme are stored in the browser under new names, so every visitor starts from the defaults.
- **Favorites** are a row at the top of each tab, without a heading. The star that makes a tile a favorite, and the buttons that move one, show only in edit mode, which the pencil in the bottom right corner turns on.
- **Several clusters.** A visitor who has made no choice sees the local cluster only and switches the others on with the buttons above the tiles. Set `web.showAllClusters` to show every cluster from the start.
- **Health checks** are at `/healthz` and `/readyz` instead of `/q/health/*`. The chart sets them up.

### The same

- The `startpunkt.ullberg.us/*` annotations and what they mean.
- `Application` and `Bookmark` resources, including `urlFrom`, `rootPath` and `tags`.
- Tag filtering by the path of the address.
- Availability probing: an answer below 500 counts as available.
- The names of the theme colours, so a theme can be copied over as it is.

## Configuration

4.x read `application.yaml`. v5 takes its settings from the chart's values, which the chart turns into a `Startpunkt` resource. The settings map like this:

| 4.x (`startpunkt.` …) | v5 chart value |
| --- | --- |
| `clusters.local.name` | `config.cluster.name` |
| `clusters.remote[]` | `federation.remotes[]`, or `Remote` resources. See below. |
| `defaultProtocol` | `sources.httpRoute.defaultProtocol` and `sources.virtualService.defaultProtocol` |
| `defaultLanguage` | `config.web.defaultLanguage` |
| `namespaceSelector` | `namespaceSelector` |
| `ingress.enabled`, `ingress.onlyAnnotated` | `sources.ingress.enabled`, `sources.ingress.onlyAnnotated` |
| `ingress.ingressClassNames`, `ingress.includeUnclassified` | `sources.ingress.classNames`, `sources.ingress.includeUnclassified` |
| `openshift.*` | `sources.route.*` |
| `istio.virtualservice.*` | `sources.virtualService.*` |
| `gatewayapi.httproute.*` | `sources.httpRoute.*` |
| `hajimari.*` | Not available |
| `availability.enabled`, `interval` | `availability.enabled`, `availability.interval` |
| `availability.timeout` (seconds) | `availability.timeout` (a duration, such as `5s`) |
| `availability.ignoreCertificates` | `availability.insecureSkipVerify` |
| `availability.initialDelayMs`, `maxDelayMs` | `availability.initialBackoff`, `availability.maxBackoff` (durations) |
| `web.title`, `web.searchEngine`, `web.checkForUpdates`, `web.theme` | The same names under `config.web` |
| `web.githubLink.enabled` | `config.web.githubLink`. It shows the footer, which links to the project; the page has no corner for that any more. |

The values of the 4.x chart (`startpunkt.image`, `startpunkt.deployment`, `startpunkt.ingress` and so on) have no counterpart of the same shape. Start from the v5 chart's [values.yaml](../charts/startpunkt/values.yaml), which documents every setting.

A resource type that the cluster does not have, such as Routes outside OpenShift, is skipped and picked up if it appears later. There is nothing to turn off for it.

### Remote clusters

A v5 instance follows other v5 instances. It cannot read a 4.x instance, and a 4.x instance cannot read a v5 one. Upgrade the instances that are read from before the one that shows them.

A 4.x remote

```yaml
startpunkt:
  clusters:
    remote:
      - name: prod
        graphql-url: https://startpunkt.prod.example.com/graphql
        graphql-token: secret
```

becomes

```yaml
federation:
  remotes:
    - name: prod
      url: https://startpunkt.prod.example.com
```

There is no token. The remote is read the way a browser reads it, so whatever lets a browser in lets the instance in. For a remote behind an authenticating proxy, `headers` on the remote sends request headers; take secret values from a Secret through `extraEnv`.

## The custom resource definitions

The 4.x chart installs the `Application` and `Bookmark` definitions as part of its release, serving `v1alpha1` to `v1alpha4`. The v5 chart installs definitions that serve `v1` as well:

- `v1` has exactly the fields of `v1alpha4`. Existing resources read as `v1` without being changed, and manifests can move to `apiVersion: startpunkt.ullberg.us/v1` whenever it suits you.
- `v1alpha1` to `v1alpha4` stay served. Applying a manifest in one of them works and prints a deprecation warning.
- New in `v1`: the status of an `Application` holds the resolved address, whether it answers, and conditions.

**Do not run `helm uninstall` on the 4.x release while it still owns the definitions.** Helm deletes them with the release, and Kubernetes then deletes every `Application` and `Bookmark` in the cluster. Annotating the definitions with `helm.sh/resource-policy: keep` beforehand does not help: Helm goes by the manifest it stored at install time. [Switching over](#switching-over) removes 4.x without this.

Whatever you do, take a copy first:

```shell
kubectl get applications.startpunkt.ullberg.us,bookmarks.startpunkt.ullberg.us -A -o yaml > startpunkt-resources.yaml
```

## Trying v5 next to 4.x

v5 can run on the same cluster as 4.x. Both only read the cluster, so they show the same resources.

Install v5 under another release name, in a namespace of its own, and tell it to leave the definitions to 4.x:

```shell
helm install startpunkt-v5 oci://ghcr.io/ullbergm/charts/startpunkt \
  --namespace startpunkt-v5 --create-namespace \
  --set crds.install=false
```

Every resource of the v5 release is named after the release, so nothing collides with 4.x.

While both run:

- v5 reads the `v1alpha4` version that the 4.x definitions serve.
- v5 cannot write the status of Applications, because the 4.x definitions do not declare its fields. It logs that once. Availability still shows on the page.
- Both probe the same addresses, so the services see twice the probes.
- Hajimari resources show in 4.x only.

## Switching over

These steps assume 4.x was installed with Helm as release `startpunkt` in namespace `startpunkt`, and v5 as release `startpunkt-v5` in namespace `startpunkt-v5`. Adjust the names to yours. The same steps are run by `hack/test-cutover.sh` on a test cluster, which is a way to rehearse them.

1. Delete what the 4.x release created, except the definitions. Everything else it created carries the label used here; the definitions carry no label and are left alone.

   ```shell
   helm get manifest startpunkt -n startpunkt | kubectl delete -f - -l app.kubernetes.io/name=startpunkt
   ```

2. Delete Helm's record of the 4.x release. This removes only the record: with it gone, Helm has no release that could take the definitions with it.

   ```shell
   kubectl -n startpunkt delete secret -l owner=helm,name=startpunkt
   ```

   Check that the definitions and your resources are still there:

   ```shell
   kubectl get crd applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us
   kubectl get applications.startpunkt.ullberg.us,bookmarks.startpunkt.ullberg.us -A
   ```

3. Hand the definitions to the v5 release. Helm refuses to manage something that is marked as another release's, so mark them as this one's:

   ```shell
   for crd in applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us; do
     kubectl annotate crd $crd --overwrite \
       meta.helm.sh/release-name=startpunkt-v5 meta.helm.sh/release-namespace=startpunkt-v5
     kubectl label crd $crd --overwrite app.kubernetes.io/managed-by=Helm
   done
   ```

4. Upgrade the v5 release with the definitions turned on, which is the chart's default. Keep the other values you installed it with.

   ```shell
   helm upgrade startpunkt-v5 oci://ghcr.io/ullbergm/charts/startpunkt \
     --namespace startpunkt-v5 --reuse-values --set crds.install=true
   ```

   The definitions now serve `v1`, new and changed resources are stored as `v1`, and v5 starts reading `v1` and writing status within a minute, without a restart:

   ```shell
   kubectl get applications.startpunkt.ullberg.us -A
   ```

5. Point your address at v5: move the host of the 4.x Ingress or Route to the v5 release's `ingress.host` or `route.host`.

After step 4 there is no way back to the 4.x definitions: they do not serve the version that resources are now stored in.

From here on the definitions belong to the v5 release, and they are marked to be kept. Uninstalling it leaves them, and your resources, in the cluster.

### With Argo CD

When 4.x is an Argo CD application, there is no Helm release, and Argo CD is what could delete the definitions: they are among the resources of the 4.x application. The steps below were rehearsed with Argo CD 3.6 on a test cluster, with the 4.x application set to prune, to heal itself and to delete its resources when it is deleted.

In that rehearsal the definitions survived the deletion of the 4.x application even without step 1. Do it anyway: it costs nothing, and losing the definitions loses every `Application` and `Bookmark`.

1. Tell Argo CD to leave the two definitions alone when their application goes:

   ```shell
   for crd in applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us; do
     kubectl annotate crd $crd --overwrite argocd.argoproj.io/sync-options=Delete=false,Prune=false
   done
   ```

2. Remove the 4.x application from Argo CD the way you normally would, for example by deleting it from Git. Its Deployment, Service and the rest go with it. Check that the definitions and your resources are still there:

   ```shell
   kubectl get crd applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us
   kubectl get applications.startpunkt.ullberg.us,bookmarks.startpunkt.ullberg.us -A
   ```

3. In the values of the v5 application, remove `crds.install: false`, or set it to `true`. On its next sync Argo CD upgrades the definitions in place and they become resources of the v5 application. v5 starts reading `v1` and writing status within a minute.

4. Point your address at v5, as above.

The definitions that the v5 chart installs carry the `Delete=false` option themselves, so removing the v5 application later leaves them in the cluster.

With Argo CD installed, `kubectl get applications` means Argo CD's applications. Write `applications.startpunkt.ullberg.us` for Startpunkt's.

With another GitOps tool the idea is the same: make the tool stop managing the two definitions before the 4.x installation is removed from it, and check on a test cluster that they survive.

### Starting fresh instead

If you would rather not carry the definitions over, the copy is all you need: remove 4.x altogether, install v5 with its defaults, and apply `startpunkt-resources.yaml` again. The resources are gone from the cluster in between.

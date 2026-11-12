# Agents Guide: the chart

Read the repository's `AGENTS.md` first; this file adds what is particular to the chart.

- `values.yaml` is the documentation of every setting. A value is described there, in full sentences, with its default, and `values.schema.json` is changed with it.
- The settings sections (`config`, `namespaceSelector`, `sources`, `availability`, `status`, `icons`) are passed on whole: to the `Startpunkt` resource in `templates/settings.yaml`, or to environment variables in `templates/deployment.yaml` when `customResources.enabled` is false. A new setting has to work both ways.
- `mode` is `single` or `split`. Every template has to render for both; in split mode only the controller gets a service account token, and `/api` goes to `api` while everything else goes to `web`.
- The definitions are generated, not written. `crds/` (`Startpunkt`, `Remote`) and `files/crds/` (`Application`, `Bookmark`, with the versions before `v1`) come from `make crds`; change the Go types in `api/v1` instead. Helm installs `crds/` once and never upgrades it; `files/crds` is installed by `templates/crds.yaml` when `crds.install` is set, and is upgraded with the release.
- The definitions must survive the release. Helm never deletes what is in `crds/`, and the templated ones carry `helm.sh/resource-policy: keep` and Argo CD's `Delete=false` unless `crds.keep` is turned off. Deleting a definition deletes every resource of its kind.
- Every resource is named from the release name and namespace, the cluster-scoped ones too, so that two releases can share a cluster.
- RBAC grants what the enabled sources need and no more: read access to the source types, status writes on Startpunkt's own types, and `create`, `update` and `delete` on `applications` and `bookmarks` only when editing is on.
- Combinations of values that cannot work fail in `templates/validate.yaml`, with a message that says what to set.
- The versions in `Chart.yaml` are written by release-please. Leave them.
- Check with `helm lint charts/startpunkt`, the same with `--set mode=split`, and with `--set customResources.enabled=false --set crds.install=false`. `make check` runs all three. After changing how the definitions are installed, run `make test-cutover`.

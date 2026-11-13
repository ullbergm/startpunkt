# Agents Guide

Startpunkt is a start page for Kubernetes clusters: a Go controller that keeps one in-memory model of its cluster and streams it to a Preact page. The design, the decisions behind it and what each part does are in `docs/v5-design.md`; read it before making changes, and keep it true when a change makes it wrong.

More specific guides: `web/AGENTS.md` for the page and `charts/startpunkt/AGENTS.md` for the chart.

## Layout

| Path | Holds |
| --- | --- |
| `cmd/startpunkt` | Entry point; wires the roles together |
| `changelog.go` | Embeds `CHANGELOG.md`, which the page shows as what is new |
| `api/v1` | Go types of the custom resources and of every setting |
| `internal/tile` | The tile, which is the unit everything else passes around |
| `internal/store` | The in-memory store, its diffs and its subscribers |
| `internal/source` | Adapters that turn a Kubernetes object into tiles, annotations, CEL mappings, `urlFrom` |
| `internal/kube` | Informers and discovery, status writes, the settings watcher, the editor |
| `internal/probe` | Availability probing |
| `internal/api` | HTTP API, event stream, icons, background, update check, security headers |
| `internal/edit` | Edit key, validation and the write endpoints |
| `internal/follow` | Following another process over its event stream: the controller in split mode, and remotes |
| `internal/settings`, `internal/config` | Settings from file, environment and resources, and passing them between roles |
| `web/` | The page: Preact, signals, TypeScript, Vite |
| `charts/startpunkt` | Helm chart and the generated resource definitions |
| `hack/` | Generation of the definitions, the cutover test, the screenshots |
| `docs/` | Design, roadmap, migration notes, tag filtering, pictures |

## Rules

- One binary runs every role: `all`, `controller`, `api` and `web`. Keep a feature working both in one process and split across roles. Only the controller holds Kubernetes credentials.
- The tile JSON under `/api/v1` is a versioned contract shared by the browser and by other Startpunkt processes. Change `internal/tile`, `internal/api` and `web/src/types.ts` together.
- Settings are defined once, as Go types in `api/v1`. They are the spec of the `Startpunkt` resource and the sections of the configuration file, and each also has an environment variable (`STARTPUNKT_*`). After changing those types, or the `Application` and `Bookmark` types, run `make crds` and commit the result; CI fails when the generated files are out of date. Document new settings in the chart's `values.yaml` and its `values.schema.json`.
- Tests never point at a real cluster. Use the fake clients (see `internal/kube/controller_test.go`). What only a real API server can show goes in `hack/test-cutover.sh`, which runs on a throwaway kind cluster.
- The page loads no third-party scripts and renders tile content as text. Keep the Content-Security-Policy in `internal/api` strict.
- Whatever comes from a cluster resource or a remote is untrusted: addresses are `http` or `https`, and nothing from a probed service's answer is exposed.
- Accessibility: semantic HTML, keyboard reachable controls, visible focus, ARIA names on interactive elements, and never colour as the only signal.
- No new dependency without a reason that the standard library does not answer. The server has four direct dependencies and the page three.

## Checks

- Everything: `make check`. It runs the Go and frontend tests, `go vet`, the type check and `helm lint` in three configurations.
- Backend alone: `gofmt -l .` (must print nothing), `go vet ./...` and `go test -race ./...`.
- Frontend alone, in `web/`: `npm run check`, `npm test`, `npm run build`. Use npm, not another package manager.
- `web/dist` is embedded in the binary. Build the frontend before `go build` when the page is needed (`make build` does both); Go tests do not need it.
- `make test-cutover` rehearses the move from 4.x on a kind cluster. Run it after changing the definitions, the chart's handling of them, or the version fallback.

## Documentation

- User-facing behaviour is described in `README.md`, chart settings in `charts/startpunkt/values.yaml`, the design in `docs/v5-design.md`, and what changed from 4.x in `docs/migrating-from-4.x.md`. A change that alters any of them updates it in the same commit.
- Ideas that are not built are in `docs/roadmap.md`. Remove an item when it is built, and describe it where built things are described.
- The pictures in `docs/images` are made by `hack/screenshots`. Retake them when the look of the page changes.
- Write plainly: say what a thing does, in the present tense, without selling it.

## History

- The 4.x implementation (Quarkus and Preact) is not in the tree. It ends at the tag `v4.8.0`; read it from there when its behaviour is the reference, for example `git show v4.8.0:src/main/java/us/ullberg/startpunkt/objects/kubernetes/IngressApplicationWrapper.java`.

## Commits and releases

- Commits follow Conventional Commits (`type(scope): description`). Pull requests are squashed, so the title of the pull request is what counts.
- release-please works out the next version and the changelog from those titles: `fix` raises the patch version, `feat` the minor version, and a `!` the major version. Do not edit `CHANGELOG.md`, the version in `Chart.yaml` or `.release-please-manifest.json` by hand.

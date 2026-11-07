# Agents Guide

This branch holds Startpunkt v5, a rewrite in Go. The design, the decisions behind it and the milestones are in `docs/v5-design.md`; read it before making changes.

- The 4.x implementation (Quarkus and Preact) is not on this branch. Read it from `main` when its behaviour is the reference, for example `git show main:src/main/java/us/ullberg/startpunkt/objects/kubernetes/IngressApplicationWrapper.java`.
- Layout: `cmd/startpunkt` (entry point and roles), `api/v1` (custom resource types), `internal/` (tile model, store, source adapters, controller, HTTP API, follower, config), `web/` (Preact, signals, TypeScript, Vite), `charts/startpunkt` (Helm chart).
- One binary runs every role: `all`, `controller`, `api` and `web`. Keep a feature working both in one process and split across roles.
- Backend checks: `go vet ./...` and `go test -race ./...`.
- Frontend checks, in `web/`: `npm run check`, `npm test`, `npm run build`. Use npm, not another package manager.
- `web/dist` is embedded in the binary. Build the frontend before `go build` when the page is needed; Go tests do not need it.
- Tests never point at a real cluster. Use the fake clients (see `internal/kube/controller_test.go`).
- The tile JSON under `/api/v1` is a versioned contract shared by the browser and by other Startpunkt processes. Change `internal/tile`, `internal/api` and `web/src/types.ts` together.
- Every setting must be settable through an environment variable (`STARTPUNKT_*`), with the YAML file as an alternative. Document new settings in the chart's `values.yaml`.
- The page loads no third-party scripts and renders tile content as text. Keep the Content-Security-Policy in `internal/api` strict.
- Accessibility: semantic HTML, keyboard reachable controls, visible focus, ARIA names on interactive elements, and never colour as the only signal.
- Commits follow Conventional Commits (`type(scope): description`).

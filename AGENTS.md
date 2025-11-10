# Agents Guide

- Read `.github/copilot-instructions.md` before making changes; it captures the project-specific rules and workflows.
- Backend work happens in the Quarkus service under `src/main/java/us/ullberg/startpunkt`; frontend lives in `src/main/webui` with Preact + Vite.
- Run `./mvnw quarkus:dev` for local development or `./mvnw verify` before opening a PR to execute Java, Quarkus, Jest, Spotless, Checkstyle, and dependency checks.
- Frontend-only iterations can use `npm run dev` / `npm test` inside `src/main/webui`, but commit with the Maven verify passing.
- Mock Kubernetes tests require registering CRDs via Fabric8 helpers (see `ApplicationResourceTest`); do not point tests at a real cluster.
- Keep JSON contracts (`groups[].applications[]`, bookmark payloads, theme palettes) in sync between REST resources and SPA components when editing APIs.
- Avoid committing generated artifacts under `target/`, `src/main/webui/node_modules/`.
- When adding config knobs, wire them through `application.yaml`, the corresponding `@ConfigProperty`, REST exposure if needed, and document defaults for operators.
- `docs/todo.md` contains a list of changes to be implemented.

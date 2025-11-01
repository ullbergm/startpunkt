# GitHub Copilot Instructions for Startpunkt

## Project Overview

Startpunkt is a clean start page designed to display links to all self-hosted resources in a Kubernetes cluster. It's a Quarkus 3 service that aggregates Kubernetes resources (Ingress, Routes, VirtualServices, HTTPRoutes) into a Preact single-page application.

**Technology Stack:**
- Backend: Quarkus 3 (Java 21)
- Frontend: Preact + Vite
- Testing: JUnit 5, RestAssured, Jest, Testing Library
- Kubernetes Client: Fabric8
- Build: Maven (wrapper included)
- Package Manager: npm (canonical for this project)

**Key Directories:**
- `src/main/java/us/ullberg/startpunkt` - Backend Java code
- `src/main/webui` - Frontend Preact code
- `src/main/resources` - Configuration and i18n files
- `src/test/java` - Java unit/integration tests
- `src/main/webui/**/*.test.jsx` - Frontend component tests

## Architecture & Structure

- Startpunkt is a Quarkus 3 service that aggregates Kubernetes resources into a Preact SPA; backend sources live in `src/main/java/us/ullberg/startpunkt`.
- REST resources in `rest/` expose grouped data (`ApplicationResource`, `BookmarkResource`, `ConfigResource`, `I8nResource`, `ThemeResource`) and always return wrappers from `objects/`.
- `ApplicationResource` builds a sorted `ApplicationSpec` list through wrapper classes in `objects/kubernetes`; respect the feature toggles from `application.yaml` and keep `Collections.sort(apps)` before grouping so UI ordering stays deterministic.
- Wrappers extend `BaseKubernetesObject`, read Fabric8 generic resources, and enrich URLs with annotations like `startpunkt.ullberg.us/rootPath` and `startpunkt.ullberg.us/tags`; preserve the tag filtering rules implemented in `filterApplicationsByTags` and `filterApplicationsWithoutTags`.
- Bookmarks flow through `BookmarkService` and `BookmarkGroupList`; group names are lowercased and location `0` is normalized to `1000` for Hajimari compatibility.
- CRD Java models under `crd/v1alpha4` are consumed by both the API and Fabric8 mocks; add new fields with generator annotations rather than editing generated YAML, and keep older versions intact for compatibility.
- Translations reside in `src/main/resources/i8n/*.json`; `I8nService` validates language format and falls back to `startpunkt.defaultLanguage`.
- Theme endpoints build responses from `Theme`/`ThemeColors`; always provide both `light` and `dark` palettes because the SPA expects them.
- Front-end code is in `src/main/webui`; `main.jsx` bootstraps Preact components that consume the REST JSON (`groups[].applications[]`, `bookmarks[].links[]`). Component tests live alongside sources with `.test.jsx` using Testing Library + Jest.
- Vite configuration (`vite.config.js`) is tuned for Quarkus Quinoa; let Quarkus own the build output in `target/quinoa` and avoid custom dist paths.
- Quinoa install settings are managed via `application.properties`; keep node/npm versions aligned with `frontend-maven-plugin` if you update tooling.
- Metrics and caching rely on `@Timed` and `@CacheResult`; additions that mutate data must add explicit cache invalidation annotations to avoid stale responses.
- Full backend + frontend verification runs with `./mvnw verify`, which triggers Jest through the `frontend-maven-plugin`; expect Checkstyle, Spotless, Enforcer, dependency analysis, and Quarkus tests in that command.
- Use `./mvnw quarkus:dev` for hot reload across Java and the SPA (Quinoa proxies Vite); front-end only tasks can use `npm run dev` inside `src/main/webui`.
- Kubernetes-facing tests rely on `@WithKubernetesTestServer`; always register CRDs before seeding resources (see `ApplicationResourceTest#before`) and interact through Fabric8 `resource()` helpers instead of raw HTTP.
- REST tests use RestAssured; keep response shapes stable and update the accompanying `.test.jsx` files if the JSON contract changes.
- Tag filtering behaviour is documented in `docs/object-tag-filtering.md`; untagged apps must remain visible by default and whenever tags are supplied.
- Configuration defaults live in `application.yaml`; any new `@ConfigProperty` entry must be mirrored there and, if exposed to the UI, surfaced via `ConfigResource`.
- Generated artefacts under `target/` and `src/main/webui/node_modules/` should never be committed.
- Renovate manages dependency bumps; when adding libraries, pin versions explicitly in `pom.xml` or the web UI `package.json` and run the full verify task.
- Tests are split between fast unit tests (`*Test.java`, `.test.jsx`) and Quarkus native/IT (`*IT.java`); keep new coverage consistent with this naming so Surefire/Failsafe execute them correctly.

## Code Style & Formatting

- Java code follows Checkstyle and Spotless rules; run `./mvnw spotless:apply` to auto-format before committing.
- Frontend code should be consistent with existing Preact/JSX style; avoid introducing new linting rules without discussion.
- Keep imports organized and remove unused imports.

## Accessibility Guidelines

- Always add proper ARIA labels and roles to interactive elements (buttons, links, dialogs, etc.).
- Ensure all UI components are keyboard navigable (Tab, Enter, Space, Arrow keys where applicable).
- Use semantic HTML elements (header, nav, main, footer, article) with appropriate roles.
- Include `aria-label`, `aria-labelledby`, `aria-describedby` where needed for screen readers.
- Add `aria-live` regions for dynamic content updates that should be announced.
- Provide visible focus indicators with sufficient contrast (min 3px outline).
- Support high contrast mode through CSS classes applied to body.
- Ensure color is not the only means of conveying information.
- Test new features with keyboard-only navigation and consider screen reader users.
- Maintain proper heading hierarchy (h1 > h2 > h3) for document structure.

## Commit Conventions

- Follow conventional commit format: `type(scope): description` (e.g., `feat(api): add theme endpoint`, `fix(ui): correct bookmark sorting`).
- Commitlint enforces this format; use `npm run commit` for an interactive prompt if unsure.
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

## Development Workflow

- Create focused, well-scoped pull requests.
- Run `./mvnw verify` before opening a PR to ensure all checks pass.
- Add tests for new features and bug fixes.
- Update documentation if changing APIs or configuration options.
- Keep PRs small and reviewable; split large changes into multiple PRs.

## Testing Requirements

### Backend Tests
- All new Java code must have corresponding unit tests (*Test.java) or integration tests (*IT.java).
- Use `@QuarkusTest` for Quarkus integration tests.
- Kubernetes tests require `@WithKubernetesTestServer` and CRD registration in `@BeforeEach` or `@BeforeAll`.
- REST endpoints must have RestAssured tests validating request/response contracts.
- Target minimum 80% code coverage; focus on critical business logic and edge cases.

### Frontend Tests
- Component tests use Jest + Testing Library (*.test.jsx files alongside components).
- Test user interactions, accessibility attributes, and component rendering.
- Mock API calls using appropriate Jest mocking patterns.
- Ensure keyboard navigation and ARIA compliance in interactive components.

## Security Best Practices

- Never commit secrets, API keys, or credentials to the repository.
- Validate all external input using appropriate validators or Quarkus validation annotations.
- Use `@ConfigProperty` for configuration values; define defaults in `application.yaml`.
- When adding dependencies, check for known vulnerabilities using `./mvnw dependency-check:check`.
- Follow the principle of least privilege when handling Kubernetes resources.
- Sanitize user-provided content before rendering in the UI to prevent XSS.

## Common Pitfalls to Avoid

- **Don't commit generated files**: Exclude `target/`, `src/main/webui/node_modules/`, and `src/main/webui/dist/` from commits.
- **Don't modify Quinoa paths**: The build output should remain in `target/quinoa`; avoid custom dist configurations.
- **Don't skip CRD registration**: Kubernetes tests fail without proper CRD setup in test initialization.
- **Don't break tag filtering**: Preserve the logic in `filterApplicationsByTags` and `filterApplicationsWithoutTags`.
- **Don't remove existing tests**: If tests fail, fix the code or tests, don't delete them.
- **Don't use package managers other than npm**: This project uses npm exclusively (no pnpm, yarn).

## API and Data Contracts

- REST endpoints return typed objects from `objects/` package, never primitives or raw maps.
- Applications are grouped by namespace or custom groups; maintain `ApplicationSpec` as the canonical model.
- Bookmarks use `BookmarkGroupList` with groups lowercased and location `0` normalized to `1000`.
- Theme responses must always include both `light` and `dark` color palettes.
- I18n language codes must match ISO format (e.g., `en-US`); validation enforced in `I8nService`.

## Performance Considerations

- Use `@CacheResult` for expensive operations (e.g., Kubernetes resource queries).
- Invalidate caches with `@CacheInvalidate` or `@CacheInvalidateAll` when data changes.
- Apply `@Timed` metrics to endpoints and services for observability.
- Debounce real-time events (SSE) as configured in `application.yaml` to prevent flooding.
- Minimize Kubernetes API calls; batch operations where possible.

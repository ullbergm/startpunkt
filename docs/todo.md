# TODO

## Backend TOD- [x] **Resolve Node/NPM version drift** (High)  
  Quinoa pins Node 20.11.1 (application.properties) but the `frontend-maven-plugin` installs Node 24.2.0 directly into node. Use a single version across both tools and relocate the install directory to `target/frontend` (or rely solely on Quinoa) so binaries don't clutter the source tree.

- [x] **Inject and reuse the `KubernetesClient` instead of instantiating per request** (High)

- [x] **Handle namespace selector config safely** (High)

- [ ] **Improve error handling around Kubernetes lookups** (Medium)  
  `ApplicationResource.retrieveApps()` and `BookmarkService.retrieveBookmarks()` surface raw exceptions, returning 500s without context. Catch `KubernetesClientException`, log with namespace/scope details, and downgrade to empty results where it makes sense.

- [ ] **Close/i18n InputStreams and harden fallbacks** (Medium)  
  `I8nService.getTranslation()` reads from `translation.readAllBytes()` without closing the stream and can still dereference `null` if neither the requested nor default bundle exists. Use try-with-resources and convert the “last resort” into a clear `IOException`.

- [ ] **Trim dead helper methods in `BookmarkService` and consolidate mapping logic** (Low)  
  Methods like `getUrl`, `getIcon`, etc., are unused; folding the repeated spec-extraction logic into small reusable helpers keeps the class focused and appeases static analysis.

- [ ] **Tighten field visibility on REST resources** (Low)  
  `ConfigResource` and `ThemeResource` expose `public` fields for injected config. Make them `private` and add getters or constructor injection to reduce accidental mutation in tests.

## Frontend & Tooling TODOs

- [x] **Choose one package manager + lockfile** (High)  

- [x] **Resolve Node/NPM version drift** (High)

- [ ] **Add lint/type-check coverage for the webui** (Medium)  
  The package.json only runs Jest. Introduce `eslint` (or `biome`) and optionally `tsc --noEmit` if you add TypeScript, wiring them into CI to catch regressions early.

- [ ] **Strengthen UI test posture** (Low)  
  Current Jest suite lives but outputs only JUnit. Consider adding minimal smoke tests for routing, translation loading, and theme switching to guard high-value behaviors.

## Build, Deploy & Ops TODOs

- [ ] **Audit dependency declarations against Quarkus BOM** (Medium)  
  A few entries (e.g., `io.quarkus:quarkus-core` with explicit version, duplicated `commons-lang3`) can be trimmed once managed by the imported BOM. Run `mvn dependency:tree -Dverbose` after cleanup to ensure no drift.

- [ ] **Modernize generated manifests** (Low)  
  startpunkt-jvm.yaml still advertises Quarkus 3.12.3 while the project is on 3.28.x. Regenerate manifests after the platform upgrade so metadata stays accurate and new config defaults propagate.

- [ ] **Document test & build commands in the README** (Low)  
  Local contributors have no consolidated “run backend”, “run webui standalone”, or “run combined tests” section. Add a short “Try it locally” block for Maven + Quinoa workflows.

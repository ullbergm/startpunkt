---
applyTo: '**'
---
# Issue Refinement Instructions for Agents

## Overview

When asked to refine, rewrite, or improve a GitHub issue, follow this structured approach to analyze the current state of the repository, understand the request, clean up the issue description, and provide a detailed implementation plan.

## Workflow Steps

### 1. Understand the Issue

**First, carefully read the issue:**

- Identify the core problem or feature request
- Extract any technical requirements mentioned
- Note any existing context or background information
- Identify stakeholders or users affected
- Look for any acceptance criteria already provided

### 2. Analyze Repository Context

**Before refining the issue, search the repository for relevant context:**

- **Search for related code:**
  - Use `semantic_search` to find similar features or patterns
  - Use `grep_search` to locate specific APIs, classes, or components mentioned
  - Check if similar functionality already exists

- **Review related files:**
  - Backend: Look in `src/main/java/us/ullberg/startpunkt/`
  - Frontend: Look in `src/main/webui/src/`
  - Tests: Check `src/test/java/` and `.test.jsx` files
  - Configuration: Review `application.yaml` and `application.properties`
  - Documentation: Check `docs/` for relevant guides

- **Identify dependencies:**
  - Check `pom.xml` for Java dependencies
  - Check `src/main/webui/package.json` for frontend dependencies
  - Note any CRD models in `crd/v1alpha4/`

- **Review existing patterns:**
  - How are similar features implemented?
  - What REST endpoint patterns are used?
  - What component structures exist in the UI?
  - What testing patterns are established?

### 3. Clean Up the Issue

**Rewrite the issue with the following structure:**

```markdown
## Summary
[One-paragraph overview of what needs to be done and why]

## Problem Statement / Motivation
[Detailed explanation of the problem or the value this feature provides]
- Why is this needed?
- Who benefits from this?
- What is the current pain point or limitation?

## Proposed Solution
[Clear description of the solution approach]
- High-level design decisions
- User-facing changes
- Technical approach overview

## Technical Context
[Based on repository analysis]
- Related existing features: [list]
- Files to modify: [list with brief descriptions]
- New files to create: [list with brief descriptions]
- Dependencies to add/modify: [list]
- Configuration changes: [list]

## Acceptance Criteria
- [ ] [Specific, testable criteria]
- [ ] [Each criterion should be verifiable]
- [ ] [Include both functional and non-functional requirements]
- [ ] [Tests added/updated]
- [ ] [Documentation updated]

## Implementation Plan

### Phase 1: Backend Changes
**Files to modify:**
- `path/to/file.java` - [specific changes needed]
- `path/to/another.java` - [specific changes needed]

**Files to create:**
- `path/to/new.java` - [purpose and structure]

**Steps:**
1. [Detailed step with code context]
2. [Detailed step with code context]

**Testing:**
- Add unit tests in `src/test/java/...Test.java`
- Add integration tests if needed
- Expected test coverage: [percentage or scope]

### Phase 2: Frontend Changes
**Files to modify:**
- `src/main/webui/src/component.jsx` - [specific changes needed]
- `src/main/webui/src/styles.scss` - [specific changes needed]

**Files to create:**
- `src/main/webui/src/new-component.jsx` - [purpose and structure]
- `src/main/webui/src/new-component.test.jsx` - [test scenarios]

**Steps:**
1. [Detailed step with component context]
2. [Detailed step with component context]

**Testing:**
- Add component tests alongside components (*.test.jsx)
- Test accessibility (keyboard navigation, ARIA labels)
- Test user interactions

### Phase 3: Configuration & Integration
**Configuration changes:**
- `application.yaml` - [new properties to add]
- `application.properties` - [values to set]

**Steps:**
1. Wire up backend to frontend
2. Update REST endpoints if needed
3. Add/update documentation

**Testing:**
- Integration tests covering end-to-end flow
- Manual testing steps: [list specific scenarios]

### Phase 4: Documentation & Polish
**Documentation to update:**
- `docs/user/` - [user-facing documentation]
- `docs/developer/` - [developer documentation]
- `README.md` - [if adding major feature]

**Code quality:**
- Run `./mvnw spotless:apply` for formatting
- Run `./mvnw verify` to ensure all checks pass
- Ensure conventional commit format

## Accessibility Requirements
[If UI changes are involved]
- [ ] Keyboard navigation works (Tab, Enter, Space, Arrows)
- [ ] ARIA labels and roles added where needed
- [ ] Focus indicators visible with sufficient contrast
- [ ] Color not sole means of conveying information
- [ ] Screen reader tested (if possible)

## Security Considerations
- [ ] No secrets or credentials hardcoded
- [ ] Input validation in place
- [ ] External input sanitized
- [ ] Dependencies checked for vulnerabilities
- [ ] Principle of least privilege followed

## Performance Considerations
- [ ] Caching strategy defined (if applicable)
- [ ] Metrics/timing added for observability
- [ ] Kubernetes API calls minimized
- [ ] Debouncing/throttling considered for events

## Related Issues/PRs
- Relates to #[number]
- Blocks #[number]
- Blocked by #[number]

## Open Questions
- [Questions that need stakeholder input]
- [Technical decisions requiring discussion]

## Out of Scope
- [Clearly state what this issue does NOT cover]
- [Helps prevent scope creep]
```

### 4. Validate the Refined Issue

**Before posting, ensure:**

- [ ] All repository context has been researched
- [ ] Implementation plan references actual files and patterns
- [ ] Acceptance criteria are specific and testable
- [ ] Testing strategy is comprehensive
- [ ] Documentation updates are identified
- [ ] The issue follows conventional structure
- [ ] Technical feasibility has been verified
- [ ] Dependencies and prerequisites are identified

### 5. Implementation Plan Best Practices

**When creating the implementation plan:**

1. **Be Specific**: Reference actual file paths, class names, method signatures
2. **Show, Don't Tell**: Include code snippets or pseudocode where helpful
3. **Consider Dependencies**: Order tasks based on dependencies
4. **Think About Testing**: Each phase should have clear test requirements
5. **Account for Edge Cases**: Note potential gotchas or edge cases
6. **Reference Patterns**: Point to existing code as examples
7. **Estimate Scope**: Indicate if tasks are small/medium/large
8. **Break Down Complex Work**: Split large phases into manageable chunks

**Phase Sizing Guidelines:**

- **Small**: 1-2 hours, single file changes, straightforward logic
- **Medium**: Half-day to 1 day, multiple file changes, moderate complexity
- **Large**: 1-3 days, architectural changes, significant testing needed
- **Very Large**: Consider splitting into multiple issues

## Example Searches to Perform

**For a new REST endpoint:**

```text
semantic_search: "REST endpoint implementation pattern"
grep_search: "@Path" in src/main/java/us/ullberg/startpunkt/rest/
read_file: src/main/java/us/ullberg/startpunkt/rest/ApplicationResource.java
```

**For a new UI component:**

```text
semantic_search: "Preact component pattern modal dialog"
file_search: "src/main/webui/src/components/*.jsx"
read_file: src/main/webui/src/components/[similar-component].jsx
```

**For Kubernetes integration:**

```text
semantic_search: "Fabric8 Kubernetes client usage"
grep_search: "fabric8" in src/main/java/
read_file: src/main/java/us/ullberg/startpunkt/objects/kubernetes/
```

**For configuration changes:**

```text
read_file: src/main/resources/application.yaml
grep_search: "@ConfigProperty" in src/main/java/
```

## Common Patterns to Reference

### Backend Patterns

- REST resources in `rest/` extend base patterns, return wrappers from `objects/`
- Kubernetes wrappers extend `BaseKubernetesObject`
- Services use `@ApplicationScoped`, `@Inject` for DI
- Caching with `@CacheResult`, `@CacheInvalidate`
- Metrics with `@Timed`
- Tests use `@QuarkusTest`, `@WithKubernetesTestServer`

### Frontend Patterns

- Functional components with hooks
- Props validation and TypeScript-like JSDoc
- Accessibility attributes (role, aria-*)
- Component tests with Testing Library
- CSS modules or SCSS alongside components

### Testing Patterns

- Unit tests: `*Test.java` and `*.test.jsx`
- Integration tests: `*IT.java`
- Mock Kubernetes server for K8s tests
- RestAssured for REST endpoint testing
- Jest + Testing Library for frontend

## Agent Checklist

When refining an issue, the agent should:

- [ ] Read and understand the original issue completely
- [ ] Search for related code patterns in the repository
- [ ] Identify all files that need modification
- [ ] Identify all new files that need creation
- [ ] Check for similar existing implementations
- [ ] Review project guidelines (`.github/copilot-instructions.md`)
- [ ] Create detailed, actionable implementation steps
- [ ] Include specific file paths and code references
- [ ] Define clear acceptance criteria
- [ ] Specify testing requirements
- [ ] Note documentation updates needed
- [ ] Consider accessibility, security, and performance
- [ ] Validate technical feasibility
- [ ] Structure the issue with all required sections
- [ ] Use proper Markdown formatting
- [ ] Keep implementation plan realistic and scoped

## Tone and Style

- **Professional but approachable**: Write clearly for both technical and non-technical stakeholders
- **Specific and actionable**: Avoid vague statements like "improve the code"
- **Contextual**: Always reference existing patterns and code
- **Structured**: Use consistent formatting and section headers
- **Complete**: Don't leave gaps or assumptions unstated

## Final Notes

- Always verify the repository context before making assumptions
- Use the project's established patterns and conventions
- Consider backward compatibility and migration needs
- Think about the operator/user experience
- Validate against project guidelines and best practices
- Make the issue a useful reference for implementation

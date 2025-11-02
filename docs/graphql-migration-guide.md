# GraphQL Migration Guide

## Overview

This document provides guidance for completing the migration from REST API to GraphQL API in Startpunkt. The migration follows a phased approach with **Phase 1 and Phases 2-3 (Applications domain) already completed** as a proof of concept.

## Current Status

### ✅ Completed

- **Phase 1**: GraphQL infrastructure setup
  - SmallRye GraphQL dependencies added
  - Configuration in `application.yaml`
  - GraphQL endpoint available at `/graphql`
  - GraphiQL UI available at `/graphql-ui` (dev mode)

- **Phase 2-3 (Partial)**: Application Query Resolvers
  - `ApplicationGraphQLResource` implemented
  - Queries: `applicationGroups(tags: [String])`, `application(groupName, appName)`
  - Tag filtering logic ported
  - Integration tests added

### 🚧 Remaining Work

The following phases need to be completed following the pattern established in `ApplicationGraphQLResource`:

1. **Complete Query Resolvers** (Bookmarks, Config, Theme, I18n)
2. **Mutation Resolvers** (CRUD operations)
3. **DataLoaders** (Performance optimization)
4. **GraphQL Subscriptions** (Replace WebSocket)
5. **Frontend Migration** (React/Preact to GraphQL client)
6. **REST Cleanup** (Remove old endpoints)
7. **Comprehensive Testing**

## Architecture Pattern

### GraphQL Resource Structure

```java
@GraphQLApi
@ApplicationScoped
public class DomainGraphQLResource {
  
  // Inject dependencies via constructor
  final ServiceClass service;
  
  public DomainGraphQLResource(ServiceClass service) {
    this.service = service;
  }
  
  // Query methods
  @Query("queryName")
  @Description("Query description")
  @Timed(value = "graphql.query.queryName")
  public ReturnType getQueryName(
      @Name("param") @Description("Parameter description") String param) {
    // Delegate to existing service layer
    return service.getSomething(param);
  }
  
  // Mutation methods (future)
  @Mutation("mutationName")
  @Description("Mutation description")
  @Timed(value = "graphql.mutation.mutationName")
  public ReturnType mutationName(
      @Name("input") InputType input) {
    // Perform mutation
    return service.update(input);
  }
}
```

### Key Principles

1. **Reuse Existing Services**: GraphQL resolvers should delegate to existing service classes (`ApplicationService`, `BookmarkService`, etc.)
2. **Avoid Duplication**: Don't copy-paste REST logic; refactor shared code into services
3. **Use Annotations**: Leverage `@Description`, `@Name` for schema documentation
4. **Metrics**: Add `@Timed` annotations for observability
5. **Nullable vs NonNull**: Use `@NonNull` annotation where appropriate

## Implementation Steps

### Step 1: Implement Remaining Query Resolvers

Create GraphQL resources for each domain following the `ApplicationGraphQLResource` pattern:

#### BookmarkGraphQLResource

```java
@GraphQLApi
@ApplicationScoped
public class BookmarkGraphQLResource {
  
  final BookmarkService bookmarkService;
  
  public BookmarkGraphQLResource(BookmarkService bookmarkService) {
    this.bookmarkService = bookmarkService;
  }
  
  @Query("bookmarkGroups")
  @Description("Retrieve all bookmark groups")
  @Timed(value = "graphql.query.bookmarkGroups")
  public List<BookmarkGroup> getBookmarkGroups() {
    List<BookmarkResponse> bookmarks = // retrieve from service
    return bookmarkService.generateBookmarkGroups(bookmarks);
  }
}
```

#### ConfigGraphQLResource

```java
@GraphQLApi
@ApplicationScoped
public class ConfigGraphQLResource {
  
  @ConfigProperty(name = "startpunkt.web.title")
  String webTitle;
  
  @ConfigProperty(name = "startpunkt.web.refreshInterval")
  int refreshInterval;
  
  // ... other config properties
  
  @Query("config")
  @Description("Retrieve application configuration")
  @Timed(value = "graphql.query.config")
  public ConfigResponse getConfig() {
    return new ConfigResponse(webTitle, refreshInterval, ...);
  }
}
```

#### ThemeGraphQLResource

```java
@GraphQLApi
@ApplicationScoped
public class ThemeGraphQLResource {
  
  @Query("theme")
  @Description("Retrieve theme colors")
  @Timed(value = "graphql.query.theme")
  public ThemeResponse getTheme(@Name("name") String themeName) {
    // Return theme colors based on themeName (light/dark)
  }
}
```

#### I18nGraphQLResource

```java
@GraphQLApi
@ApplicationScoped
public class I18nGraphQLResource {
  
  final I8nService i8nService;
  
  public I18nGraphQLResource(I8nService i8nService) {
    this.i8nService = i8nService;
  }
  
  @Query("translations")
  @Description("Retrieve translations for a specific language")
  @Timed(value = "graphql.query.translations")
  public Map<String, String> getTranslations(
      @Name("language") @Description("Language code (e.g., en-US)") String language) {
    return i8nService.getTranslations(language);
  }
}
```

### Step 2: Implement Mutation Resolvers

Add mutation methods to the GraphQL resources for CRUD operations:

```java
@Mutation("createApplication")
@Description("Create a new application")
@Timed(value = "graphql.mutation.createApplication")
public Application createApplication(@Name("input") CreateApplicationInput input) {
  Application created = applicationService.createApplication(
    input.namespace, input.name, input.spec
  );
  
  // Invalidate caches if needed
  // Broadcast subscription event
  
  return created;
}

@Mutation("updateApplication")
@Description("Update an existing application")
@Timed(value = "graphql.mutation.updateApplication")
public Application updateApplication(@Name("input") UpdateApplicationInput input) {
  // Similar pattern to create
}

@Mutation("deleteApplication")
@Description("Delete an application")
@Timed(value = "graphql.mutation.deleteApplication")
public Boolean deleteApplication(
    @Name("namespace") String namespace, 
    @Name("name") String name) {
  return applicationService.deleteApplication(namespace, name);
}
```

### Step 3: Create Input Types

Define input types for mutations:

```java
@Input("CreateApplicationInput")
public class CreateApplicationInput {
  public String namespace;
  public String name;
  public ApplicationSpec spec;
}

@Input("UpdateApplicationInput")
public class UpdateApplicationInput {
  public String namespace;
  public String name;
  public ApplicationSpec spec;
}
```

### Step 4: Add DataLoaders (Optional but Recommended)

Implement DataLoaders to batch Kubernetes resource fetches:

```java
@ApplicationScoped
public class ApplicationDataLoader {
  
  @Inject
  KubernetesClient kubernetesClient;
  
  @DataLoader("application")
  public CompletionStage<List<Application>> batchLoadApplications(List<ApplicationKey> keys) {
    return CompletableFuture.supplyAsync(() -> {
      // Batch fetch applications from Kubernetes
      return kubernetesClient.resources(Application.class)
        .inAnyNamespace()
        .list()
        .getItems()
        .stream()
        .filter(app -> keys.contains(toKey(app)))
        .collect(Collectors.toList());
    });
  }
}
```

### Step 5: Implement Subscriptions

Replace WebSocket with GraphQL subscriptions:

```java
@Subscription("applicationUpdates")
@Description("Subscribe to real-time application updates")
public Multi<ApplicationUpdateEvent> subscribeToApplicationUpdates(
    @Name("namespace") String namespace) {
  return Multi.createFrom().emitter(emitter -> {
    // Listen to Kubernetes events
    // Emit updates as they occur
  });
}
```

### Step 6: Frontend Migration

#### Install GraphQL Client

```bash
cd src/main/webui
npm install @urql/preact graphql
```

#### Setup GraphQL Client

```javascript
// src/main/webui/src/graphql-client.js
import { Client, cacheExchange, fetchExchange } from '@urql/preact';

export const client = new Client({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
});
```

#### Update App Component

```javascript
import { Provider } from '@urql/preact';
import { client } from './graphql-client';

export function App() {
  return (
    <Provider value={client}>
      {/* Your app components */}
    </Provider>
  );
}
```

#### Replace REST Calls with GraphQL

**Before (REST):**
```javascript
const [apps, setApps] = useState([]);

useEffect(() => {
  fetch('/api/apps')
    .then(res => res.json())
    .then(data => setApps(data.groups));
}, []);
```

**After (GraphQL):**
```javascript
import { useQuery } from '@urql/preact';

const APPS_QUERY = `
  query {
    applicationGroups {
      name
      applications {
        name
        url
        icon
        available
      }
    }
  }
`;

const [result] = useQuery({ query: APPS_QUERY });
const apps = result.data?.applicationGroups || [];
```

#### Files to Update

1. `src/main/webui/src/app.jsx` - Main app, config/theme/i18n fetches
2. `src/main/webui/src/SpotlightSearch.jsx` - App searches
3. `src/main/webui/src/ApplicationEditor.jsx` - CRUD mutations
4. `src/main/webui/src/BookmarkEditor.jsx` - CRUD mutations
5. All `*.test.jsx` files - Update mocks to use GraphQL

### Step 7: Remove REST Endpoints

Once frontend migration is complete and tested:

1. Delete `src/main/java/us/ullberg/startpunkt/rest/*.java`
2. Delete `src/test/java/us/ullberg/startpunkt/rest/*Test.java`
3. Remove `quarkus-smallrye-openapi` dependency (if no longer needed)
4. Remove REST-specific configuration
5. Update documentation to remove REST references

### Step 8: Testing

#### Integration Tests

Create comprehensive GraphQL tests:

```java
@QuarkusTest
class StartpunktGraphQLApiTest {
  
  @Test
  void testCompleteApplicationWorkflow() {
    // Create
    String createMutation = """
      mutation {
        createApplication(input: {
          namespace: "test"
          name: "myapp"
          spec: { ... }
        }) {
          metadata { name namespace }
        }
      }
    """;
    
    // Query
    String query = """
      query {
        application(groupName: "test", appName: "myapp") {
          name
          url
        }
      }
    """;
    
    // Update
    // Delete
    // Verify
  }
  
  @Test
  void testSubscriptions() {
    // Subscribe to updates
    // Perform mutation
    // Verify subscription receives event
  }
}
```

#### Frontend Tests

Update component tests to mock GraphQL:

```javascript
import { Provider } from '@urql/preact';
import { fromValue } from 'wonka';

const mockClient = {
  executeQuery: () => fromValue({
    data: {
      applicationGroups: [/* mock data */]
    }
  })
};

test('renders applications', () => {
  render(
    <Provider value={mockClient}>
      <ApplicationList />
    </Provider>
  );
  // assertions
});
```

## Testing the GraphQL API

### Using GraphiQL UI

1. Start the dev server: `./mvnw quarkus:dev`
2. Navigate to `http://localhost:8080/graphql-ui`
3. Run queries interactively

### Example Queries

```graphql
# Get all applications
{
  applicationGroups {
    name
    applications {
      name
      url
      icon
      available
      group
    }
  }
}

# Get applications filtered by tags
{
  applicationGroups(tags: ["admin", "monitoring"]) {
    name
    applications {
      name
      url
    }
  }
}

# Get single application
{
  application(groupName: "Tools", appName: "Jenkins") {
    name
    url
    available
    targetBlank
  }
}

# Schema introspection
{
  __schema {
    queryType {
      name
      fields {
        name
        description
      }
    }
  }
}
```

### Example Mutations (Future)

```graphql
mutation {
  createApplication(input: {
    namespace: "default"
    name: "my-app"
    spec: {
      name: "My Application"
      url: "https://myapp.example.com"
      group: "Tools"
      icon: "mdi:application"
    }
  }) {
    metadata {
      name
      namespace
    }
    spec {
      name
      url
    }
  }
}
```

## Migration Checklist

### Backend

- [x] GraphQL dependencies added
- [x] Configuration setup
- [x] Application query resolvers
- [ ] Bookmark query resolvers
- [ ] Config query resolver
- [ ] Theme query resolver
- [ ] I18n query resolver
- [ ] Application mutation resolvers
- [ ] Bookmark mutation resolvers
- [ ] DataLoader implementation
- [ ] Subscription implementation
- [ ] Comprehensive GraphQL tests

### Frontend

- [ ] GraphQL client installed (@urql/preact)
- [ ] Client configuration
- [ ] app.jsx migrated
- [ ] SpotlightSearch.jsx migrated
- [ ] ApplicationEditor.jsx migrated
- [ ] BookmarkEditor.jsx migrated
- [ ] All fetch() calls replaced
- [ ] WebSocket replaced with subscriptions
- [ ] Component tests updated
- [ ] E2E tests passing

### Cleanup

- [ ] REST endpoints deleted
- [ ] REST tests deleted
- [ ] OpenAPI dependency removed (if applicable)
- [ ] Documentation updated
- [ ] README updated
- [ ] No dead REST code remains

### Quality

- [ ] All tests passing (./mvnw verify)
- [ ] Code coverage ≥ 80%
- [ ] Spotless formatting applied
- [ ] Checkstyle passes
- [ ] No security vulnerabilities
- [ ] Performance benchmarked

## Common Pitfalls

1. **Cache Key Null**: Don't use `@CacheResult` without proper cache key handling for nullable parameters
2. **Missing @Description**: Always add descriptions for schema documentation
3. **Forgetting @Timed**: Add metrics for monitoring
4. **Not Testing Subscriptions**: Subscriptions are complex; test thoroughly
5. **Frontend State Management**: GraphQL clients handle caching differently; understand urql's cache behavior

## Performance Considerations

1. **DataLoaders**: Essential for avoiding N+1 queries when fetching related resources
2. **Query Complexity**: Consider adding max depth/complexity limits
3. **Caching**: Leverage GraphQL client caching (urql's cache exchange)
4. **Batching**: Use DataLoaders to batch Kubernetes API calls
5. **Monitoring**: Use metrics to track query performance

## Security Considerations

1. **Query Depth Limiting**: Prevent deeply nested expensive queries
2. **Rate Limiting**: Apply rate limits to GraphQL endpoint
3. **Input Validation**: Validate all mutation inputs
4. **Authorization**: Implement field-level auth if needed
5. **Introspection**: Consider disabling in production (`quarkus.smallrye-graphql.schema-available=false`)

## Resources

- [SmallRye GraphQL Documentation](https://smallrye.io/smallrye-graphql/)
- [Quarkus GraphQL Guide](https://quarkus.io/guides/smallrye-graphql)
- [urql Documentation](https://formidable.com/open-source/urql/docs/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [DataLoader Pattern](https://github.com/graphql/dataloader)

## Next Steps

1. Review the `ApplicationGraphQLResource` implementation as a reference
2. Implement remaining query resolvers following the same pattern
3. Test each resolver individually with GraphiQL
4. Add mutation resolvers
5. Begin frontend migration incrementally (one component at a time)
6. Test thoroughly before removing REST endpoints

---

**Note**: This is a significant architectural change. Take it step by step, test frequently, and ensure each phase is complete before moving to the next.

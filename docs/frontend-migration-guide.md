# GraphQL Migration - Frontend Migration Guide

## Current Status

The backend GraphQL API is **100% complete** with full query and mutation support. The remaining work is to migrate the frontend from REST to GraphQL.

## Frontend Migration Plan

### Files Requiring Changes

Based on analysis, the following files need to be updated:

1. **`src/main/webui/src/app.jsx`** - Main application file with REST API calls:
   - `/api/theme` - Get theme colors
   - `/api/i8n/{lang}` - Get translations
   - `/api/config` - Get configuration
   - `/api/bookmarks` - Get bookmarks
   - `/api/apps/manage` - Delete applications (CRUD)
   - `/api/bookmarks/manage` - Delete bookmarks (CRUD)

2. **`src/main/webui/src/ApplicationEditor.jsx`** - Application CRUD operations (if present)

3. **`src/main/webui/src/BookmarkEditor.jsx`** - Bookmark CRUD operations (if present)

4. **`src/main/webui/src/SpotlightSearch.jsx`** - Search functionality (if it makes API calls)

5. **Test files** - All `*.test.jsx` files that mock REST API calls

### Step-by-Step Migration Process

#### Step 1: Add GraphQL Client Dependencies (~15 minutes)

Add urql to package.json:

```bash
cd src/main/webui
npm install urql graphql
```

Or add to package.json dependencies:
```json
{
  "dependencies": {
    "urql": "^4.1.0",
    "graphql": "^16.9.0"
  }
}
```

#### Step 2: Create GraphQL Client Setup (~30 minutes)

Create `src/main/webui/src/graphql/client.js`:

```javascript
import { createClient, fetchExchange } from 'urql';

export const client = createClient({
  url: '/graphql',
  exchanges: [fetchExchange],
  // Optional: Add request policy for caching
  requestPolicy: 'cache-and-network'
});
```

Create `src/main/webui/src/graphql/queries.js`:

```javascript
// Queries
export const CONFIG_QUERY = `
  query {
    config {
      version
      web {
        title
        showGithubLink
        checkForUpdates
        refreshInterval
      }
      websocket {
        enabled
      }
    }
  }
`;

export const THEME_QUERY = `
  query {
    theme {
      light {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
      dark {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
    }
  }
`;

export const TRANSLATIONS_QUERY = `
  query GetTranslations($language: String!) {
    translations(language: $language)
  }
`;

export const BOOKMARK_GROUPS_QUERY = `
  query {
    bookmarkGroups {
      name
      bookmarks {
        name
        group
        icon
        url
        info
        targetBlank
        location
        namespace
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

export const APPLICATION_GROUPS_QUERY = `
  query GetApplicationGroups($tags: [String]) {
    applicationGroups(tags: $tags) {
      name
      applications {
        name
        group
        icon
        iconColor
        url
        info
        targetBlank
        location
        enabled
        rootPath
        tags
        available
        namespace
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

// Combined query for initialization
export const INIT_QUERY = `
  query InitApp($language: String!) {
    config {
      version
      web {
        title
        showGithubLink
        checkForUpdates
        refreshInterval
      }
      websocket {
        enabled
      }
    }
    theme {
      light {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
      dark {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
    }
    translations(language: $language)
    bookmarkGroups {
      name
      bookmarks {
        name
        url
        icon
        group
        namespace
        resourceName
      }
    }
  }
`;
```

Create `src/main/webui/src/graphql/mutations.js`:

```javascript
export const CREATE_APPLICATION_MUTATION = `
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) {
      name
      namespace
      resourceName
      url
      group
    }
  }
`;

export const UPDATE_APPLICATION_MUTATION = `
  mutation UpdateApplication($input: UpdateApplicationInput!) {
    updateApplication(input: $input) {
      name
      namespace
      resourceName
      url
      group
    }
  }
`;

export const DELETE_APPLICATION_MUTATION = `
  mutation DeleteApplication($namespace: String!, $name: String!) {
    deleteApplication(namespace: $namespace, name: $name)
  }
`;

export const CREATE_BOOKMARK_MUTATION = `
  mutation CreateBookmark($input: CreateBookmarkInput!) {
    createBookmark(input: $input) {
      bookmarkName: name
      namespace
      resourceName: name
      url
      group
    }
  }
`;

export const UPDATE_BOOKMARK_MUTATION = `
  mutation UpdateBookmark($input: UpdateBookmarkInput!) {
    updateBookmark(input: $input) {
      bookmarkName: name
      namespace
      resourceName: name
      url
      group
    }
  }
`;

export const DELETE_BOOKMARK_MUTATION = `
  mutation DeleteBookmark($namespace: String!, $name: String!) {
    deleteBookmark(namespace: $namespace, name: $name)
  }
`;
```

#### Step 3: Update app.jsx (~2-3 hours)

Replace REST fetch calls with GraphQL queries. Key changes:

**Before (REST):**
```javascript
// Multiple sequential calls
const theme = await fetch('/api/theme').then(res => res.json());
const i18n = await fetch('/api/i8n/' + lang).then(res => res.json());
const config = await fetch('/api/config').then(res => res.json());
const bookmarks = await fetch('/api/bookmarks').then(res => res.json());
```

**After (GraphQL):**
```javascript
import { client } from './graphql/client';
import { INIT_QUERY } from './graphql/queries';

// Single combined query
const result = await client.query(INIT_QUERY, { language: lang }).toPromise();
const { config, theme, translations, bookmarkGroups } = result.data;
```

**Delete operations - Before:**
```javascript
await fetch(`/api/apps/manage?namespace=${namespace}&name=${name}`, {
  method: 'DELETE'
});
```

**After:**
```javascript
import { DELETE_APPLICATION_MUTATION } from './graphql/mutations';

await client.mutation(DELETE_APPLICATION_MUTATION, { 
  namespace, 
  name 
}).toPromise();
```

#### Step 4: Update ApplicationEditor.jsx (if needed) (~1 hour)

If this component handles create/update operations:

```javascript
import { client } from './graphql/client';
import { CREATE_APPLICATION_MUTATION, UPDATE_APPLICATION_MUTATION } from './graphql/mutations';

// Create
const result = await client.mutation(CREATE_APPLICATION_MUTATION, {
  input: {
    namespace,
    resourceName,
    name,
    group,
    url,
    // ... other fields
  }
}).toPromise();

// Update
const result = await client.mutation(UPDATE_APPLICATION_MUTATION, {
  input: {
    namespace,
    resourceName,
    name,
    group,
    url,
    // ... other fields
  }
}).toPromise();
```

#### Step 5: Update BookmarkEditor.jsx (if needed) (~1 hour)

Similar pattern for bookmark CRUD operations.

#### Step 6: Update Tests (~2-3 hours)

Update all test files that mock fetch calls:

**Before:**
```javascript
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ theme: {...} })
  })
);
```

**After:**
```javascript
import { client } from './graphql/client';

jest.mock('./graphql/client', () => ({
  client: {
    query: jest.fn(() => ({
      toPromise: () => Promise.resolve({
        data: { config: {...}, theme: {...} }
      })
    })),
    mutation: jest.fn(() => ({
      toPromise: () => Promise.resolve({ data: {...} })
    }))
  }
}));
```

#### Step 7: Verify and Test (~1-2 hours)

1. Run frontend tests: `npm test`
2. Start dev server: `./mvnw quarkus:dev`
3. Test all functionality:
   - Application loading
   - Bookmark loading
   - Theme switching
   - Language switching
   - CRUD operations (if accessible)
4. Check browser console for errors
5. Verify network tab shows GraphQL requests

### Migration Benefits

Once migrated, the frontend will:

1. **Single request**: Load config, theme, translations, and bookmarks in ONE GraphQL query instead of 4-5 REST calls
2. **Smaller payloads**: Request only needed fields
3. **Type safety**: GraphQL schema provides runtime validation
4. **Better DX**: GraphiQL for API exploration
5. **Real-time ready**: Can add subscriptions later to replace WebSocket

### Estimated Time

- **Setup and queries**: 2-3 hours
- **app.jsx migration**: 2-3 hours
- **Editor components**: 2-3 hours (if CRUD is implemented)
- **Test updates**: 2-3 hours
- **Testing and fixes**: 2-3 hours

**Total: 10-15 hours (1.5-2 days)**

### Alternative: Incremental Migration

If a full migration is too risky, consider:

1. Add GraphQL client alongside REST
2. Migrate one feature at a time (e.g., start with config/theme)
3. Keep REST as fallback during transition
4. Remove REST once all features migrated and tested

This approach is safer but takes longer.

## After Frontend Migration

Once frontend is migrated:

1. **Remove REST endpoints** (Phase 8):
   - Delete `src/main/java/us/ullberg/startpunkt/rest/ApplicationResource.java`
   - Delete `src/main/java/us/ullberg/startpunkt/rest/BookmarkResource.java`
   - Delete `src/main/java/us/ullberg/startpunkt/rest/ConfigResource.java`
   - Delete `src/main/java/us/ullberg/startpunkt/rest/ThemeResource.java`
   - Delete `src/main/java/us/ullberg/startpunkt/rest/I8nResource.java`
   - Delete corresponding test files

2. **Optional: Remove OpenAPI** dependency if no longer needed

3. **Update documentation** to reference only GraphQL API

## References

- GraphQL Backend API: Complete (all queries and mutations implemented)
- GraphQL Schema: Available at `/graphql-schema` when server running
- GraphiQL UI: Available at `/graphql-ui` in dev mode
- Documentation: `docs/graphql-migration-guide.md`, `docs/graphql-examples.md`

# GraphQL API Examples

This document provides practical examples of using the Startpunkt GraphQL API.

## Accessing the API

### GraphQL Endpoint
- **URL**: `http://localhost:8080/graphql`
- **Method**: POST
- **Content-Type**: application/json

### GraphiQL UI (Development)
- **URL**: `http://localhost:8080/graphql-ui`
- Available only in dev mode (`./mvnw quarkus:dev`)

## Current Queries

### Application Queries

#### Get All Application Groups

Returns all applications grouped by their group name.

**Query:**
```graphql
{
  applicationGroups {
    name
    applications {
      name
      url
      icon
      iconColor
      group
      info
      targetBlank
      enabled
      available
      tags
      namespace
      resourceName
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "applicationGroups": [
      {
        "name": "Tools",
        "applications": [
          {
            "name": "Jenkins",
            "url": "https://jenkins.example.com",
            "icon": "mdi:jenkins",
            "iconColor": "#D24939",
            "group": "Tools",
            "info": "CI/CD Pipeline",
            "targetBlank": true,
            "enabled": true,
            "available": true,
            "tags": "admin,ci",
            "namespace": "default",
            "resourceName": "jenkins-app"
          }
        ]
      }
    ]
  }
}
```

#### Get Applications with Tag Filtering

Returns applications that match the specified tags OR applications without any tags.

**Query:**
```graphql
{
  applicationGroups(tags: ["admin", "monitoring"]) {
    name
    applications {
      name
      url
      available
      tags
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "applicationGroups": [
      {
        "name": "Monitoring",
        "applications": [
          {
            "name": "Prometheus",
            "url": "https://prometheus.example.com",
            "available": true,
            "tags": "monitoring"
          },
          {
            "name": "Grafana",
            "url": "https://grafana.example.com",
            "available": true,
            "tags": "monitoring,admin"
          }
        ]
      }
    ]
  }
}
```

**Tag Filtering Behavior:**
- If `tags` is `null` or empty: returns only applications **without** tags
- If `tags` is provided: returns applications with **matching** tags OR applications **without** tags
- This ensures untagged applications are always visible

#### Get Single Application

Returns a specific application by group name and application name.

**Query:**
```graphql
{
  application(groupName: "Tools", appName: "Jenkins") {
    name
    url
    icon
    available
    info
    namespace
    resourceName
    hasOwnerReferences
  }
}
```

**Response:**
```json
{
  "data": {
    "application": {
      "name": "Jenkins",
      "url": "https://jenkins.example.com",
      "icon": "mdi:jenkins",
      "available": true,
      "info": "CI/CD Pipeline",
      "namespace": "default",
      "resourceName": "jenkins-app",
      "hasOwnerReferences": false
    }
  }
}
```

If not found, returns:
```json
{
  "data": {
    "application": null
  }
}
```

#### Selective Field Queries

GraphQL allows requesting only the fields you need:

**Minimal Query:**
```graphql
{
  applicationGroups {
    name
    applications {
      name
      url
    }
  }
}
```

**Availability Only:**
```graphql
{
  applicationGroups {
    applications {
      name
      url
      available
    }
  }
}
```

## Schema Introspection

### Query Available Types

```graphql
{
  __schema {
    types {
      name
      kind
      description
    }
  }
}
```

### Query Available Queries

```graphql
{
  __schema {
    queryType {
      name
      fields {
        name
        description
        args {
          name
          type {
            name
            kind
          }
        }
        type {
          name
          kind
        }
      }
    }
  }
}
```

### Get Schema for a Specific Type

```graphql
{
  __type(name: "ApplicationResponse") {
    name
    kind
    description
    fields {
      name
      description
      type {
        name
        kind
      }
    }
  }
}
```

## Using with cURL

### Basic Query

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ applicationGroups { name applications { name url } } }"
  }'
```

### Query with Variables

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetApps($tags: [String]) { applicationGroups(tags: $tags) { name applications { name url } } }",
    "variables": {
      "tags": ["admin", "monitoring"]
    }
  }'
```

## Using with JavaScript/Preact

### Fetch API

```javascript
async function fetchApplications() {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        {
          applicationGroups {
            name
            applications {
              name
              url
              available
            }
          }
        }
      `
    })
  });
  
  const result = await response.json();
  return result.data.applicationGroups;
}
```

### urql Client (Recommended)

```javascript
import { useQuery } from '@urql/preact';

const APPS_QUERY = `
  query GetApplications($tags: [String]) {
    applicationGroups(tags: $tags) {
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

function ApplicationList({ tags }) {
  const [result] = useQuery({
    query: APPS_QUERY,
    variables: { tags }
  });
  
  if (result.fetching) return <div>Loading...</div>;
  if (result.error) return <div>Error: {result.error.message}</div>;
  
  const groups = result.data.applicationGroups;
  
  return (
    <div>
      {groups.map(group => (
        <div key={group.name}>
          <h2>{group.name}</h2>
          {group.applications.map(app => (
            <a key={app.name} href={app.url}>
              {app.name}
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Future Mutations (Not Yet Implemented)

### Create Application

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
      iconColor: "#2196F3"
      info: "My custom application"
      targetBlank: true
      enabled: true
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

### Update Application

```graphql
mutation {
  updateApplication(input: {
    namespace: "default"
    name: "my-app"
    spec: {
      name: "My Updated Application"
      url: "https://myapp-new.example.com"
      group: "Updated Tools"
    }
  }) {
    spec {
      name
      url
      group
    }
  }
}
```

### Delete Application

```graphql
mutation {
  deleteApplication(namespace: "default", name: "my-app")
}
```

## Error Handling

### Query Errors

When a query fails, GraphQL returns errors in the response:

```json
{
  "errors": [
    {
      "message": "Validation error",
      "path": ["applicationGroups"],
      "extensions": {
        "classification": "ValidationError"
      }
    }
  ],
  "data": null
}
```

### Null Results

When a query returns no results:

```json
{
  "data": {
    "application": null
  }
}
```

This is different from an error - it means the query succeeded but found nothing.

## Performance Tips

1. **Request Only Needed Fields**: GraphQL allows selective field queries to reduce payload size
2. **Use Variables**: Parameterize queries for better caching
3. **Batch Queries**: Combine multiple queries in a single request
4. **Monitor**: Check `/q/metrics` for GraphQL query timing

## Comparison: REST vs GraphQL

### REST (Current)
```bash
# Multiple requests needed
GET /api/config
GET /api/theme
GET /api/i8n/en-US
GET /api/apps
GET /api/bookmarks
```

### GraphQL (Future)
```graphql
# Single request
{
  config { version web { title } }
  theme(name: "dark") { bodyBgColor }
  translations(language: "en-US") { key value }
  applicationGroups { name applications { name url } }
  bookmarkGroups { name bookmarks { name url } }
}
```

**Benefits:**
- Fewer network roundtrips
- Reduced over-fetching
- Smaller payload sizes
- Strongly typed schema
- Better developer experience

## Next Steps

1. Review the [GraphQL Migration Guide](./graphql-migration-guide.md)
2. Explore the API using GraphiQL UI
3. Implement remaining query resolvers
4. Add mutation resolvers
5. Migrate frontend to use GraphQL

## Resources

- [GraphQL Official Documentation](https://graphql.org/learn/)
- [SmallRye GraphQL](https://smallrye.io/smallrye-graphql/)
- [urql Documentation](https://formidable.com/open-source/urql/)

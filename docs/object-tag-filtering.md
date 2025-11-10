# Object Tag Filtering

This feature allows filtering applications based on tags. You can filter applications by passing tags as URL parameters, showing only applications that match the specified tags or applications with no tags.

## URL-Based Filtering

You can filter applications by adding tags directly to the URL path:

```url
https://your-startpunkt-instance.com/admin
https://your-startpunkt-instance.com/admin,dev
https://your-startpunkt-instance.com/users
```

If no tags are specified in the URL, only applications without tags will be shown.

## Kubernetes Resource Annotation

Add the `startpunkt.ullberg.us/tags` annotation to your Kubernetes resources to specify which tag(s) the application should be associated with:

### Example: Admin-tagged application

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-dashboard
  annotations:
    startpunkt.ullberg.us/tags: "admin"
    startpunkt.ullberg.us/enable: "true"
spec:
  # ... ingress spec
```

### Example: Multi-tagged application

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: dev-tool
  annotations:
    startpunkt.ullberg.us/tags: "admin,dev"
    startpunkt.ullberg.us/enable: "true"
spec:
  # ... route spec
```

### Example: Untagged application (no tag filter)

```yaml
apiVersion: apps/v1
kind: Application
metadata:
  name: common-app
  annotations:
    startpunkt.ullberg.us/enable: "true"
    # No tags annotation - will be shown when no tags are filtered or with any tag filter
spec:
  # ... application spec
```

## Behavior

- **No tags in URL**: Shows only applications without tags
- **Tags specified in URL (e.g., `/admin`)**: Shows applications that either:
  - Have matching tag(s) in the `startpunkt.ullberg.us/tags` annotation
  - Have no tags annotation (untagged applications are always included when tags are specified)
- **Multiple tags in URL (e.g., `/admin,dev`)**: Shows applications that have any of the specified tags, plus all untagged applications

## Filtering Logic

**When no tags are specified in the URL:**

- Only applications without the `startpunkt.ullberg.us/tags` annotation (or with empty tags) are displayed

**When tags are specified in the URL:**

- An application will be displayed if:
  1. The application has one or more matching tags, OR
  2. The application has no tags annotation (untagged applications are always included when filtering by tags)

This approach ensures that untagged applications are always accessible, either by browsing with no tags specified or when filtering by any specific tags.

## Use Cases

1. **Admin View**: `/admin`
   - Shows applications tagged with "admin" and all untagged applications
   
2. **Developer View**: `/dev`
   - Shows applications tagged with "dev" and all untagged applications
   
3. **Multi-tag View**: `/admin,dev`
   - Shows applications tagged with "admin" OR "dev" and all untagged applications

4. **Default View**: `/` (root path)
   - Shows only untagged applications

This approach allows flexible filtering of applications based on URL parameters while maintaining a single deployment and ensuring untagged applications remain accessible.

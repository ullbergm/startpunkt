# Multi-Instance Support

This feature allows running multiple instances of the Startpunkt application, where each instance can show different sets of applications based on instance filtering.

## Configuration

Add the following configuration property to control which instance this application should display:

```properties
startpunkt.instance=admin
```

If this property is not set or is empty, all applications will be shown (default behavior).

## Kubernetes Resource Annotation

Add the `startpunkt.ullberg.us/instance` annotation to your Kubernetes resources to specify which instance(s) should display the application:

### Example: Admin-only application

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-dashboard
  annotations:
    startpunkt.ullberg.us/instance: "admin"
    startpunkt.ullberg.us/enable: "true"
spec:
  # ... ingress spec
```

### Example: User-only application

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: user-portal
  annotations:
    startpunkt.ullberg.us/instance: "users"
    startpunkt.ullberg.us/enable: "true"
spec:
  # ... route spec
```

### Example: Common application (no instance filter)

```yaml
apiVersion: apps/v1
kind: Application
metadata:
  name: common-app
  annotations:
    startpunkt.ullberg.us/enable: "true"
    # No instance annotation - will be shown in all instances
spec:
  # ... application spec
```

## Behavior

- **No instance configuration**: Shows all applications (backward compatible)
- **Instance configured (e.g., "admin")**: Shows applications that either:
  - Have the matching instance annotation (`startpunkt.ullberg.us/instance: "admin"`)
  - Have no instance annotation (common applications)
- **Instance annotation on resource**: Only shown in instances with matching configuration

## Use Cases

1. **Admin Instance**: `startpunkt.instance=admin`
   - Shows admin-specific tools and common applications
   
2. **User Instance**: `startpunkt.instance=users`
   - Shows user-facing applications and common applications
   
3. **Development Instance**: `startpunkt.instance=dev`
   - Shows development tools and common applications

This allows you to deploy multiple instances of Startpunkt with different configurations while using the same underlying Kubernetes resources.
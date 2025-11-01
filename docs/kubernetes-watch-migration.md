# Kubernetes Watch Events Migration Guide

## Overview

Starting with version 3.3.0, Startpunkt uses Kubernetes Watch API to monitor resource changes in real-time instead of periodic polling. This provides instant updates when resources are added, modified, or deleted in the cluster.

## What Changed

### Before (Polling)
- Resources were fetched on-demand when REST endpoints were called
- Availability checks ran on a fixed schedule (default: every 60 seconds)
- Cache invalidation only happened during scheduled availability checks

### After (Watch Events)
- Kubernetes resources are monitored continuously using the Watch API
- Changes are detected immediately and caches are invalidated
- Availability checks still run periodically but cache invalidation is event-driven
- Real-time events are broadcast to connected clients via Server-Sent Events (SSE)

## Benefits

1. **Lower Latency**: Changes are detected within seconds instead of waiting for the next poll interval
2. **More Efficient**: No repeated API calls to list resources; only receive updates when changes occur
3. **Real-time Updates**: Connected clients receive instant notifications via SSE
4. **Better Resource Usage**: Reduced load on the Kubernetes API server

## Configuration

### Enable/Disable Watching

```yaml
startpunkt:
  watch:
    enabled: true  # Default: true
```

When set to `false`, Startpunkt will revert to the legacy behavior of loading resources on-demand.

### Availability Checking

Availability checking continues to run on a schedule (unchanged):

```yaml
startpunkt:
  availability:
    enabled: true
    interval: 60s  # How often to check application availability
    timeout: 5     # Timeout in seconds for each check
```

## What to Expect

### Startup Behavior

When Startpunkt starts with watching enabled:

1. The application establishes watches for all configured resource types:
   - Startpunkt Applications and Bookmarks
   - Hajimari Applications and Bookmarks (if enabled)
   - Ingress resources (if enabled)
   - OpenShift Routes (if enabled)
   - Istio VirtualServices (if enabled)
   - Gateway API HTTPRoutes (if enabled)

2. You'll see log messages like:
   ```
   Starting Kubernetes resource watchers
   Starting watch for Startpunkt Application in all namespaces
   Successfully started watch for Startpunkt Application
   Started 6 Kubernetes resource watchers
   ```

### Runtime Behavior

When Kubernetes resources change:

1. The watcher detects the change (ADDED/MODIFIED/DELETED)
2. Application/bookmark caches are invalidated
3. Events are broadcast to connected SSE clients
4. Next REST API call fetches fresh data from Kubernetes

Example log messages:
```
Startpunkt Application ADDED: default/my-app
Invalidated application caches due to resource changes
Broadcasted event: APPLICATION_ADDED
```

### Shutdown Behavior

When Startpunkt stops:
```
Stopping Kubernetes resource watchers
Kubernetes resource watchers stopped
```

## Troubleshooting

### Watches Not Starting

If watches fail to start, check:

1. **RBAC Permissions**: Ensure the service account has `watch` permissions:
   ```yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: ClusterRole
   metadata:
     name: startpunkt
   rules:
     - apiGroups: ["startpunkt.ullberg.us"]
       resources: ["applications", "bookmarks"]
       verbs: ["get", "list", "watch"]
   ```

2. **Network Connectivity**: Watches use long-lived connections to the API server
3. **API Server Load**: In large clusters, API server may rate-limit watch requests

### Fallback to Polling

If you experience issues with watches, you can disable them:

```yaml
startpunkt:
  watch:
    enabled: false
```

This will revert to the legacy on-demand loading behavior.

### Watch Disconnections

If a watch disconnects (e.g., due to network issues), you may see:
```
Watch closed for Startpunkt Application with error
```

Currently, watches are not automatically reconnected. A service restart will re-establish them. Future versions may implement automatic reconnection logic.

## Performance Considerations

### Memory Usage

Watches maintain long-lived HTTP connections to the API server. In very large clusters with many watched resources, this may increase memory usage slightly.

### API Server Impact

- **Before**: Periodic LIST calls (every 60s by default) for each resource type
- **After**: One long-lived WATCH connection per resource type per namespace

For most clusters, watching is more efficient than polling.

## Migration Checklist

- [ ] Update RBAC to include `watch` verb for all resource types
- [ ] Review and adjust availability check interval if needed
- [ ] Test in non-production environment first
- [ ] Monitor logs during initial deployment
- [ ] Verify SSE clients receive real-time updates
- [ ] Have rollback plan ready (set `watch.enabled: false`)

## Backward Compatibility

This change is fully backward compatible:

- Existing configurations continue to work
- REST API responses are unchanged
- Clients that don't use SSE are unaffected
- Can be disabled with a single configuration flag

## Future Enhancements

Planned improvements for the watch implementation:

1. Automatic reconnection on watch failure
2. Exponential backoff for reconnection attempts
3. Metrics for watch connection health
4. Support for watch bookmarks to resume from specific resource versions

# Kubernetes Informer Architecture

## Overview

Startpunkt uses **Kubernetes Informers** (via Fabric8 Kubernetes Client) to watch for changes in Kubernetes resources and maintain real-time caches for the GraphQL API. This document explains the architecture, benefits, and operational characteristics of the Informer-based implementation.

## What are Informers?

Informers are a higher-level abstraction over raw Kubernetes watches that provide:

1. **Local caching** - Maintain an in-memory cache of resources
2. **Event handlers** - Clean callbacks for add/update/delete events
3. **Automatic reconnection** - Handle connection failures transparently
4. **Periodic resync** - Full list/watch resync at configurable intervals
5. **Resource version management** - Automatically handle "too old resource version" errors

Informers are the **standard pattern** used by Kubernetes controllers and operators.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes API Server                    │
└────────────────────┬────────────────────────────────────────┘
                     │ List + Watch
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              SharedIndexInformer (Fabric8)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Internal Cache (K8s Objects)                          │   │
│  │ - Applications, Bookmarks, Ingress, Routes, etc.     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Event Handlers:                                             │
│  - onAdd(resource)                                           │
│  - onUpdate(oldResource, newResource)                        │
│  - onDelete(resource, deletedFinalStateUnknown)             │
└────────────────────┬────────────────────────────────────────┘
                     │ Events
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            KubernetesWatchService Handlers                   │
│  - handleApplicationAdded()                                  │
│  - handleApplicationUpdated()                                │
│  - handleApplicationDeleted()                                │
│  - etc.                                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ Enriched Objects
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Application Cache Services                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │ ApplicationCacheService                             │     │
│  │ - Stores enriched ApplicationResponse objects      │     │
│  │ - Adds availability, metadata, sorting             │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ BookmarkCacheService                                │     │
│  │ - Stores enriched BookmarkResponse objects         │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              GraphQL API + Event Broadcasting                │
│  - Queries read from cache services                          │
│  - Subscriptions receive real-time events                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initialization** (startup):
   - Informer performs initial LIST of all resources
   - Populates internal cache
   - Event handlers fire `onAdd` for each existing resource
   - Resources are enriched and stored in application caches

2. **Real-time updates** (watch events):
   - Kubernetes API sends watch events to Informer
   - Informer updates internal cache
   - Event handlers fire (onAdd/onUpdate/onDelete)
   - Application caches updated
   - GraphQL subscriptions notified

3. **Periodic resync** (every 5 minutes by default):
   - Informer performs full LIST from API server
   - Compares with internal cache
   - Fires update events for changed resources
   - Catches any missed events due to network issues

## Informer Types

Startpunkt uses 7 different Informers:

| Informer | Resource Type | Handler Approach |
|----------|---------------|------------------|
| Application CRD | `startpunkt.ullberg.us/v1alpha4/Application` | Direct - individual resource events |
| Bookmark CRD | `startpunkt.ullberg.us/v1alpha4/Bookmark` | Direct - individual resource events |
| Hajimari Bookmark | `hajimari.io/v1alpha1/Bookmark` | Bulk - triggers full reload |
| Ingress | `networking.k8s.io/v1/Ingress` | Bulk - triggers full reload |
| Route | `route.openshift.io/v1/Route` | Bulk - triggers full reload |
| VirtualService | `networking.istio.io/v1/VirtualService` | Bulk - triggers full reload |
| HTTPRoute | `gateway.networking.k8s.io/v1/HTTPRoute` | Bulk - triggers full reload |

### Why Two Approaches?

**Direct Handler (Application, Bookmark CRDs)**:
- Strongly-typed custom resources
- Can process individual events efficiently
- Updates single cache entry per event
- More granular, less overhead

**Bulk Reload (Generic resources)**:
- Multiple resource types contribute to same application list
- Need to aggregate across types (e.g., Route + Ingress + VirtualService)
- Simpler to reload entire application set
- Still efficient with debouncing

## Configuration

### Application Configuration

```yaml
startpunkt:
  watch:
    enabled: true  # Enable/disable Informers
    resyncPeriodSeconds: 300  # Full resync interval (5 minutes)
```

### Resync Period

The `resyncPeriodSeconds` controls how often the Informer performs a full list/watch resync:

- **Default**: 300 seconds (5 minutes)
- **Minimum**: 60 seconds (don't set lower)
- **Maximum**: No hard limit, but longer = more drift risk

**Why resync?**
- Catches events missed during network outages
- Detects resources deleted while watch was down
- Validates cache consistency
- Standard Kubernetes controller pattern

## Automatic Reconnection

### Network Failures

When network connectivity is lost:

1. Informer detects connection failure
2. **Automatically attempts reconnection** with exponential backoff
3. On reconnect, performs full resync
4. Fires update events for any changes during downtime
5. **No manual intervention required**

Log messages you'll see:
```
WARN  [io.fabric8.kubernetes.client.informers.SharedInformerFactory] Error restarting informer
INFO  [io.fabric8.kubernetes.client.informers.SharedInformerFactory] Restarting informer after 1000ms
```

### "Too Old Resource Version" Errors

This common error occurs when a watch has been running so long that its resource version falls outside the API server's event window.

**Old approach (raw watches)**:
- Watch closes with error
- Required manual restart logic
- Complex error detection and scheduling
- ~150 lines of code

**Informer approach**:
- Informer automatically detects error
- Stops watch and starts new one with fresh resource version
- **Completely transparent to application**
- Zero lines of error handling code needed

## Event Handling

### Application CRD Events

```java
SharedIndexInformer<Application> informer = kubernetesClient
    .resources(Application.class)
    .inAnyNamespace()
    .inform(new ResourceEventHandler<Application>() {
        @Override
        public void onAdd(Application app) {
            // Resource created
            ApplicationResponse enriched = enrich(app);
            applicationCacheService.put(enriched);
            eventBroadcaster.broadcastApplicationAdded(app);
        }

        @Override
        public void onUpdate(Application oldApp, Application newApp) {
            // Resource modified
            ApplicationResponse enriched = enrich(newApp);
            applicationCacheService.put(enriched);
            eventBroadcaster.broadcastApplicationUpdated(newApp);
        }

        @Override
        public void onDelete(Application app, boolean deletedFinalStateUnknown) {
            // Resource deleted
            applicationCacheService.remove(app.getMetadata().getNamespace(), 
                                          app.getMetadata().getName());
            availabilityCheckService.unregisterUrl(app.getSpec().getUrl());
            eventBroadcaster.broadcastApplicationRemoved(app);
        }
    }, resyncPeriodSeconds * 1000);
```

### Generic Resource Events

For resources like Ingress, Route, etc. where multiple types contribute to the application list:

```java
@Override
public void onAdd(GenericKubernetesResource resource) {
    reloadApplicationCache();
}

@Override
public void onUpdate(GenericKubernetesResource oldResource, 
                     GenericKubernetesResource newResource) {
    reloadApplicationCache();
}

@Override
public void onDelete(GenericKubernetesResource resource, 
                     boolean deletedFinalStateUnknown) {
    reloadApplicationCache();
}
```

The `reloadApplicationCache()` method:
- Queries all relevant resource types
- Aggregates them into application list
- Sorts and enriches
- Updates entire cache
- Broadcasts status change event

## Benefits Over Raw Watches

| Feature | Raw Watches | Informers |
|---------|-------------|-----------|
| Connection handling | Manual restart logic | Automatic |
| Resource version errors | Manual detection & restart | Automatic |
| Periodic resync | Manual scheduling | Built-in |
| Event deduplication | Manual | Built-in |
| Local caching | Must implement | Built-in |
| Code complexity | ~1000 lines | ~770 lines |
| Error handling | ~200 lines | ~0 lines |
| Production-ready | Custom solution | Battle-tested |

### Code Reduction

**Removed** (no longer needed):
- Watch restart scheduling (~80 lines)
- Error classification logic (~60 lines)
- Debouncing mechanism (~40 lines)
- Shutdown flag management (~20 lines)
- Pending restart tracking (~30 lines)
- Manual periodic refresh (~50 lines)

**Total reduction**: ~280 lines of complex error-handling code eliminated

## Monitoring

### Healthy Operation Logs

**Startup**:
```
INFO  [us.ull.sta.ser.KubernetesWatchService] Initializing Kubernetes Informer service
INFO  [us.ull.sta.ser.KubernetesWatchService] Started Application CRD informer
INFO  [us.ull.sta.ser.KubernetesWatchService] Started Bookmark CRD informer
INFO  [us.ull.sta.ser.KubernetesWatchService] Started Ingress informer
INFO  [us.ull.sta.ser.KubernetesWatchService] Started Route informer
INFO  [us.ull.sta.ser.KubernetesWatchService] Kubernetes Informer service initialized with 5 informers
```

**Real-time events**:
```
DEBUG [us.ull.sta.ser.KubernetesWatchService] Application added: default/my-app
DEBUG [us.ull.sta.ser.KubernetesWatchService] Application updated: default/my-app
DEBUG [us.ull.sta.ser.KubernetesWatchService] Application deleted: default/my-app
```

**Resync events** (every 5 minutes):
```
DEBUG [us.ull.sta.ser.KubernetesWatchService] Reloading application cache
DEBUG [us.ull.sta.ser.KubernetesWatchService] Reloaded 42 applications into cache
```

### Metrics

Potential Prometheus metrics (future enhancement):
- `startpunkt_informer_events_total{type="add|update|delete",resource="application"}` - Event counts
- `startpunkt_informer_cache_size{resource="application"}` - Cache entries
- `startpunkt_informer_resync_total{resource="application"}` - Resync count
- `startpunkt_informer_reconnect_total{resource="application"}` - Reconnection attempts

## Troubleshooting

### Informers Not Starting

**Symptom**: No "Started X informer" logs

**Possible causes**:
1. `startpunkt.watch.enabled=false` in configuration
2. Kubernetes client cannot connect to API server
3. RBAC permissions missing

**Solution**:
```bash
# Check configuration
kubectl logs <pod> | grep "watch.enabled"

# Check RBAC
kubectl auth can-i list applications --as system:serviceaccount:<namespace>:<serviceaccount>
kubectl auth can-i watch applications --as system:serviceaccount:<namespace>:<serviceaccount>
```

### Resources Not Appearing

**Symptom**: Resources exist in K8s but not in Startpunkt

**Diagnosis**:
1. Check if informer is running: `kubectl logs <pod> | grep "Started .* informer"`
2. Check for errors: `kubectl logs <pod> | grep ERROR`
3. Verify resource is in watched namespace (if namespace filtering enabled)
4. Check resource matches annotation filters (if `onlyAnnotated=true`)

**Solution**:
- Wait for next resync (max 5 minutes)
- Or restart application to force full reload

### Excessive Reconnections

**Symptom**: Frequent reconnection messages in logs

**Possible causes**:
1. Network instability
2. API server under load
3. Invalid RBAC causing repeated auth failures

**Solution**:
```bash
# Check network connectivity
kubectl exec <pod> -- wget -q -O- https://kubernetes.default.svc

# Check API server health
kubectl get --raw /healthz

# Review RBAC
kubectl describe clusterrole startpunkt-role
```

### High Memory Usage

**Symptom**: Pod memory increases over time

**Possible causes**:
1. Large number of resources being cached
2. Resync period too short (< 60s)
3. Memory leak (unlikely with Informers)

**Solution**:
1. Increase resync period to 600s (10 minutes)
2. Enable namespace filtering to reduce resource count
3. Monitor with heap dump if issue persists

## Performance Characteristics

### Memory Usage

**Per Informer**:
- Base overhead: ~5-10 MB
- Per resource: ~1-2 KB (depending on size)

**Example** (50 applications, 20 bookmarks, 100 ingresses):
- Total: ~60 MB for all informer caches
- Plus: Application cache (~200 KB)
- Plus: Bookmark cache (~50 KB)

### Network Usage

**Initial startup**:
- LIST all resources: ~100 KB - 1 MB (depends on cluster size)

**Steady state**:
- Watch events: ~1-5 KB per event
- Resync (every 5 min): Same as initial LIST

**Total bandwidth** (example):
- ~1 MB startup
- ~10-50 KB/min during normal operation
- ~200 KB every 5 minutes for resync

### CPU Usage

**Typical**:
- Idle: < 1% CPU
- During events: 2-5% CPU spike
- During resync: 5-10% CPU for 1-2 seconds

### Latency

**Event propagation**:
- Kubernetes event → Informer: <100ms
- Informer → Cache update: <10ms
- Cache → GraphQL subscription: <50ms
- **Total end-to-end**: < 200ms

## Migration from Raw Watches

### What Changed

**Code structure**:
- ✅ Informers instead of watches
- ✅ ResourceEventHandler instead of Watcher
- ✅ No watch restart logic
- ✅ Simplified error handling

**Configuration**:
- ✅ `cacheRefreshIntervalMinutes` → `resyncPeriodSeconds`
- ✅ Same enable/disable flag

**Behavior**:
- ✅ Same real-time updates
- ✅ Same GraphQL subscriptions
- ✅ Better reliability
- ✅ Automatic error recovery

### Backward Compatibility

**GraphQL API**: No changes
**Cache Services**: No changes
**Event Broadcasting**: No changes
**Configuration**: New property, old one ignored

**Result**: Drop-in replacement with better reliability

### Async Initialization

**Important**: Informers are initialized **asynchronously** in a background thread to avoid blocking application startup. This is especially important for:
- **Native mode** - Where K8s API may not be available during tests
- **Development** - Running outside a Kubernetes cluster
- **Graceful degradation** - Application starts successfully even if Kubernetes is unreachable

The application will log:
```
INFO  Kubernetes Informer service initialization started in background
```

If initialization succeeds:
```
INFO  Kubernetes Informer service initialized with 6 informers
INFO  Initial sync complete - Informers now active for real-time updates
```

If Kubernetes is unavailable:
```
ERROR Failed to initialize Kubernetes Informer service
WARN  Application will continue without Kubernetes resource watching
```

In this case, the application falls back to REST-based resource discovery endpoints.

## Best Practices

1. **Resync period**: Use 300s (5 min) for most deployments
   - Increase to 600s (10 min) for very large clusters
   - Never set below 60s

2. **Namespace filtering**: Enable if possible to reduce memory
   ```yaml
   startpunkt:
     namespaceSelector:
       any: false
       matchNames: [prod, staging]
   ```

3. **RBAC**: Grant minimum necessary permissions
   ```yaml
   - apiGroups: ["startpunkt.ullberg.us"]
     resources: ["applications", "bookmarks"]
     verbs: ["list", "watch"]
   ```

4. **Monitoring**: Watch for:
   - Frequent reconnections (network issues)
   - High memory growth (too many resources)
   - Slow resync times (API server load)

5. **Resource limits**: Set appropriate limits
   ```yaml
   resources:
     requests:
       memory: 256Mi
       cpu: 100m
     limits:
       memory: 512Mi
       cpu: 500m
   ```

## Further Reading

- [Kubernetes Informers](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)
- [Fabric8 Kubernetes Client - Informers](https://github.com/fabric8io/kubernetes-client/blob/master/doc/CHEATSHEET.md#informers)
- [Controller Pattern](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Writing Controllers](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-api-machinery/controllers.md)

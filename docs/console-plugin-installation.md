# OpenShift Console Plugin Installation Guide

This guide explains how to install and configure the Startpunkt OpenShift Console Plugin.

## Prerequisites

- OpenShift 4.10 or later (when dynamic plugins were introduced)
- Startpunkt installed in your cluster
- Cluster admin permissions (to install the ConsolePlugin resource)

## Installation

### Using Helm

The console plugin can be enabled via Helm chart values:

```yaml
consolePlugin:
  enabled: true
  image:
    repository: ghcr.io/ullbergm/startpunkt-console-plugin
    tag: v3.1.0
```

Install or upgrade the Helm release:

```bash
helm upgrade --install startpunkt ./deploy/kubernetes/charts/startpunkt \
  --namespace startpunkt \
  --create-namespace \
  --set consolePlugin.enabled=true
```

### Manual Installation

1. **Deploy the console plugin**:

   ```bash
   kubectl apply -f console-plugin/ConsolePlugin.yaml
   ```

2. **Enable the plugin in the OpenShift Console**:

   The console will automatically detect and load the plugin. You may need to refresh your browser.

   Alternatively, you can enable it via the console UI:
   - Navigate to **Administration** → **Cluster Settings** → **Configuration** → **Console**
   - Under **Console plugins**, enable the `startpunkt-console-plugin`

## Configuration

### Custom Startpunkt URL

If your Startpunkt service is in a different namespace or has a custom name:

```yaml
consolePlugin:
  enabled: true
  startpunktUrl: "http://my-startpunkt.custom-namespace.svc.cluster.local:8080"
```

### Resource Limits

Adjust resource requests and limits:

```yaml
consolePlugin:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
```

### Replicas

For high availability:

```yaml
consolePlugin:
  replicas: 3
```

## Verification

1. **Check the plugin deployment**:

   ```bash
   kubectl get deployment -n startpunkt startpunkt-console-plugin
   kubectl get pods -n startpunkt -l app.kubernetes.io/component=console-plugin
   ```

2. **Verify the ConsolePlugin resource**:

   ```bash
   kubectl get consoleplugin startpunkt-console-plugin
   ```

3. **Access the plugin**:

   - Log in to the OpenShift web console
   - Look for **Startpunkt** in the navigation menu (under **Home**)
   - Click on it to access the Startpunkt dashboard

## Troubleshooting

### Plugin not appearing in console

1. Verify the plugin is enabled:
   ```bash
   kubectl get consoleplugin
   ```

2. Check the console operator status:
   ```bash
   kubectl get clusteroperator console
   ```

3. Clear your browser cache and refresh the console

### Plugin loads but shows error

1. Check plugin pod logs:
   ```bash
   kubectl logs -n startpunkt -l app.kubernetes.io/component=console-plugin
   ```

2. Verify the Startpunkt backend service is accessible:
   ```bash
   kubectl get svc -n startpunkt startpunkt
   ```

3. Check the proxy configuration in the ConsolePlugin resource:
   ```bash
   kubectl get consoleplugin startpunkt-console-plugin -o yaml
   ```

### SSL/TLS issues

The plugin requires a valid TLS certificate. OpenShift automatically generates one via the service-ca-operator:

```bash
kubectl get secret -n startpunkt startpunkt-console-plugin-cert
```

If the secret doesn't exist, verify the service annotation:
```yaml
annotations:
  service.beta.openshift.io/serving-cert-secret-name: startpunkt-console-plugin-cert
```

## Uninstallation

To remove the console plugin:

```bash
# Via Helm
helm upgrade startpunkt ./deploy/kubernetes/charts/startpunkt \
  --namespace startpunkt \
  --set consolePlugin.enabled=false

# Or manually
kubectl delete consoleplugin startpunkt-console-plugin
kubectl delete deployment -n startpunkt startpunkt-console-plugin
kubectl delete service -n startpunkt startpunkt-console-plugin
```

## Advanced Configuration

### Custom Navigation Placement

The plugin adds a navigation item under **Home**. To customize its placement, modify the plugin's index.ts:

```typescript
{
  type: 'console.navigation/href',
  properties: {
    section: 'admin',  // or 'dev', 'user', etc.
    insertAfter: 'search',
  },
}
```

### Authentication

The plugin automatically inherits authentication from the OpenShift console. No additional configuration is needed.

### CORS Configuration

If you encounter CORS issues, ensure the Startpunkt backend allows requests from the console:

```yaml
# In application.yaml or via environment variables
quarkus:
  http:
    cors:
      ~: true
      # For production, specify your console URL(s)
      origins: "https://console-openshift-console.apps.your-cluster.example.com"
      # For development/testing, you can use:
      # origins: "*"
```

**Security Note**: The default configuration uses `*` which allows all origins. In production, it's recommended to specify the exact console URL for better security.

## Security Considerations

- The plugin runs with minimal privileges (non-root, read-only filesystem)
- TLS is enforced for all communication
- Authentication is handled by OpenShift OAuth
- The plugin uses OpenShift RBAC for authorization

## Support

For issues or questions:
- File an issue: https://github.com/ullbergm/startpunkt/issues
- Discussions: https://github.com/ullbergm/startpunkt/discussions

# Multi-Cluster Support

Startpunkt includes infrastructure for reading applications and bookmarks from multiple Kubernetes clusters simultaneously. The core multi-cluster framework is in place, with local cluster control fully functional.

## Current Status

✅ **Fully Implemented:**
- Local cluster enable/disable control
- Multi-cluster client management infrastructure  
- Cluster identification in API responses
- Health checks for cluster connectivity
- ClusterConfig model for cluster configuration
- ClusterClientService for managing multiple clients

🚧 **Planned for Future Release:**
- Remote cluster configuration via application.yaml
- MicroProfile Config converter for ClusterConfig objects
- Full documentation for remote cluster setup

## Features

- **Local Cluster Control**: Enable or disable reading from the cluster where Startpunkt is deployed (✅ Available Now)
- **Remote Clusters**: Connect to and read from multiple remote Kubernetes clusters (🚧 Framework Ready, Configuration Pending)
- **Flexible Authentication**: Support for kubeconfig files or token-based authentication (🚧 Code Ready, Configuration Pending)
- **Per-Cluster Identification**: Applications and bookmarks are tagged with their source cluster (✅ Available Now)
- **Graceful Failure**: If one cluster is unavailable, others continue to work (✅ Available Now)

## Current Configuration

### Local Cluster Configuration (Available Now)

Control whether Startpunkt reads resources from the local cluster (where it's deployed):

```yaml
startpunkt:
  clusters:
    local:
      enabled: true  # Set to false to disable local cluster reading
```

**Use Cases for Disabling Local Cluster:**
- Running Startpunkt as a centralized dashboard preparation (once remote clusters are configurable)
- Isolating Startpunkt from the cluster it runs on for organizational reasons
- Testing configurations without local resources

### Remote Cluster Configuration (Coming Soon)

The infrastructure for remote cluster support is in place, but configuration via `application.yaml` requires implementing a MicroProfile Config converter for the ClusterConfig class. This feature will be available in a future release.

**Planned Configuration Format:**

```yaml
startpunkt:
  clusters:
    local:
      enabled: false  # Optional: disable local cluster
    remote:
      - name: production
        displayName: "Production Cluster"
        apiServerUrl: "https://prod-k8s.example.com:6443"
        kubeconfigPath: "/etc/startpunkt/kubeconfig-prod"
        enabled: true
      - name: staging
        displayName: "Staging Environment"  
        apiServerUrl: "https://staging-k8s.example.com:6443"
        token: "eyJhbGci..."  # Service account token
        caCertPath: "/etc/startpunkt/ca.crt"
        enabled: true
```

**Current Workaround:**

If you need multi-cluster support now, you can:
1. Deploy separate Startpunkt instances in each cluster
2. Use a reverse proxy or ingress to aggregate them
3. Wait for the configuration converter implementation (coming soon)

## Architecture

### ClusterClientService

The `ClusterClientService` manages multiple Kubernetes clients:

```java
public class ClusterClientService {
  // Returns map of cluster name -> KubernetesClient
  public Map<String, KubernetesClient> getAllClusterClients();
  
  // Tests connectivity to a specific cluster
  public boolean testClusterConnectivity(String clusterName);
  
  // Returns all cluster configurations
  public List<ClusterConfig> getAllClusterConfigs();
}
```

### ClusterConfig Model

The `ClusterConfig` class represents a cluster configuration:

```java
public class ClusterConfig {
  private String name;              // Unique cluster identifier
  private String displayName;        // Display name for UI
  private String apiServerUrl;       // Kubernetes API server URL
  private String kubeconfigPath;     // Path to kubeconfig file
  private String token;              // Service account token
  private String caCertPath;         // CA certificate path
  private boolean skipTlsVerify;    // Skip TLS verification (not recommended)
  private boolean enabled;          // Whether cluster is enabled
}
```

### API Response Format

Applications and bookmarks from all clusters include a `clusterName` field:

```json
{
  "groups": [
    {
      "name": "monitoring",
      "applications": [
        {
          "name": "grafana",
          "url": "https://grafana.example.com",
          "clusterName": "local",
          "namespace": "monitoring",
          "resourceName": "grafana-ingress"
        }
      ]
    }
  ]
}
```

## Implementation Status

### What's Working Now

1. **Local Cluster Control**: Fully functional - you can enable/disable the local cluster
2. **Infrastructure**: All classes and services are in place
3. **Client Management**: ClusterClientService can manage multiple clients
4. **Cluster Identification**: All responses include cluster information
5. **Health Checks**: Connectivity testing for all clusters

### What's Needed for Remote Clusters

To complete remote cluster support, we need to implement a MicroProfile Config Converter:

```java
@Priority(300)
public class ClusterConfigConverter implements Converter<ClusterConfig> {
  @Override
  public ClusterConfig convert(String value) {
    // Parse YAML/JSON string to ClusterConfig
    // This allows @ConfigProperty to work with complex objects
  }
}
```

Once this converter is implemented, remote clusters can be configured directly in `application.yaml`.

## Contributing

If you'd like to help implement the configuration converter for remote clusters:

1. See `src/main/java/us/ullberg/startpunkt/service/ClusterClientService.java`
2. See `src/main/java/us/ullberg/startpunkt/objects/ClusterConfig.java`
3. Review MicroProfile Config Converter documentation
4. Implement a converter that can parse cluster configuration from strings
5. Submit a pull request!

## Future Enhancements

Potential improvements for multi-cluster support:

- Dynamic cluster registration via API (no restart needed)
- Cluster auto-discovery
- Per-cluster caching strategies
- Async/parallel cluster querying for better performance
- Cluster-specific resource filtering
- UI for managing cluster connections
- Cluster health dashboard
- Per-cluster namespace selectors

## Testing

The multi-cluster infrastructure includes comprehensive tests:

- `ClusterClientServiceTest`: Tests cluster client management
- `ApplicationGraphQLResourceTest`: Tests multi-cluster app retrieval
- `BookmarkServiceTest`: Tests multi-cluster bookmark retrieval

All tests pass with the current implementation.

## Example: Disabling Local Cluster

Here's a working example you can use today:

```yaml
# application.yaml
startpunkt:
  clusters:
    local:
      enabled: false  # Disable reading from local cluster
```

This will prevent Startpunkt from reading resources from the cluster where it's deployed. Useful for preparing a centralized dashboard setup.

## Limitations

- **Remote Configuration**: Currently requires custom converter implementation
- **No Auto-Discovery**: Clusters must be explicitly configured
- **Synchronous Processing**: All clusters are queried sequentially
- **Manual Configuration**: No API for adding clusters dynamically

## Support

For questions or issues related to multi-cluster support:

- Create an issue on GitHub
- Check the documentation in `docs/multi-cluster-support.md`
- Review the source code in `src/main/java/us/ullberg/startpunkt/service/ClusterClientService.java`

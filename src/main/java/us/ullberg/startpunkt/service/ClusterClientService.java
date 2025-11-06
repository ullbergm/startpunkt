package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.ConfigBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.KubernetesClientException;
import io.quarkus.logging.Log;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.objects.ClusterConfig;

/**
 * Service for managing Kubernetes clients for multiple clusters. Handles creation and lifecycle of
 * clients for both local and remote clusters.
 */
@ApplicationScoped
public class ClusterClientService {

  /** The local Kubernetes client (where Startpunkt is running). */
  private final KubernetesClient localClient;

  /** Map of remote cluster clients keyed by cluster name. */
  private final Map<String, KubernetesClient> remoteClients = new HashMap<>();

  /** Whether local cluster reading is enabled. */
  @ConfigProperty(name = "startpunkt.clusters.local.enabled", defaultValue = "true")
  boolean localClusterEnabled;

  /** Configuration for remote clusters - currently not supported via config injection. */
  // @ConfigProperty(name = "startpunkt.clusters.remote")
  // Optional<List<ClusterConfig>> remoteClusters;
  Optional<List<ClusterConfig>> remoteClusters = Optional.empty();

  /**
   * Constructor with dependency injection.
   *
   * @param localClient the local Kubernetes client
   */
  public ClusterClientService(KubernetesClient localClient) {
    this.localClient = localClient;
  }

  /**
   * Gets a map of all enabled cluster clients with their identifiers. The local cluster is
   * identified as "local", remote clusters use their configured name.
   *
   * @return map of cluster name to KubernetesClient
   */
  public Map<String, KubernetesClient> getAllClusterClients() {
    Map<String, KubernetesClient> clients = new HashMap<>();

    // Add local cluster if enabled
    if (localClusterEnabled && localClient != null) {
      Log.debug("Including local cluster in client map");
      clients.put("local", localClient);
    } else {
      Log.debug("Local cluster disabled or client not available");
    }

    // Initialize and add remote clusters
    if (remoteClusters != null && remoteClusters.isPresent()) {
      for (ClusterConfig config : remoteClusters.get()) {
        if (!config.isEnabled()) {
          Log.debugf("Skipping disabled remote cluster: %s", config.getName());
          continue;
        }

        try {
          KubernetesClient client = getOrCreateRemoteClient(config);
          if (client != null) {
            clients.put(config.getName(), client);
            Log.debugf("Added remote cluster client: %s", config.getName());
          }
        } catch (Exception e) {
          Log.errorf(e, "Failed to create client for remote cluster: %s", config.getName());
        }
      }
    }

    Log.debugf("Total active cluster clients: %d", clients.size());
    return clients;
  }

  /**
   * Gets or creates a Kubernetes client for a remote cluster.
   *
   * @param config the cluster configuration
   * @return the Kubernetes client for the cluster
   */
  private KubernetesClient getOrCreateRemoteClient(ClusterConfig config) {
    // Check if client already exists
    if (remoteClients.containsKey(config.getName())) {
      return remoteClients.get(config.getName());
    }

    // Create new client
    try {
      KubernetesClient client = createRemoteClient(config);
      remoteClients.put(config.getName(), client);
      Log.infof("Created Kubernetes client for remote cluster: %s", config.getName());
      return client;
    } catch (Exception e) {
      Log.errorf(e, "Failed to create Kubernetes client for cluster: %s", config.getName());
      return null;
    }
  }

  /**
   * Creates a new Kubernetes client for a remote cluster based on configuration.
   *
   * @param config the cluster configuration
   * @return new Kubernetes client instance
   */
  private KubernetesClient createRemoteClient(ClusterConfig config) {
    Log.debugf("Creating remote client for cluster: %s", config.getName());

    // If kubeconfig path is provided, use it
    if (config.getKubeconfigPath() != null && !config.getKubeconfigPath().isEmpty()) {
      Log.debugf("Using kubeconfig from path: %s", config.getKubeconfigPath());
      File kubeconfigFile = new File(config.getKubeconfigPath());
      if (!kubeconfigFile.exists()) {
        throw new IllegalArgumentException(
            "Kubeconfig file not found: " + config.getKubeconfigPath());
      }
      try {
        String kubeconfigContent = java.nio.file.Files.readString(kubeconfigFile.toPath());
        return new KubernetesClientBuilder()
            .withConfig(Config.fromKubeconfig(kubeconfigContent))
            .build();
      } catch (Exception e) {
        throw new RuntimeException(
            "Failed to read kubeconfig file: " + config.getKubeconfigPath(), e);
      }
    }

    // Otherwise, build config from individual properties
    ConfigBuilder configBuilder = new ConfigBuilder();

    // Set API server URL
    if (config.getApiServerUrl() != null) {
      configBuilder.withMasterUrl(config.getApiServerUrl());
    }

    // Set token if provided
    if (config.getToken() != null && !config.getToken().isEmpty()) {
      configBuilder.withOauthToken(config.getToken());
    }

    // Set CA certificate if provided
    if (config.getCaCertPath() != null && !config.getCaCertPath().isEmpty()) {
      File caCertFile = new File(config.getCaCertPath());
      if (caCertFile.exists()) {
        configBuilder.withCaCertFile(config.getCaCertPath());
      } else {
        Log.warnf("CA certificate file not found: %s", config.getCaCertPath());
      }
    }

    // Set TLS verification setting
    configBuilder.withTrustCerts(config.isSkipTlsVerify());

    Config clientConfig = configBuilder.build();
    return new KubernetesClientBuilder().withConfig(clientConfig).build();
  }

  /**
   * Tests connectivity to a remote cluster.
   *
   * @param clusterName the name of the cluster to test
   * @return true if the cluster is reachable, false otherwise
   */
  public boolean testClusterConnectivity(String clusterName) {
    if ("local".equals(clusterName)) {
      if (!localClusterEnabled) {
        return false;
      }
      try {
        localClient.getVersion();
        return true;
      } catch (Exception e) {
        Log.warnf(e, "Local cluster connectivity test failed");
        return false;
      }
    }

    KubernetesClient client = remoteClients.get(clusterName);
    if (client == null) {
      return false;
    }

    try {
      client.getVersion();
      return true;
    } catch (KubernetesClientException e) {
      Log.warnf(e, "Remote cluster %s connectivity test failed", clusterName);
      return false;
    }
  }

  /**
   * Gets all configured clusters (both enabled and disabled).
   *
   * @return list of cluster configurations
   */
  public List<ClusterConfig> getAllClusterConfigs() {
    List<ClusterConfig> configs = new ArrayList<>();

    // Add local cluster config
    ClusterConfig localConfig = new ClusterConfig("local", "local");
    localConfig.setDisplayName("Local Cluster");
    localConfig.setEnabled(localClusterEnabled);
    configs.add(localConfig);

    // Add remote clusters
    if (remoteClusters != null && remoteClusters.isPresent()) {
      configs.addAll(remoteClusters.get());
    }

    return configs;
  }

  /** Cleanup method to close all remote clients when the service is destroyed. */
  @PreDestroy
  public void cleanup() {
    Log.info("Closing remote Kubernetes clients");
    for (Map.Entry<String, KubernetesClient> entry : remoteClients.entrySet()) {
      try {
        entry.getValue().close();
        Log.debugf("Closed client for cluster: %s", entry.getKey());
      } catch (Exception e) {
        Log.warnf(e, "Error closing client for cluster: %s", entry.getKey());
      }
    }
    remoteClients.clear();
  }
}

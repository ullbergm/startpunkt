package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import us.ullberg.startpunkt.config.ClusterConfig;
import us.ullberg.startpunkt.config.ClustersConfig;

/**
 * Service for managing multiple Kubernetes client connections.
 *
 * <p>This service creates and manages KubernetesClient instances for multiple clusters based on
 * configuration. It handles both local (in-cluster) and remote (kubeconfig-based) connections.
 */
@ApplicationScoped
public class MultiClusterKubernetesClientService {

  private final KubernetesClient localClient;
  private final ClustersConfig clustersConfig;
  private final Map<String, KubernetesClient> remoteClients = new HashMap<>();
  private final Map<String, ClusterConfig> clusterConfigs = new HashMap<>();

  /**
   * Constructor with injected local Kubernetes client and clusters configuration.
   *
   * @param localClient the local Kubernetes client (injected by Quarkus)
   * @param clustersConfig the clusters configuration (injected by Quarkus)
   */
  public MultiClusterKubernetesClientService(
      KubernetesClient localClient, ClustersConfig clustersConfig) {
    this.localClient = localClient;
    this.clustersConfig = clustersConfig;
  }

  /** Initialize remote cluster connections on startup. */
  void onStart(@Observes StartupEvent ev) {
    Log.info("Initializing multi-cluster Kubernetes client service");

    // Register local cluster if enabled
    if (clustersConfig.local().enabled()) {
      ClusterConfig localConfig = new ClusterConfig("local", null, true);
      clusterConfigs.put("local", localConfig);
      Log.info("Local cluster enabled");
    } else {
      Log.info("Local cluster disabled");
    }

    // Initialize remote clusters asynchronously to avoid blocking startup
    Optional<List<ClustersConfig.RemoteCluster>> remoteClusterConfigs = clustersConfig.remote();
    if (remoteClusterConfigs.isPresent() && !remoteClusterConfigs.get().isEmpty()) {
      List<ClustersConfig.RemoteCluster> configs = remoteClusterConfigs.get();
      Log.infof(
          "Found %d remote cluster configuration(s), initializing asynchronously", configs.size());

      // Initialize each cluster asynchronously
      for (ClustersConfig.RemoteCluster remoteConfig : configs) {
        if (remoteConfig.enabled()) {
          ClusterConfig config = toClusterConfig(remoteConfig);
          CompletableFuture.runAsync(
              () -> {
                try {
                  initializeRemoteCluster(config);
                  Log.infof("Successfully initialized remote cluster '%s'", config.getName());
                } catch (Exception e) {
                  Log.errorf(
                      e,
                      "Failed to initialize remote cluster '%s': %s",
                      config.getName(),
                      e.getMessage());
                }
              });
        } else {
          Log.infof("Remote cluster '%s' is disabled, skipping", remoteConfig.name());
        }
      }
    } else {
      Log.info("No remote clusters configured");
    }

    Log.info(
        "Multi-cluster service initialization started (remote clusters will connect in background)");
  }

  /**
   * Convert RemoteCluster interface to ClusterConfig POJO.
   *
   * @param remoteConfig the RemoteCluster configuration interface
   * @return the ClusterConfig POJO
   */
  private ClusterConfig toClusterConfig(ClustersConfig.RemoteCluster remoteConfig) {
    ClusterConfig config = new ClusterConfig();
    config.setName(remoteConfig.name());
    config.setEnabled(remoteConfig.enabled());
    config.setIgnoreCertificates(remoteConfig.ignoreCertificates());

    // Connection type and GraphQL URL
    config.setConnectionType(remoteConfig.connectionType());
    remoteConfig.graphqlUrl().ifPresent(config::setGraphqlUrl);

    remoteConfig.kubeconfigPath().ifPresent(config::setKubeconfigPath);
    remoteConfig.kubeconfigSecret().ifPresent(config::setKubeconfigSecret);
    remoteConfig.kubeconfigSecretNamespace().ifPresent(config::setKubeconfigSecretNamespace);
    config.setKubeconfigSecretKey(remoteConfig.kubeconfigSecretKey());

    remoteConfig.hostname().ifPresent(config::setHostname);
    remoteConfig.token().ifPresent(config::setToken);
    remoteConfig.tokenSecret().ifPresent(config::setTokenSecret);
    remoteConfig.tokenSecretNamespace().ifPresent(config::setTokenSecretNamespace);
    config.setTokenSecretKey(remoteConfig.tokenSecretKey());

    return config;
  }

  /** Close all remote Kubernetes clients on shutdown. */
  void onStop(@Observes ShutdownEvent ev) {
    Log.info("Shutting down multi-cluster Kubernetes client service");

    for (Map.Entry<String, KubernetesClient> entry : remoteClients.entrySet()) {
      try {
        Log.debugf("Closing Kubernetes client for cluster '%s'", entry.getKey());
        entry.getValue().close();
      } catch (Exception e) {
        Log.warnf(e, "Error closing Kubernetes client for cluster '%s'", entry.getKey());
      }
    }

    remoteClients.clear();
    clusterConfigs.clear();
    Log.info("Multi-cluster service shutdown complete");
  }

  /**
   * Initialize a remote cluster connection.
   *
   * @param config the cluster configuration
   * @throws IllegalArgumentException if the configuration is invalid
   */
  private void initializeRemoteCluster(ClusterConfig config) {
    String clusterName = config.getName();

    if (clusterName == null || clusterName.trim().isEmpty()) {
      throw new IllegalArgumentException("Cluster name cannot be null or empty");
    }

    if ("local".equalsIgnoreCase(clusterName)) {
      throw new IllegalArgumentException("Cluster name 'local' is reserved for the local cluster");
    }

    // Debug log the connection type
    Log.infof(
        "Initializing cluster '%s' with connection type: '%s'",
        clusterName, config.getConnectionType());

    // Check if this is a GraphQL connection (remote Startpunkt instance)
    if ("graphql".equalsIgnoreCase(config.getConnectionType())) {
      Log.infof("Initializing remote cluster '%s' via GraphQL", clusterName);

      if (config.getGraphqlUrl() == null || config.getGraphqlUrl().trim().isEmpty()) {
        throw new IllegalArgumentException(
            "GraphQL URL is required for graphql connection type for cluster '"
                + clusterName
                + "'");
      }

      // For GraphQL connections, just store the config - no Kubernetes client needed
      clusterConfigs.put(clusterName, config);
      Log.infof(
          "Configured remote Startpunkt cluster '%s' at %s", clusterName, config.getGraphqlUrl());
      return;
    }

    // Kubernetes connection types below...

    // Authentication method 1: Hostname + Token (takes highest precedence)
    if (config.getHostname() != null && !config.getHostname().trim().isEmpty()) {
      Log.infof(
          "Initializing remote cluster '%s' with hostname and token authentication", clusterName);

      String token = getTokenFromConfig(config);
      initializeClusterWithToken(
          clusterName, config.getHostname(), token, config.isIgnoreCertificates());
      clusterConfigs.put(clusterName, config);
      return;
    }

    // Authentication method 2: Secret-based kubeconfig
    String kubeconfigContent = null;

    if (config.getKubeconfigSecret() != null && !config.getKubeconfigSecret().trim().isEmpty()) {
      Log.infof(
          "Initializing remote cluster '%s' from Secret '%s'",
          clusterName, config.getKubeconfigSecret());

      kubeconfigContent = readKubeconfigFromSecret(config);
    }
    // Authentication method 3: File-based kubeconfig
    else if (config.getKubeconfigPath() != null && !config.getKubeconfigPath().trim().isEmpty()) {
      Log.infof(
          "Initializing remote cluster '%s' with kubeconfig file: %s",
          clusterName, config.getKubeconfigPath());

      kubeconfigContent = readKubeconfigFromFile(config.getKubeconfigPath(), clusterName);
    } else {
      throw new IllegalArgumentException(
          "Either hostname+token, kubeconfigSecret, or kubeconfigPath must be provided for remote cluster '"
              + clusterName
              + "'");
    }

    Log.debugf("Creating Kubernetes client for cluster '%s'", clusterName);

    try {
      Config kubeConfig = Config.fromKubeconfig(kubeconfigContent);

      // Apply ignoreCertificates setting if configured
      if (config.isIgnoreCertificates()) {
        kubeConfig.setTrustCerts(true);
        Log.warnf(
            "SSL certificate validation is disabled for cluster '%s' - this is insecure and should only be used in development",
            clusterName);
      }

      KubernetesClient client = new KubernetesClientBuilder().withConfig(kubeConfig).build();

      // Test the connection with timeout
      try {
        CompletableFuture<String> versionFuture =
            CompletableFuture.supplyAsync(
                () -> {
                  return client.getKubernetesVersion().getGitVersion();
                });

        String version = versionFuture.get(10, TimeUnit.SECONDS);
        Log.infof("Connected to remote cluster '%s' (version: %s)", clusterName, version);
      } catch (Exception e) {
        Log.warnf(
            "Could not verify connection to cluster '%s' (timeout or error: %s) - will retry on first use",
            clusterName, e.getMessage());
      }

      remoteClients.put(clusterName, client);
      clusterConfigs.put(clusterName, config);
    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to create Kubernetes client for cluster '" + clusterName + "'", e);
    }
  }

  /**
   * Read kubeconfig from a Kubernetes Secret.
   *
   * @param config the cluster configuration
   * @return the kubeconfig content
   * @throws RuntimeException if the Secret cannot be read
   */
  private String readKubeconfigFromSecret(ClusterConfig config) {
    String secretName = config.getKubeconfigSecret();
    String namespace =
        config.getKubeconfigSecretNamespace() != null
            ? config.getKubeconfigSecretNamespace()
            : localClient.getNamespace();
    String key =
        config.getKubeconfigSecretKey() != null && !config.getKubeconfigSecretKey().trim().isEmpty()
            ? config.getKubeconfigSecretKey()
            : "kubeconfig";

    if (namespace == null || namespace.trim().isEmpty()) {
      namespace = "default";
    }

    try {
      Log.debugf(
          "Reading kubeconfig from Secret '%s' in namespace '%s' (key: %s)",
          secretName, namespace, key);

      io.fabric8.kubernetes.api.model.Secret secret =
          localClient.secrets().inNamespace(namespace).withName(secretName).get();

      if (secret == null) {
        throw new RuntimeException(
            "Secret '"
                + secretName
                + "' not found in namespace '"
                + namespace
                + "' for cluster '"
                + config.getName()
                + "'");
      }

      Map<String, String> data = secret.getData();
      if (data == null || !data.containsKey(key)) {
        throw new RuntimeException(
            "Key '"
                + key
                + "' not found in Secret '"
                + secretName
                + "' in namespace '"
                + namespace
                + "' for cluster '"
                + config.getName()
                + "'");
      }

      // Decode base64 content
      String encodedContent = data.get(key);
      byte[] decodedBytes = java.util.Base64.getDecoder().decode(encodedContent);
      String kubeconfigContent = new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8);

      Log.debugf("Successfully read kubeconfig from Secret '%s'", secretName);
      return kubeconfigContent;

    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to read kubeconfig from Secret '"
              + secretName
              + "' in namespace '"
              + namespace
              + "' for cluster '"
              + config.getName()
              + "'",
          e);
    }
  }

  /**
   * Read kubeconfig from a file.
   *
   * @param kubeconfigPath the file path
   * @param clusterName the cluster name
   * @return the kubeconfig content
   * @throws RuntimeException if the file cannot be read
   */
  private String readKubeconfigFromFile(String kubeconfigPath, String clusterName) {
    File kubeconfigFile = new File(kubeconfigPath);
    if (!kubeconfigFile.exists()) {
      throw new IllegalArgumentException(
          "Kubeconfig file does not exist: "
              + kubeconfigPath
              + " for cluster '"
              + clusterName
              + "'");
    }

    try {
      return java.nio.file.Files.readString(kubeconfigFile.toPath());
    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to read kubeconfig file: "
              + kubeconfigPath
              + " for cluster '"
              + clusterName
              + "'",
          e);
    }
  }

  /**
   * Get the token from the configuration (either directly or from a Secret).
   *
   * @param config the cluster configuration
   * @return the token
   * @throws RuntimeException if the token cannot be obtained
   */
  private String getTokenFromConfig(ClusterConfig config) {
    // Check if token is directly provided
    if (config.getToken() != null && !config.getToken().trim().isEmpty()) {
      Log.debugf("Using token from configuration for cluster '%s'", config.getName());
      return config.getToken();
    }

    // Try to read from Secret
    if (config.getTokenSecret() != null && !config.getTokenSecret().trim().isEmpty()) {
      return readTokenFromSecret(config);
    }

    throw new IllegalArgumentException(
        "Either token or tokenSecret must be provided for cluster '" + config.getName() + "'");
  }

  /**
   * Read token from a Kubernetes Secret.
   *
   * @param config the cluster configuration
   * @return the token
   * @throws RuntimeException if the Secret cannot be read
   */
  private String readTokenFromSecret(ClusterConfig config) {
    String secretName = config.getTokenSecret();
    String namespace =
        config.getTokenSecretNamespace() != null
            ? config.getTokenSecretNamespace()
            : localClient.getNamespace();
    String key =
        config.getTokenSecretKey() != null && !config.getTokenSecretKey().trim().isEmpty()
            ? config.getTokenSecretKey()
            : "token";

    if (namespace == null || namespace.trim().isEmpty()) {
      namespace = "default";
    }

    try {
      Log.debugf(
          "Reading token from Secret '%s' in namespace '%s' (key: %s)", secretName, namespace, key);

      io.fabric8.kubernetes.api.model.Secret secret =
          localClient.secrets().inNamespace(namespace).withName(secretName).get();

      if (secret == null) {
        throw new RuntimeException(
            "Secret '"
                + secretName
                + "' not found in namespace '"
                + namespace
                + "' for cluster '"
                + config.getName()
                + "'");
      }

      Map<String, String> data = secret.getData();
      if (data == null || !data.containsKey(key)) {
        throw new RuntimeException(
            "Key '"
                + key
                + "' not found in Secret '"
                + secretName
                + "' in namespace '"
                + namespace
                + "' for cluster '"
                + config.getName()
                + "'");
      }

      // Decode base64 content
      String encodedContent = data.get(key);
      byte[] decodedBytes = java.util.Base64.getDecoder().decode(encodedContent);
      String token = new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8);

      Log.debugf("Successfully read token from Secret '%s'", secretName);
      return token.trim(); // Remove any trailing newlines/whitespace

    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to read token from Secret '"
              + secretName
              + "' in namespace '"
              + namespace
              + "' for cluster '"
              + config.getName()
              + "'",
          e);
    }
  }

  /**
   * Initialize a cluster connection using hostname and token.
   *
   * @param clusterName the cluster name
   * @param hostname the Kubernetes API server hostname
   * @param token the bearer token
   * @param ignoreCertificates whether to ignore SSL certificate validation errors
   * @throws RuntimeException if the connection cannot be established
   */
  private void initializeClusterWithToken(
      String clusterName, String hostname, String token, boolean ignoreCertificates) {
    try {
      Log.debugf(
          "Creating Kubernetes client for cluster '%s' with token authentication", clusterName);

      Config kubeConfig = Config.autoConfigure(null); // Start with default config
      kubeConfig.setMasterUrl(hostname);
      kubeConfig.setOauthToken(token);
      // Clear any other authentication methods
      kubeConfig.setUsername(null);
      kubeConfig.setPassword(null);
      kubeConfig.setClientCertData(null);
      kubeConfig.setClientKeyData(null);
      // Set certificate trust based on configuration
      kubeConfig.setTrustCerts(ignoreCertificates);

      if (ignoreCertificates) {
        Log.warnf(
            "SSL certificate validation is disabled for cluster '%s' - this is insecure and should only be used in development",
            clusterName);
      }

      KubernetesClient client = new KubernetesClientBuilder().withConfig(kubeConfig).build();

      // Test the connection with timeout
      try {
        CompletableFuture<String> versionFuture =
            CompletableFuture.supplyAsync(
                () -> {
                  return client.getKubernetesVersion().getGitVersion();
                });

        String version = versionFuture.get(10, TimeUnit.SECONDS);
        Log.infof("Connected to remote cluster '%s' (version: %s)", clusterName, version);
      } catch (Exception e) {
        Log.warnf(
            "Could not verify connection to cluster '%s' (timeout or error: %s) - will retry on first use",
            clusterName, e.getMessage());
      }

      remoteClients.put(clusterName, client);

    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to create Kubernetes client for cluster '"
              + clusterName
              + "' with hostname '"
              + hostname
              + "'",
          e);
    }
  }

  /**
   * Get the Kubernetes client for a specific cluster.
   *
   * @param clusterName the cluster name
   * @return the Kubernetes client, or null if the cluster is not configured
   */
  public KubernetesClient getClient(String clusterName) {
    if ("local".equalsIgnoreCase(clusterName)) {
      return clustersConfig.local().enabled() ? localClient : null;
    }
    return remoteClients.get(clusterName);
  }

  /**
   * Get the local Kubernetes client.
   *
   * @return the local client, or null if disabled
   */
  public KubernetesClient getLocalClient() {
    return clustersConfig.local().enabled() ? localClient : null;
  }

  /**
   * Get all active cluster names.
   *
   * @return list of cluster names
   */
  public List<String> getActiveClusterNames() {
    List<String> names = new ArrayList<>();

    if (clustersConfig.local().enabled()) {
      names.add("local");
    }

    // Add clusters with Kubernetes clients
    names.addAll(remoteClients.keySet());
    
    // Add GraphQL-only clusters (those in clusterConfigs but not in remoteClients)
    for (String configName : clusterConfigs.keySet()) {
      if (!remoteClients.containsKey(configName) && !names.contains(configName)) {
        names.add(configName);
      }
    }
    
    return names;
  }

  /**
   * Get the number of active clusters.
   *
   * @return count of active clusters
   */
  public int getActiveClusterCount() {
    return getActiveClusterNames().size();
  }

  /**
   * Check if a cluster is configured and active.
   *
   * @param clusterName the cluster name
   * @return true if the cluster is active
   */
  public boolean isClusterActive(String clusterName) {
    if ("local".equalsIgnoreCase(clusterName)) {
      return clustersConfig.local().enabled();
    }
    return remoteClients.containsKey(clusterName);
  }

  /**
   * Get configuration for a specific cluster.
   *
   * @param clusterName the cluster name
   * @return the cluster configuration, or empty if not found
   */
  public Optional<ClusterConfig> getClusterConfig(String clusterName) {
    return Optional.ofNullable(clusterConfigs.get(clusterName));
  }

  /**
   * Get all active cluster configurations.
   *
   * @return map of cluster name to configuration
   */
  public Map<String, ClusterConfig> getAllClusterConfigs() {
    return new HashMap<>(clusterConfigs);
  }
}

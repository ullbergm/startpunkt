package us.ullberg.startpunkt.config;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Configuration for a Kubernetes cluster connection.
 *
 * <p>This class holds configuration for connecting to a single Kubernetes cluster. Supports
 * multiple authentication methods (in order of precedence):
 *
 * <ol>
 *   <li>Hostname + Token (direct connection with service account token)
 *   <li>Secret-based kubeconfig
 *   <li>File-based kubeconfig
 * </ol>
 */
@RegisterForReflection
public class ClusterConfig {

  /** Unique name for this cluster (e.g., "local", "prod", "staging"). */
  private String name;

  /** Path to the kubeconfig file for this cluster. If not set, uses in-cluster config. */
  private String kubeconfigPath;

  /**
   * Name of the Kubernetes Secret containing the kubeconfig. Takes precedence over kubeconfigPath
   * if both are set.
   */
  private String kubeconfigSecret;

  /** Namespace where the kubeconfig Secret is located. Defaults to the current namespace. */
  private String kubeconfigSecretNamespace;

  /** Key within the Secret that contains the kubeconfig data. Defaults to "kubeconfig". */
  private String kubeconfigSecretKey = "kubeconfig";

  /** Kubernetes API server hostname (e.g., "https://api.cluster.example.com:6443"). */
  private String hostname;

  /** Bearer token for authentication. Can be provided directly or read from a Secret. */
  private String token;

  /** Name of the Kubernetes Secret containing the bearer token. */
  private String tokenSecret;

  /** Namespace where the token Secret is located. Defaults to the current namespace. */
  private String tokenSecretNamespace;

  /** Key within the Secret that contains the token. Defaults to "token". */
  private String tokenSecretKey = "token";

  /** Whether this cluster is enabled. */
  private boolean enabled = true;

  /** Whether to ignore SSL certificate validation errors (insecure, use only for development). */
  private boolean ignoreCertificates = false;

  /**
   * GraphQL endpoint URL for remote Startpunkt instance (e.g.,
   * "https://startpunkt.example.com/graphql"). If set, connects to a remote Startpunkt instance
   * instead of directly to Kubernetes.
   */
  private String graphqlUrl;

  /**
   * Authentication token for GraphQL endpoint (e.g., Bearer token). Used when connecting to a
   * remote Startpunkt instance.
   */
  private String graphqlToken;

  /**
   * Connection type: "kubernetes" (direct K8s connection) or "graphql" (remote Startpunkt).
   * Defaults to "kubernetes".
   */
  private String connectionType = "kubernetes";

  /** Default constructor. */
  public ClusterConfig() {}

  /**
   * Constructor with name and kubeconfig path.
   *
   * @param name the cluster name
   * @param kubeconfigPath the kubeconfig path
   * @param enabled whether the cluster is enabled
   */
  public ClusterConfig(String name, String kubeconfigPath, boolean enabled) {
    this.name = name;
    this.kubeconfigPath = kubeconfigPath;
    this.enabled = enabled;
  }

  /**
   * Gets the cluster name.
   *
   * @return the cluster name
   */
  public String getName() {
    return name;
  }

  /**
   * Sets the cluster name.
   *
   * @param name the cluster name
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Gets the kubeconfig path.
   *
   * @return the kubeconfig path
   */
  public String getKubeconfigPath() {
    return kubeconfigPath;
  }

  /**
   * Sets the kubeconfig path.
   *
   * @param kubeconfigPath the kubeconfig path
   */
  public void setKubeconfigPath(String kubeconfigPath) {
    this.kubeconfigPath = kubeconfigPath;
  }

  /**
   * Gets the kubeconfig Secret name.
   *
   * @return the Secret name
   */
  public String getKubeconfigSecret() {
    return kubeconfigSecret;
  }

  /**
   * Sets the kubeconfig Secret name.
   *
   * @param kubeconfigSecret the Secret name
   */
  public void setKubeconfigSecret(String kubeconfigSecret) {
    this.kubeconfigSecret = kubeconfigSecret;
  }

  /**
   * Gets the namespace where the kubeconfig Secret is located.
   *
   * @return the Secret namespace
   */
  public String getKubeconfigSecretNamespace() {
    return kubeconfigSecretNamespace;
  }

  /**
   * Sets the namespace where the kubeconfig Secret is located.
   *
   * @param kubeconfigSecretNamespace the Secret namespace
   */
  public void setKubeconfigSecretNamespace(String kubeconfigSecretNamespace) {
    this.kubeconfigSecretNamespace = kubeconfigSecretNamespace;
  }

  /**
   * Gets the key within the Secret that contains the kubeconfig data.
   *
   * @return the Secret key
   */
  public String getKubeconfigSecretKey() {
    return kubeconfigSecretKey;
  }

  /**
   * Sets the key within the Secret that contains the kubeconfig data.
   *
   * @param kubeconfigSecretKey the Secret key
   */
  public void setKubeconfigSecretKey(String kubeconfigSecretKey) {
    this.kubeconfigSecretKey = kubeconfigSecretKey;
  }

  /**
   * Gets the Kubernetes API server hostname.
   *
   * @return the hostname (e.g., "https://api.cluster.example.com:6443")
   */
  public String getHostname() {
    return hostname;
  }

  /**
   * Sets the Kubernetes API server hostname.
   *
   * @param hostname the hostname
   */
  public void setHostname(String hostname) {
    this.hostname = hostname;
  }

  /**
   * Gets the bearer token for authentication.
   *
   * @return the token
   */
  public String getToken() {
    return token;
  }

  /**
   * Sets the bearer token for authentication.
   *
   * @param token the token
   */
  public void setToken(String token) {
    this.token = token;
  }

  /**
   * Gets the name of the Secret containing the bearer token.
   *
   * @return the Secret name
   */
  public String getTokenSecret() {
    return tokenSecret;
  }

  /**
   * Sets the name of the Secret containing the bearer token.
   *
   * @param tokenSecret the Secret name
   */
  public void setTokenSecret(String tokenSecret) {
    this.tokenSecret = tokenSecret;
  }

  /**
   * Gets the namespace where the token Secret is located.
   *
   * @return the Secret namespace
   */
  public String getTokenSecretNamespace() {
    return tokenSecretNamespace;
  }

  /**
   * Sets the namespace where the token Secret is located.
   *
   * @param tokenSecretNamespace the Secret namespace
   */
  public void setTokenSecretNamespace(String tokenSecretNamespace) {
    this.tokenSecretNamespace = tokenSecretNamespace;
  }

  /**
   * Gets the key within the Secret that contains the token.
   *
   * @return the Secret key
   */
  public String getTokenSecretKey() {
    return tokenSecretKey;
  }

  /**
   * Sets the key within the Secret that contains the token.
   *
   * @param tokenSecretKey the Secret key
   */
  public void setTokenSecretKey(String tokenSecretKey) {
    this.tokenSecretKey = tokenSecretKey;
  }

  /**
   * Gets whether this cluster is enabled.
   *
   * @return true if enabled
   */
  public boolean isEnabled() {
    return enabled;
  }

  /**
   * Sets whether this cluster is enabled.
   *
   * @param enabled whether the cluster is enabled
   */
  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  /**
   * Gets whether to ignore SSL certificate validation errors.
   *
   * @return true if certificate validation should be ignored
   */
  public boolean isIgnoreCertificates() {
    return ignoreCertificates;
  }

  /**
   * Sets whether to ignore SSL certificate validation errors.
   *
   * @param ignoreCertificates whether to ignore certificate validation
   */
  public void setIgnoreCertificates(boolean ignoreCertificates) {
    this.ignoreCertificates = ignoreCertificates;
  }

  /**
   * Gets the GraphQL endpoint URL.
   *
   * @return the GraphQL URL
   */
  public String getGraphqlUrl() {
    return graphqlUrl;
  }

  /**
   * Sets the GraphQL endpoint URL.
   *
   * @param graphqlUrl the GraphQL URL
   */
  public void setGraphqlUrl(String graphqlUrl) {
    this.graphqlUrl = graphqlUrl;
  }

  /**
   * Gets the GraphQL authentication token.
   *
   * @return the GraphQL token
   */
  public String getGraphqlToken() {
    return graphqlToken;
  }

  /**
   * Sets the GraphQL authentication token.
   *
   * @param graphqlToken the GraphQL token
   */
  public void setGraphqlToken(String graphqlToken) {
    this.graphqlToken = graphqlToken;
  }

  /**
   * Gets the connection type.
   *
   * @return the connection type ("kubernetes" or "graphql")
   */
  public String getConnectionType() {
    return connectionType;
  }

  /**
   * Sets the connection type.
   *
   * @param connectionType the connection type
   */
  public void setConnectionType(String connectionType) {
    this.connectionType = connectionType;
  }

  @Override
  public String toString() {
    return "ClusterConfig{"
        + "name='"
        + name
        + '\''
        + ", connectionType='"
        + connectionType
        + '\''
        + ", kubeconfigPath='"
        + kubeconfigPath
        + '\''
        + ", kubeconfigSecret='"
        + kubeconfigSecret
        + '\''
        + ", kubeconfigSecretNamespace='"
        + kubeconfigSecretNamespace
        + '\''
        + ", kubeconfigSecretKey='"
        + kubeconfigSecretKey
        + '\''
        + ", hostname='"
        + hostname
        + '\''
        + ", token='"
        + (token != null ? "***" : null)
        + '\''
        + ", tokenSecret='"
        + tokenSecret
        + '\''
        + ", tokenSecretNamespace='"
        + tokenSecretNamespace
        + '\''
        + ", tokenSecretKey='"
        + tokenSecretKey
        + '\''
        + ", graphqlUrl='"
        + graphqlUrl
        + '\''
        + ", graphqlToken='"
        + (graphqlToken != null ? "***" : null)
        + '\''
        + ", enabled="
        + enabled
        + ", ignoreCertificates="
        + ignoreCertificates
        + '}';
  }
}

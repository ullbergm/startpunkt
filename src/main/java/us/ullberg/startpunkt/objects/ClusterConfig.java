package us.ullberg.startpunkt.objects;

import java.util.Objects;

/**
 * Configuration for a Kubernetes cluster connection. Supports multiple authentication methods
 * including kubeconfig files and service account tokens.
 */
public class ClusterConfig {

  /** Unique identifier for the cluster. Used to distinguish resources from different clusters. */
  private String name;

  /** Display name for the cluster shown in the UI. If not set, uses the name field. */
  private String displayName;

  /** Kubernetes API server URL (e.g., https://kubernetes.default.svc). */
  private String apiServerUrl;

  /** Path to kubeconfig file for cluster authentication. Optional - use OR token-based auth. */
  private String kubeconfigPath;

  /**
   * Service account token for cluster authentication. Optional - use OR kubeconfig-based auth.
   */
  private String token;

  /** Path to CA certificate file for TLS verification. Optional. */
  private String caCertPath;

  /** Whether to skip TLS certificate verification. Default false. Use with caution. */
  private boolean skipTlsVerify = false;

  /** Whether this cluster is enabled for resource discovery. Default true. */
  private boolean enabled = true;

  /** Default constructor for serialization frameworks. */
  public ClusterConfig() {}

  /**
   * Constructor with required fields.
   *
   * @param name unique cluster identifier
   * @param apiServerUrl Kubernetes API server URL
   */
  public ClusterConfig(String name, String apiServerUrl) {
    this.name = name;
    this.apiServerUrl = apiServerUrl;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDisplayName() {
    return displayName != null ? displayName : name;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public String getApiServerUrl() {
    return apiServerUrl;
  }

  public void setApiServerUrl(String apiServerUrl) {
    this.apiServerUrl = apiServerUrl;
  }

  public String getKubeconfigPath() {
    return kubeconfigPath;
  }

  public void setKubeconfigPath(String kubeconfigPath) {
    this.kubeconfigPath = kubeconfigPath;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }

  public String getCaCertPath() {
    return caCertPath;
  }

  public void setCaCertPath(String caCertPath) {
    this.caCertPath = caCertPath;
  }

  public boolean isSkipTlsVerify() {
    return skipTlsVerify;
  }

  public void setSkipTlsVerify(boolean skipTlsVerify) {
    this.skipTlsVerify = skipTlsVerify;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    ClusterConfig that = (ClusterConfig) o;
    return Objects.equals(name, that.name);
  }

  @Override
  public int hashCode() {
    return Objects.hash(name);
  }

  @Override
  public String toString() {
    return "ClusterConfig{"
        + "name='"
        + name
        + '\''
        + ", displayName='"
        + getDisplayName()
        + '\''
        + ", apiServerUrl='"
        + apiServerUrl
        + '\''
        + ", enabled="
        + enabled
        + '}';
  }
}

package us.ullberg.startpunkt.config;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Configuration for a Kubernetes cluster connection.
 *
 * <p>This class holds configuration for connecting to a single Kubernetes cluster, including the
 * cluster name, kubeconfig path, and whether the cluster is enabled.
 */
@RegisterForReflection
public class ClusterConfig {

  /** Unique name for this cluster (e.g., "local", "prod", "staging"). */
  private String name;

  /** Path to the kubeconfig file for this cluster. If not set, uses in-cluster config. */
  private String kubeconfigPath;

  /** Whether this cluster is enabled. */
  private boolean enabled = true;

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

  @Override
  public String toString() {
    return "ClusterConfig{"
        + "name='"
        + name
        + '\''
        + ", kubeconfigPath='"
        + kubeconfigPath
        + '\''
        + ", enabled="
        + enabled
        + '}';
  }
}

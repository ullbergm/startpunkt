package us.ullberg.startpunkt.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.util.List;
import java.util.Optional;

/**
 * Configuration mapping for multi-cluster settings.
 *
 * <p>This interface maps the startpunkt.clusters configuration from application.yaml.
 */
@ConfigMapping(prefix = "startpunkt.clusters")
public interface ClustersConfig {

  /**
   * Local cluster configuration.
   *
   * @return the local cluster configuration
   */
  LocalCluster local();

  /**
   * Remote cluster configurations.
   *
   * @return list of remote cluster configurations
   */
  Optional<List<RemoteCluster>> remote();

  /** Local cluster configuration. */
  interface LocalCluster {
    /**
     * Whether the local cluster is enabled.
     *
     * @return true if enabled
     */
    @WithDefault("true")
    boolean enabled();
  }

  /** Remote cluster configuration. */
  interface RemoteCluster {
    /** Cluster name. */
    String name();

    /** Kubeconfig file path. */
    Optional<String> kubeconfigPath();

    /** Kubeconfig Secret name. */
    Optional<String> kubeconfigSecret();

    /** Kubeconfig Secret namespace. */
    Optional<String> kubeconfigSecretNamespace();

    /** Kubeconfig Secret key. */
    @WithDefault("kubeconfig")
    String kubeconfigSecretKey();

    /** Kubernetes API server hostname. */
    Optional<String> hostname();

    /** Bearer token for authentication. */
    Optional<String> token();

    /** Token Secret name. */
    Optional<String> tokenSecret();

    /** Token Secret namespace. */
    Optional<String> tokenSecretNamespace();

    /** Token Secret key. */
    @WithDefault("token")
    String tokenSecretKey();

    /** Whether this cluster is enabled. */
    @WithDefault("true")
    boolean enabled();

    /**
     * Whether to ignore SSL certificate validation errors (insecure, use only for development).
     *
     * @return true if certificate validation should be ignored
     */
    @WithDefault("false")
    boolean ignoreCertificates();
  }
}

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

    /** Whether this cluster is enabled. */
    @WithDefault("true")
    boolean enabled();

    /**
     * GraphQL endpoint URL for remote Startpunkt instance.
     */
    String graphqlUrl();

    /** Authentication token for GraphQL endpoint. */
    Optional<String> graphqlToken();
  }
}

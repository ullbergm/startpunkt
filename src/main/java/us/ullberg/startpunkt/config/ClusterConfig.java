package us.ullberg.startpunkt.config;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Configuration for a remote cluster connection.
 *
 * <p>This class holds configuration for connecting to a remote Startpunkt instance via GraphQL.
 */
@RegisterForReflection
public class ClusterConfig {

  /** Unique name for this cluster (e.g., "local", "prod", "staging"). */
  private String name;

  /** Whether this cluster is enabled. */
  private boolean enabled = true;

  /**
   * GraphQL endpoint URL for remote Startpunkt instance (e.g.,
   * "https://startpunkt.example.com/graphql"). Connects to a remote Startpunkt instance.
   */
  private String graphqlUrl;

  /**
   * Authentication token for GraphQL endpoint (e.g., Bearer token). Used when connecting to a
   * remote Startpunkt instance.
   */
  private String graphqlToken;

  /** Default constructor. */
  public ClusterConfig() {}

  /**
   * Constructor with name.
   *
   * @param name the cluster name
   * @param graphqlUrl the GraphQL URL
   * @param enabled whether the cluster is enabled
   */
  public ClusterConfig(String name, String graphqlUrl, boolean enabled) {
    this.name = name;
    this.graphqlUrl = graphqlUrl;
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

  @Override
  public String toString() {
    return "ClusterConfig{"
        + "name='"
        + name
        + '\''
        + ", graphqlUrl='"
        + graphqlUrl
        + '\''
        + ", graphqlToken='"
        + (graphqlToken != null ? "***" : null)
        + '\''
        + ", enabled="
        + enabled
        + '}';
  }
}

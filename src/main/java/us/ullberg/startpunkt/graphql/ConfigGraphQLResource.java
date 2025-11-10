package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.service.MultiClusterService;

/**
 * GraphQL API resource for application configuration. Provides queries for retrieving configuration
 * settings.
 */
@GraphQLApi
@ApplicationScoped
public class ConfigGraphQLResource {

  final MultiClusterService multiClusterService;

  @ConfigProperty(name = "startpunkt.web.githubLink.enabled", defaultValue = "true")
  boolean showGithubLink;

  @ConfigProperty(name = "startpunkt.web.checkForUpdates", defaultValue = "true")
  boolean checkForUpdates;

  @ConfigProperty(name = "startpunkt.web.title", defaultValue = "Startpunkt")
  String title;

  @ConfigProperty(name = "startpunkt.web.refreshInterval", defaultValue = "300")
  int refreshInterval;

  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  boolean websocketEnabled;

  @ConfigProperty(name = "quarkus.application.version", defaultValue = "0")
  String version;

  @ConfigProperty(name = "startpunkt.web.defaultShowAllClusters", defaultValue = "false")
  boolean defaultShowAllClusters;

  /**
   * Constructor with injected dependencies.
   *
   * @param multiClusterService the multi-cluster service
   */
  public ConfigGraphQLResource(MultiClusterService multiClusterService) {
    this.multiClusterService = multiClusterService;
  }

  /**
   * Retrieve application configuration.
   *
   * @return configuration object
   */
  @Query("config")
  @Description("Retrieve application configuration")
  @Timed(value = "graphql.query.config")
  public ConfigResponse getConfig() {
    Log.debug("GraphQL query: config");
    return new ConfigResponse(
        version,
        new WebConfig(
            showGithubLink, checkForUpdates, title, refreshInterval, defaultShowAllClusters),
        new WebSocketConfig(websocketEnabled),
        new ClustersConfig(defaultShowAllClusters));
  }

  /**
   * Retrieve active cluster names.
   *
   * @return list of active cluster names
   */
  @Query("activeClusters")
  @Description("Retrieve list of active cluster names")
  @Timed(value = "graphql.query.activeClusters")
  public List<String> getActiveClusters() {
    Log.debug("GraphQL query: activeClusters");
    return multiClusterService.getActiveClusterNames();
  }

  /**
   * Retrieve the display name for the local cluster.
   *
   * @return the local cluster display name
   */
  @Query("localClusterName")
  @Description("Retrieve the display name for the local cluster")
  @Timed(value = "graphql.query.localClusterName")
  public String getLocalClusterName() {
    Log.debug("GraphQL query: localClusterName");
    return multiClusterService.getLocalClusterDisplayName();
  }

  /** Configuration response type. */
  public static class ConfigResponse {
    public String version;
    public WebConfig web;
    public WebSocketConfig websocket;
    public ClustersConfig clusters;

    public ConfigResponse(
        String version, WebConfig web, WebSocketConfig websocket, ClustersConfig clusters) {
      this.version = version;
      this.web = web;
      this.websocket = websocket;
      this.clusters = clusters;
    }
  }

  /** Web configuration type. */
  public static class WebConfig {
    public boolean showGithubLink;
    public boolean checkForUpdates;
    public String title;
    public int refreshInterval;
    public boolean defaultShowAllClusters;

    public WebConfig(
        boolean showGithubLink,
        boolean checkForUpdates,
        String title,
        int refreshInterval,
        boolean defaultShowAllClusters) {
      this.showGithubLink = showGithubLink;
      this.checkForUpdates = checkForUpdates;
      this.title = title;
      this.refreshInterval = refreshInterval;
      this.defaultShowAllClusters = defaultShowAllClusters;
    }
  }

  /** WebSocket configuration type. */
  public static class WebSocketConfig {
    public boolean enabled;

    public WebSocketConfig(boolean enabled) {
      this.enabled = enabled;
    }
  }

  /** Clusters configuration type. */
  public static class ClustersConfig {
    public boolean defaultShowAll;

    public ClustersConfig(boolean defaultShowAll) {
      this.defaultShowAll = defaultShowAll;
    }
  }
}

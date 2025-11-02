package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Query;

/**
 * GraphQL API resource for application configuration.
 * Provides queries for retrieving configuration settings.
 */
@GraphQLApi
@ApplicationScoped
public class ConfigGraphQLResource {

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
        new WebConfig(showGithubLink, checkForUpdates, title, refreshInterval),
        new WebSocketConfig(websocketEnabled));
  }

  /**
   * Configuration response type.
   */
  public static class ConfigResponse {
    public String version;
    public WebConfig web;
    public WebSocketConfig websocket;

    public ConfigResponse(String version, WebConfig web, WebSocketConfig websocket) {
      this.version = version;
      this.web = web;
      this.websocket = websocket;
    }
  }

  /**
   * Web configuration type.
   */
  public static class WebConfig {
    public boolean showGithubLink;
    public boolean checkForUpdates;
    public String title;
    public int refreshInterval;

    public WebConfig(
        boolean showGithubLink, boolean checkForUpdates, String title, int refreshInterval) {
      this.showGithubLink = showGithubLink;
      this.checkForUpdates = checkForUpdates;
      this.title = title;
      this.refreshInterval = refreshInterval;
    }
  }

  /**
   * WebSocket configuration type.
   */
  public static class WebSocketConfig {
    public boolean enabled;

    public WebSocketConfig(boolean enabled) {
      this.enabled = enabled;
    }
  }
}

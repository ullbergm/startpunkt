package us.ullberg.startpunkt.rest;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * REST API resource class for application configuration. Provides endpoints to retrieve
 * configuration settings and a ping for health check.
 */
@Path("/api/config")
@Tag(name = "config")
@Produces(MediaType.APPLICATION_JSON)
public class ConfigResource {

  /** Indicates whether the GitHub link should be shown in the UI. */
  @ConfigProperty(name = "startpunkt.web.githubLink.enabled", defaultValue = "true")
  public boolean showGithubLink;

  /** Indicates whether the application should check for updates. */
  @ConfigProperty(name = "startpunkt.web.checkForUpdates", defaultValue = "true")
  public boolean checkForUpdates;

  /** Title of the application as shown in the UI. */
  @ConfigProperty(name = "startpunkt.web.title", defaultValue = "Startpunkt")
  public String title;

  /** Refresh interval in seconds for applications and bookmarks (0 = disabled). */
  @ConfigProperty(name = "startpunkt.web.refreshInterval", defaultValue = "300")
  public int refreshInterval;

  /** Indicates whether WebSocket support is enabled. */
  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  public boolean websocketEnabled;

  /** Application version, usually set by Quarkus during build. */
  @ConfigProperty(name = "quarkus.application.version", defaultValue = "0")
  public String version;

  /** Default constructor. */
  public ConfigResource() {
    // No special initialization needed
  }

  /**
   * Retrieves the current application configuration.
   *
   * @return HTTP 200 response containing the configuration as JSON
   */
  @GET
  @Operation(summary = "Returns the configuration")
  @APIResponse(
      responseCode = "200",
      description = "Gets the configuration",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Map.class, required = true)))
  public Response getConfig() {
    return Response.ok(generateConfig()).build();
  }

  /**
   * Assembles the application configuration into a structured map.
   *
   * @return a map representing the config payload
   */
  private Map<String, Object> generateConfig() {
    return Map.of(
        "config",
        Map.of(
            "version",
            version,
            "web",
            Map.of(
                "showGithubLink",
                showGithubLink,
                "checkForUpdates",
                checkForUpdates,
                "title",
                title,
                "refreshInterval",
                refreshInterval),
            "websocket",
            Map.of("enabled", websocketEnabled)));
  }

  /**
   * Health check endpoint for the config resource.
   *
   * @return plain text "Pong from Config Resource"
   */
  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping")
  @APIResponse(responseCode = "200", description = "Ping")
  @NonBlocking
  public String ping() {
    Log.debug("Ping Config Resource");
    return "Pong from Config Resource";
  }
}

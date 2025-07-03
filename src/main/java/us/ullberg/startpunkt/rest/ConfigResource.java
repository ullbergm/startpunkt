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
  @ConfigProperty(name = "startpunkt.web.githubLink.enabled", defaultValue = "true")
  public boolean showGithubLink;

  @ConfigProperty(name = "startpunkt.web.checkForUpdates", defaultValue = "true")
  public boolean checkForUpdates;

  @ConfigProperty(name = "startpunkt.web.title", defaultValue = "Startpunkt")
  public String title;

  @ConfigProperty(name = "quarkus.application.version", defaultValue = "0")
  public String version;

  // GET endpoint to retrieve the list of bookmarks
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

  private Map<String, Object> generateConfig() {
    // Create a response with the configuration value
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
                title)));
  }

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

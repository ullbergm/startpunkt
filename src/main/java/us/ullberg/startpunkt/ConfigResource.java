package us.ullberg.startpunkt;

import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

// REST API resource class for application configuration
@Path("/api/config")
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
  public Response getConfig() {
    return Response.ok(generateConfig()).build();
  }

  private Map<String, Object> generateConfig() {
    // Create a response with the configuration value
    return Map.of("config", Map.of("version", version, "web", Map.of("showGithubLink",
        showGithubLink, "checkForUpdates", checkForUpdates, "title", title)));
  }
}

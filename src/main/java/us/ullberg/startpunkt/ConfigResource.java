package us.ullberg.startpunkt;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;

// REST API resource class for application configuration
@Path("/api/config")
@Produces(MediaType.APPLICATION_JSON)
public class ConfigResource {
  @ConfigProperty(name = "startpunkt.web.githubLink.enabled", defaultValue = "true")
  public boolean showGithubLink;

  // GET endpoint to retrieve the list of bookmarks
  @GET
  public Response getConfig() {
    return Response.ok(generateConfig()).build();
  }

  private Map<String, Object> generateConfig() {
    // Create a response with the configuration value
    Map<String, Object> response =
        Map.of("config", Map.of("web", Map.of("showGithubLink", showGithubLink)));

    return response;
  }
}

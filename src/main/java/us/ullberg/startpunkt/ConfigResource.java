package us.ullberg.startpunkt;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;

// REST API resource class for application configuration
@Path("/api/config")
@Produces(MediaType.APPLICATION_JSON)
public class ConfigResource {
  @ConfigProperty(name = "startpunkt.web.githubLink.enabled", defaultValue = "true")
  public boolean showGithubLink;

  @ConfigProperty(name = "startpunkt.web.title", defaultValue = "Startpunkt")
  public String title;

  @ConfigProperty(name = "quarkus.application.version", defaultValue = "0")
  public String version;

  @ConfigProperty(name = "startpunkt.web.theme.light.bodyBgColor", defaultValue = "#F8F6F1")
  public String lightThemeBodyBg;

  @ConfigProperty(name = "startpunkt.web.theme.light.bodyColor", defaultValue = "#696969")
  public String lightThemeBodyColor;

  @ConfigProperty(name = "startpunkt.web.theme.light.emphasisColor", defaultValue = "#000000")
  public String lightThemeEmphasisColor;

  @ConfigProperty(name = "startpunkt.web.theme.light.textPrimaryColor", defaultValue = "#4C432E")
  public String lightThemeTextPrimary;

  @ConfigProperty(name = "startpunkt.web.theme.light.textAccentColor", defaultValue = "#AA9A73")
  public String lightThemeTextAccent;

  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyBgColor", defaultValue = "#F8F6F1")
  public String darkThemeBodyBg;

  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyColor", defaultValue = "#696969")
  public String darkThemeBodyColor;

  @ConfigProperty(name = "startpunkt.web.theme.dark.emphasisColor", defaultValue = "#000000")
  public String darkThemeEmphasisColor;

  @ConfigProperty(name = "startpunkt.web.theme.dark.textPrimaryColor", defaultValue = "#4C432E")
  public String darkThemeTextPrimary;

  @ConfigProperty(name = "startpunkt.web.theme.dark.textAccentColor", defaultValue = "#AA9A73")
  public String darkThemeTextAccent;

  // GET endpoint to retrieve the list of bookmarks
  @GET
  public Response getConfig() {
    return Response.ok(generateConfig()).build();
  }

  private Map<String, Object> generateConfig() {
    // Create a response with the configuration value
    Map<String, Object> response = Map.of("config",
        Map.of("version", version, "web",
            Map.of("showGithubLink", showGithubLink, "title", title, "theme",
                Map.of("light",
                    Map.of("bodyBgColor", lightThemeBodyBg, "bodyColor", lightThemeBodyColor,
                        "emphasisColor", lightThemeEmphasisColor, "textPrimaryColor",
                        lightThemeTextPrimary, "textAccentColor", lightThemeTextAccent),
                    "dark",
                    Map.of("bodyBgColor", darkThemeBodyBg, "bodyColor", darkThemeBodyColor,
                        "emphasisColor", darkThemeEmphasisColor, "textPrimaryColor",
                        darkThemeTextPrimary, "textAccentColor", darkThemeTextAccent)))));

    return response;
  }
}

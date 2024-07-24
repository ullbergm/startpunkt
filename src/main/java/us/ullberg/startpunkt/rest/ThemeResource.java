package us.ullberg.startpunkt.rest;

import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

// REST API resource class for application configuration
@Path("/api/theme")
@Produces(MediaType.APPLICATION_JSON)
public class ThemeResource {
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
  public Response getTheme() {
    return Response.ok(generateTheme()).build();
  }

  private Map<String, Object> generateTheme() {
    // Create a response with the configuration value
    return Map.of("theme",
        Map.of("light",
            Map.of("bodyBgColor", lightThemeBodyBg, "bodyColor", lightThemeBodyColor,
                "emphasisColor", lightThemeEmphasisColor, "textPrimaryColor", lightThemeTextPrimary,
                "textAccentColor", lightThemeTextAccent),
            "dark",
            Map.of("bodyBgColor", darkThemeBodyBg, "bodyColor", darkThemeBodyColor, "emphasisColor",
                darkThemeEmphasisColor, "textPrimaryColor", darkThemeTextPrimary, "textAccentColor",
                darkThemeTextAccent)));
  }

  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping")
  @APIResponse(responseCode = "200", description = "Ping")
  @NonBlocking
  public String ping() {
    Log.debug("Ping Theme Resource");
    return "Pong from Theme Resource";
  }
}

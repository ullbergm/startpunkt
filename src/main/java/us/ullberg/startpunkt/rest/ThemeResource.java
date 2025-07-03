package us.ullberg.startpunkt.rest;

import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/theme")
@Tag(name = "theme")
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

  @GET
  @Operation(summary = "Returns application configuration")
  @APIResponse(responseCode = "200", description = "Gets application configuration",
      content = @Content(mediaType = MediaType.APPLICATION_JSON,
          schema = @Schema(implementation = Theme.class, required = true)))
  public Response getTheme() {
    return Response.ok(generateTheme()).build();
  }

  private Theme generateTheme() {
    ThemeColors light = new ThemeColors(lightThemeBodyBg, lightThemeBodyColor,
        lightThemeEmphasisColor, lightThemeTextPrimary, lightThemeTextAccent);

    ThemeColors dark = new ThemeColors(darkThemeBodyBg, darkThemeBodyColor, darkThemeEmphasisColor,
        darkThemeTextPrimary, darkThemeTextAccent);

    return new Theme(light, dark);
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

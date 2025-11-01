package us.ullberg.startpunkt.rest;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * REST resource providing theme configuration for the application. Exposes endpoints to retrieve
 * theme settings and perform a ping test.
 */
@Path("/api/theme")
@Tag(name = "theme")
@Produces(MediaType.APPLICATION_JSON)
public class ThemeResource {

  /** Background color for light theme body. */
  @ConfigProperty(name = "startpunkt.web.theme.light.bodyBgColor", defaultValue = "#F8F6F1")
  public String lightThemeBodyBg;

  /** Text color for light theme body. */
  @ConfigProperty(name = "startpunkt.web.theme.light.bodyColor", defaultValue = "#696969")
  public String lightThemeBodyColor;

  /** Emphasis color for light theme. */
  @ConfigProperty(name = "startpunkt.web.theme.light.emphasisColor", defaultValue = "#000000")
  public String lightThemeEmphasisColor;

  /** Primary text color for light theme. */
  @ConfigProperty(name = "startpunkt.web.theme.light.textPrimaryColor", defaultValue = "#4C432E")
  public String lightThemeTextPrimary;

  /** Accent text color for light theme. */
  @ConfigProperty(name = "startpunkt.web.theme.light.textAccentColor", defaultValue = "#AA9A73")
  public String lightThemeTextAccent;

  /** Background color for dark theme body. */
  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyBgColor", defaultValue = "#F8F6F1")
  public String darkThemeBodyBg;

  /** Text color for dark theme body. */
  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyColor", defaultValue = "#696969")
  public String darkThemeBodyColor;

  /** Emphasis color for dark theme. */
  @ConfigProperty(name = "startpunkt.web.theme.dark.emphasisColor", defaultValue = "#000000")
  public String darkThemeEmphasisColor;

  /** Primary text color for dark theme. */
  @ConfigProperty(name = "startpunkt.web.theme.dark.textPrimaryColor", defaultValue = "#4C432E")
  public String darkThemeTextPrimary;

  /** Accent text color for dark theme. */
  @ConfigProperty(name = "startpunkt.web.theme.dark.textAccentColor", defaultValue = "#AA9A73")
  public String darkThemeTextAccent;

  /** Default constructor. */
  public ThemeResource() {
    // No special initialization needed
  }

  /**
   * Returns the complete theme configuration including light and dark themes.
   *
   * @return HTTP response containing the theme configuration as JSON
   */
  @GET
  @Operation(summary = "Returns application configuration")
  @APIResponse(
      responseCode = "200",
      description = "Gets application configuration",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Theme.class, required = true)))
  public Response getTheme() {
    return Response.ok(generateTheme()).build();
  }

  /**
   * Builds the Theme object using values injected from configuration.
   *
   * @return a Theme object representing light and dark mode configurations
   */
  private Theme generateTheme() {
    ThemeColors light =
        new ThemeColors(
            lightThemeBodyBg,
            lightThemeBodyColor,
            lightThemeEmphasisColor,
            lightThemeTextPrimary,
            lightThemeTextAccent);

    ThemeColors dark =
        new ThemeColors(
            darkThemeBodyBg,
            darkThemeBodyColor,
            darkThemeEmphasisColor,
            darkThemeTextPrimary,
            darkThemeTextAccent);

    return new Theme(light, dark);
  }

  /**
   * Simple ping endpoint to check if the Theme resource is reachable.
   *
   * @return a plain text response confirming the service is alive
   */
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

package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.rest.Theme;
import us.ullberg.startpunkt.rest.ThemeColors;

/**
 * GraphQL API resource for theme configuration. Provides queries for retrieving theme color
 * schemes.
 */
@GraphQLApi
@ApplicationScoped
public class ThemeGraphQLResource {

  @ConfigProperty(name = "startpunkt.web.theme.light.bodyBgColor", defaultValue = "#F8F6F1")
  String lightThemeBodyBg;

  @ConfigProperty(name = "startpunkt.web.theme.light.bodyColor", defaultValue = "#696969")
  String lightThemeBodyColor;

  @ConfigProperty(name = "startpunkt.web.theme.light.emphasisColor", defaultValue = "#000000")
  String lightThemeEmphasisColor;

  @ConfigProperty(name = "startpunkt.web.theme.light.textPrimaryColor", defaultValue = "#4C432E")
  String lightThemeTextPrimary;

  @ConfigProperty(name = "startpunkt.web.theme.light.textAccentColor", defaultValue = "#AA9A73")
  String lightThemeTextAccent;

  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyBgColor", defaultValue = "#232530")
  String darkThemeBodyBg;

  @ConfigProperty(name = "startpunkt.web.theme.dark.bodyColor", defaultValue = "#696969")
  String darkThemeBodyColor;

  @ConfigProperty(name = "startpunkt.web.theme.dark.emphasisColor", defaultValue = "#FAB795")
  String darkThemeEmphasisColor;

  @ConfigProperty(name = "startpunkt.web.theme.dark.textPrimaryColor", defaultValue = "#FAB795")
  String darkThemeTextPrimary;

  @ConfigProperty(name = "startpunkt.web.theme.dark.textAccentColor", defaultValue = "#E95678")
  String darkThemeTextAccent;

  /**
   * Retrieve theme configuration.
   *
   * @return theme object with light and dark color schemes
   */
  @Query("theme")
  @Description("Retrieve theme color schemes for light and dark modes")
  @Timed(value = "graphql.query.theme")
  public Theme getTheme() {
    Log.debug("GraphQL query: theme");

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
}

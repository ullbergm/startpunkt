package us.ullberg.startpunkt.objects.theme;

/**
 * Represents the theme configuration for the application, including separate color schemes for
 * light and dark modes.
 */
public class Theme {

  /** Color scheme used in light mode. */
  private ThemeColors light;

  /** Color scheme used in dark mode. */
  private ThemeColors dark;

  /** Default constructor for frameworks and serialization. */
  public Theme() {}

  /**
   * Constructs a Theme with specified light and dark color schemes.
   *
   * @param light the color scheme for light mode
   * @param dark the color scheme for dark mode
   */
  public Theme(ThemeColors light, ThemeColors dark) {
    this.light = light;
    this.dark = dark;
  }

  /**
   * Gets the color scheme used for light mode.
   *
   * @return the light mode color scheme
   */
  public ThemeColors getLight() {
    return light;
  }

  /**
   * Sets the color scheme used for light mode.
   *
   * @param light the light mode color scheme
   */
  public void setLight(ThemeColors light) {
    this.light = light;
  }

  /**
   * Gets the color scheme used for dark mode.
   *
   * @return the dark mode color scheme
   */
  public ThemeColors getDark() {
    return dark;
  }

  /**
   * Sets the color scheme used for dark mode.
   *
   * @param dark the dark mode color scheme
   */
  public void setDark(ThemeColors dark) {
    this.dark = dark;
  }
}

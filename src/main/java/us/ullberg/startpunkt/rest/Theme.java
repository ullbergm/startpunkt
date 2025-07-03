package us.ullberg.startpunkt.rest;

/**
 * Represents the theme configuration for the application, including separate color schemes for
 * light and dark modes.
 */
public class Theme {
  private ThemeColors light;
  private ThemeColors dark;

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

  public ThemeColors getLight() {
    return light;
  }

  public void setLight(ThemeColors light) {
    this.light = light;
  }

  public ThemeColors getDark() {
    return dark;
  }

  public void setDark(ThemeColors dark) {
    this.dark = dark;
  }
}

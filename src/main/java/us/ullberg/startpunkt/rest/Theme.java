package us.ullberg.startpunkt.rest;

public class Theme {
  private ThemeColors light;
  private ThemeColors dark;

  public Theme() {}

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

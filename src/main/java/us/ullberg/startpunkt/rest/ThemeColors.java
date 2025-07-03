package us.ullberg.startpunkt.rest;

public class ThemeColors {
  private String bodyBgColor;
  private String bodyColor;
  private String emphasisColor;
  private String textPrimaryColor;
  private String textAccentColor;

  public ThemeColors() {}

  public ThemeColors(String bodyBgColor, String bodyColor, String emphasisColor,
      String textPrimaryColor, String textAccentColor) {
    this.bodyBgColor = bodyBgColor;
    this.bodyColor = bodyColor;
    this.emphasisColor = emphasisColor;
    this.textPrimaryColor = textPrimaryColor;
    this.textAccentColor = textAccentColor;
  }

  public String getBodyBgColor() {
    return bodyBgColor;
  }

  public void setBodyBgColor(String bodyBgColor) {
    this.bodyBgColor = bodyBgColor;
  }

  public String getBodyColor() {
    return bodyColor;
  }

  public void setBodyColor(String bodyColor) {
    this.bodyColor = bodyColor;
  }

  public String getEmphasisColor() {
    return emphasisColor;
  }

  public void setEmphasisColor(String emphasisColor) {
    this.emphasisColor = emphasisColor;
  }

  public String getTextPrimaryColor() {
    return textPrimaryColor;
  }

  public void setTextPrimaryColor(String textPrimaryColor) {
    this.textPrimaryColor = textPrimaryColor;
  }

  public String getTextAccentColor() {
    return textAccentColor;
  }

  public void setTextAccentColor(String textAccentColor) {
    this.textAccentColor = textAccentColor;
  }
}

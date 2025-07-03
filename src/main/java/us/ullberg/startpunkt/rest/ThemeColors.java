package us.ullberg.startpunkt.rest;

/**
 * Represents the color scheme for a theme. Contains colors for background, text, emphasis, and
 * accents.
 */
public class ThemeColors {
  private String bodyBgColor;
  private String bodyColor;
  private String emphasisColor;
  private String textPrimaryColor;
  private String textAccentColor;

  /** Default constructor for frameworks and serialization. */
  public ThemeColors() {}

  /**
   * Constructs a ThemeColors instance with specified colors.
   *
   * @param bodyBgColor background color of the body
   * @param bodyColor main body text color
   * @param emphasisColor color used for emphasis elements
   * @param textPrimaryColor primary text color
   * @param textAccentColor accent text color
   */
  public ThemeColors(
      String bodyBgColor,
      String bodyColor,
      String emphasisColor,
      String textPrimaryColor,
      String textAccentColor) {
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

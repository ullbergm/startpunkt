package us.ullberg.startpunkt.rest;

/**
 * Represents the color scheme for a theme. Contains colors for background, text, emphasis, and
 * accents.
 */
public class ThemeColors {

  /** Background color of the body. */
  private String bodyBgColor;

  /** Main text color of the body. */
  private String bodyColor;

  /** Color used for emphasized elements. */
  private String emphasisColor;

  /** Primary color used for main text. */
  private String textPrimaryColor;

  /** Accent color used for secondary or highlighted text. */
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

  /**
   * Gets the body background color.
   *
   * @return background color of the body
   */
  public String getBodyBgColor() {
    return bodyBgColor;
  }

  /**
   * Sets the body background color.
   *
   * @param bodyBgColor background color of the body
   */
  public void setBodyBgColor(String bodyBgColor) {
    this.bodyBgColor = bodyBgColor;
  }

  /**
   * Gets the body text color.
   *
   * @return text color of the body
   */
  public String getBodyColor() {
    return bodyColor;
  }

  /**
   * Sets the body text color.
   *
   * @param bodyColor text color of the body
   */
  public void setBodyColor(String bodyColor) {
    this.bodyColor = bodyColor;
  }

  /**
   * Gets the emphasis color.
   *
   * @return color used for emphasis
   */
  public String getEmphasisColor() {
    return emphasisColor;
  }

  /**
   * Sets the emphasis color.
   *
   * @param emphasisColor color used for emphasis
   */
  public void setEmphasisColor(String emphasisColor) {
    this.emphasisColor = emphasisColor;
  }

  /**
   * Gets the primary text color.
   *
   * @return primary color for text
   */
  public String getTextPrimaryColor() {
    return textPrimaryColor;
  }

  /**
   * Sets the primary text color.
   *
   * @param textPrimaryColor primary color for text
   */
  public void setTextPrimaryColor(String textPrimaryColor) {
    this.textPrimaryColor = textPrimaryColor;
  }

  /**
   * Gets the accent text color.
   *
   * @return accent color for text
   */
  public String getTextAccentColor() {
    return textAccentColor;
  }

  /**
   * Sets the accent text color.
   *
   * @param textAccentColor accent color for text
   */
  public void setTextAccentColor(String textAccentColor) {
    this.textAccentColor = textAccentColor;
  }
}

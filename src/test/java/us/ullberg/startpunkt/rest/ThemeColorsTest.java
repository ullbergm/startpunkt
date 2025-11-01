package us.ullberg.startpunkt.rest;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** Unit tests for {@link ThemeColors} class. */
class ThemeColorsTest {

  @Test
  void testDefaultConstructor() {
    // When
    ThemeColors colors = new ThemeColors();

    // Then
    assertNotNull(colors, "ThemeColors should be created");
    assertNull(colors.getBodyBgColor(), "Body background color should be null by default");
    assertNull(colors.getBodyColor(), "Body color should be null by default");
    assertNull(colors.getEmphasisColor(), "Emphasis color should be null by default");
    assertNull(colors.getTextPrimaryColor(), "Text primary color should be null by default");
    assertNull(colors.getTextAccentColor(), "Text accent color should be null by default");
  }

  @Test
  void testParameterizedConstructor() {
    // When
    ThemeColors colors = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");

    // Then
    assertNotNull(colors, "ThemeColors should be created");
    assertEquals("#ffffff", colors.getBodyBgColor(), "Body background color should match");
    assertEquals("#000000", colors.getBodyColor(), "Body color should match");
    assertEquals("#0066cc", colors.getEmphasisColor(), "Emphasis color should match");
    assertEquals("#333333", colors.getTextPrimaryColor(), "Text primary color should match");
    assertEquals("#6699ff", colors.getTextAccentColor(), "Text accent color should match");
  }

  @Test
  void testSetBodyBgColor() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setBodyBgColor("#ffffff");

    // Then
    assertEquals("#ffffff", colors.getBodyBgColor(), "Body background color should be set");
  }

  @Test
  void testSetBodyColor() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setBodyColor("#000000");

    // Then
    assertEquals("#000000", colors.getBodyColor(), "Body color should be set");
  }

  @Test
  void testSetEmphasisColor() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setEmphasisColor("#0066cc");

    // Then
    assertEquals("#0066cc", colors.getEmphasisColor(), "Emphasis color should be set");
  }

  @Test
  void testSetTextPrimaryColor() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setTextPrimaryColor("#333333");

    // Then
    assertEquals("#333333", colors.getTextPrimaryColor(), "Text primary color should be set");
  }

  @Test
  void testSetTextAccentColor() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setTextAccentColor("#6699ff");

    // Then
    assertEquals("#6699ff", colors.getTextAccentColor(), "Text accent color should be set");
  }

  @Test
  void testSetAllColors() {
    // Given
    ThemeColors colors = new ThemeColors();

    // When
    colors.setBodyBgColor("#ffffff");
    colors.setBodyColor("#000000");
    colors.setEmphasisColor("#0066cc");
    colors.setTextPrimaryColor("#333333");
    colors.setTextAccentColor("#6699ff");

    // Then
    assertEquals("#ffffff", colors.getBodyBgColor());
    assertEquals("#000000", colors.getBodyColor());
    assertEquals("#0066cc", colors.getEmphasisColor());
    assertEquals("#333333", colors.getTextPrimaryColor());
    assertEquals("#6699ff", colors.getTextAccentColor());
  }

  @Test
  void testConstructorWithNullValues() {
    // When
    ThemeColors colors = new ThemeColors(null, null, null, null, null);

    // Then
    assertNotNull(colors, "ThemeColors should be created with null values");
    assertNull(colors.getBodyBgColor());
    assertNull(colors.getBodyColor());
    assertNull(colors.getEmphasisColor());
    assertNull(colors.getTextPrimaryColor());
    assertNull(colors.getTextAccentColor());
  }

  @Test
  void testSetNullValues() {
    // Given
    ThemeColors colors = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");

    // When
    colors.setBodyBgColor(null);
    colors.setBodyColor(null);
    colors.setEmphasisColor(null);
    colors.setTextPrimaryColor(null);
    colors.setTextAccentColor(null);

    // Then
    assertNull(colors.getBodyBgColor(), "Body background color should be null");
    assertNull(colors.getBodyColor(), "Body color should be null");
    assertNull(colors.getEmphasisColor(), "Emphasis color should be null");
    assertNull(colors.getTextPrimaryColor(), "Text primary color should be null");
    assertNull(colors.getTextAccentColor(), "Text accent color should be null");
  }

  @Test
  void testReplaceColorValues() {
    // Given
    ThemeColors colors = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");

    // When
    colors.setBodyBgColor("#f0f0f0");
    colors.setBodyColor("#111111");
    colors.setEmphasisColor("#0055aa");
    colors.setTextPrimaryColor("#444444");
    colors.setTextAccentColor("#5588ee");

    // Then
    assertEquals("#f0f0f0", colors.getBodyBgColor(), "Body background color should be replaced");
    assertEquals("#111111", colors.getBodyColor(), "Body color should be replaced");
    assertEquals("#0055aa", colors.getEmphasisColor(), "Emphasis color should be replaced");
    assertEquals("#444444", colors.getTextPrimaryColor(), "Text primary color should be replaced");
    assertEquals("#5588ee", colors.getTextAccentColor(), "Text accent color should be replaced");
  }

  @Test
  void testEmptyStringColors() {
    // When
    ThemeColors colors = new ThemeColors("", "", "", "", "");

    // Then
    assertEquals("", colors.getBodyBgColor(), "Empty string should be preserved");
    assertEquals("", colors.getBodyColor(), "Empty string should be preserved");
    assertEquals("", colors.getEmphasisColor(), "Empty string should be preserved");
    assertEquals("", colors.getTextPrimaryColor(), "Empty string should be preserved");
    assertEquals("", colors.getTextAccentColor(), "Empty string should be preserved");
  }

  @Test
  void testVariousColorFormats() {
    // Test various color formats (hex, rgb, named colors)
    ThemeColors colors1 = new ThemeColors("#fff", "#000", "#06c", "#333", "#69f");
    ThemeColors colors2 =
        new ThemeColors(
            "rgb(255,255,255)",
            "rgb(0,0,0)",
            "rgb(0,102,204)",
            "rgb(51,51,51)",
            "rgb(102,153,255)");
    ThemeColors colors3 = new ThemeColors("white", "black", "blue", "darkgray", "lightblue");

    // Then - All formats should be accepted (validation is not enforced in the class)
    assertNotNull(colors1);
    assertNotNull(colors2);
    assertNotNull(colors3);

    assertEquals("#fff", colors1.getBodyBgColor());
    assertEquals("rgb(255,255,255)", colors2.getBodyBgColor());
    assertEquals("white", colors3.getBodyBgColor());
  }
}

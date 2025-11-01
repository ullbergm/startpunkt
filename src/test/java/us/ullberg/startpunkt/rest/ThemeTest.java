package us.ullberg.startpunkt.rest;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** Unit tests for {@link Theme} class. */
class ThemeTest {

  @Test
  void testDefaultConstructor() {
    // When
    Theme theme = new Theme();

    // Then
    assertNotNull(theme, "Theme should be created");
    assertNull(theme.getLight(), "Light colors should be null by default");
    assertNull(theme.getDark(), "Dark colors should be null by default");
  }

  @Test
  void testParameterizedConstructor() {
    // Given
    ThemeColors light = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");
    ThemeColors dark = new ThemeColors("#000000", "#ffffff", "#66aaff", "#cccccc", "#3377dd");

    // When
    Theme theme = new Theme(light, dark);

    // Then
    assertNotNull(theme, "Theme should be created");
    assertEquals(light, theme.getLight(), "Light colors should match");
    assertEquals(dark, theme.getDark(), "Dark colors should match");
  }

  @Test
  void testSetLight() {
    // Given
    Theme theme = new Theme();
    ThemeColors light = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");

    // When
    theme.setLight(light);

    // Then
    assertEquals(light, theme.getLight(), "Light colors should be set");
  }

  @Test
  void testSetDark() {
    // Given
    Theme theme = new Theme();
    ThemeColors dark = new ThemeColors("#000000", "#ffffff", "#66aaff", "#cccccc", "#3377dd");

    // When
    theme.setDark(dark);

    // Then
    assertEquals(dark, theme.getDark(), "Dark colors should be set");
  }

  @Test
  void testSetBothThemes() {
    // Given
    Theme theme = new Theme();
    ThemeColors light = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");
    ThemeColors dark = new ThemeColors("#000000", "#ffffff", "#66aaff", "#cccccc", "#3377dd");

    // When
    theme.setLight(light);
    theme.setDark(dark);

    // Then
    assertEquals(light, theme.getLight(), "Light colors should be set");
    assertEquals(dark, theme.getDark(), "Dark colors should be set");
  }

  @Test
  void testConstructorWithNullValues() {
    // When
    Theme theme = new Theme(null, null);

    // Then
    assertNotNull(theme, "Theme should be created with null values");
    assertNull(theme.getLight(), "Light colors should be null");
    assertNull(theme.getDark(), "Dark colors should be null");
  }

  @Test
  void testSetNullLight() {
    // Given
    ThemeColors light = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");
    Theme theme = new Theme(light, null);

    // When
    theme.setLight(null);

    // Then
    assertNull(theme.getLight(), "Light colors should be null after setting to null");
  }

  @Test
  void testSetNullDark() {
    // Given
    ThemeColors dark = new ThemeColors("#000000", "#ffffff", "#66aaff", "#cccccc", "#3377dd");
    Theme theme = new Theme(null, dark);

    // When
    theme.setDark(null);

    // Then
    assertNull(theme.getDark(), "Dark colors should be null after setting to null");
  }

  @Test
  void testReplaceExistingThemes() {
    // Given
    ThemeColors light1 = new ThemeColors("#ffffff", "#000000", "#0066cc", "#333333", "#6699ff");
    ThemeColors dark1 = new ThemeColors("#000000", "#ffffff", "#66aaff", "#cccccc", "#3377dd");
    Theme theme = new Theme(light1, dark1);

    ThemeColors light2 = new ThemeColors("#f0f0f0", "#111111", "#0055aa", "#444444", "#5588ee");
    ThemeColors dark2 = new ThemeColors("#111111", "#eeeeee", "#77bbff", "#bbbbbb", "#2266cc");

    // When
    theme.setLight(light2);
    theme.setDark(dark2);

    // Then
    assertEquals(light2, theme.getLight(), "Light colors should be replaced");
    assertEquals(dark2, theme.getDark(), "Dark colors should be replaced");
  }
}

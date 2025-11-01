package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import org.junit.jupiter.api.Test;

@QuarkusTest
class I8nServiceTest {

  @Inject I8nService service;

  @Test
  void testGetTranslationForValidLanguage() throws IOException {
    // When
    String translation = service.getTranslation("en-US");

    // Then
    assertNotNull(translation, "Translation should not be null");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
    assertTrue(translation.length() > 0, "Translation should not be empty");
  }

  @Test
  void testGetTranslationForTwoLetterLanguage() throws IOException {
    // Given - Assuming en.json exists as fallback
    // When
    String translation = service.getTranslation("en");

    // Then - Should fallback to en-US or configured default
    assertNotNull(translation, "Translation should not be null");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForInvalidFormat() throws IOException {
    // Given - Invalid language format
    // When
    String translation = service.getTranslation("invalid");

    // Then - Should fallback to en-US
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForInvalidFormatWithNumbers() throws IOException {
    // Given - Invalid language format with numbers
    // When
    String translation = service.getTranslation("en123");

    // Then - Should fallback to en-US
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForInvalidFormatWithSpecialChars() throws IOException {
    // Given - Invalid language format with special characters
    // When
    String translation = service.getTranslation("en@US");

    // Then - Should fallback to en-US
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForValidButMissingLanguage() throws IOException {
    // Given - Valid format but non-existent translation file
    // When
    String translation = service.getTranslation("xx-YY");

    // Then - Should fallback to configured default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForLowercaseCountry() throws IOException {
    // Given - Invalid format (country code should be uppercase)
    // When
    String translation = service.getTranslation("en-us");

    // Then - Should fallback to en-US due to validation failure
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForUppercaseLanguage() throws IOException {
    // Given - Invalid format (language code should be lowercase)
    // When
    String translation = service.getTranslation("EN-US");

    // Then - Should fallback to en-US due to validation failure
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForNull() {
    // When/Then - Should throw exception
    assertThrows(
        NullPointerException.class,
        () -> service.getTranslation(null),
        "Null language should throw exception");
  }

  @Test
  void testGetTranslationForEmptyString() throws IOException {
    // When
    String translation = service.getTranslation("");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForThreeLetterLanguageCode() throws IOException {
    // Given - Invalid format (language code should be 2 letters)
    // When
    String translation = service.getTranslation("eng");

    // Then - Should fallback to en-US
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForThreeLetterCountryCode() throws IOException {
    // Given - Invalid format (country code should be 2 letters)
    // When
    String translation = service.getTranslation("en-USA");

    // Then - Should fallback to en-US
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForValidFormatWithoutCountry() throws IOException {
    // Given - Valid 2-letter language code
    // When
    String translation = service.getTranslation("de");

    // Then - Should try to load de.json, fallback to default if not found
    assertNotNull(translation, "Translation should not be null");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationMultipleCalls() throws IOException {
    // When - Call multiple times for the same language
    String translation1 = service.getTranslation("en-US");
    String translation2 = service.getTranslation("en-US");

    // Then - Should return same content
    assertNotNull(translation1, "First translation should not be null");
    assertNotNull(translation2, "Second translation should not be null");
    assertEquals(
        translation1, translation2, "Multiple calls for same language should return same content");
  }
}

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

  @Test
  void testGetTranslationWithWhitespace() throws IOException {
    // Given - Language code with whitespace
    // When
    String translation = service.getTranslation("  en-US  ");

    // Then - Should handle or fallback gracefully
    assertNotNull(translation, "Translation should not be null");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationWithDifferentDelimiter() throws IOException {
    // Given - Language code with underscore instead of hyphen
    // When
    String translation = service.getTranslation("en_US");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationWithExtraHyphens() throws IOException {
    // Given - Language code with multiple hyphens
    // When
    String translation = service.getTranslation("en-US-extra");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationConsistency() throws IOException {
    // When - Get multiple different languages
    String en = service.getTranslation("en-US");
    String invalid1 = service.getTranslation("invalid");
    String invalid2 = service.getTranslation("xx-YY");

    // Then - All should return valid JSON
    assertNotNull(en);
    assertNotNull(invalid1);
    assertNotNull(invalid2);
    assertTrue(en.contains("{"));
    assertTrue(invalid1.contains("{"));
    assertTrue(invalid2.contains("{"));
  }

  @Test
  void testGetTranslationReturnsNonEmptyJson() throws IOException {
    // When
    String translation = service.getTranslation("en-US");

    // Then - Should contain some translation keys
    assertNotNull(translation);
    assertTrue(translation.length() > 10, "Translation should contain actual content");
  }

  @Test
  void testGetTranslationWithNumericLanguageCode() throws IOException {
    // Given - Numeric language code (invalid)
    // When
    String translation = service.getTranslation("12-34");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationWithMixedCaseFormat() throws IOException {
    // Given - Mixed case format
    // When
    String translation = service.getTranslation("En-uS");

    // Then - Should fallback to default due to validation
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationForSingleCharacterCode() throws IOException {
    // Given - Single character code (invalid)
    // When
    String translation = service.getTranslation("e");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }

  @Test
  void testGetTranslationWithOnlyHyphen() throws IOException {
    // Given - Only hyphen
    // When
    String translation = service.getTranslation("-");

    // Then - Should fallback to default
    assertNotNull(translation, "Translation should fallback to default");
    assertTrue(translation.contains("{"), "Translation should be valid JSON");
  }
}

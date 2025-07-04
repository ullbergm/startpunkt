package us.ullberg.startpunkt.service;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class I8nServiceTest {

  @Inject
  I8nService i8nService;

  @Test
  void testValidLanguageReturnsTranslation() throws IOException {
    String json = i8nService.getTranslation("en-US");
    assertNotNull(json);
    assertTrue(json.contains("{") && json.contains("}"), "Expected JSON content");
  }

  @Test
  void testInvalidFormatFallsBackToEnUS() throws IOException {
    String fallback = i8nService.getTranslation("invalid_lang");
    assertNotNull(fallback);
    assertTrue(fallback.contains("{") && fallback.contains("}"));
  }

  @Test
  void testMissingTranslationFallsBackToDefault() throws IOException {
    String fallback = i8nService.getTranslation("fr-FR"); // assuming fr-FR.json does not exist
    assertNotNull(fallback);
    assertTrue(fallback.contains("{") && fallback.contains("}"));
  }

  @Test
  void testDefaultLanguageInjection() {
    // This ensures the config property was injected
    assertDoesNotThrow(() -> {
      i8nService.getTranslation("non-existent");
    });
  }
}

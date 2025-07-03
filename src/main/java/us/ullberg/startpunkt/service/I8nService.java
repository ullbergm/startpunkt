package us.ullberg.startpunkt.service;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Service for internationalization (i18n) handling. Provides translation JSON content for requested
 * languages.
 */
@ApplicationScoped
public class I8nService {
  @ConfigProperty(name = "startpunkt.defaultLanguage", defaultValue = "en-US")
  private String defaultLanguage;

  /**
   * Retrieves the translation JSON content for the given language. If the language code is invalid
   * or translation is missing, falls back to default language.
   *
   * @param language language code in the format "xx" or "xx-YY" (e.g., "en", "en-US")
   * @return translation JSON content as a String
   * @throws IOException if neither requested nor fallback translation files are found
   */
  @Timed(value = "startpunkt.i8n", description = "Get a translation for a given language")
  public String getTranslation(String language) throws IOException {
    // if the language does not match standard i8n format, log a warning and fall back to US English
    InputStream translation;

    if (language.matches("^[a-z]{2}(-[A-Z]{2})?$")) {
      translation = getClass().getResourceAsStream("/i8n/" + language + ".json");
    } else {
      Log.warn("Invalid language format, falling back to US English");
      translation = getClass().getResourceAsStream("/i8n/en-US.json");
    }

    // If the translation is not found, log a warning and fall back to the default
    // language from the configuration
    if (translation == null) {
      Log.info(
          "No translation found for language: "
              + language
              + ", falling back to default language: "
              + defaultLanguage);
      translation = getClass().getResourceAsStream("/i8n/" + defaultLanguage + ".json");
    }

    return new String(translation.readAllBytes(), StandardCharsets.UTF_8);
  }
}

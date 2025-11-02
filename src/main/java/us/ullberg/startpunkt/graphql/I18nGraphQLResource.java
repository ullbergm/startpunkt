package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Name;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.service.I8nService;

/**
 * GraphQL API resource for internationalization (i18n).
 * Provides queries for retrieving translations in different languages.
 */
@GraphQLApi
@ApplicationScoped
public class I18nGraphQLResource {

  final I8nService i8nService;

  /**
   * Constructor with injected dependencies.
   *
   * @param i8nService the i18n service
   */
  public I18nGraphQLResource(I8nService i8nService) {
    this.i8nService = i8nService;
  }

  /**
   * Retrieve translations for a specific language.
   *
   * @param language the language code (e.g., "en-US", "de-DE")
   * @return translation JSON as a string
   */
  @Query("translations")
  @Description("Retrieve translations for a specific language")
  @Timed(value = "graphql.query.translations")
  public String getTranslations(
      @NonNull @Name("language") @Description("Language code (e.g., en-US, de-DE)") String language) {
    Log.debugf("GraphQL query: translations for language=%s", language);
    
    try {
      return i8nService.getTranslation(language);
    } catch (IOException e) {
      Log.errorf("Failed to get translation for language %s: %s", language, e.getMessage());
      // Return empty JSON object on error
      return "{}";
    }
  }
}

package us.ullberg.startpunkt.graphql;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.MediaType;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Name;
import org.eclipse.microprofile.graphql.Query;

/**
 * GraphQL API resource for Iconify icon search. Proxies requests to the Iconify API to avoid CORS
 * issues.
 */
@GraphQLApi
@ApplicationScoped
public class IconifyGraphQLResource {

  private static final String ICONIFY_API_URL = "https://api.iconify.design/search";
  private static final int DEFAULT_LIMIT = 20;
  private static final int MAX_LIMIT = 100;
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;

  /** Constructor for IconifyGraphQLResource. Initializes HTTP client and JSON object mapper. */
  public IconifyGraphQLResource() {
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    this.objectMapper = new ObjectMapper();
  }

  /**
   * Search for icons using the Iconify API.
   *
   * @param query The search query
   * @param limit Maximum number of results (default: 20, max: 100)
   * @return List of icon identifiers (e.g., "mdi:home", "fa:star")
   */
  @Query("searchIcons")
  @Description("Search for icons from Iconify")
  @Timed(value = "iconify.search", description = "Time spent searching icons")
  @CacheResult(cacheName = "iconify-search-cache")
  public IconSearchResult searchIcons(@Name("query") String query, @Name("limit") Integer limit) {

    if (query == null || query.trim().isEmpty()) {
      Log.debug("Empty search query provided");
      return new IconSearchResult(new ArrayList<>(), 0);
    }

    int actualLimit = limit != null ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;

    try {
      String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
      String url =
          String.format("%s?query=%s&limit=%d", ICONIFY_API_URL, encodedQuery, actualLimit);

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(url))
              .header("Accept", MediaType.APPLICATION_JSON)
              .timeout(Duration.ofSeconds(5))
              .GET()
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() == 200) {
        JsonNode root = objectMapper.readTree(response.body());
        List<String> icons = new ArrayList<>();

        // Parse the Iconify API response
        // Response format: { "icons": ["mdi:home", "fa:house", ...], "total": 100 }
        if (root.has("icons") && root.get("icons").isArray()) {
          root.get("icons").forEach(icon -> icons.add(icon.asText()));
        }

        int total = root.has("total") ? root.get("total").asInt() : icons.size();

        Log.debugf("Found %d icons for query: %s", icons.size(), query);
        return new IconSearchResult(icons, total);
      } else {
        Log.warnf("Iconify API returned status %d for query: %s", response.statusCode(), query);
        return new IconSearchResult(new ArrayList<>(), 0);
      }
    } catch (Exception e) {
      Log.errorf(e, "Error searching icons for query: %s", query);
      return new IconSearchResult(new ArrayList<>(), 0);
    }
  }

  /** Result object for icon search. */
  public static class IconSearchResult {
    private final List<String> icons;
    private final int total;

    public IconSearchResult(List<String> icons, int total) {
      this.icons = icons;
      this.total = total;
    }

    @Description("List of icon identifiers")
    public List<String> getIcons() {
      return icons;
    }

    @Description("Total number of matching icons")
    public int getTotal() {
      return total;
    }
  }
}

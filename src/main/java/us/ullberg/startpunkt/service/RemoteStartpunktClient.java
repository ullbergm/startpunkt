package us.ullberg.startpunkt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import us.ullberg.startpunkt.config.ClusterConfig;
import us.ullberg.startpunkt.objects.ApplicationResponse;
import us.ullberg.startpunkt.objects.BookmarkResponse;

/**
 * Client for connecting to remote Startpunkt instances via GraphQL.
 *
 * <p>This client allows fetching applications and bookmarks from a remote Startpunkt instance
 * instead of directly connecting to Kubernetes.
 */
@ApplicationScoped
public class RemoteStartpunktClient {

  private static final String APPLICATION_GROUPS_QUERY =
      """
      query {
        applicationGroups {
          name
          applications {
            name
            group
            icon
            url
            targetBlank
            location
            info
            tags
            rootPath
            namespace
            resourceName
            hasOwnerReferences
          }
        }
      }
      """;

  private static final String BOOKMARK_GROUPS_QUERY =
      """
      query {
        bookmarkGroups {
          name
          bookmarks {
            name
            group
            icon
            url
            info
            targetBlank
            location
            namespace
            resourceName
            hasOwnerReferences
          }
        }
      }
      """;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Fetch applications from a remote Startpunkt instance.
   *
   * @param config the cluster configuration containing GraphQL URL and token
   * @param clusterName the name to assign to fetched applications
   * @return list of applications with cluster name set
   */
  public List<ApplicationResponse> fetchApplications(ClusterConfig config, String clusterName) {
    try {
      String graphqlUrl = config.getGraphqlUrl();
      if (graphqlUrl == null || graphqlUrl.trim().isEmpty()) {
        throw new IllegalArgumentException(
            "GraphQL URL is required for cluster '" + clusterName + "'");
      }

      Log.debugf("Fetching applications from remote Startpunkt at %s", graphqlUrl);

      String responseBody =
          executeGraphQLQuery(graphqlUrl, config.getGraphqlToken(), APPLICATION_GROUPS_QUERY);

      Log.infof("GraphQL response from '%s': %s", clusterName, responseBody);

      // Parse response
      JsonNode root = objectMapper.readTree(responseBody);
      JsonNode data = root.path("data");
      JsonNode applicationGroups = data.path("applicationGroups");

      List<ApplicationResponse> applications = new ArrayList<>();

      if (applicationGroups.isArray()) {
        for (JsonNode group : applicationGroups) {
          JsonNode apps = group.path("applications");
          if (apps.isArray()) {
            for (JsonNode app : apps) {
              ApplicationResponse appResponse =
                  objectMapper.treeToValue(app, ApplicationResponse.class);
              // Override cluster name with our remote cluster name
              appResponse.setCluster(clusterName);
              applications.add(appResponse);
            }
          }
        }
      }

      Log.infof(
          "Fetched %d applications from remote Startpunkt '%s'", applications.size(), clusterName);
      return applications;

    } catch (Exception e) {
      Log.errorf(
          e,
          "Failed to fetch applications from remote Startpunkt '%s': %s",
          clusterName,
          e.getMessage());
      return List.of();
    }
  }

  /**
   * Fetch bookmarks from a remote Startpunkt instance.
   *
   * @param config the cluster configuration containing GraphQL URL and token
   * @param clusterName the name to assign to fetched bookmarks
   * @return list of bookmarks with cluster name set
   */
  public List<BookmarkResponse> fetchBookmarks(ClusterConfig config, String clusterName) {
    try {
      String graphqlUrl = config.getGraphqlUrl();
      if (graphqlUrl == null || graphqlUrl.trim().isEmpty()) {
        throw new IllegalArgumentException(
            "GraphQL URL is required for cluster '" + clusterName + "'");
      }

      Log.debugf("Fetching bookmarks from remote Startpunkt at %s", graphqlUrl);

      String responseBody =
          executeGraphQLQuery(graphqlUrl, config.getGraphqlToken(), BOOKMARK_GROUPS_QUERY);

      Log.infof("GraphQL bookmark response from '%s': %s", clusterName, responseBody);

      // Parse response
      JsonNode root = objectMapper.readTree(responseBody);
      JsonNode data = root.path("data");
      JsonNode bookmarkGroups = data.path("bookmarkGroups");

      List<BookmarkResponse> bookmarks = new ArrayList<>();

      if (bookmarkGroups.isArray()) {
        for (JsonNode group : bookmarkGroups) {
          JsonNode bks = group.path("bookmarks");
          if (bks.isArray()) {
            for (JsonNode bk : bks) {
              BookmarkResponse bookmarkResponse =
                  objectMapper.treeToValue(bk, BookmarkResponse.class);
              // Override cluster name with our remote cluster name
              bookmarkResponse.setCluster(clusterName);
              bookmarks.add(bookmarkResponse);
            }
          }
        }
      }

      Log.infof("Fetched %d bookmarks from remote Startpunkt '%s'", bookmarks.size(), clusterName);
      return bookmarks;

    } catch (Exception e) {
      Log.errorf(
          e,
          "Failed to fetch bookmarks from remote Startpunkt '%s': %s",
          clusterName,
          e.getMessage());
      return List.of();
    }
  }

  /**
   * Execute a GraphQL query against a remote endpoint.
   *
   * @param graphqlUrl the GraphQL endpoint URL
   * @param token optional authentication token
   * @param query the GraphQL query string
   * @return the response body as a string
   * @throws Exception if the request fails
   */
  private String executeGraphQLQuery(String graphqlUrl, String token, String query)
      throws Exception {
    HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    // Create GraphQL request body
    String requestBody = String.format("{\"query\":%s}", objectMapper.writeValueAsString(query));

    HttpRequest.Builder requestBuilder =
        HttpRequest.newBuilder()
            .uri(URI.create(graphqlUrl))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .timeout(Duration.ofSeconds(30));

    // Add authentication if token is provided
    if (token != null && !token.trim().isEmpty()) {
      requestBuilder.header("Authorization", "Bearer " + token);
    }

    HttpRequest request = requestBuilder.build();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    if (response.statusCode() != 200) {
      throw new RuntimeException(
          "GraphQL request failed with status " + response.statusCode() + ": " + response.body());
    }

    return response.body();
  }
}

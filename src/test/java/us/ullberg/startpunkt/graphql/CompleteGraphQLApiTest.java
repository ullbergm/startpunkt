package us.ullberg.startpunkt.graphql;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** Integration tests for the complete GraphQL API. Tests query execution across all domains. */
@QuarkusTest
class CompleteGraphQLApiTest {

  /** Helper method to format GraphQL query for REST Assured. */
  private String formatGraphQLQuery(String query) {
    return "{\"query\": \"" + query.replace("\n", " ").replace("\"", "\\\"") + "\"}";
  }

  @Test
  void testBookmarkGroupsQuery() {
    String query =
        """
        {
          bookmarkGroups {
            name
            bookmarks {
              name
              url
            }
          }
        }
        """;

    given()
        .contentType("application/json")
        .body(formatGraphQLQuery(query))
        .when()
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("data.bookmarkGroups", notNullValue());
  }

  @Test
  void testConfigQuery() {
    String query =
        """
        {
          config {
            version
            web {
              title
              showGithubLink
              checkForUpdates
              refreshInterval
            }
            websocket {
              enabled
            }
          }
        }
        """;

    given()
        .contentType("application/json")
        .body(formatGraphQLQuery(query))
        .when()
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("data.config.version", notNullValue())
        .body("data.config.web.title", notNullValue());
  }

  @Test
  void testThemeQuery() {
    String query =
        """
        {
          theme {
            light {
              bodyBgColor
              bodyColor
            }
            dark {
              bodyBgColor
              bodyColor
            }
          }
        }
        """;

    given()
        .contentType("application/json")
        .body(formatGraphQLQuery(query))
        .when()
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("data.theme.light.bodyBgColor", notNullValue())
        .body("data.theme.dark.bodyBgColor", notNullValue());
  }

  @Test
  void testTranslationsQuery() {
    String query =
        """
        {
          translations(language: "en-US")
        }
        """;

    given()
        .contentType("application/json")
        .body(formatGraphQLQuery(query))
        .when()
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("data.translations", notNullValue());
  }

  @Test
  void testCombinedQuery() {
    // Test that multiple queries can be fetched in a single request
    String query =
        """
        {
          config {
            version
            web {
              title
            }
          }
          theme {
            light {
              bodyBgColor
            }
          }
        }
        """;

    given()
        .contentType("application/json")
        .body(formatGraphQLQuery(query))
        .when()
        .post("/graphql")
        .then()
        .statusCode(200)
        .body("data.config", notNullValue())
        .body("data.theme", notNullValue());
  }
}

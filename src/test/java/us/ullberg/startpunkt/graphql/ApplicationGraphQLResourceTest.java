package us.ullberg.startpunkt.graphql;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/**
 * Integration tests for the GraphQL API.
 * Tests basic GraphQL query execution using REST Assured.
 */
@QuarkusTest
class ApplicationGraphQLResourceTest {

  /**
   * Helper method to format GraphQL query for REST Assured.
   * Escapes quotes and removes newlines for JSON body.
   */
  private String formatGraphQLQuery(String query) {
    return "{\"query\": \"" + query.replace("\n", " ").replace("\"", "\\\"") + "\"}";
  }

  @Test
  void testApplicationGroupsQuery() {
    String query = """
        {
          applicationGroups {
            name
            applications {
              name
              url
              group
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
        .body("data.applicationGroups", notNullValue());
  }

  @Test
  void testApplicationGroupsQueryWithTags() {
    String query = """
        {
          applicationGroups(tags: ["admin"]) {
            name
            applications {
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
        .body("data.applicationGroups", notNullValue());
  }

  @Test
  void testGraphQLSchemaIntrospection() {
    // Test that GraphQL schema introspection works
    String query = """
        {
          __schema {
            queryType {
              name
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
        .body("data.__schema.queryType.name", equalTo("Query"));
  }
}

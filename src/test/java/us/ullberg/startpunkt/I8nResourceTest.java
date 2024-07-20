package us.ullberg.startpunkt;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

// Mark this class as a Quarkus test
@QuarkusTest
class I8nResourceTest {
  // Test to verify that the i8n API endpoint is accessible
  @Test
  void testI8nApiEndpoint() {
    given().when().get("/api/i8n").then().statusCode(200);
  }

  @Test
  void testEnglishLanguage() {
    given().when().get("/api/i8n/en-US").then().statusCode(200);
    given().when().get("/api/i8n/en-US").then().body("home.applications", equalTo("Applications"));
    given().when().get("/api/i8n/en-US").then().body("home.bookmarks", equalTo("Bookmarks"));
  }

  @Test
  void testSwedishLanguage() {
    given().when().get("/api/i8n/sv-SE").then().statusCode(200);
    given().when().get("/api/i8n/sv-SE").then().body("home.applications", equalTo("Program"));
    given().when().get("/api/i8n/sv-SE").then().body("home.bookmarks", equalTo("Bokmärken"));
  }

  @Test
  void testUnknownLanguage() {
    given().when().get("/api/i8n/unknown").then().statusCode(200);
    given().when().get("/api/i8n/unknown").then().body("home.applications",
        equalTo("Applications"));
    given().when().get("/api/i8n/unknown").then().body("home.bookmarks", equalTo("Bookmarks"));
  }
}

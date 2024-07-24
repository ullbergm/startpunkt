package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;

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
    given().when().get("/api/i8n/en-US").then().statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  @Test
  void testSwedishLanguage() {
    given().when().get("/api/i8n/sv-SE").then().statusCode(200)
        .body("home.applications", equalTo("Program")).body("home.bookmarks", equalTo("Bokmärken"));
  }

  @Test
  void testMissingLanguage() {
    given().when().get("/api/i8n/fi").then().statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  @Test
  void testUnknownLanguage() {
    given().when().get("/api/i8n/unknown").then().statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  // Test the ping endpoint
  @Test
  void testPingEndpoint() {
    given().when().get("/api/i8n/ping").then().statusCode(200)
        .body(equalTo(new I8nResource().ping()));
  }
}

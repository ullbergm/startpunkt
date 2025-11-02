package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.service.I8nService;

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
    given()
        .when()
        .get("/api/i8n/en-US")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  @Test
  void testSwedishLanguage() {
    given()
        .when()
        .get("/api/i8n/sv-SE")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Program"))
        .body("home.bookmarks", equalTo("Bokmärken"));
  }

  @Test
  void testMissingLanguage() {
    given()
        .when()
        .get("/api/i8n/fi")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  @Test
  void testUnknownLanguage() {
    given()
        .when()
        .get("/api/i8n/unknown")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"))
        .body("home.bookmarks", equalTo("Bookmarks"));
  }

  // Test the ping endpoint
  @Test
  void testPingEndpoint() {
    given()
        .when()
        .get("/api/i8n/ping")
        .then()
        .statusCode(200)
        .body(equalTo(new I8nResource(new I8nService()).ping()));
  }

  // Test malformed language codes
  @Test
  void testMalformedCodeWithNumbers() {
    given()
        .when()
        .get("/api/i8n/en123")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testMalformedCodeWithSpecialChars() {
    given()
        .when()
        .get("/api/i8n/en@US")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testInvalidFormatLowercase() {
    given()
        .when()
        .get("/api/i8n/en-us")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testInvalidFormatUppercase() {
    given()
        .when()
        .get("/api/i8n/EN-US")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testMalformedCodeWithExtraHyphens() {
    given()
        .when()
        .get("/api/i8n/en-US-extra")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testMalformedCodeWithUnderscore() {
    given()
        .when()
        .get("/api/i8n/en_US")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testEmptyLanguageCode() {
    // Empty language path will hit the base /api/i8n endpoint
    given().when().get("/api/i8n/").then().statusCode(200); // Base endpoint returns 200
  }

  @Test
  void testSingleCharacterCode() {
    given()
        .when()
        .get("/api/i8n/e")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testNumericLanguageCode() {
    given()
        .when()
        .get("/api/i8n/12-34")
        .then()
        .statusCode(200)
        .body("home.applications", equalTo("Applications"));
  }

  @Test
  void testResponseContentType() {
    given().when().get("/api/i8n/en-US").then().statusCode(200).contentType("application/json");
  }

  @Test
  void testValidTwoLetterCode() {
    given().when().get("/api/i8n/de").then().statusCode(200);
  }
}

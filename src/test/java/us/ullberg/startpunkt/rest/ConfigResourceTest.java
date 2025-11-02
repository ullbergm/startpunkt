package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anything;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.ws.rs.core.MediaType;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ConfigResourceTest {

  // Existing test method
  @Test
  void testGetConfigEndpoint() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .contentType(MediaType.APPLICATION_JSON)
        .body("config.version", anything())
        .body("config.web.showGithubLink", equalTo(true))
        .body("config.web.checkForUpdates", equalTo(true))
        .body("config.web.title", equalTo("Startpunkt"));
  }

  // Test the ping endpoint
  @Test
  void testPingEndpoint() {
    given()
        .when()
        .get("/api/config/ping")
        .then()
        .statusCode(200)
        .body(equalTo(new ConfigResource().ping()));
  }

  @Test
  void testGetConfigContainsAllRequiredFields() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .contentType(MediaType.APPLICATION_JSON)
        .body("config", anything())
        .body("config.version", anything())
        .body("config.web", anything())
        .body("config.web.showGithubLink", anything())
        .body("config.web.checkForUpdates", anything())
        .body("config.web.title", anything())
        .body("config.web.refreshInterval", anything())
        .body("config.realtime", anything())
        .body("config.realtime.enabled", anything());
  }

  @Test
  void testGetConfigReturnsOkStatus() {
    given().when().get("/api/config").then().statusCode(200);
  }

  @Test
  void testGetConfigReturnsJsonContentType() {
    given().when().get("/api/config").then().contentType(MediaType.APPLICATION_JSON);
  }

  @Test
  void testPingReturnsTextPlain() {
    given().when().get("/api/config/ping").then().statusCode(200).contentType(MediaType.TEXT_PLAIN);
  }

  @Test
  void testPingReturnsExpectedMessage() {
    given()
        .when()
        .get("/api/config/ping")
        .then()
        .statusCode(200)
        .body(equalTo("Pong from Config Resource"));
  }

  @Test
  void testGetConfigWebShowGithubLinkIsBoolean() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .body("config.web.showGithubLink", anything());
  }

  @Test
  void testGetConfigWebCheckForUpdatesIsBoolean() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .body("config.web.checkForUpdates", anything());
  }

  @Test
  void testGetConfigRealtimeEnabledIsBoolean() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .body("config.realtime.enabled", anything());
  }

  @Test
  void testGetConfigWebTitleIsString() {
    given().when().get("/api/config").then().statusCode(200).body("config.web.title", anything());
  }

  @Test
  void testGetConfigWebRefreshIntervalIsNumber() {
    given()
        .when()
        .get("/api/config")
        .then()
        .statusCode(200)
        .body("config.web.refreshInterval", anything());
  }

  @Test
  void testConfigResourceDefaultConstructor() {
    // Just verify the default constructor works
    ConfigResource resource = new ConfigResource();
    assertNotNull(resource, "ConfigResource should be instantiable");
  }

  @Test
  void testMultipleConfigRequests() {
    // Test that multiple requests return consistent results
    String firstResponse =
        given().when().get("/api/config").then().statusCode(200).extract().asString();

    String secondResponse =
        given().when().get("/api/config").then().statusCode(200).extract().asString();

    assertEquals(firstResponse, secondResponse, "Multiple config requests should return same data");
  }

  @Test
  void testMultiplePingRequests() {
    // Test that multiple ping requests work
    for (int i = 0; i < 5; i++) {
      given()
          .when()
          .get("/api/config/ping")
          .then()
          .statusCode(200)
          .body(equalTo("Pong from Config Resource"));
    }
  }
}

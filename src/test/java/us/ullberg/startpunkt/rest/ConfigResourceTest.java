package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anything;
import static org.hamcrest.Matchers.equalTo;

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
}

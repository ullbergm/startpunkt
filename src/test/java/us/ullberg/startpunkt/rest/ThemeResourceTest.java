package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;

@QuarkusTest
class ThemeResourceTest {
  @Test
  void testGetThemeEndpoint() {
    given().when().get("/api/theme").then().statusCode(200);
  }

  @Test
  void testLightThemeConfiguration() {
    given().when().get("/api/theme").then().body("light.bodyBgColor", equalTo("#F8F6F1"))
        .body("light.bodyColor", equalTo("#696969")).body("light.emphasisColor", equalTo("#000000"))
        .body("light.textPrimaryColor", equalTo("#4C432E"))
        .body("light.textAccentColor", equalTo("#AA9A73"));
  }

  @Test
  void testDarkThemeConfiguration() {
    given().when().get("/api/theme").then().body("dark.bodyBgColor", equalTo("#232530"))
        .body("dark.bodyColor", equalTo("#696969")).body("dark.emphasisColor", equalTo("#FAB795"))
        .body("dark.textPrimaryColor", equalTo("#FAB795"))
        .body("dark.textAccentColor", equalTo("#E95678"));
  }

  // Test the ping endpoint
  @Test
  void testPingEndpoint() {
    given().when().get("/api/theme/ping").then().statusCode(200)
        .body(equalTo(new ThemeResource().ping()));
  }
}

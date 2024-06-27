package us.ullberg.startpage;

import static io.restassured.RestAssured.given;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ApplicationResourceTest {
  @Test
  void testApplicationApiEndpoint() {
    given().when().get("/api/apps").then().statusCode(200);
  }
}

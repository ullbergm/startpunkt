package us.ullberg.startpunkt;

import static io.restassured.RestAssured.given;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

@QuarkusTest
class BookmarkResourceTest {
  @Test
  void testBookmarkApiEndpoint() {
    given().when().get("/api/bookmarks").then().statusCode(200);
  }
}

package us.ullberg.startpage;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

@QuarkusTest
class ApplicationResourceTest {
    @Test
    void testApplicationApiEndpoint() {
        given()
                .when().get("/api/apps")
                .then()
                .statusCode(200);
    }
}
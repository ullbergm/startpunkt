package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponse.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.BookmarkResource;
import us.ullberg.startpunkt.service.BookmarkService;

class PingBookmarkResourceHealthCheckTest {

  private PingBookmarkResourceHealthCheck healthCheck;
  private BookmarkResource bookmarkResource;

  @BeforeEach
  void setUp() {
    bookmarkResource = new BookmarkResource(new BookmarkService(), null);
    healthCheck = new PingBookmarkResourceHealthCheck(bookmarkResource);
  }

  @Test
  void testPing() {
    var response = bookmarkResource.ping();
    var expectedResponse =
        HealthCheckResponse.named("Ping Bookmark REST Endpoint")
            .withData("Response", response)
            .up()
            .build();

    var actualResponse = healthCheck.call();

    assertEquals(expectedResponse.getData(), actualResponse.getData());
    assertEquals(expectedResponse.getName(), actualResponse.getName());
    assertEquals(expectedResponse.getStatus(), actualResponse.getStatus());
  }

  @Test
  void testCallReturnsNonNullResponse() {
    var response = healthCheck.call();
    assertNotNull(response, "Health check response should not be null");
  }

  @Test
  void testCallReturnsUpStatus() {
    var response = healthCheck.call();
    assertEquals(Status.UP, response.getStatus(), "Health check should return UP status");
  }

  @Test
  void testCallReturnsCorrectName() {
    var response = healthCheck.call();
    assertEquals(
        "Ping Bookmark REST Endpoint", response.getName(), "Health check should have correct name");
  }

  @Test
  void testCallIncludesResponseData() {
    var response = healthCheck.call();
    assertTrue(response.getData().isPresent(), "Health check should include response data");
    assertTrue(
        response.getData().get().containsKey("Response"),
        "Response data should contain 'Response' key");
  }

  @Test
  void testMultipleCallsReturnConsistentResults() {
    var response1 = healthCheck.call();
    var response2 = healthCheck.call();

    assertEquals(response1.getStatus(), response2.getStatus());
    assertEquals(response1.getName(), response2.getName());
  }
}

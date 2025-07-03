package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.BookmarkResource;
import us.ullberg.startpunkt.service.BookmarkService;

class PingBookmarkResourceHealthCheckTest {

  private PingBookmarkResourceHealthCheck healthCheck;
  private BookmarkResource bookmarkResource;

  @BeforeEach
  void setUp() {
    bookmarkResource = new BookmarkResource(new BookmarkService());
    healthCheck = new PingBookmarkResourceHealthCheck(bookmarkResource);
  }

  @Test
  void testPing() {
    var response = bookmarkResource.ping();

    var expectedResponse = HealthCheckResponse.named("Ping Bookmark REST Endpoint")
        .withData("Response", response)
        .up()
        .build();

    assertEquals(expectedResponse.getData(), healthCheck.call().getData());
  }
}

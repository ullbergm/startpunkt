package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.rest.BookmarkResource;
import us.ullberg.startpunkt.service.BookmarkService;

import org.eclipse.microprofile.health.HealthCheckResponse;

class PingBookmarkResourceHealthCheckTest {

  private PingBookmarkResourceHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    healthCheck = new PingBookmarkResourceHealthCheck(new BookmarkResource(new BookmarkService()));
  }

  @Test
  void testPing() {
    var response = new BookmarkResource(new BookmarkService()).ping();
    var expectedResponse = HealthCheckResponse.named("Ping Bookmark REST Endpoint")
        .withData("Response", response).up().build();

    assertEquals(healthCheck.call().getData(), expectedResponse.getData());
  }
}

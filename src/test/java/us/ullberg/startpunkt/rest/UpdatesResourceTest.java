package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.messaging.EventBroadcaster;

/**
 * Integration tests for the SSE UpdatesResource endpoint and EventBroadcaster.
 *
 * <p>Tests event broadcasting functionality. Note: Full SSE endpoint connectivity is tested
 * manually or via separate integration tests due to long-lived connection nature.
 */
@QuarkusTest
@TestProfile(UpdatesResourceTest.RealtimeEnabledProfile.class)
class UpdatesResourceTest {

  public static class RealtimeEnabledProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
      return Map.of("startpunkt.realtime.enabled", "true");
    }
  }

  @Inject EventBroadcaster eventBroadcaster;

  @Test
  void testEventBroadcasterAvailable() {
    assertNotNull(eventBroadcaster, "EventBroadcaster should be injected");
  }

  @Test
  void testBroadcastApplicationAdded() {
    Map<String, Object> appData = Map.of("name", "TestApp", "url", "https://test.com");
    // Should not throw exception
    eventBroadcaster.broadcastApplicationAdded(appData);
  }

  @Test
  void testBroadcastMultipleEventTypes() {
    // Test that multiple event types can be broadcast without errors
    eventBroadcaster.broadcastApplicationAdded(Map.of("name", "App1"));
    eventBroadcaster.broadcastBookmarkAdded(Map.of("name", "Bookmark1"));
    eventBroadcaster.broadcastConfigChanged(Map.of("key", "value"));
    eventBroadcaster.broadcastApplicationUpdated(Map.of("name", "UpdatedApp"));
    eventBroadcaster.broadcastApplicationRemoved(Map.of("name", "RemovedApp"));
    eventBroadcaster.broadcastBookmarkUpdated(Map.of("name", "UpdatedBookmark"));
    eventBroadcaster.broadcastBookmarkRemoved(Map.of("name", "RemovedBookmark"));
    eventBroadcaster.broadcastStatusChanged(Map.of("status", "active"));
  }

  @Test
  void testStreamAvailability() {
    // Test that the stream is available and not null
    assertNotNull(eventBroadcaster.getStream(), "Event stream should not be null");
  }

  @Test
  void testSseEndpointReturnsServerSentEvents() {
    // Test that the SSE endpoint returns the correct content type
    given()
        .when()
        .get("/api/updates/stream")
        .then()
        .statusCode(200)
        .contentType(ContentType.TEXT)
        .header("Content-Type", containsString("text/event-stream"));
  }
}

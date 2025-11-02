package us.ullberg.startpunkt.rest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.messaging.EventBroadcaster;

/**
 * Integration tests for the WebSocket UpdatesWebSocket endpoint and EventBroadcaster.
 *
 * <p>Tests event broadcasting functionality. Note: Full WebSocket endpoint connectivity is tested
 * manually or via separate integration tests due to long-lived connection nature.
 */
@QuarkusTest
@TestProfile(UpdatesResourceTest.WebSocketEnabledProfile.class)
class UpdatesResourceTest {

  public static class WebSocketEnabledProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
      return Map.of("startpunkt.websocket.enabled", "true");
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

  // Note: WebSocket endpoint test is intentionally omitted as it creates a long-lived
  // connection that would hang the test suite. WebSocket functionality should be tested
  // manually or via integration tests with proper connection lifecycle management.
}

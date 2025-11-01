package us.ullberg.startpunkt.messaging;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.websocket.WebSocketEventType;

/** Unit tests for {@link EventBroadcaster}. */
@QuarkusTest
class EventBroadcasterTest {

  @Inject EventBroadcaster broadcaster;

  @Test
  void testBroadcastApplicationAdded() {
    // Given
    Map<String, Object> appData = Map.of("name", "TestApp", "url", "https://test.com");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(appData));
  }

  @Test
  void testBroadcastApplicationRemoved() {
    // Given
    Map<String, Object> appData = Map.of("name", "TestApp");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationRemoved(appData));
  }

  @Test
  void testBroadcastApplicationUpdated() {
    // Given
    Map<String, Object> appData = Map.of("name", "TestApp", "status", "updated");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationUpdated(appData));
  }

  @Test
  void testBroadcastConfigChanged() {
    // Given
    Map<String, Object> configData = Map.of("theme", "dark", "language", "en");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastConfigChanged(configData));
  }

  @Test
  void testBroadcastStatusChanged() {
    // Given
    Map<String, Object> statusData = Map.of("status", "healthy", "timestamp", 123456789L);

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastStatusChanged(statusData));
  }

  @Test
  void testBroadcastBookmarkAdded() {
    // Given
    Map<String, Object> bookmarkData = Map.of("name", "Bookmark1", "url", "https://bookmark.com");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastBookmarkAdded(bookmarkData));
  }

  @Test
  void testBroadcastBookmarkRemoved() {
    // Given
    Map<String, Object> bookmarkData = Map.of("name", "Bookmark1");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastBookmarkRemoved(bookmarkData));
  }

  @Test
  void testBroadcastBookmarkUpdated() {
    // Given
    Map<String, Object> bookmarkData = Map.of("name", "Bookmark1", "status", "updated");

    // When/Then - Should not throw exception
    assertDoesNotThrow(() -> broadcaster.broadcastBookmarkUpdated(bookmarkData));
  }

  @Test
  void testBroadcastWithNullData() {
    // When/Then - Should handle null data without throwing exception
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(null));
  }

  @Test
  void testBroadcastWithEmptyMap() {
    // Given
    Map<String, Object> emptyData = new HashMap<>();

    // When/Then - Should handle empty map without throwing exception
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(emptyData));
  }

  @Test
  void testMultipleDifferentEventsInSequence() {
    // Given
    Map<String, Object> appData = Map.of("app", "data");
    Map<String, Object> bookmarkData = Map.of("bookmark", "data");
    Map<String, Object> statusData = Map.of("status", "data");

    // When/Then - Should handle multiple events without throwing exception
    assertDoesNotThrow(
        () -> {
          broadcaster.broadcastApplicationAdded(appData);
          broadcaster.broadcastBookmarkAdded(bookmarkData);
          broadcaster.broadcastStatusChanged(statusData);
        });
  }

  @Test
  void testBroadcastEventWithComplexData() {
    // Given
    Map<String, Object> complexData =
        Map.of(
            "name",
            "ComplexApp",
            "metadata",
            Map.of("version", "1.0.0", "author", "TestAuthor"),
            "tags",
            java.util.List.of("tag1", "tag2", "tag3"),
            "enabled",
            true);

    // When/Then - Should handle complex nested data structure
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(complexData));
  }

  @Test
  void testBroadcastWithLargeDataSet() {
    // Given - Create a large map
    Map<String, Object> largeData = new HashMap<>();
    for (int i = 0; i < 100; i++) {
      largeData.put("key" + i, "value" + i);
    }

    // When/Then - Should handle large data without issues
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(largeData));
  }

  @Test
  void testBroadcastAllEventTypes() {
    // Given
    Map<String, Object> data = Map.of("test", "data");

    // When/Then - Test all event broadcasting methods
    assertDoesNotThrow(
        () -> {
          broadcaster.broadcastApplicationAdded(data);
          broadcaster.broadcastApplicationRemoved(data);
          broadcaster.broadcastApplicationUpdated(data);
          broadcaster.broadcastConfigChanged(data);
          broadcaster.broadcastStatusChanged(data);
          broadcaster.broadcastBookmarkAdded(data);
          broadcaster.broadcastBookmarkRemoved(data);
          broadcaster.broadcastBookmarkUpdated(data);
        });
  }

  @Test
  void testBroadcastEventDirectly() {
    // Given
    Map<String, Object> data = Map.of("direct", "call");

    // When/Then - Test direct broadcastEvent method
    assertDoesNotThrow(
        () -> broadcaster.broadcastEvent(WebSocketEventType.APPLICATION_ADDED, data));
  }

  @Test
  void testBroadcastWithSpecialCharacters() {
    // Given
    Map<String, Object> dataWithSpecialChars =
        Map.of(
            "name",
            "App with 特殊字符",
            "url",
            "https://example.com?param=value&other=值",
            "description",
            "Description with émojis 🚀");

    // When/Then - Should handle special characters and unicode
    assertDoesNotThrow(() -> broadcaster.broadcastApplicationAdded(dataWithSpecialChars));
  }

  @Test
  void testBroadcasterIsInjectable() {
    // Then - Broadcaster should be injected
    assertNotNull(broadcaster, "EventBroadcaster should be injected");
  }

  @Test
  void testBroadcastWithStringData() {
    // Given
    String stringData = "Simple string data";

    // When/Then - Should handle non-map data
    assertDoesNotThrow(() -> broadcaster.broadcastEvent(WebSocketEventType.CONFIG_CHANGED, stringData));
  }

  @Test
  void testBroadcastWithNumericData() {
    // Given
    Integer numericData = 12345;

    // When/Then - Should handle numeric data
    assertDoesNotThrow(() -> broadcaster.broadcastEvent(WebSocketEventType.STATUS_CHANGED, numericData));
  }

  @Test
  void testConsecutiveBroadcastsOfSameType() {
    // Given
    Map<String, Object> data1 = Map.of("iteration", 1);
    Map<String, Object> data2 = Map.of("iteration", 2);
    Map<String, Object> data3 = Map.of("iteration", 3);

    // When/Then - Should handle consecutive broadcasts (debouncing may apply)
    assertDoesNotThrow(
        () -> {
          broadcaster.broadcastApplicationAdded(data1);
          broadcaster.broadcastApplicationAdded(data2);
          broadcaster.broadcastApplicationAdded(data3);
        });
  }
}

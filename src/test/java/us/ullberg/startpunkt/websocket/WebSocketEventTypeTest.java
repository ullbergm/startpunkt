package us.ullberg.startpunkt.websocket;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** Tests for WebSocketEventType enum. */
class WebSocketEventTypeTest {

  @Test
  void testAllEventTypesExist() {
    // Verify all expected event types are defined
    WebSocketEventType[] types = WebSocketEventType.values();
    assertEquals(9, types.length, "Should have exactly 9 event types");
  }

  @Test
  void testApplicationAddedExists() {
    assertNotNull(WebSocketEventType.APPLICATION_ADDED);
    assertEquals("APPLICATION_ADDED", WebSocketEventType.APPLICATION_ADDED.name());
  }

  @Test
  void testApplicationRemovedExists() {
    assertNotNull(WebSocketEventType.APPLICATION_REMOVED);
    assertEquals("APPLICATION_REMOVED", WebSocketEventType.APPLICATION_REMOVED.name());
  }

  @Test
  void testApplicationUpdatedExists() {
    assertNotNull(WebSocketEventType.APPLICATION_UPDATED);
    assertEquals("APPLICATION_UPDATED", WebSocketEventType.APPLICATION_UPDATED.name());
  }

  @Test
  void testConfigChangedExists() {
    assertNotNull(WebSocketEventType.CONFIG_CHANGED);
    assertEquals("CONFIG_CHANGED", WebSocketEventType.CONFIG_CHANGED.name());
  }

  @Test
  void testStatusChangedExists() {
    assertNotNull(WebSocketEventType.STATUS_CHANGED);
    assertEquals("STATUS_CHANGED", WebSocketEventType.STATUS_CHANGED.name());
  }

  @Test
  void testBookmarkAddedExists() {
    assertNotNull(WebSocketEventType.BOOKMARK_ADDED);
    assertEquals("BOOKMARK_ADDED", WebSocketEventType.BOOKMARK_ADDED.name());
  }

  @Test
  void testBookmarkRemovedExists() {
    assertNotNull(WebSocketEventType.BOOKMARK_REMOVED);
    assertEquals("BOOKMARK_REMOVED", WebSocketEventType.BOOKMARK_REMOVED.name());
  }

  @Test
  void testBookmarkUpdatedExists() {
    assertNotNull(WebSocketEventType.BOOKMARK_UPDATED);
    assertEquals("BOOKMARK_UPDATED", WebSocketEventType.BOOKMARK_UPDATED.name());
  }

  @Test
  void testHeartbeatExists() {
    assertNotNull(WebSocketEventType.HEARTBEAT);
    assertEquals("HEARTBEAT", WebSocketEventType.HEARTBEAT.name());
  }

  @Test
  void testValueOfFromString() {
    assertEquals(
        WebSocketEventType.APPLICATION_ADDED, WebSocketEventType.valueOf("APPLICATION_ADDED"));
    assertEquals(WebSocketEventType.CONFIG_CHANGED, WebSocketEventType.valueOf("CONFIG_CHANGED"));
    assertEquals(WebSocketEventType.HEARTBEAT, WebSocketEventType.valueOf("HEARTBEAT"));
  }

  @Test
  void testValueOfInvalidString() {
    assertThrows(
        IllegalArgumentException.class,
        () -> WebSocketEventType.valueOf("INVALID_EVENT"),
        "Should throw IllegalArgumentException for invalid event type");
  }

  @Test
  void testEnumEquality() {
    WebSocketEventType type1 = WebSocketEventType.APPLICATION_ADDED;
    WebSocketEventType type2 = WebSocketEventType.APPLICATION_ADDED;
    assertEquals(type1, type2, "Same enum values should be equal");
    assertSame(type1, type2, "Same enum values should be same instance");
  }

  @Test
  void testEnumInequality() {
    WebSocketEventType type1 = WebSocketEventType.APPLICATION_ADDED;
    WebSocketEventType type2 = WebSocketEventType.APPLICATION_REMOVED;
    assertNotEquals(type1, type2, "Different enum values should not be equal");
  }

  @Test
  void testToString() {
    assertEquals("APPLICATION_ADDED", WebSocketEventType.APPLICATION_ADDED.toString());
    assertEquals("BOOKMARK_UPDATED", WebSocketEventType.BOOKMARK_UPDATED.toString());
    assertEquals("HEARTBEAT", WebSocketEventType.HEARTBEAT.toString());
  }

  @Test
  void testEnumOrdering() {
    WebSocketEventType[] types = WebSocketEventType.values();

    // Verify the first and last elements
    assertEquals(WebSocketEventType.APPLICATION_ADDED, types[0]);
    assertEquals(WebSocketEventType.HEARTBEAT, types[types.length - 1]);
  }

  @Test
  void testSwitchStatement() {
    // Test that enum can be used in switch statements
    String result =
        switch (WebSocketEventType.APPLICATION_ADDED) {
          case APPLICATION_ADDED -> "added";
          case APPLICATION_REMOVED -> "removed";
          case APPLICATION_UPDATED -> "updated";
          case CONFIG_CHANGED -> "config";
          case STATUS_CHANGED -> "status";
          case BOOKMARK_ADDED -> "bookmark_added";
          case BOOKMARK_REMOVED -> "bookmark_removed";
          case BOOKMARK_UPDATED -> "bookmark_updated";
          case HEARTBEAT -> "heartbeat";
        };

    assertEquals("added", result);
  }

  @Test
  void testHashCode() {
    // Enum hashCode should be consistent
    WebSocketEventType type = WebSocketEventType.CONFIG_CHANGED;
    int hash1 = type.hashCode();
    int hash2 = type.hashCode();
    assertEquals(hash1, hash2, "HashCode should be consistent");
  }

  @Test
  void testCompareTo() {
    // Enums are comparable based on their declaration order
    assertTrue(
        WebSocketEventType.APPLICATION_ADDED.compareTo(WebSocketEventType.HEARTBEAT) < 0,
        "APPLICATION_ADDED should come before HEARTBEAT");
    assertTrue(
        WebSocketEventType.HEARTBEAT.compareTo(WebSocketEventType.APPLICATION_ADDED) > 0,
        "HEARTBEAT should come after APPLICATION_ADDED");
    assertEquals(
        0,
        WebSocketEventType.CONFIG_CHANGED.compareTo(WebSocketEventType.CONFIG_CHANGED),
        "Comparing same enum should return 0");
  }
}

package us.ullberg.startpunkt.websocket;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Tests for WebSocketMessage class. */
public class WebSocketMessageTest {

  @Test
  public void testMessageCreation() {
    var data = "test data";
    var message = new WebSocketMessage<>(WebSocketEventType.APPLICATION_ADDED, data);

    assertEquals(WebSocketEventType.APPLICATION_ADDED, message.getType());
    assertEquals(data, message.getData());
    assertNotNull(message.getTimestamp());
  }

  @Test
  public void testMessageWithNullData() {
    var message = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);

    assertEquals(WebSocketEventType.HEARTBEAT, message.getType());
    assertNull(message.getData());
    assertNotNull(message.getTimestamp());
  }

  @Test
  public void testSettersAndGetters() {
    var message = new WebSocketMessage<String>();

    message.setType(WebSocketEventType.CONFIG_CHANGED);
    message.setData("config data");

    assertEquals(WebSocketEventType.CONFIG_CHANGED, message.getType());
    assertEquals("config data", message.getData());
  }

  @Test
  public void testDefaultConstructorSetsTimestamp() {
    var message = new WebSocketMessage<String>();
    assertNotNull(message.getTimestamp(), "Default constructor should set timestamp");
  }

  @Test
  public void testTimestampIsCurrentTime() {
    Instant before = Instant.now();
    var message = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);
    Instant after = Instant.now();

    assertNotNull(message.getTimestamp());
    assertTrue(message.getTimestamp().isAfter(before.minusSeconds(1)));
    assertTrue(message.getTimestamp().isBefore(after.plusSeconds(1)));
  }

  @Test
  public void testSetTimestamp() {
    var message = new WebSocketMessage<String>();
    Instant customTime = Instant.parse("2024-01-01T12:00:00Z");
    
    message.setTimestamp(customTime);
    assertEquals(customTime, message.getTimestamp());
  }

  @Test
  public void testMessageWithComplexData() {
    var complexData = new TestDataObject("value1", 42);
    var message = new WebSocketMessage<>(WebSocketEventType.APPLICATION_UPDATED, complexData);

    assertEquals(WebSocketEventType.APPLICATION_UPDATED, message.getType());
    assertEquals(complexData, message.getData());
    assertEquals("value1", message.getData().field1);
    assertEquals(42, message.getData().field2);
  }

  @Test
  public void testMessageWithEmptyString() {
    var message = new WebSocketMessage<>(WebSocketEventType.APPLICATION_REMOVED, "");
    
    assertEquals(WebSocketEventType.APPLICATION_REMOVED, message.getType());
    assertEquals("", message.getData());
  }

  @Test
  public void testMessageTypeChanges() {
    var message = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, "data");
    
    message.setType(WebSocketEventType.CONFIG_CHANGED);
    assertEquals(WebSocketEventType.CONFIG_CHANGED, message.getType());
  }

  @Test
  public void testMessageDataChanges() {
    var message = new WebSocketMessage<>(WebSocketEventType.CONFIG_CHANGED, "initial");
    
    message.setData("updated");
    assertEquals("updated", message.getData());
  }

  @Test
  public void testMultipleMessagesHaveUniqueTimestamps() throws InterruptedException {
    var message1 = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);
    Thread.sleep(1); // Ensure different timestamps
    var message2 = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);

    assertNotEquals(message1.getTimestamp(), message2.getTimestamp());
  }

  @Test
  public void testAllEventTypes() {
    // Test that messages can be created with all event types
    for (WebSocketEventType eventType : WebSocketEventType.values()) {
      var message = new WebSocketMessage<>(eventType, "test");
      assertEquals(eventType, message.getType());
    }
  }

  // Helper class for testing complex data
  private static class TestDataObject {
    String field1;
    int field2;

    TestDataObject(String field1, int field2) {
      this.field1 = field1;
      this.field2 = field2;
    }
  }
}

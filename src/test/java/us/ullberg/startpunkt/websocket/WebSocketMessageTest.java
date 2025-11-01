package us.ullberg.startpunkt.websocket;

import static org.junit.jupiter.api.Assertions.*;

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
}

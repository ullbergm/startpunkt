package us.ullberg.startpunkt.websocket;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for WebSocketEventBroadcaster. */
@QuarkusTest
public class WebSocketEventBroadcasterTest {

  @Inject WebSocketEventBroadcaster eventBroadcaster;

  @Inject WebSocketConnectionManager connectionManager;

  @BeforeEach
  public void setup() {
    assertNotNull(eventBroadcaster);
    assertNotNull(connectionManager);
  }

  @Test
  public void testBroadcastApplicationAdded() {
    // Should not throw an exception even with no connections
    assertDoesNotThrow(() -> eventBroadcaster.broadcastApplicationAdded("test-app"));
  }

  @Test
  public void testBroadcastApplicationRemoved() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastApplicationRemoved("test-app"));
  }

  @Test
  public void testBroadcastApplicationUpdated() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastApplicationUpdated("test-app"));
  }

  @Test
  public void testBroadcastConfigChanged() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastConfigChanged("config-data"));
  }

  @Test
  public void testBroadcastStatusChanged() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastStatusChanged("status-data"));
  }

  @Test
  public void testBroadcastBookmarkAdded() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastBookmarkAdded("bookmark-data"));
  }

  @Test
  public void testBroadcastBookmarkRemoved() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastBookmarkRemoved("bookmark-data"));
  }

  @Test
  public void testBroadcastBookmarkUpdated() {
    assertDoesNotThrow(() -> eventBroadcaster.broadcastBookmarkUpdated("bookmark-data"));
  }
}

package us.ullberg.startpunkt.websocket;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for WebSocketConnectionManager. */
@QuarkusTest
public class WebSocketConnectionManagerTest {

  @Inject WebSocketConnectionManager connectionManager;

  @Inject ObjectMapper objectMapper;

  @BeforeEach
  public void setup() {
    // Connection manager should be injected and ready
    assertNotNull(connectionManager);
  }

  @Test
  public void testInitialConnectionCount() {
    // Initially, there should be no connections
    assertEquals(0, connectionManager.getConnectionCount());
  }

  @Test
  public void testBroadcastWithNoConnections() {
    // Broadcasting with no connections should not throw an exception
    var message = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);
    assertDoesNotThrow(() -> connectionManager.broadcast(message));
  }

  @Test
  public void testObjectMapperInjection() {
    // Object mapper should be injected
    assertNotNull(objectMapper);
  }
}

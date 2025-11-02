package us.ullberg.startpunkt.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnError;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * WebSocket endpoint for real-time updates to clients.
 *
 * <p>This endpoint allows clients to receive real-time notifications about changes in applications,
 * bookmarks, configuration, and status updates without requiring HTTP polling.
 */
@WebSocket(path = "/api/ws/updates")
public class UpdatesWebSocket {

  private final WebSocketConnectionManager connectionManager;
  private final ObjectMapper objectMapper;

  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  boolean websocketEnabled;

  /**
   * Constructor for UpdatesWebSocket.
   *
   * @param connectionManager the connection manager
   * @param objectMapper the object mapper
   */
  public UpdatesWebSocket(WebSocketConnectionManager connectionManager, ObjectMapper objectMapper) {
    this.connectionManager = connectionManager;
    this.objectMapper = objectMapper;
  }

  /**
   * Called when a new client connects.
   *
   * @param connection the WebSocket connection
   */
  @OnOpen
  public void onOpen(WebSocketConnection connection) {
    if (!websocketEnabled) {
      Log.debug("WebSocket support is disabled, closing connection");
      connection.close();
      return;
    }

    Log.infof("WebSocket connection opened: %s", connection.id());
    connectionManager.addConnection(connection);

    // Send initial heartbeat to confirm connection
    try {
      var heartbeat = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);
      connection.sendTextAndAwait(objectMapper.writeValueAsString(heartbeat));
    } catch (JsonProcessingException e) {
      Log.error("Error sending heartbeat message", e);
    }
  }

  /**
   * Called when a client disconnects.
   *
   * @param connection the WebSocket connection
   */
  @OnClose
  public void onClose(WebSocketConnection connection) {
    Log.infof("WebSocket connection closed: %s", connection.id());
    connectionManager.removeConnection(connection);
  }

  /**
   * Called when an error occurs.
   *
   * @param connection the WebSocket connection
   * @param throwable the error
   */
  @OnError
  public void onError(WebSocketConnection connection, Throwable throwable) {
    Log.errorf(throwable, "WebSocket error on connection: %s", connection.id());
    connectionManager.removeConnection(connection);
  }

  /**
   * Called when a text message is received from the client.
   *
   * @param message the message received
   * @param connection the WebSocket connection
   * @return response message (echo for now)
   */
  @OnTextMessage
  public String onMessage(String message, WebSocketConnection connection) {
    Log.debugf("Received message from %s: %s", connection.id(), message);
    // For now, we just echo back. In the future, we could handle client requests here.
    return message;
  }
}

package us.ullberg.startpunkt.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Manages active WebSocket connections and provides broadcasting capabilities.
 *
 * <p>This service tracks all active WebSocket connections and provides methods to broadcast
 * messages to all connected clients. It also handles periodic heartbeat messages to keep
 * connections alive.
 */
@ApplicationScoped
public class WebSocketConnectionManager {

  private final Set<WebSocketConnection> connections = ConcurrentHashMap.newKeySet();
  private final ObjectMapper objectMapper;

  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  boolean websocketEnabled;

  @ConfigProperty(name = "startpunkt.websocket.heartbeatInterval", defaultValue = "30s")
  String heartbeatInterval;

  /**
   * Constructor for WebSocketConnectionManager.
   *
   * @param objectMapper the object mapper
   */
  public WebSocketConnectionManager(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  /**
   * Adds a new connection to the managed set.
   *
   * @param connection the WebSocket connection to add
   */
  public void addConnection(WebSocketConnection connection) {
    connections.add(connection);
    Log.infof("Added connection %s. Total connections: %d", connection.id(), connections.size());
  }

  /**
   * Removes a connection from the managed set.
   *
   * @param connection the WebSocket connection to remove
   */
  public void removeConnection(WebSocketConnection connection) {
    connections.remove(connection);
    Log.infof("Removed connection %s. Total connections: %d", connection.id(), connections.size());
  }

  /**
   * Gets the number of active connections.
   *
   * @return the number of active connections
   */
  public int getConnectionCount() {
    return connections.size();
  }

  /**
   * Broadcasts a message to all connected clients.
   *
   * @param message the message to broadcast
   * @param <T> the type of the message data
   */
  public <T> void broadcast(WebSocketMessage<T> message) {
    if (!websocketEnabled || connections.isEmpty()) {
      Log.warnf(
          "Cannot broadcast - websocketEnabled: %s, connections: %d",
          websocketEnabled, connections.size());
      return;
    }

    String jsonMessage;
    try {
      jsonMessage = objectMapper.writeValueAsString(message);
      Log.infof("Serialized message: %s", jsonMessage);
    } catch (JsonProcessingException e) {
      Log.error("Error serializing WebSocket message", e);
      return;
    }

    Log.infof("Broadcasting message to %d clients: %s", connections.size(), message.getType());

    // Remove closed connections and send to active ones
    connections.removeIf(
        connection -> {
          if (!connection.isOpen()) {
            Log.debugf("Removing closed connection: %s", connection.id());
            return true;
          }

          try {
            Log.infof("Sending to connection %s: %s", connection.id(), jsonMessage);
            // Use non-blocking send with subscribe to handle async result
            connection
                .sendText(jsonMessage)
                .subscribe()
                .with(
                    unused -> Log.infof("Successfully sent to connection %s", connection.id()),
                    failure ->
                        Log.errorf(
                            failure, "Failed to send message to connection %s", connection.id()));
            return false;
          } catch (Exception e) {
            Log.errorf(e, "Error sending message to connection %s", connection.id());
            return true;
          }
        });
  }

  /**
   * Sends periodic heartbeat messages to all connected clients.
   *
   * <p>This is scheduled based on the configured heartbeat interval.
   */
  @Scheduled(every = "{startpunkt.websocket.heartbeatInterval}")
  void sendHeartbeat() {
    if (!websocketEnabled || connections.isEmpty()) {
      return;
    }

    Log.debugf("Sending heartbeat to %d clients", connections.size());
    var heartbeat = new WebSocketMessage<>(WebSocketEventType.HEARTBEAT, null);
    broadcast(heartbeat);
  }
}

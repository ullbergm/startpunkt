package us.ullberg.startpunkt.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.time.Instant;

/**
 * WebSocket message sent to clients for real-time updates.
 *
 * @param <T> The type of data payload in the message
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@RegisterForReflection
public class WebSocketMessage<T> {
  @JsonProperty("type")
  private WebSocketEventType type;
  
  @JsonProperty("timestamp")
  private Instant timestamp;
  
  @JsonProperty("data")
  private T data;

  /** Default constructor for JSON deserialization. */
  public WebSocketMessage() {
    this.timestamp = Instant.now();
  }

  /**
   * Creates a WebSocket message with type and data.
   *
   * @param type the event type
   * @param data the message payload
   */
  public WebSocketMessage(WebSocketEventType type, T data) {
    this.type = type;
    this.data = data;
    this.timestamp = Instant.now();
  }

  /**
   * Gets the event type.
   *
   * @return the event type
   */
  public WebSocketEventType getType() {
    return type;
  }

  /**
   * Sets the event type.
   *
   * @param type the event type
   */
  public void setType(WebSocketEventType type) {
    this.type = type;
  }

  /**
   * Gets the timestamp.
   *
   * @return the timestamp
   */
  public Instant getTimestamp() {
    return timestamp;
  }

  /**
   * Sets the timestamp.
   *
   * @param timestamp the timestamp
   */
  public void setTimestamp(Instant timestamp) {
    this.timestamp = timestamp;
  }

  /**
   * Gets the data payload.
   *
   * @return the data payload
   */
  public T getData() {
    return data;
  }

  /**
   * Sets the data payload.
   *
   * @param data the data payload
   */
  public void setData(T data) {
    this.data = data;
  }
}

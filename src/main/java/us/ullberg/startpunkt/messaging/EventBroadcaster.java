package us.ullberg.startpunkt.messaging;

import io.quarkus.logging.Log;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.websocket.WebSocketEventType;
import us.ullberg.startpunkt.websocket.WebSocketMessage;

/**
 * Service for broadcasting events to connected clients using Mutiny Multi streams.
 *
 * <p>This service provides methods to broadcast various types of events (application changes,
 * configuration updates, etc.) to all connected clients via Server-Sent Events (SSE). It includes
 * debouncing logic to prevent flooding clients with rapid updates.
 */
@ApplicationScoped
public class EventBroadcaster {

  @ConfigProperty(name = "startpunkt.realtime.enabled", defaultValue = "true")
  boolean realtimeEnabled;

  @ConfigProperty(name = "startpunkt.realtime.eventDebounceMs", defaultValue = "500")
  long eventDebounceMs;

  // BroadcastProcessor for broadcasting messages to multiple subscribers
  private BroadcastProcessor<WebSocketMessage<?>> processor;
  private Multi<WebSocketMessage<?>> stream;

  // Track last broadcast time for each event type to implement debouncing
  private final Map<String, Instant> lastBroadcastTimes = new ConcurrentHashMap<>();

  @PostConstruct
  void init() {
    // Create a broadcast processor that can handle multiple subscribers
    processor = BroadcastProcessor.create();
    stream = processor;
  }

  /**
   * Get the Multi stream for subscribing to events.
   *
   * @return the Multi stream of WebSocketMessages
   */
  public Multi<WebSocketMessage<?>> getStream() {
    return stream;
  }

  /**
   * Broadcasts an event to all connected clients with debouncing.
   *
   * @param eventType the type of event
   * @param data the event data
   * @param <T> the type of the event data
   */
  public <T> void broadcastEvent(WebSocketEventType eventType, T data) {
    if (!realtimeEnabled) {
      Log.warnf("Event broadcasting is disabled, not broadcasting event: %s", eventType);
      return;
    }

    // Create a unique key for this event type and data
    String eventKey = eventType.toString();

    // Check if we should debounce this event
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventType);
      return;
    }

    // Update last broadcast time
    lastBroadcastTimes.put(eventKey, Instant.now());

    // Create and broadcast the message
    var message = new WebSocketMessage<>(eventType, data);
    processor.onNext(message);

    Log.infof("Broadcasted event: %s", eventType);
  }

  /**
   * Checks if an event should be debounced based on the last broadcast time.
   *
   * @param eventKey the unique key for the event
   * @return true if the event should be debounced, false otherwise
   */
  private boolean shouldDebounce(String eventKey) {
    Instant lastBroadcast = lastBroadcastTimes.get(eventKey);
    if (lastBroadcast == null) {
      return false;
    }

    Duration timeSinceLastBroadcast = Duration.between(lastBroadcast, Instant.now());
    return timeSinceLastBroadcast.toMillis() < eventDebounceMs;
  }

  /**
   * Broadcasts an application added event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationAdded(Object applicationData) {
    broadcastEvent(WebSocketEventType.APPLICATION_ADDED, applicationData);
  }

  /**
   * Broadcasts an application removed event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationRemoved(Object applicationData) {
    broadcastEvent(WebSocketEventType.APPLICATION_REMOVED, applicationData);
  }

  /**
   * Broadcasts an application updated event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationUpdated(Object applicationData) {
    broadcastEvent(WebSocketEventType.APPLICATION_UPDATED, applicationData);
  }

  /**
   * Broadcasts a configuration changed event.
   *
   * @param configData the configuration data
   */
  public void broadcastConfigChanged(Object configData) {
    broadcastEvent(WebSocketEventType.CONFIG_CHANGED, configData);
  }

  /**
   * Broadcasts a status changed event.
   *
   * @param statusData the status data
   */
  public void broadcastStatusChanged(Object statusData) {
    broadcastEvent(WebSocketEventType.STATUS_CHANGED, statusData);
  }

  /**
   * Broadcasts a bookmark added event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkAdded(Object bookmarkData) {
    broadcastEvent(WebSocketEventType.BOOKMARK_ADDED, bookmarkData);
  }

  /**
   * Broadcasts a bookmark removed event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkRemoved(Object bookmarkData) {
    broadcastEvent(WebSocketEventType.BOOKMARK_REMOVED, bookmarkData);
  }

  /**
   * Broadcasts a bookmark updated event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkUpdated(Object bookmarkData) {
    broadcastEvent(WebSocketEventType.BOOKMARK_UPDATED, bookmarkData);
  }
}

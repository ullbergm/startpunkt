package us.ullberg.startpunkt.messaging;

import io.quarkus.logging.Log;
import io.quarkus.arc.Arc;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.graphql.SubscriptionEventEmitter;
import us.ullberg.startpunkt.graphql.types.ApplicationType;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateEvent;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateType;
import us.ullberg.startpunkt.graphql.types.BookmarkType;
import us.ullberg.startpunkt.graphql.types.BookmarkUpdateEvent;
import us.ullberg.startpunkt.graphql.types.BookmarkUpdateType;
import us.ullberg.startpunkt.objects.ApplicationResponse;
import us.ullberg.startpunkt.objects.BookmarkResponse;
import us.ullberg.startpunkt.websocket.WebSocketConnectionManager;
import us.ullberg.startpunkt.websocket.WebSocketEventType;
import us.ullberg.startpunkt.websocket.WebSocketMessage;

/**
 * Service for broadcasting events to connected clients using WebSocket.
 *
 * <p>This service provides methods to broadcast various types of events (application changes,
 * configuration updates, etc.) to all connected clients via WebSocket. It includes debouncing logic
 * to prevent flooding clients with rapid updates.
 */
@ApplicationScoped
public class EventBroadcaster {

  private final WebSocketConnectionManager connectionManager;

  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  boolean websocketEnabled;

  @ConfigProperty(name = "startpunkt.graphql.subscription.enabled", defaultValue = "true")
  boolean subscriptionEnabled;

  @ConfigProperty(name = "startpunkt.websocket.eventDebounceMs", defaultValue = "500")
  long eventDebounceMs;

  // Track last broadcast time for each event type to implement debouncing
  private final Map<String, Instant> lastBroadcastTimes = new ConcurrentHashMap<>();

  /**
   * Constructor for EventBroadcaster.
   *
   * @param connectionManager the WebSocket connection manager
   */
  public EventBroadcaster(WebSocketConnectionManager connectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Get the subscription event emitter if available using Arc CDI container.
   *
   * @return the subscription event emitter or null if not available
   */
  private SubscriptionEventEmitter getSubscriptionEventEmitter() {
    try {
      return Arc.container().instance(SubscriptionEventEmitter.class).get();
    } catch (Exception e) {
      Log.debug("SubscriptionEventEmitter not available", e);
      return null;
    }
  }

  /**
   * Broadcasts an event to all connected clients with debouncing.
   *
   * @param eventType the type of event
   * @param data the event data
   * @param <T> the type of the event data
   */
  public <T> void broadcastEvent(WebSocketEventType eventType, T data) {
    if (!websocketEnabled) {
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
    connectionManager.broadcast(message);

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

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          ApplicationType appType = convertToApplicationType(applicationData);
          if (appType != null) {
            ApplicationUpdateEvent event =
                new ApplicationUpdateEvent(ApplicationUpdateType.ADDED, appType, Instant.now());
            emitter.emitApplicationUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting application added event to subscriptions", e);
        }
      }
    }
  }

  /**
   * Broadcasts an application removed event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationRemoved(Object applicationData) {
    broadcastEvent(WebSocketEventType.APPLICATION_REMOVED, applicationData);

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          ApplicationType appType = convertToApplicationType(applicationData);
          if (appType != null) {
            ApplicationUpdateEvent event =
                new ApplicationUpdateEvent(ApplicationUpdateType.REMOVED, appType, Instant.now());
            emitter.emitApplicationUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting application removed event to subscriptions", e);
        }
      }
    }
  }

  /**
   * Broadcasts an application updated event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationUpdated(Object applicationData) {
    broadcastEvent(WebSocketEventType.APPLICATION_UPDATED, applicationData);

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          ApplicationType appType = convertToApplicationType(applicationData);
          if (appType != null) {
            ApplicationUpdateEvent event =
                new ApplicationUpdateEvent(ApplicationUpdateType.UPDATED, appType, Instant.now());
            emitter.emitApplicationUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting application updated event to subscriptions", e);
        }
      }
    }
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

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
          if (bookmarkType != null) {
            BookmarkUpdateEvent event =
                new BookmarkUpdateEvent(BookmarkUpdateType.ADDED, bookmarkType, Instant.now());
            emitter.emitBookmarkUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting bookmark added event to subscriptions", e);
        }
      }
    }
  }

  /**
   * Broadcasts a bookmark removed event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkRemoved(Object bookmarkData) {
    broadcastEvent(WebSocketEventType.BOOKMARK_REMOVED, bookmarkData);

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
          if (bookmarkType != null) {
            BookmarkUpdateEvent event =
                new BookmarkUpdateEvent(BookmarkUpdateType.REMOVED, bookmarkType, Instant.now());
            emitter.emitBookmarkUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting bookmark removed event to subscriptions", e);
        }
      }
    }
  }

  /**
   * Broadcasts a bookmark updated event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkUpdated(Object bookmarkData) {
    broadcastEvent(WebSocketEventType.BOOKMARK_UPDATED, bookmarkData);

    // Also emit to GraphQL subscriptions
    if (subscriptionEnabled) {
      SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
      if (emitter != null) {
        try {
          BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
          if (bookmarkType != null) {
            BookmarkUpdateEvent event =
                new BookmarkUpdateEvent(BookmarkUpdateType.UPDATED, bookmarkType, Instant.now());
            emitter.emitBookmarkUpdate(event);
          }
        } catch (Exception e) {
          Log.error("Error emitting bookmark updated event to subscriptions", e);
        }
      }
    }
  }

  /**
   * Converts application data to ApplicationType for GraphQL subscriptions.
   *
   * @param applicationData the application data (Application CRD or Map)
   * @return ApplicationType or null if conversion fails
   */
  private ApplicationType convertToApplicationType(Object applicationData) {
    if (applicationData == null) {
      return null;
    }

    if (applicationData instanceof Application app) {
      // Convert Application CRD to ApplicationResponse then to ApplicationType
      ApplicationResponse response = new ApplicationResponse(app.getSpec());
      response.setNamespace(app.getMetadata().getNamespace());
      response.setResourceName(app.getMetadata().getName());
      return ApplicationType.fromResponse(response);
    } else if (applicationData instanceof Map) {
      // For delete events, we get a Map with namespace and name
      // We can't construct a full ApplicationType, so return null
      // Subscriptions will need to handle REMOVED events differently
      Log.debug("Cannot convert Map to ApplicationType for subscription");
      return null;
    }

    Log.warnf("Unknown application data type for subscription: %s", applicationData.getClass());
    return null;
  }

  /**
   * Converts bookmark data to BookmarkType for GraphQL subscriptions.
   *
   * @param bookmarkData the bookmark data (Bookmark CRD or Map)
   * @return BookmarkType or null if conversion fails
   */
  private BookmarkType convertToBookmarkType(Object bookmarkData) {
    if (bookmarkData == null) {
      return null;
    }

    if (bookmarkData instanceof Bookmark bookmark) {
      // Convert Bookmark CRD to BookmarkResponse then to BookmarkType
      BookmarkResponse response = new BookmarkResponse(bookmark.getSpec());
      response.setNamespace(bookmark.getMetadata().getNamespace());
      response.setResourceName(bookmark.getMetadata().getName());
      return BookmarkType.fromResponse(response);
    } else if (bookmarkData instanceof Map) {
      // For delete events, we get a Map with namespace and name
      // We can't construct a full BookmarkType, so return null
      Log.debug("Cannot convert Map to BookmarkType for subscription");
      return null;
    }

    Log.warnf("Unknown bookmark data type for subscription: %s", bookmarkData.getClass());
    return null;
  }
}

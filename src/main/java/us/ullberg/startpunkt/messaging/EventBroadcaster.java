package us.ullberg.startpunkt.messaging;

import io.quarkus.arc.Arc;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
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

/**
 * Service for broadcasting events to connected clients using GraphQL subscriptions.
 *
 * <p>This service provides methods to broadcast various types of events (application changes,
 * bookmark updates, etc.) to all connected clients via GraphQL subscriptions. It includes
 * debouncing logic to prevent flooding clients with rapid updates.
 */
@ApplicationScoped
public class EventBroadcaster {

  @ConfigProperty(name = "startpunkt.graphql.subscription.enabled", defaultValue = "true")
  boolean subscriptionEnabled;

  @ConfigProperty(name = "startpunkt.websocket.eventDebounceMs", defaultValue = "500")
  long eventDebounceMs;

  // Track last broadcast time for each event type to implement debouncing
  private final Map<String, Instant> lastBroadcastTimes = new ConcurrentHashMap<>();

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
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "APPLICATION_ADDED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        ApplicationType appType = convertToApplicationType(applicationData);
        if (appType != null) {
          ApplicationUpdateEvent event =
              new ApplicationUpdateEvent(ApplicationUpdateType.ADDED, appType, Instant.now());
          emitter.emitApplicationUpdate(event);
          Log.infof("Emitted application added event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting application added event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts an application removed event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationRemoved(Object applicationData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "APPLICATION_REMOVED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        ApplicationType appType = convertToApplicationType(applicationData);
        if (appType != null) {
          ApplicationUpdateEvent event =
              new ApplicationUpdateEvent(ApplicationUpdateType.REMOVED, appType, Instant.now());
          emitter.emitApplicationUpdate(event);
          Log.infof("Emitted application removed event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting application removed event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts an application updated event.
   *
   * @param applicationData the application data
   */
  public void broadcastApplicationUpdated(Object applicationData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "APPLICATION_UPDATED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        ApplicationType appType = convertToApplicationType(applicationData);
        if (appType != null) {
          ApplicationUpdateEvent event =
              new ApplicationUpdateEvent(ApplicationUpdateType.UPDATED, appType, Instant.now());
          emitter.emitApplicationUpdate(event);
          Log.infof("Emitted application updated event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting application updated event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts a configuration changed event.
   *
   * @param configData the configuration data
   */
  public void broadcastConfigChanged(Object configData) {
    Log.info("Config changed event received (no-op for subscriptions)");
    // Config changes don't need subscription events as they require page reload
  }

  /**
   * Broadcasts a status changed event.
   *
   * <p>Status changes affect application availability. We don't have specific application data, so
   * we trigger a general refresh by emitting a synthetic update event. The frontend should refetch
   * all applications when receiving this.
   *
   * @param statusData the status data
   */
  public void broadcastStatusChanged(Object statusData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "STATUS_CHANGED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        // Emit a synthetic application update event with minimal data
        // This signals the frontend to refresh all applications
        ApplicationType placeholderApp = new ApplicationType();
        placeholderApp.name = "_status_check_";
        placeholderApp.namespace = "system";

        ApplicationUpdateEvent event =
            new ApplicationUpdateEvent(
                ApplicationUpdateType.UPDATED, placeholderApp, Instant.now());
        emitter.emitApplicationUpdate(event);
        Log.infof("Emitted status changed event via subscription (triggers application refresh)");
      } catch (Exception e) {
        Log.error("Error emitting status changed event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts a bookmark added event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkAdded(Object bookmarkData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "BOOKMARK_ADDED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
        if (bookmarkType != null) {
          BookmarkUpdateEvent event =
              new BookmarkUpdateEvent(BookmarkUpdateType.ADDED, bookmarkType, Instant.now());
          emitter.emitBookmarkUpdate(event);
          Log.infof("Emitted bookmark added event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting bookmark added event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts a bookmark removed event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkRemoved(Object bookmarkData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "BOOKMARK_REMOVED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
        if (bookmarkType != null) {
          BookmarkUpdateEvent event =
              new BookmarkUpdateEvent(BookmarkUpdateType.REMOVED, bookmarkType, Instant.now());
          emitter.emitBookmarkUpdate(event);
          Log.infof("Emitted bookmark removed event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting bookmark removed event to subscriptions", e);
      }
    }
  }

  /**
   * Broadcasts a bookmark updated event.
   *
   * @param bookmarkData the bookmark data
   */
  public void broadcastBookmarkUpdated(Object bookmarkData) {
    if (!subscriptionEnabled) {
      Log.debug("Subscription broadcasting is disabled");
      return;
    }

    String eventKey = "BOOKMARK_UPDATED";
    if (shouldDebounce(eventKey)) {
      Log.debugf("Debouncing event: %s", eventKey);
      return;
    }

    lastBroadcastTimes.put(eventKey, Instant.now());

    SubscriptionEventEmitter emitter = getSubscriptionEventEmitter();
    if (emitter != null) {
      try {
        BookmarkType bookmarkType = convertToBookmarkType(bookmarkData);
        if (bookmarkType != null) {
          BookmarkUpdateEvent event =
              new BookmarkUpdateEvent(BookmarkUpdateType.UPDATED, bookmarkType, Instant.now());
          emitter.emitBookmarkUpdate(event);
          Log.infof("Emitted bookmark updated event via subscription");
        }
      } catch (Exception e) {
        Log.error("Error emitting bookmark updated event to subscriptions", e);
      }
    }
  }

  /**
   * Converts application data to ApplicationType for GraphQL subscriptions.
   *
   * @param applicationData the application data (Application CRD)
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
    }

    Log.warnf("Unknown application data type for subscription: %s", applicationData.getClass());
    return null;
  }

  /**
   * Converts bookmark data to BookmarkType for GraphQL subscriptions.
   *
   * @param bookmarkData the bookmark data (Bookmark CRD)
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
    }

    Log.warnf("Unknown bookmark data type for subscription: %s", bookmarkData.getClass());
    return null;
  }
}

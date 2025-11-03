package us.ullberg.startpunkt.graphql;

import io.quarkus.logging.Log;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateEvent;
import us.ullberg.startpunkt.graphql.types.BookmarkUpdateEvent;

/**
 * Service for managing GraphQL subscription event streams.
 *
 * <p>This service provides reactive streams for application and bookmark update events that can be
 * subscribed to via GraphQL subscriptions. It uses Mutiny's BroadcastProcessor to fan-out events
 * to multiple subscribers.
 */
@ApplicationScoped
public class SubscriptionEventEmitter {

  // Broadcast processors for different event types
  // Using BroadcastProcessor to allow multiple subscribers to receive the same events
  private final BroadcastProcessor<ApplicationUpdateEvent> applicationEventProcessor =
      BroadcastProcessor.create();

  private final BroadcastProcessor<BookmarkUpdateEvent> bookmarkEventProcessor =
      BroadcastProcessor.create();

  /**
   * Get the reactive stream for application update events.
   *
   * <p>Each subscriber will receive all future application events emitted after subscription.
   *
   * @return Multi stream of application update events
   */
  public Multi<ApplicationUpdateEvent> getApplicationStream() {
    return applicationEventProcessor;
  }

  /**
   * Get the reactive stream for bookmark update events.
   *
   * <p>Each subscriber will receive all future bookmark events emitted after subscription.
   *
   * @return Multi stream of bookmark update events
   */
  public Multi<BookmarkUpdateEvent> getBookmarkStream() {
    return bookmarkEventProcessor;
  }

  /**
   * Emit an application update event to all subscribers.
   *
   * @param event the application update event to emit
   */
  public void emitApplicationUpdate(ApplicationUpdateEvent event) {
    if (event == null) {
      Log.warn("Attempted to emit null application update event");
      return;
    }

    Log.debugf(
        "Emitting application update event: type=%s, app=%s",
        event.getType(), event.getApplication() != null ? event.getApplication().name : "null");

    try {
      applicationEventProcessor.onNext(event);
    } catch (Exception e) {
      Log.error("Error emitting application update event", e);
    }
  }

  /**
   * Emit a bookmark update event to all subscribers.
   *
   * @param event the bookmark update event to emit
   */
  public void emitBookmarkUpdate(BookmarkUpdateEvent event) {
    if (event == null) {
      Log.warn("Attempted to emit null bookmark update event");
      return;
    }

    Log.debugf(
        "Emitting bookmark update event: type=%s, bookmark=%s",
        event.getType(), event.getBookmark() != null ? event.getBookmark().name : "null");

    try {
      bookmarkEventProcessor.onNext(event);
    } catch (Exception e) {
      Log.error("Error emitting bookmark update event", e);
    }
  }
}

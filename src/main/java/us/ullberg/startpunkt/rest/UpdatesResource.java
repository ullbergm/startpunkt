package us.ullberg.startpunkt.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.Cancellable;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.websocket.WebSocketEventType;
import us.ullberg.startpunkt.websocket.WebSocketMessage;

/**
 * REST resource for Server-Sent Events (SSE) updates.
 *
 * <p>Provides a real-time event stream to clients using SSE. Clients can subscribe to this endpoint
 * to receive updates about applications, bookmarks, and system status changes.
 */
@Path("/api/updates")
@Tag(name = "updates")
public class UpdatesResource {

  @ConfigProperty(name = "startpunkt.websocket.enabled", defaultValue = "true")
  boolean messagingEnabled;

  @ConfigProperty(name = "startpunkt.websocket.heartbeatInterval", defaultValue = "30s")
  Duration heartbeatInterval;

  private final EventBroadcaster eventBroadcaster;
  private final ObjectMapper objectMapper;

  public UpdatesResource(EventBroadcaster eventBroadcaster, ObjectMapper objectMapper) {
    this.eventBroadcaster = eventBroadcaster;
    this.objectMapper = objectMapper;
  }

  /**
   * Server-Sent Events endpoint for real-time updates.
   *
   * @param eventSink the SSE event sink
   * @param sse the SSE context
   */
  @GET
  @Path("/stream")
  @Produces(MediaType.SERVER_SENT_EVENTS)
  @Operation(summary = "Subscribe to real-time updates via Server-Sent Events")
  public void stream(@Context SseEventSink eventSink, @Context Sse sse) {
    if (!messagingEnabled) {
      Log.warn("Event streaming is disabled");
      eventSink.close();
      return;
    }

    Log.info("New SSE client connected");

    // Get the stream from the event broadcaster
    Multi<WebSocketMessage<?>> updatesStream = eventBroadcaster.getStream();

    // Merge the updates stream with heartbeat
    Multi<WebSocketMessage<?>> heartbeat =
        Multi.createFrom()
            .ticks()
            .every(heartbeatInterval)
            .map(
                tick ->
                    new WebSocketMessage<>(
                        WebSocketEventType.HEARTBEAT,
                        Map.of("timestamp", System.currentTimeMillis())));

    Multi<WebSocketMessage<?>> combinedStream =
        Multi.createBy().merging().streams(updatesStream, heartbeat);

    // Subscribe to the combined stream and send events to the client
    AtomicReference<Cancellable> subscriptionRef = new AtomicReference<>();

    Runnable closeHandler =
        () -> {
          Log.info("SSE client connection closed, cancelling subscription");
          Cancellable subscription = subscriptionRef.get();
          if (subscription != null) {
            subscription.cancel();
          }
        };

    Cancellable subscription =
        combinedStream
            .subscribe()
            .with(
                message -> {
                  // Check if the event sink is still open before sending
                  if (eventSink.isClosed()) {
                    Log.debug("SSE client disconnected, skipping event");
                    closeHandler.run();
                    return;
                  }

                  try {
                    // Serialize message to JSON
                    String jsonData = objectMapper.writeValueAsString(message);
                    eventSink.send(
                        sse.newEventBuilder()
                            .name(message.getType().toString())
                            .data(jsonData)
                            .mediaType(MediaType.APPLICATION_JSON_TYPE)
                            .build());
                  } catch (IllegalStateException e) {
                    // Event sink is closed, cancel the subscription
                    Log.info("SSE client disconnected");
                    closeHandler.run();
                  } catch (Exception e) {
                    Log.errorf("Error sending SSE event: %s", e.getMessage());
                  }
                },
                error -> {
                  Log.errorf("Error in SSE stream: %s", error.getMessage());
                  if (!eventSink.isClosed()) {
                    eventSink.close();
                  }
                  closeHandler.run();
                },
                () -> {
                  Log.info("SSE stream completed");
                  if (!eventSink.isClosed()) {
                    eventSink.close();
                  }
                  closeHandler.run();
                });

    subscriptionRef.set(subscription);
  }
}

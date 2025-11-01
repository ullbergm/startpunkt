package us.ullberg.startpunkt.rest;

import io.quarkus.logging.Log;
import io.smallrye.mutiny.Multi;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.Duration;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.NoCache;
import org.jboss.resteasy.reactive.RestStreamElementType;
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

  @ConfigProperty(name = "startpunkt.realtime.enabled", defaultValue = "true")
  boolean realtimeEnabled;

  @ConfigProperty(name = "startpunkt.realtime.heartbeatInterval", defaultValue = "30s")
  Duration heartbeatInterval;

  private final EventBroadcaster eventBroadcaster;

  public UpdatesResource(EventBroadcaster eventBroadcaster) {
    this.eventBroadcaster = eventBroadcaster;
  }

  /**
   * Server-Sent Events endpoint for real-time updates.
   *
   * <p>This endpoint provides a stream of events to clients for real-time updates. The stream
   * includes both application/bookmark changes and periodic heartbeats to keep the connection alive
   * through proxies and load balancers.
   *
   * <p>The @NoCache annotation prevents proxies from buffering SSE responses, which is critical for
   * real-time delivery in production environments behind reverse proxies or load balancers.
   *
   * @return a Multi stream of SSE events as WebSocketMessage objects
   */
  @GET
  @Path("/stream")
  @Produces(MediaType.SERVER_SENT_EVENTS)
  @RestStreamElementType(MediaType.APPLICATION_JSON)
  @NoCache
  @Operation(summary = "Subscribe to real-time updates via Server-Sent Events")
  public Multi<WebSocketMessage<?>> stream() {
    if (!realtimeEnabled) {
      Log.warn("Event streaming is disabled");
      return Multi.createFrom().empty();
    }

    Log.info("New SSE client connected");

    // Get the stream from the event broadcaster
    Multi<WebSocketMessage<?>> updatesStream = eventBroadcaster.getStream();

    // Create heartbeat stream
    Multi<WebSocketMessage<?>> heartbeat =
        Multi.createFrom()
            .ticks()
            .every(heartbeatInterval)
            .map(
                tick ->
                    new WebSocketMessage<>(
                        WebSocketEventType.HEARTBEAT,
                        Map.of("timestamp", System.currentTimeMillis())));

    // Merge the updates stream with heartbeat
    Multi<WebSocketMessage<?>> combinedStream =
        Multi.createBy().merging().streams(updatesStream, heartbeat);

    // Return the stream of objects directly - Quarkus will handle JSON serialization
    return combinedStream
        .onFailure()
        .invoke(error -> Log.errorf(error, "Error in SSE stream"))
        .onCancellation()
        .invoke(() -> Log.info("SSE client disconnected"))
        .onCompletion()
        .invoke(() -> Log.info("SSE stream completed"));
  }
}

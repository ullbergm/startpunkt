package us.ullberg.startpunkt.rest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
  private final ObjectMapper objectMapper;

  public UpdatesResource(EventBroadcaster eventBroadcaster, ObjectMapper objectMapper) {
    this.eventBroadcaster = eventBroadcaster;
    this.objectMapper = objectMapper;
  }

  /**
   * Server-Sent Events endpoint for real-time updates.
   *
   * @return a Multi stream of SSE events as JSON strings
   */
  @GET
  @Path("/stream")
  @Produces(MediaType.SERVER_SENT_EVENTS)
  @RestStreamElementType(MediaType.APPLICATION_JSON)
  @Operation(summary = "Subscribe to real-time updates via Server-Sent Events")
  public Multi<String> stream() {
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

    // Convert messages to JSON strings
    return combinedStream
        .onItem()
        .transform(
            message -> {
              try {
                return objectMapper.writeValueAsString(message);
              } catch (JsonProcessingException e) {
                Log.errorf(e, "Error serializing SSE message: %s", message);
                return "{\"type\":\"ERROR\",\"data\":{\"message\":\"Serialization error\"}}";
              }
            })
        .onFailure()
        .invoke(error -> Log.errorf(error, "Error in SSE stream"))
        .onCancellation()
        .invoke(() -> Log.info("SSE client disconnected"))
        .onCompletion()
        .invoke(() -> Log.info("SSE stream completed"));
  }
}

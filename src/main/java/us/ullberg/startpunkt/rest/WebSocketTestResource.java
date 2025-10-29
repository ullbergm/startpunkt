package us.ullberg.startpunkt.rest;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Map;
import us.ullberg.startpunkt.service.AvailabilityCheckService;
import us.ullberg.startpunkt.websocket.WebSocketEventBroadcaster;

/**
 * REST API resource for testing WebSocket functionality.
 * This resource provides endpoints to manually trigger WebSocket broadcasts.
 */
@Path("/api/test/websocket")
public class WebSocketTestResource {

  private final WebSocketEventBroadcaster eventBroadcaster;
  private final AvailabilityCheckService availabilityCheckService;

  public WebSocketTestResource(
      WebSocketEventBroadcaster eventBroadcaster,
      AvailabilityCheckService availabilityCheckService) {
    this.eventBroadcaster = eventBroadcaster;
    this.availabilityCheckService = availabilityCheckService;
  }

  /**
   * Manually trigger a STATUS_CHANGED broadcast for testing.
   *
   * @return confirmation message
   */
  @GET
  @Path("/trigger")
  @Produces(MediaType.APPLICATION_JSON)
  @NonBlocking
  public Map<String, Object> triggerStatusChange() {
    Log.info("Manually triggering STATUS_CHANGED broadcast");
    
    // Invalidate caches first to ensure fresh data
    availabilityCheckService.invalidateApplicationCaches();
    
    eventBroadcaster.broadcastStatusChanged(
        Map.of(
            "timestamp", System.currentTimeMillis(),
            "reason", "manual_test_trigger"
        )
    );
    
    return Map.of(
        "success", true,
        "message", "STATUS_CHANGED event broadcast triggered",
        "timestamp", System.currentTimeMillis()
    );
  }
}

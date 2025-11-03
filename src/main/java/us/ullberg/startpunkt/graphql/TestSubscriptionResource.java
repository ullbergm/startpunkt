package us.ullberg.startpunkt.graphql;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import us.ullberg.startpunkt.graphql.types.ApplicationType;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateEvent;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateType;
import us.ullberg.startpunkt.graphql.types.BookmarkType;
import us.ullberg.startpunkt.graphql.types.BookmarkUpdateEvent;
import us.ullberg.startpunkt.graphql.types.BookmarkUpdateType;

/**
 * Test endpoint for manually triggering GraphQL subscription events. This is a temporary endpoint
 * for testing subscriptions without Kubernetes watchers.
 *
 * <p>DELETE THIS FILE once Kubernetes watchers are implemented!
 */
@Path("/api/test/subscriptions")
@ApplicationScoped
public class TestSubscriptionResource {

  private final SubscriptionEventEmitter subscriptionEventEmitter;

  public TestSubscriptionResource(SubscriptionEventEmitter subscriptionEventEmitter) {
    this.subscriptionEventEmitter = subscriptionEventEmitter;
  }

  /**
   * Test endpoint to trigger an application update event.
   *
   * @return Response indicating the event was sent
   */
  @GET
  @Path("/trigger-application-update")
  @Produces(MediaType.APPLICATION_JSON)
  public Response triggerApplicationUpdate() {
    Log.info("Manually triggering application update event for testing");

    // Create a test application
    ApplicationType testApp = new ApplicationType();
    testApp.name = "Test Application " + System.currentTimeMillis();
    testApp.namespace = "default";
    testApp.group = "Test Group";
    testApp.url = "https://test.example.com";
    testApp.icon = "mdi:test-tube";
    testApp.iconColor = "#FF5733";
    testApp.available = true;
    testApp.tags = "admin,test,demo"; // Include 'admin' tag to match subscription filter
    testApp.info = "This is a test application event";
    testApp.targetBlank = true;
    testApp.location = 100;
    testApp.enabled = true;
    testApp.rootPath = "/";
    testApp.resourceName = "test-app";
    testApp.hasOwnerReferences = false;

    // Create and emit the event
    ApplicationUpdateEvent event =
        new ApplicationUpdateEvent(ApplicationUpdateType.UPDATED, testApp, Instant.now());

    subscriptionEventEmitter.emitApplicationUpdate(event);

    Log.info("Application update event emitted successfully");

    return Response.ok()
        .entity("{\"status\": \"success\", \"message\": \"Application update event triggered\"}")
        .build();
  }

  /**
   * Test endpoint to trigger a bookmark update event.
   *
   * @return Response indicating the event was sent
   */
  @GET
  @Path("/trigger-bookmark-update")
  @Produces(MediaType.APPLICATION_JSON)
  public Response triggerBookmarkUpdate() {
    Log.info("Manually triggering bookmark update event for testing");

    // Create a test bookmark
    BookmarkType testBookmark = new BookmarkType();
    testBookmark.name = "Test Bookmark " + System.currentTimeMillis();
    testBookmark.namespace = "default";
    testBookmark.group = "Test Group";
    testBookmark.url = "https://bookmark.example.com";
    testBookmark.icon = "mdi:bookmark";
    testBookmark.info = "This is a test bookmark event";
    testBookmark.targetBlank = true;
    testBookmark.location = 200;
    testBookmark.resourceName = "test-bookmark";
    testBookmark.hasOwnerReferences = false;

    // Create and emit the event
    BookmarkUpdateEvent event =
        new BookmarkUpdateEvent(BookmarkUpdateType.UPDATED, testBookmark, Instant.now());

    subscriptionEventEmitter.emitBookmarkUpdate(event);

    Log.info("Bookmark update event emitted successfully");

    return Response.ok()
        .entity("{\"status\": \"success\", \"message\": \"Bookmark update event triggered\"}")
        .build();
  }
}

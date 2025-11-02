package us.ullberg.startpunkt.rest;

import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheInvalidate;
import io.quarkus.cache.CacheManager;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.BookmarkGroup;
import us.ullberg.startpunkt.objects.BookmarkGroupList;
import us.ullberg.startpunkt.objects.BookmarkResponse;
import us.ullberg.startpunkt.service.BookmarkManagementService;
import us.ullberg.startpunkt.service.BookmarkService;

/**
 * REST API resource class for managing bookmarks. Supports retrieving bookmarks grouped by their
 * group names, including optional integration with Hajimari bookmarks.
 */
@Path("/api/bookmarks")
@Tag(name = "bookmarks")
@Produces(MediaType.APPLICATION_JSON)
public class BookmarkResource {
  // Inject the BookmarkService to manage bookmark-related operations
  private final BookmarkService bookmarkService;

  // Inject the BookmarkManagementService for CRUD operations
  private final BookmarkManagementService bookmarkManagementService;

  // Inject the event broadcaster for WebSocket notifications
  private final EventBroadcaster eventBroadcaster;

  // Inject the cache manager for manual cache invalidation
  private final CacheManager cacheManager;

  // Configuration property to enable or disable Hajimari bookmarks
  @ConfigProperty(name = "startpunkt.hajimari.enabled")
  private boolean hajimariEnabled = true;

  /**
   * Constructs the BookmarkResource with the given services.
   *
   * @param bookmarkService service to manage bookmark operations
   * @param bookmarkManagementService service for CRUD operations on bookmarks
   * @param eventBroadcaster the event broadcaster for WebSocket notifications
   * @param cacheManager the cache manager for manual cache invalidation
   */
  public BookmarkResource(
      BookmarkService bookmarkService,
      BookmarkManagementService bookmarkManagementService,
      EventBroadcaster eventBroadcaster,
      CacheManager cacheManager) {
    this.bookmarkService = bookmarkService;
    this.bookmarkManagementService = bookmarkManagementService;
    this.eventBroadcaster = eventBroadcaster;
    this.cacheManager = cacheManager;
  }

  /**
   * Retrieves bookmarks from BookmarkService and optionally from Hajimari, sorts them
   * alphabetically.
   *
   * @return sorted list of BookmarkResponse objects
   */
  private ArrayList<BookmarkResponse> retrieveBookmarks() {
    var bookmarks = new ArrayList<BookmarkResponse>();
    bookmarks.addAll(bookmarkService.retrieveBookmarks());

    if (hajimariEnabled) {
      bookmarks.addAll(bookmarkService.retrieveHajimariBookmarks());
    }

    Collections.sort(bookmarks);
    return bookmarks;
  }

  /**
   * REST GET endpoint to retrieve all bookmarks grouped by their group names.
   *
   * @return HTTP 200 with grouped bookmarks or HTTP 404 if none found
   */
  @GET
  @Operation(summary = "Returns all bookmarks")
  @APIResponse(
      responseCode = "200",
      description = "Gets all bookmarks",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = BookmarkGroup.class, type = SchemaType.ARRAY)))
  @APIResponse(responseCode = "404", description = "No bookmarks found")
  @Timed(value = "startpunkt.api.getbookmarks", description = "Get the list of bookmarks")
  @CacheResult(cacheName = "getBookmarks")
  public Response getBookmarks() {
    // Retrieve the list of bookmarks
    List<BookmarkResponse> bookmarklist = retrieveBookmarks();

    // Create a list to store bookmark groups
    List<BookmarkGroup> groups = bookmarkService.generateBookmarkGroups(bookmarklist);

    if (groups.isEmpty()) {
      return Response.status(404, "No bookmarks found").build();
    }

    // Return the list of bookmark groups
    return Response.ok(new BookmarkGroupList(groups)).build();
  }

  /**
   * POST endpoint to create a new Bookmark custom resource.
   *
   * @param namespace namespace to create the bookmark in
   * @param name name for the bookmark resource
   * @param spec bookmark specification
   * @return HTTP 201 with created bookmark or 400/500 on error
   */
  @POST
  @Path("/manage")
  @Consumes(MediaType.APPLICATION_JSON)
  @Operation(summary = "Create a new bookmark")
  @APIResponse(
      responseCode = "201",
      description = "Bookmark created",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Bookmark.class)))
  @APIResponse(responseCode = "400", description = "Invalid input")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.createbookmark", description = "Create a bookmark")
  @CacheInvalidate(cacheName = "getBookmarks")
  public Response createBookmark(
      @QueryParam("namespace") String namespace,
      @QueryParam("name") String name,
      BookmarkSpec spec) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }
      if (spec == null) {
        return Response.status(400, "Bookmark spec is required").build();
      }

      Bookmark created = bookmarkManagementService.createBookmark(namespace, name, spec);

      // Manually invalidate cache synchronously before broadcasting
      Cache cache = cacheManager.getCache("getBookmarks").orElse(null);
      if (cache != null) {
        cache.invalidateAll().await().indefinitely();
      }

      // Broadcast event to connected clients after cache is invalidated
      eventBroadcaster.broadcastBookmarkAdded(created);

      return Response.status(201).entity(created).build();
    } catch (Exception e) {
      Log.error("Error creating bookmark", e);
      return Response.status(500, "Error creating bookmark: " + e.getMessage()).build();
    }
  }

  /**
   * PUT endpoint to update an existing Bookmark custom resource.
   *
   * @param namespace namespace of the bookmark
   * @param name name of the bookmark resource
   * @param spec updated bookmark specification
   * @return HTTP 200 with updated bookmark or 400/404/500 on error
   */
  @PUT
  @Path("/manage")
  @Consumes(MediaType.APPLICATION_JSON)
  @Operation(summary = "Update an existing bookmark")
  @APIResponse(
      responseCode = "200",
      description = "Bookmark updated",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Bookmark.class)))
  @APIResponse(responseCode = "400", description = "Invalid input")
  @APIResponse(responseCode = "404", description = "Bookmark not found")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.updatebookmark", description = "Update a bookmark")
  @CacheInvalidate(cacheName = "getBookmarks")
  public Response updateBookmark(
      @QueryParam("namespace") String namespace,
      @QueryParam("name") String name,
      BookmarkSpec spec) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }
      if (spec == null) {
        return Response.status(400, "Bookmark spec is required").build();
      }

      Bookmark updated = bookmarkManagementService.updateBookmark(namespace, name, spec);

      // Manually invalidate cache synchronously before broadcasting
      Cache cache = cacheManager.getCache("getBookmarks").orElse(null);
      if (cache != null) {
        cache.invalidateAll().await().indefinitely();
      }

      // Broadcast event to connected clients after cache is invalidated
      eventBroadcaster.broadcastBookmarkUpdated(updated);

      return Response.ok(updated).build();
    } catch (IllegalArgumentException e) {
      return Response.status(404, e.getMessage()).build();
    } catch (Exception e) {
      Log.error("Error updating bookmark", e);
      return Response.status(500, "Error updating bookmark: " + e.getMessage()).build();
    }
  }

  /**
   * DELETE endpoint to delete a Bookmark custom resource.
   *
   * @param namespace namespace of the bookmark
   * @param name name of the bookmark resource
   * @return HTTP 204 if deleted, 404 if not found, 500 on error
   */
  @DELETE
  @Path("/manage")
  @Operation(summary = "Delete a bookmark")
  @APIResponse(responseCode = "204", description = "Bookmark deleted")
  @APIResponse(responseCode = "404", description = "Bookmark not found")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.deletebookmark", description = "Delete a bookmark")
  @CacheInvalidate(cacheName = "getBookmarks")
  public Response deleteBookmark(
      @QueryParam("namespace") String namespace, @QueryParam("name") String name) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }

      boolean deleted = bookmarkManagementService.deleteBookmark(namespace, name);
      if (deleted) {
        // Manually invalidate cache synchronously before broadcasting
        Cache cache = cacheManager.getCache("getBookmarks").orElse(null);
        if (cache != null) {
          cache.invalidateAll().await().indefinitely();
        }

        // Broadcast event to connected clients after cache is invalidated
        var deletedData = new java.util.HashMap<String, String>();
        deletedData.put("namespace", namespace);
        deletedData.put("name", name);
        eventBroadcaster.broadcastBookmarkRemoved(deletedData);

        return Response.status(204).build();
      } else {
        return Response.status(404, "Bookmark not found").build();
      }
    } catch (Exception e) {
      Log.error("Error deleting bookmark", e);
      return Response.status(500, "Error deleting bookmark: " + e.getMessage()).build();
    }
  }

  /**
   * GET endpoint to retrieve a single Bookmark custom resource with ownership info.
   *
   * @param namespace namespace of the bookmark
   * @param name name of the bookmark resource
   * @return HTTP 200 with bookmark and ownership info or 404 if not found
   */
  @GET
  @Path("/manage")
  @Operation(summary = "Get a bookmark resource with ownership info")
  @APIResponse(
      responseCode = "200",
      description = "Bookmark retrieved",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Bookmark.class)))
  @APIResponse(responseCode = "404", description = "Bookmark not found")
  @Timed(value = "startpunkt.api.getbookmarkresource", description = "Get bookmark resource")
  public Response getBookmarkResource(
      @QueryParam("namespace") String namespace, @QueryParam("name") String name) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }

      Bookmark bookmark = bookmarkManagementService.getBookmark(namespace, name);
      if (bookmark == null) {
        return Response.status(404, "Bookmark not found").build();
      }

      return Response.ok(bookmark).build();
    } catch (Exception e) {
      Log.error("Error getting bookmark", e);
      return Response.status(500, "Error getting bookmark: " + e.getMessage()).build();
    }
  }

  /**
   * Ping endpoint for health checking this resource.
   *
   * @return a simple string confirming the resource is alive
   */
  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping")
  @APIResponse(responseCode = "200", description = "Ping")
  @NonBlocking
  public String ping() {
    Log.debug("Ping Bookmark Resource");
    return "Pong from Bookmark Resource";
  }
}

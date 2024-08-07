package us.ullberg.startpunkt.rest;

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

import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import us.ullberg.startpunkt.crd.BookmarkSpec;
import us.ullberg.startpunkt.objects.BookmarkGroup;
import us.ullberg.startpunkt.objects.BookmarkGroupList;
import us.ullberg.startpunkt.service.BookmarkService;

// REST API resource class for managing bookmarks
@Path("/api/bookmarks")
@Tag(name = "bookmarks")
@Produces(MediaType.APPLICATION_JSON)
public class BookmarkResource {
  // Inject the BookmarkService to manage bookmark-related operations
  BookmarkService bookmarkService;

  // Configuration property to enable or disable Hajimari bookmarks
  @ConfigProperty(name = "startpunkt.hajimari.enabled")
  private boolean hajimariEnabled = true;

  // Constructor
  public BookmarkResource(BookmarkService bookmarkService) {
    this.bookmarkService = bookmarkService;
  }

  // Method to retrieve the list of bookmarks
  private ArrayList<BookmarkSpec> retrieveBookmarks() {
    // Create a list to store bookmarks
    var bookmarks = new ArrayList<BookmarkSpec>();

    // Add bookmarks retrieved from the BookmarkService
    bookmarks.addAll(bookmarkService.retrieveBookmarks());

    // If Hajimari bookmarks are enabled, add them to the list
    if (hajimariEnabled)
      bookmarks.addAll(bookmarkService.retrieveHajimariBookmarks());

    // Sort the list of bookmarks
    Collections.sort(bookmarks);

    // Return the sorted list of bookmarks
    return bookmarks;
  }

  // GET endpoint to retrieve the list of bookmarks
  @GET
  @Operation(summary = "Returns all bookmarks")
  @APIResponse(responseCode = "200", description = "Gets all bookmarks",
      content = @Content(mediaType = MediaType.APPLICATION_JSON,
          schema = @Schema(implementation = BookmarkGroup.class, type = SchemaType.ARRAY)))
  @APIResponse(responseCode = "404", description = "No bookmarks found")
  @Timed(value = "startpunkt.api.getbookmarks", description = "Get the list of bookmarks")
  @CacheResult(cacheName = "getBookmarks")
  public Response getBookmarks() {
    // Retrieve the list of bookmarks
    List<BookmarkSpec> bookmarklist = retrieveBookmarks();

    // Create a list to store bookmark groups
    List<BookmarkGroup> groups = bookmarkService.generateBookmarkGroups(bookmarklist);

    if (groups.isEmpty()) {
      return Response.status(404, "No bookmarks found").build();
    }

    // Return the list of bookmark groups
    return Response.ok(new BookmarkGroupList(groups)).build();
  }

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

package us.ullberg.startpunkt;

import java.util.ArrayList;
import java.util.Collections;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import us.ullberg.startpunkt.crd.BookmarkSpec;

// REST API resource class for managing bookmarks
@Path("/api/bookmarks")
@Produces(MediaType.APPLICATION_JSON)
public class BookmarkResource {

  // Inject the BookmarkService to manage bookmark-related operations
  @Inject
  BookmarkService bookmarkService;

  // Inject the MeterRegistry for metrics
  @Inject
  MeterRegistry registry;

  // Configuration property to enable or disable Hajimari bookmarks
  @ConfigProperty(name = "startpunkt.hajimari.enabled")
  private boolean hajimariEnabled = true;

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
  @Timed(value = "startpunkt.api.getbookmarks", description = "Get the list of bookmarks")
  @CacheResult(cacheName = "getBookmarks")
  public Response getBookmarks() {
    // Retrieve the list of bookmarks
    ArrayList<BookmarkSpec> bookmarklist = retrieveBookmarks();

    // Create a list to store bookmark groups
    ArrayList<BookmarkGroup> groups = new ArrayList<>();

    // Group the bookmarks by their group property
    for (BookmarkSpec bookmark : bookmarklist) {
      // Find the existing group
      BookmarkGroup group = null;
      for (BookmarkGroup g : groups) {
        if (g.getName().equals(bookmark.getGroup())) {
          group = g;
          break;
        }
      }

      // If the group doesn't exist, create a new one
      if (group == null) {
        group = new BookmarkGroup(bookmark.getGroup());
        groups.add(group);
      }

      // Add the bookmark to the group
      group.addBookmark(bookmark);
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

package us.ullberg.startpunkt;

import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.cache.CacheResult;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Collections;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.BookmarkSpec;

@Path("/api/bookmarks")
@Produces(MediaType.APPLICATION_JSON)
public class BookmarkResource {
  @Inject BookmarkService BookmarkService;

  @Inject MeterRegistry registry;

  @ConfigProperty(name = "startpunkt.hajimari.enabled")
  private boolean hajimariEnabled = true;

  private ArrayList<BookmarkSpec> retrieveBookmarks() {
    // Create a list of bookmarks
    var bookmarks = new ArrayList<BookmarkSpec>();

    // If startpunkt.hajimari is set to true, get the Hajimari bookmarks
    if (hajimariEnabled) bookmarks.addAll(BookmarkService.retrieveHajimariBookmarks());

    // Sort the list
    Collections.sort(bookmarks);

    // Return the list
    return bookmarks;
  }

  @GET
  @Timed(value = "startpunkt.api.getbookmarks", description = "Get the list of bookmarks")
  @CacheResult(cacheName = "getBookmarks")
  public Response getBookmarks() {
    // Retrieve the list of bookmarks
    ArrayList<BookmarkSpec> bookmarklist = retrieveBookmarks();

    // Create a list of groups
    ArrayList<BookmarkGroup> groups = new ArrayList<>();

    // Group the bookmarks by group
    for (BookmarkSpec a : bookmarklist) {
      // Find the group
      BookmarkGroup group = null;
      for (BookmarkGroup g : groups) {
        if (g.getName().equals(a.getGroup())) {
          group = g;
          break;
        }
      }

      // If the group doesn't exist, create it
      if (group == null) {
        group = new BookmarkGroup(a.getGroup());
        groups.add(group);
      }

      // Add the bookmark to the group
      group.addBookmark(a);
    }

    // Return the list
    return Response.ok(groups).build();
  }
}

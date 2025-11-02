package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.objects.BookmarkGroup;
import us.ullberg.startpunkt.objects.BookmarkResponse;
import us.ullberg.startpunkt.service.BookmarkService;

/**
 * GraphQL API resource for bookmarks. Provides queries for retrieving bookmarks
 * grouped by their group property.
 */
@GraphQLApi
@ApplicationScoped
public class BookmarkGraphQLResource {

  final BookmarkService bookmarkService;

  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  boolean hajimariEnabled;

  /**
   * Constructor with injected dependencies.
   *
   * @param bookmarkService the bookmark service
   */
  public BookmarkGraphQLResource(BookmarkService bookmarkService) {
    this.bookmarkService = bookmarkService;
  }

  /**
   * Retrieve bookmark groups.
   *
   * @return list of bookmark groups
   */
  @Query("bookmarkGroups")
  @Description("Retrieve all bookmark groups")
  @Timed(value = "graphql.query.bookmarkGroups")
  public List<BookmarkGroup> getBookmarkGroups() {
    Log.debug("GraphQL query: bookmarkGroups");
    
    List<BookmarkResponse> bookmarks = retrieveBookmarks();
    return bookmarkService.generateBookmarkGroups(bookmarks);
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
}

package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheManager;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.Name;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;
import us.ullberg.startpunkt.graphql.input.CreateBookmarkInput;
import us.ullberg.startpunkt.graphql.input.UpdateBookmarkInput;
import us.ullberg.startpunkt.graphql.types.BookmarkGroupType;
import us.ullberg.startpunkt.graphql.types.BookmarkType;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.BookmarkGroup;
import us.ullberg.startpunkt.objects.BookmarkResponse;
import us.ullberg.startpunkt.service.BookmarkManagementService;
import us.ullberg.startpunkt.service.BookmarkService;

/**
 * GraphQL API resource for bookmarks. Provides queries for retrieving bookmarks grouped by their
 * group property.
 */
@GraphQLApi
@ApplicationScoped
public class BookmarkGraphQLResource {

  final BookmarkService bookmarkService;
  final BookmarkManagementService bookmarkManagementService;
  final EventBroadcaster eventBroadcaster;
  final CacheManager cacheManager;

  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  boolean hajimariEnabled;

  /**
   * Constructor with injected dependencies.
   *
   * @param bookmarkService the bookmark service
   * @param bookmarkManagementService the bookmark management service for CRUD operations
   * @param eventBroadcaster the event broadcaster for WebSocket notifications
   * @param cacheManager the cache manager for manual cache invalidation
   */
  public BookmarkGraphQLResource(
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
   * Retrieve bookmark groups.
   *
   * @return list of bookmark groups
   */
  @Query("bookmarkGroups")
  @Description("Retrieve all bookmark groups")
  @Timed(value = "graphql.query.bookmarkGroups")
  public List<BookmarkGroupType> getBookmarkGroups() {
    Log.debug("GraphQL query: bookmarkGroups");

    List<BookmarkResponse> bookmarks = retrieveBookmarks();
    List<BookmarkGroup> groups = bookmarkService.generateBookmarkGroups(bookmarks);

    // Convert to GraphQL types (no CRD exposure)
    return groups.stream().map(BookmarkGroupType::fromBookmarkGroup).collect(Collectors.toList());
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
   * Create a new bookmark.
   *
   * @param input the bookmark creation input
   * @return the created bookmark
   */
  @Mutation("createBookmark")
  @Description("Create a new bookmark")
  @Timed(value = "graphql.mutation.createBookmark")
  public BookmarkType createBookmark(@NonNull @Name("input") CreateBookmarkInput input) {
    Log.debugf(
        "GraphQL mutation: createBookmark in namespace=%s, name=%s", input.namespace, input.name);

    // Create BookmarkSpec from input
    BookmarkSpec spec =
        new BookmarkSpec(
            input.bookmarkName,
            input.group,
            input.icon,
            input.url,
            input.info,
            input.targetBlank,
            input.location != null ? input.location : 1000);

    // Create bookmark via management service
    Bookmark created = bookmarkManagementService.createBookmark(input.namespace, input.name, spec);

    // Invalidate cache
    invalidateBookmarkCache();

    // Broadcast event
    eventBroadcaster.broadcastBookmarkAdded(created);

    // Convert to GraphQL type
    BookmarkResponse response = new BookmarkResponse(spec);
    response.setNamespace(input.namespace);
    response.setResourceName(input.name);
    return BookmarkType.fromResponse(response);
  }

  /**
   * Update an existing bookmark.
   *
   * @param input the bookmark update input
   * @return the updated bookmark
   */
  @Mutation("updateBookmark")
  @Description("Update an existing bookmark")
  @Timed(value = "graphql.mutation.updateBookmark")
  public BookmarkType updateBookmark(@NonNull @Name("input") UpdateBookmarkInput input) {
    Log.debugf(
        "GraphQL mutation: updateBookmark in namespace=%s, name=%s", input.namespace, input.name);

    // Create BookmarkSpec from input
    BookmarkSpec spec =
        new BookmarkSpec(
            input.bookmarkName,
            input.group,
            input.icon,
            input.url,
            input.info,
            input.targetBlank,
            input.location != null ? input.location : 1000);

    // Update bookmark via management service
    Bookmark updated = bookmarkManagementService.updateBookmark(input.namespace, input.name, spec);

    // Invalidate cache
    invalidateBookmarkCache();

    // Broadcast event
    eventBroadcaster.broadcastBookmarkUpdated(updated);

    // Convert to GraphQL type
    BookmarkResponse response = new BookmarkResponse(spec);
    response.setNamespace(input.namespace);
    response.setResourceName(input.name);
    return BookmarkType.fromResponse(response);
  }

  /**
   * Delete a bookmark.
   *
   * @param namespace the namespace of the bookmark
   * @param name the name of the bookmark resource
   * @return true if deleted successfully
   */
  @Mutation("deleteBookmark")
  @Description("Delete a bookmark")
  @Timed(value = "graphql.mutation.deleteBookmark")
  public Boolean deleteBookmark(
      @NonNull @Name("namespace") String namespace, @NonNull @Name("name") String name) {
    Log.debugf("GraphQL mutation: deleteBookmark in namespace=%s, name=%s", namespace, name);

    // Delete bookmark via management service
    boolean deleted = bookmarkManagementService.deleteBookmark(namespace, name);

    if (deleted) {
      // Invalidate cache
      invalidateBookmarkCache();

      // Broadcast event
      var deletedData = new java.util.HashMap<String, String>();
      deletedData.put("namespace", namespace);
      deletedData.put("name", name);
      eventBroadcaster.broadcastBookmarkRemoved(deletedData);
    }

    return deleted;
  }

  /** Invalidates the bookmarks cache. */
  private void invalidateBookmarkCache() {
    Cache cache = cacheManager.getCache("getBookmarks").orElse(null);
    if (cache != null) {
      cache.invalidateAll().await().indefinitely();
    }
  }
}

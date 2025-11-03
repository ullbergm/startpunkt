package us.ullberg.startpunkt.graphql.types;

/**
 * Enum representing the type of bookmark update event.
 *
 * <p>Used in GraphQL subscriptions to indicate whether a bookmark was added, updated, or removed.
 */
public enum BookmarkUpdateType {
  /** Bookmark was added to the system. */
  ADDED,

  /** Bookmark was updated in the system. */
  UPDATED,

  /** Bookmark was removed from the system. */
  REMOVED
}

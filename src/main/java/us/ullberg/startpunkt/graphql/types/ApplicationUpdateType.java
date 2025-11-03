package us.ullberg.startpunkt.graphql.types;

/**
 * Enum representing the type of application update event.
 *
 * <p>Used in GraphQL subscriptions to indicate whether an application was added, updated, or
 * removed.
 */
public enum ApplicationUpdateType {
  /** Application was added to the system. */
  ADDED,

  /** Application was updated in the system. */
  UPDATED,

  /** Application was removed from the system. */
  REMOVED
}

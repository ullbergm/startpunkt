/**
 * GraphQL Subscription Definitions
 * 
 * These subscriptions provide real-time updates for applications and bookmarks.
 */

/**
 * Subscribe to all application updates with optional filtering.
 * 
 * @param {string|null} namespace - Optional namespace filter
 * @param {string[]|null} tags - Optional tags to filter applications
 */
export const APPLICATION_UPDATES_SUBSCRIPTION = `
  subscription OnApplicationUpdate($namespace: String, $tags: [String!]) {
    applicationUpdates(namespace: $namespace, tags: $tags) {
      type
      timestamp
      application {
        name
        namespace
        group
        url
        icon
        iconColor
        available
        tags
        info
        targetBlank
        location
        enabled
        rootPath
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

/**
 * Subscribe to new applications being added.
 */
export const APPLICATION_ADDED_SUBSCRIPTION = `
  subscription OnApplicationAdded {
    applicationAdded {
      name
      namespace
      group
      url
      icon
      iconColor
      available
      tags
      info
      targetBlank
      location
      enabled
      rootPath
      resourceName
      hasOwnerReferences
    }
  }
`;

/**
 * Subscribe to applications being updated.
 */
export const APPLICATION_UPDATED_SUBSCRIPTION = `
  subscription OnApplicationUpdated {
    applicationUpdated {
      name
      namespace
      group
      url
      icon
      iconColor
      available
      tags
      info
      targetBlank
      location
      enabled
      rootPath
      resourceName
      hasOwnerReferences
    }
  }
`;

/**
 * Subscribe to applications being removed.
 */
export const APPLICATION_REMOVED_SUBSCRIPTION = `
  subscription OnApplicationRemoved {
    applicationRemoved {
      name
      namespace
      group
      url
      icon
      iconColor
      available
      tags
      info
      targetBlank
      location
      enabled
      rootPath
      resourceName
      hasOwnerReferences
    }
  }
`;

/**
 * Subscribe to all bookmark updates.
 */
export const BOOKMARK_UPDATES_SUBSCRIPTION = `
  subscription OnBookmarkUpdate {
    bookmarkUpdates {
      type
      timestamp
      bookmark {
        name
        namespace
        group
        url
        icon
        info
        targetBlank
        location
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

/**
 * Subscribe to new bookmarks being added.
 */
export const BOOKMARK_ADDED_SUBSCRIPTION = `
  subscription OnBookmarkAdded {
    bookmarkAdded {
      name
      namespace
      group
      url
      icon
      info
      targetBlank
      location
      resourceName
      hasOwnerReferences
    }
  }
`;

/**
 * Subscribe to bookmarks being updated.
 */
export const BOOKMARK_UPDATED_SUBSCRIPTION = `
  subscription OnBookmarkUpdated {
    bookmarkUpdated {
      name
      namespace
      group
      url
      icon
      info
      targetBlank
      location
      resourceName
      hasOwnerReferences
    }
  }
`;

/**
 * Subscribe to bookmarks being removed.
 */
export const BOOKMARK_REMOVED_SUBSCRIPTION = `
  subscription OnBookmarkRemoved {
    bookmarkRemoved {
      name
      namespace
      group
      url
      icon
      info
      targetBlank
      location
      resourceName
      hasOwnerReferences
    }
  }
`;

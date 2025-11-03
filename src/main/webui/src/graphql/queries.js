// GraphQL Queries

export const CONFIG_QUERY = `
  query {
    config {
      version
      web {
        title
        showGithubLink
        checkForUpdates
        refreshInterval
      }
      websocket {
        enabled
      }
    }
  }
`;

export const THEME_QUERY = `
  query {
    theme {
      light {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
      dark {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
    }
  }
`;

export const TRANSLATIONS_QUERY = `
  query GetTranslations($language: String!) {
    translations(language: $language)
  }
`;

export const APPLICATION_GROUPS_QUERY = `
  query GetApplicationGroups($tags: [String!]) {
    applicationGroups(tags: $tags) {
      name
      applications {
        name
        url
        group
        icon
        iconColor
        info
        targetBlank
        location
        enabled
        rootPath
        tags
        available
        namespace
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

export const BOOKMARK_GROUPS_QUERY = `
  query {
    bookmarkGroups {
      name
      bookmarks {
        name
        url
        group
        icon
        info
        targetBlank
        location
        namespace
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

// Combined initialization query - fetches multiple resources in one request
export const INIT_QUERY = `
  query InitApp($language: String!, $tags: [String!]) {
    config {
      version
      web {
        title
        showGithubLink
        checkForUpdates
        refreshInterval
      }
      websocket {
        enabled
      }
    }
    theme {
      light {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
      dark {
        bodyBgColor
        bodyColor
        emphasisColor
        textPrimaryColor
        textAccentColor
      }
    }
    translations(language: $language)
    applicationGroups(tags: $tags) {
      name
      applications {
        name
        url
        group
        icon
        iconColor
        info
        targetBlank
        location
        enabled
        rootPath
        tags
        available
        namespace
        resourceName
        hasOwnerReferences
      }
    }
    bookmarkGroups {
      name
      bookmarks {
        name
        url
        group
        icon
        info
        targetBlank
        location
        namespace
        resourceName
        hasOwnerReferences
      }
    }
  }
`;

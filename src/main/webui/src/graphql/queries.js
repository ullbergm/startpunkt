import { gql } from '@apollo/client';

// GraphQL Queries
// Following best practices: named queries, explicit operation types, minimal field selection

// Fragment for common theme palette fields to avoid duplication
const THEME_PALETTE_FIELDS = `
  bodyBgColor
  bodyColor
  emphasisColor
  textPrimaryColor
  textAccentColor
`;

export const CONFIG_QUERY = gql`
  query GetConfig {
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

export const THEME_QUERY = gql`
  query GetTheme {
    theme {
      light {
        ${THEME_PALETTE_FIELDS}
      }
      dark {
        ${THEME_PALETTE_FIELDS}
      }
    }
  }
`;

export const TRANSLATIONS_QUERY = gql`
  query GetTranslations($language: String!) {
    translations(language: $language)
  }
`;
// Note: translations query returns a JSON string, not an object.
// The client must parse it: JSON.parse(result.data.translations)

export const BING_IMAGE_QUERY = gql`
  query GetBingImageOfDay($width: Int!, $height: Int!) {
    bingImageOfDay(width: $width, height: $height) {
      imageUrl
      copyright
      title
      date
    }
  }
`;

export const APPLICATION_GROUPS_QUERY = gql`
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

export const BOOKMARK_GROUPS_QUERY = gql`
  query GetBookmarkGroups {
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

// Combined initialization query - fetches all required data in one request
// This reduces the number of round trips from 5 to 1, improving initial page load performance
export const INIT_QUERY = gql`
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
        ${THEME_PALETTE_FIELDS}
      }
      dark {
        ${THEME_PALETTE_FIELDS}
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

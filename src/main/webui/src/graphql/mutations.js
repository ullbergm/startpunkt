import { gql } from '@apollo/client';

// GraphQL Mutations

export const CREATE_APPLICATION_MUTATION = gql`
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) {
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
`;

export const UPDATE_APPLICATION_MUTATION = gql`
  mutation UpdateApplication($input: UpdateApplicationInput!) {
    updateApplication(input: $input) {
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
`;

export const DELETE_APPLICATION_MUTATION = gql`
  mutation DeleteApplication($namespace: String!, $name: String!) {
    deleteApplication(namespace: $namespace, name: $name)
  }
`;

export const CREATE_BOOKMARK_MUTATION = gql`
  mutation CreateBookmark($input: CreateBookmarkInput!) {
    createBookmark(input: $input) {
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
`;

export const UPDATE_BOOKMARK_MUTATION = gql`
  mutation UpdateBookmark($input: UpdateBookmarkInput!) {
    updateBookmark(input: $input) {
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
`;

export const DELETE_BOOKMARK_MUTATION = gql`
  mutation DeleteBookmark($namespace: String!, $name: String!) {
    deleteBookmark(namespace: $namespace, name: $name)
  }
`;

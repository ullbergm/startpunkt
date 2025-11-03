import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient as createWSClient } from 'graphql-ws';

// Create HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: '/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Create WebSocket link for subscriptions
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/graphql`;

console.log('[GraphQL] Creating WebSocket client for subscriptions:', wsUrl);

const wsClient = createWSClient({
  url: wsUrl,
  connectionParams: () => ({
    // Add authentication headers if needed
  }),
  retryAttempts: Infinity,
  shouldRetry: () => true,
  keepAlive: 30000, // 30 seconds
  on: {
    connected: () => console.log('[GraphQL] WebSocket connected'),
    closed: () => console.log('[GraphQL] WebSocket closed'),
    error: (error) => console.error('[GraphQL] WebSocket error:', error),
  },
});

const wsLink = new GraphQLWsLink(wsClient);

// Split link: use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

// Create Apollo Client
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    // Cache type policies for better normalization
    typePolicies: {
      Query: {
        fields: {
          // For array fields like applicationGroups and bookmarkGroups,
          // we want to replace the entire array on refetch (not merge items)
          // This prevents cache warnings when the array length changes
          applicationGroups: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          bookmarkGroups: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  // Default fetch policy: cache-first for queries, network-only for subscriptions
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});

// Clean up WebSocket connection when page unloads
window.addEventListener('beforeunload', () => {
  wsClient.dispose();
});


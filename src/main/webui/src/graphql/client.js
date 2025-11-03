import { createClient, cacheExchange, fetchExchange } from 'urql';

export const client = createClient({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
  // Use cache-and-network to get fresh data while showing cached data first
  requestPolicy: 'cache-and-network',
  // Force standard GraphQL POST request format
  fetchOptions: () => ({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  }),
  // Disable automatic persisted queries if enabled
  preferGetMethod: false,
});

import { createClient, cacheExchange, fetchExchange } from 'urql';

export const client = createClient({
  url: '/graphql',
  exchanges: [
    // cacheExchange provides normalized caching for better performance
    cacheExchange,
    fetchExchange
  ],
  // Request policy configuration:
  // - 'cache-first': Use cached data if available, only fetch if missing (best for static data)
  // - 'cache-and-network': Return cached data immediately, then fetch fresh data (best for dynamic data)
  // - 'network-only': Always fetch from network, ignore cache (best for real-time data)
  // Using 'cache-first' as default since most data is relatively stable and we have WebSocket for updates
  requestPolicy: 'cache-first',
  // Force standard GraphQL POST request format
  fetchOptions: () => ({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  }),
  // Disable automatic persisted queries
  preferGetMethod: false,
});


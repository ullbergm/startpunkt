import { createClient, cacheExchange, fetchExchange, subscriptionExchange } from 'urql';
import { createClient as createWSClient } from 'graphql-ws';

// Create WebSocket client for subscriptions
// Use wss:// for HTTPS connections, ws:// for HTTP
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/graphql`;

console.log('[GraphQL] Creating WebSocket client for subscriptions:', wsUrl);

const wsClient = createWSClient({
  url: wsUrl,
  // Connection parameters
  connectionParams: () => ({
    // Add authentication headers if needed
  }),
  // Retry configuration
  retryAttempts: Infinity,
  shouldRetry: () => true,
  // Keep alive configuration
  keepAlive: 30000, // 30 seconds
  // Logging
  on: {
    connected: () => console.log('[GraphQL] WebSocket connected'),
    closed: () => console.log('[GraphQL] WebSocket closed'),
    error: (error) => console.error('[GraphQL] WebSocket error:', error),
  },
});

export const client = createClient({
  url: '/graphql',
  exchanges: [
    // cacheExchange provides normalized caching for better performance
    cacheExchange,
    // subscriptionExchange must come before fetchExchange
    subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query || '' };
        return {
          subscribe(sink) {
            const unsubscribe = wsClient.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }),
    fetchExchange
  ],
  // Request policy configuration:
  // - 'cache-first': Use cached data if available, only fetch if missing (best for static data)
  // - 'cache-and-network': Return cached data immediately, then fetch fresh data (best for dynamic data)
  // - 'network-only': Always fetch from network, ignore cache (best for real-time data)
  // Using 'cache-first' as default since most data is relatively stable and we have subscriptions for updates
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

// Clean up WebSocket connection when page unloads
window.addEventListener('beforeunload', () => {
  wsClient.dispose();
});


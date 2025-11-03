import { createClient, fetchExchange } from 'urql';

export const client = createClient({
  url: '/graphql',
  exchanges: [fetchExchange],
  // Use cache-and-network to get fresh data while showing cached data first
  requestPolicy: 'cache-and-network'
});

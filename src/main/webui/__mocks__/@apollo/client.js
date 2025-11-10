// Mock Apollo Client for Jest tests
export const ApolloProvider = ({ children }) => children;

export const gql = (strings, ...values) => {
  // If called as a regular function (not a template literal), just return the input
  if (typeof strings === 'string') {
    return strings;
  }
  // If called as a template literal, join the strings and values
  if (Array.isArray(strings) && strings.raw) {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  }
  // Fallback
  return strings;
};

export const ApolloClient = class {
  constructor() {
    this.query = () => Promise.resolve({ data: null });
    this.mutate = () => Promise.resolve({ data: null });
    this.subscribe = () => ({
      subscribe: (callbacks) => ({
        unsubscribe: () => {},
      }),
    });
  }
};

export const InMemoryCache = class {};
export const HttpLink = class {};
export const split = () => {};
export const GraphQLWsLink = class {};

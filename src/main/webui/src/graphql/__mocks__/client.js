// Mock Apollo Client for Jest tests
export const client = {
  query: jest.fn().mockResolvedValue({ data: {} }),
  mutate: jest.fn().mockResolvedValue({ data: {} }),
  subscribe: jest.fn(() => ({
    subscribe: jest.fn(() => ({
      unsubscribe: jest.fn(),
    })),
  })),
  clearStore: jest.fn().mockResolvedValue(undefined),
  resetStore: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest', // transform mjs files with babel-jest too
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'mjs'],
  moduleNameMapper: {
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    '^react/jsx-runtime$': 'preact/jsx-runtime',
    // Mock all static file imports (images, fonts)
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock styles (scss, css)
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    // Don't ignore these modules from transformation
    'node_modules/(?!(preact|@testing-library/preact|@apollo)/)',
  ],
};

import { render, screen, fireEvent, waitFor, within } from '@testing-library/preact';

// ---- MOCKS ----
// Mock the GraphQL client to avoid actual GraphQL calls - MUST be before importing App
jest.mock('./graphql/client', () => ({
  client: {
    query: jest.fn(),
    mutate: jest.fn(),
  },
  setOnPingCallback: jest.fn(),
}));

// Now import App AFTER setting up the mock
import { App } from './app';
import { client } from './graphql/client';

// Mock the useSubscription hook directly to avoid client mocking issues
jest.mock('./graphql/useSubscription', () => ({
  useSubscription: () => ({
    data: null,
    error: null,
    loading: false,
    isSubscribed: false,
  }),
}));
jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: () => ['auto', jest.fn()],
  writeStorage: jest.fn(),
}));
jest.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));
jest.mock('@version-checker/browser', () => jest.fn(() => Promise.resolve({ update: null })));
jest.mock('./SpotlightSearch', () => () => <div data-testid="spotlight" />);
jest.mock('./useWebSocket', () => ({
  useWebSocket: () => ({ isConnected: false }),
}));
jest.mock('./useLayoutPreferences', () => ({
  useLayoutPreferences: jest.fn(() => ({
    preferences: {
      columns: 4,
      gap: 16,
      cardMinWidth: 200,
      cardMaxWidth: 300,
      iconSize: 64,
      fontSize: 14,
      borderRadius: 8,
      shadowIntensity: 0.1
    },
    updatePreference: jest.fn(),
    savePreset: jest.fn(),
    loadPreset: jest.fn(),
    deletePreset: jest.fn(),
    resetToDefaults: jest.fn(),
    getCSSVariables: jest.fn(() => ({})),
    getGridTemplateColumns: jest.fn(() => 'repeat(4, 1fr)')
  })),
}));
jest.mock('./useBackgroundPreferences', () => ({
  useBackgroundPreferences: jest.fn(() => ({
    preferences: {
      type: 'theme',
      color: '#F8F6F1',
      opacity: 1.0,
      blur: false,
      imageUrl: '',
      geopatternSeed: 'startpunkt'
    },
    updatePreference: jest.fn(),
    resetToDefaults: jest.fn(),
    getBackgroundStyle: jest.fn(() => ({}))
  })),
}));
jest.mock('./ApplicationGroupList', () => ({
  ApplicationGroupList: ({ groups }) => (
    <div data-testid="app-groups">{groups?.length}</div>
  ),
}));
jest.mock('./BookmarkGroupList', () => ({
  BookmarkGroupList: ({ groups }) => (
    <div data-testid="bookmark-groups">{groups?.length}</div>
  ),
}));
jest.mock('./ForkMe', () => ({
  ForkMe: ({ color, link }) => (
    <div data-testid="forkme" data-color={color} data-link={link} />
  ),
}));

// ---- TEST SETUP ----
beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup default GraphQL mock responses using the manual mock
  client.query.mockImplementation(({ query, variables }) => {
    // Apollo Client queries are DocumentNode objects with loc.source.body containing the query string
    const queryString = query.loc?.source.body || query.toString();
    
    // Check for the combined INIT_QUERY first (used on app initialization)
    if (queryString.includes('InitApp(') || (queryString.includes('config {') && queryString.includes('theme {') && queryString.includes('translations(language:'))) {
      return Promise.resolve({
        data: {
          config: {
            web: { showGithubLink: true, title: 'Startpunkt', checkForUpdates: false, refreshInterval: 0 },
            websocket: { enabled: false },
            version: '1.0.0',
          },
          theme: {
            light: {
              bodyBgColor: '#f8f9fa',
              bodyColor: '#696969',
              emphasisColor: '#000',
              textPrimaryColor: '#4C432E',
              textAccentColor: '#AA9A73'
            },
            dark: {
              bodyBgColor: '#232530',
              bodyColor: '#696969',
              emphasisColor: '#FAB795',
              textPrimaryColor: '#FAB795',
              textAccentColor: '#E95678'
            }
          },
          translations: { 
            "home.theme.toggle": "Toggle theme",
            "home.applications": "Applications",
            "home.bookmarks": "Bookmarks",
            "home.loading": "Loading...",
            "home.checkingForItems": "Checking for configured applications and bookmarks...",
            "home.noItemsHelp": "If none are found, you can add them to get started.",
            "home.noItemsAvailable": "No Items Available",
            "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
            "home.skipToContent": "Skip to main content",
            "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
          },
          applicationGroups: variables?.tags ? [
            { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] },
            { name: 'G2', applications: [{ name: 'App2', url: 'http://app2.com' }] }
          ] : [
            { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] },
            { name: 'G2', applications: [{ name: 'App2', url: 'http://app2.com' }] }
          ],
          bookmarkGroups: [
            { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
          ],
        },
      });
    }
    
    // Individual queries (used for refreshes)
    if (queryString.includes('config {') && !queryString.includes('theme {')) {
      return Promise.resolve({
        data: {
          config: {
            web: { showGithubLink: true, title: 'Startpunkt', checkForUpdates: false, refreshInterval: 0 },
            websocket: { enabled: false },
            version: '1.0.0',
          },
        },
      });
    }
    
    if (queryString.includes('translations(language:') && !queryString.includes('config {')) {
      return Promise.resolve({
        data: {
          translations: { 
            "home.theme.toggle": "Toggle theme",
            "home.applications": "Applications",
            "home.bookmarks": "Bookmarks",
            "home.loading": "Loading...",
            "home.checkingForItems": "Checking for configured applications and bookmarks...",
            "home.noItemsHelp": "If none are found, you can add them to get started.",
            "home.noItemsAvailable": "No Items Available",
            "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
            "home.skipToContent": "Skip to main content",
            "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
          },
        },
      });
    }
    
    if (queryString.includes('theme {') && !queryString.includes('config {')) {
      return Promise.resolve({
        data: {
          theme: {
            light: {
              bodyBgColor: '#f8f9fa',
              bodyColor: '#696969',
              emphasisColor: '#000',
              textPrimaryColor: '#4C432E',
              textAccentColor: '#AA9A73'
            },
            dark: {
              bodyBgColor: '#232530',
              bodyColor: '#696969',
              emphasisColor: '#FAB795',
              textPrimaryColor: '#FAB795',
              textAccentColor: '#E95678'
            }
          },
        },
      });
    }
    
    if (queryString.includes('applicationGroups(tags:') || queryString.includes('GetApplicationGroups(')) {
      return Promise.resolve({
        data: {
          applicationGroups: [
            { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] },
            { name: 'G2', applications: [{ name: 'App2', url: 'http://app2.com' }] }
          ],
        },
      });
    }
    
    if (queryString.includes('bookmarkGroups {') || queryString.includes('GetBookmarkGroups')) {
      return Promise.resolve({
        data: {
          bookmarkGroups: [
            { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
          ],
        },
      });
    }
    
    return Promise.resolve({ data: {} });
  });
});

// ---- TESTS ----
describe('App', () => {
  it('renders header, footer, and nav links', async () => {
    render(<App />);
    const allStartpunkt = await screen.findAllByText(/startpunkt/i);
    expect(allStartpunkt.length).toBeGreaterThan(1);
    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByTestId('app-groups')).toBeInTheDocument();
    });
    // Find nav links specifically
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toHaveTextContent(/applications/i);
    expect(nav).toHaveTextContent(/bookmarks/i);
    expect(screen.getByText(/Magnus Ullberg/i)).toBeInTheDocument();
  });

  it('renders ForkMe if showGitHubLink true', async () => {
    render(<App />);
    expect(await screen.findByTestId('forkme')).toBeInTheDocument();
    expect(screen.getByTestId('forkme')).toHaveAttribute('data-color', 'white');
  });

  it('shows ApplicationGroupList or BookmarkGroupList based on currentPage', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('app-groups')).toHaveTextContent('2');
    });
    // Click on the navigation link
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const bookmarksLink = within(nav).getAllByText(/bookmarks/i)[0];
    fireEvent.click(bookmarksLink);
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-groups')).toHaveTextContent('1');
    });
    const applicationsLink = within(nav).getAllByText(/applications/i)[0];
    fireEvent.click(applicationsLink);
    await waitFor(() => {
      expect(screen.getByTestId('app-groups')).toHaveTextContent('2');
    });
  });

  it('checks for updates and sets ForkMe color to orange if update available', async () => {
    // Override GraphQL mock for this test
    client.query.mockImplementation(({ query, variables }) => {
      const queryString = typeof query === 'string' ? query : (query.loc?.source.body || query.toString());
      
      if (queryString.includes('config {')) {
        return Promise.resolve({
          data: {
            config: {
              web: { showGithubLink: true, title: 'Test', checkForUpdates: true, refreshInterval: 0 },
              websocket: { enabled: false },
              version: '1.2.3',
            },
          },
        });
      }
      
      if (queryString.includes('translations(language:')) {
        return Promise.resolve({
          data: {
            translations: { "home.theme.toggle": "Toggle theme" },
          },
        });
      }
      
      if (queryString.includes('theme {')) {
        return Promise.resolve({
          data: {
            theme: {
              light: {
                bodyBgColor: '#f8f9fa',
                bodyColor: '#696969',
                emphasisColor: '#000',
                textPrimaryColor: '#4C432E',
                textAccentColor: '#AA9A73'
              },
              dark: {
                bodyBgColor: '#232530',
                bodyColor: '#696969',
                emphasisColor: '#FAB795',
                textPrimaryColor: '#FAB795',
                textAccentColor: '#E95678'
              }
            },
          },
        });
      }
      
      if (queryString.includes('applicationGroups(tags:')) {
        return Promise.resolve({
          data: {
            applicationGroups: [
              { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] }
            ],
          },
        });
      }
      
      if (queryString.includes('bookmarkGroups {')) {
        return Promise.resolve({
          data: {
            bookmarkGroups: [
              { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
            ],
          },
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    // Mock update available
    const versionCheck = require('@version-checker/browser');
    versionCheck.mockImplementation(() =>
      Promise.resolve({ update: { name: 'v1.3.0' } })
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('forkme')).toHaveAttribute('data-color', 'orange');
    });
  });

  it('renders SpotlightSearch', async () => {
    render(<App />);
    expect(await screen.findByTestId('spotlight')).toBeInTheDocument();
  });

  it('hides applications link when no applications exist', async () => {
    // Mock empty applications but with bookmarks - must return INIT_QUERY format
    client.query.mockImplementation(({ query, variables }) => {
      const queryString = typeof query === 'string' ? query : (query.loc?.source.body || query.toString());
      
      //Handle INIT_QUERY
      if (queryString.includes('InitApp(') || (queryString.includes('config {') && queryString.includes('theme {') && queryString.includes('translations(language:'))) {
        return Promise.resolve({
          data: {
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false, refreshInterval: 0 },
              websocket: { enabled: false },
              version: '1.0.0',
            },
            theme: {
              light: {
                bodyBgColor: '#f8f9fa',
                bodyColor: '#696969',
                emphasisColor: '#000',
                textPrimaryColor: '#4C432E',
                textAccentColor: '#AA9A73'
              },
              dark: {
                bodyBgColor: '#232530',
                bodyColor: '#696969',
                emphasisColor: '#FAB795',
                textPrimaryColor: '#FAB795',
                textAccentColor: '#E95678'
              }
            },
            translations: { 
              "home.theme.toggle": "Toggle theme",
              "home.applications": "Applications",
              "home.bookmarks": "Bookmarks",
              "home.loading": "Loading...",
              "home.checkingForItems": "Checking for configured applications and bookmarks...",
              "home.noItemsHelp": "If none are found, you can add them to get started.",
              "home.noItemsAvailable": "No Items Available",
              "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
              "home.skipToContent": "Skip to main content",
              "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
            },
            applicationGroups: [{ name: 'G1', applications: [] }],
            bookmarkGroups: [
              { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
            ],
          },
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<App />);
    await waitFor(() => {
      // Check that Applications link is not present in navigation
      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navLinks = nav.querySelectorAll('a');
      const navTexts = Array.from(navLinks).map(link => link.textContent);
      expect(navTexts).not.toContain('Applications');
      expect(navTexts).toContain('Bookmarks');
    });
  });

  it('hides bookmarks link when no bookmarks exist', async () => {
    // Mock empty bookmarks but with applications - must return INIT_QUERY format
    client.query.mockImplementation(({ query, variables }) => {
      const queryString = typeof query === 'string' ? query : (query.loc?.source.body || query.toString());
      
      // Handle INIT_QUERY
      if (queryString.includes('InitApp(') || (queryString.includes('config {') && queryString.includes('theme {') && queryString.includes('translations(language:'))) {
        return Promise.resolve({
          data: {
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false, refreshInterval: 0 },
              websocket: { enabled: false },
              version: '1.0.0',
            },
            theme: {
              light: {
                bodyBgColor: '#f8f9fa',
                bodyColor: '#696969',
                emphasisColor: '#000',
                textPrimaryColor: '#4C432E',
                textAccentColor: '#AA9A73'
              },
              dark: {
                bodyBgColor: '#232530',
                bodyColor: '#696969',
                emphasisColor: '#FAB795',
                textPrimaryColor: '#FAB795',
                textAccentColor: '#E95678'
              }
            },
            translations: { 
              "home.theme.toggle": "Toggle theme",
              "home.applications": "Applications",
              "home.bookmarks": "Bookmarks",
              "home.loading": "Loading...",
              "home.checkingForItems": "Checking for configured applications and bookmarks...",
              "home.noItemsHelp": "If none are found, you can add them to get started.",
              "home.noItemsAvailable": "No Items Available",
              "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
              "home.skipToContent": "Skip to main content",
              "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
            },
            applicationGroups: [
              { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] }
            ],
            bookmarkGroups: [{ name: 'B1', bookmarks: [] }],
          },
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<App />);
    await waitFor(() => {
      // Check that Bookmarks link is not present in navigation
      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navLinks = nav.querySelectorAll('a');
      const navTexts = Array.from(navLinks).map(link => link.textContent);
      expect(navTexts).toContain('Applications');
      expect(navTexts).not.toContain('Bookmarks');
    });
  });

  it('shows improved loading message indicating items may not be configured', async () => {
    // Mock empty responses to test empty state - must return INIT_QUERY format
    client.query.mockImplementation(({ query, variables }) => {
      const queryString = typeof query === 'string' ? query : (query.loc?.source.body || query.toString());
      
      // Handle INIT_QUERY with empty data
      if (queryString.includes('InitApp(') || (queryString.includes('config {') && queryString.includes('theme {') && queryString.includes('translations(language:'))) {
        return Promise.resolve({
          data: {
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false, refreshInterval: 0 },
              websocket: { enabled: false },
              version: '1.0.0',
            },
            theme: {
              light: {
                bodyBgColor: '#f8f9fa',
                bodyColor: '#696969',
                emphasisColor: '#000',
                textPrimaryColor: '#4C432E',
                textAccentColor: '#AA9A73'
              },
              dark: {
                bodyBgColor: '#232530',
                bodyColor: '#696969',
                emphasisColor: '#FAB795',
                textPrimaryColor: '#FAB795',
                textAccentColor: '#E95678'
              }
            },
            translations: { 
              "home.theme.toggle": "Toggle theme",
              "home.loading": "Loading...",
              "home.checkingForItems": "Checking for configured applications and bookmarks...",
              "home.noItemsHelp": "If none are found, you can add them to get started.",
              "home.noItemsAvailable": "No Items Available",
              "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
              "home.skipToContent": "Skip to main content",
              "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
            },
            applicationGroups: [],
            bookmarkGroups: [],
          },
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<App />);
    
    // Wait for data to load and show empty state (no loading state shown since INIT_QUERY resolves immediately)
    await waitFor(() => {
      expect(screen.getByText(/No Items Available/i)).toBeInTheDocument();
    });
  });

  it('shows empty state message when no items exist', async () => {
    // Mock empty applications and bookmarks - must return INIT_QUERY format
    client.query.mockImplementation(({ query, variables }) => {
      const queryString = typeof query === 'string' ? query : (query.loc?.source.body || query.toString());
      
      // Handle INIT_QUERY with empty data
      if (queryString.includes('InitApp(') || (queryString.includes('config {') && queryString.includes('theme {') && queryString.includes('translations(language:'))) {
        return Promise.resolve({
          data: {
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false, refreshInterval: 0 },
              websocket: { enabled: false },
              version: '1.0.0',
            },
            theme: {
              light: {
                bodyBgColor: '#f8f9fa',
                bodyColor: '#696969',
                emphasisColor: '#000',
                textPrimaryColor: '#4C432E',
                textAccentColor: '#AA9A73'
              },
              dark: {
                bodyBgColor: '#232530',
                bodyColor: '#696969',
                emphasisColor: '#FAB795',
                textPrimaryColor: '#FAB795',
                textAccentColor: '#E95678'
              }
            },
            translations: { 
              "home.theme.toggle": "Toggle theme",
              "home.noItemsAvailable": "No Items Available",
              "home.noItemsConfigured": "There are currently no applications or bookmarks configured.",
              "home.skipToContent": "Skip to main content",
              "home.pleaseAddItems": "Please add some applications or bookmarks to get started."
            },
            applicationGroups: [{ name: 'G1', applications: [] }],
            bookmarkGroups: [{ name: 'B1', bookmarks: [] }],
          },
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/No Items Available/i)).toBeInTheDocument();
      expect(screen.getByText(/There are currently no applications or bookmarks configured/i)).toBeInTheDocument();
      // Navigation should not be rendered when no items exist
      const nav = screen.queryByRole('navigation', { name: /main navigation/i });
      expect(nav).not.toBeInTheDocument();
    });
  });

});

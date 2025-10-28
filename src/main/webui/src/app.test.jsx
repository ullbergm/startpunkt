import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { App } from './app';

// ---- MOCKS ----
jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: () => ['auto', jest.fn()],
  writeStorage: jest.fn(),
}));
jest.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));
jest.mock('@version-checker/browser', () => jest.fn(() => Promise.resolve({ update: null })));
jest.mock('./SpotlightSearch', () => () => <div data-testid="spotlight" />);
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
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/config')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          config: {
            web: { showGithubLink: true, title: 'Startpunkt', checkForUpdates: false, rootPath: '/' },
            version: '1.0.0',
          },
          version: '1.0.0',
        }),
      });
    }
    if (url.includes('/api/i8n')) {
      return Promise.resolve({
        json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
      });
    }
    if (url.includes('/api/apps')) {
      return Promise.resolve({
        json: () => Promise.resolve({ 
          groups: [
            { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] }, 
            { name: 'G2', applications: [{ name: 'App2', url: 'http://app2.com' }] }
          ] 
        }),
      });
    }
    if (url.includes('/api/bookmarks')) {
      return Promise.resolve({
        json: () => Promise.resolve({ 
          groups: [
            { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
          ] 
        }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

// ---- TESTS ----
describe('App', () => {
  it('renders header, footer, and nav links', async () => {
    render(<App />);
    const allStartpunkt = await screen.findAllByText(/startpunkt/i);
    expect(allStartpunkt.length).toBeGreaterThan(1);
    expect(screen.getByText(/applications/i)).toBeInTheDocument();
    expect(screen.getByText(/bookmarks/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByText(/bookmarks/i));
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-groups')).toHaveTextContent('1');
    });
    fireEvent.click(screen.getByText(/applications/i));
    await waitFor(() => {
      expect(screen.getByTestId('app-groups')).toHaveTextContent('2');
    });
  });

  it('checks for updates and sets ForkMe color to orange if update available', async () => {
    // Override fetch for this test
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/config')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            config: {
              web: { showGithubLink: true, title: 'Test', checkForUpdates: true },
              version: '1.2.3',
            },
            version: '1.2.3',
          }),
        });
      }
      if (url.includes('/api/i8n')) {
        return Promise.resolve({
          json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
        });
      }
      if (url.includes('/api/apps')) {
        return Promise.resolve({
          json: () => Promise.resolve({ 
            groups: [
              { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] }
            ] 
          }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ 
            groups: [
              { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
            ] 
          }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
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
    // Mock empty applications but with bookmarks
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/config')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false },
              version: '1.0.0',
            },
            version: '1.0.0',
          }),
        });
      }
      if (url.includes('/api/i8n')) {
        return Promise.resolve({
          json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
        });
      }
      if (url.includes('/api/apps')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [{ name: 'G1', applications: [] }] }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ 
            groups: [
              { name: 'B1', bookmarks: [{ name: 'Bookmark1', url: 'http://bookmark1.com' }] }
            ] 
          }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<App />);
    await waitFor(() => {
      // Check that Applications link is not present in navigation
      const navLinks = screen.queryByRole('navigation').querySelectorAll('a');
      const navTexts = Array.from(navLinks).map(link => link.textContent);
      expect(navTexts).not.toContain('Applications');
      expect(navTexts).toContain('Bookmarks');
    });
  });

  it('hides bookmarks link when no bookmarks exist', async () => {
    // Mock empty bookmarks but with applications
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/config')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false },
              version: '1.0.0',
            },
            version: '1.0.0',
          }),
        });
      }
      if (url.includes('/api/i8n')) {
        return Promise.resolve({
          json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
        });
      }
      if (url.includes('/api/apps')) {
        return Promise.resolve({
          json: () => Promise.resolve({ 
            groups: [
              { name: 'G1', applications: [{ name: 'App1', url: 'http://app1.com' }] }
            ] 
          }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [{ name: 'B1', bookmarks: [] }] }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<App />);
    await waitFor(() => {
      // Check that Bookmarks link is not present in navigation
      const navLinks = screen.queryByRole('navigation').querySelectorAll('a');
      const navTexts = Array.from(navLinks).map(link => link.textContent);
      expect(navTexts).toContain('Applications');
      expect(navTexts).not.toContain('Bookmarks');
    });
  });

  it('shows improved loading message indicating items may not be configured', async () => {
    // Mock slow or empty responses to test loading state
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/config')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false },
              version: '1.0.0',
            },
            version: '1.0.0',
          }),
        });
      }
      if (url.includes('/api/i8n')) {
        return Promise.resolve({
          json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
        });
      }
      if (url.includes('/api/apps')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [] }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [] }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<App />);
    
    // Initially should show loading state with improved message
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Checking for configured applications and bookmarks\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/If none are found, you can add them to get started\./i)).toBeInTheDocument();
    
    // Wait for data to load and show empty state
    await waitFor(() => {
      expect(screen.getByText(/No Items Available/i)).toBeInTheDocument();
    });
  });

  it('shows empty state message when no items exist', async () => {
    // Mock empty applications and bookmarks
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/config')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            config: {
              web: { showGithubLink: false, title: 'Test', checkForUpdates: false },
              version: '1.0.0',
            },
            version: '1.0.0',
          }),
        });
      }
      if (url.includes('/api/i8n')) {
        return Promise.resolve({
          json: () => Promise.resolve({ "home.theme.toggle": "Toggle theme" }),
        });
      }
      if (url.includes('/api/apps')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [{ name: 'G1', applications: [] }] }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [{ name: 'B1', bookmarks: [] }] }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/No Items Available/i)).toBeInTheDocument();
      expect(screen.getByText(/There are currently no applications or bookmarks configured/i)).toBeInTheDocument();
      // Check that nav links are not present
      expect(screen.getByRole('navigation')).toBeEmptyDOMElement();
    });
  });


});

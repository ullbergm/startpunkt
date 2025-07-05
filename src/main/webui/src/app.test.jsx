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
            web: { showGithubLink: true, title: 'Startpunkt', checkForUpdates: false },
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
        json: () => Promise.resolve({ groups: [{ name: 'G1' }, { name: 'G2' }] }),
      });
    }
    if (url.includes('/api/bookmarks')) {
      return Promise.resolve({
        json: () => Promise.resolve({ groups: [{ name: 'B1' }] }),
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
          json: () => Promise.resolve({ groups: [{ name: 'G1' }] }),
        });
      }
      if (url.includes('/api/bookmarks')) {
        return Promise.resolve({
          json: () => Promise.resolve({ groups: [{ name: 'B1' }] }),
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
});

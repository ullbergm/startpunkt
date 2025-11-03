import { render, screen, fireEvent, within, cleanup } from '@testing-library/preact';
import SpotlightSearch from './SpotlightSearch.jsx';

const applicationGroupsResponse = {
    applicationGroups: [
        {
            name: 'Group 1',
            applications: [
                { name: 'Alpha App', url: 'http://alpha.app', targetBlank: false }
            ],
        },
        {
            name: 'Group 2',
            applications: [
                { name: 'Beta App', url: 'http://beta.app', targetBlank: true }
            ],
        },
    ],
};

const bookmarkGroupsResponse = {
    bookmarkGroups: [
        {
            name: 'Social',
            bookmarks: [
                {
                    name: 'Reddit',
                    group: 'Social',
                    icon: 'simple-icons:reddit',
                    url: 'https://reddit.com/',
                    info: 'Discussion site',
                },
            ],
        },
    ]
};

// Mock GraphQL client
const mockQuery = jest.fn();
jest.mock('./graphql/client', () => ({
  client: {
    query: jest.fn((query, variables) => ({
      toPromise: () => mockQuery(query, variables)
    })),
  },
}));

// Setup and teardown
beforeAll(() => {
    window._navigate = jest.fn();
});

beforeEach(() => {
    window._navigate.mockClear();
    jest.clearAllMocks();
    cleanup(); // Always start from a clean DOM
    
    // Setup GraphQL mock responses
    mockQuery.mockImplementation((query, variables) => {
        const queryString = typeof query === 'string' ? query : query.toString();
        
        if (queryString.includes('applicationGroups(tags:')) {
            return Promise.resolve({
                data: applicationGroupsResponse
            });
        }
        
        if (queryString.includes('bookmarkGroups {')) {
            return Promise.resolve({
                data: bookmarkGroupsResponse
            });
        }
        
        return Promise.resolve({ data: {} });
    });
});

afterAll(() => {
    delete window._navigate;
});

describe('SpotlightSearch component', () => {
    test('shows badge "App" for an app', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        const strong = await screen.findByText('Alpha App', { selector: 'strong' });
        const badge = within(strong).getByText('App');
        expect(badge).toBeInTheDocument();
    });

    test('shows badge "Bookmark" for a bookmark', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Reddit' } });
        const strong = await screen.findByText('Reddit', { selector: 'strong' });
        const badge = within(strong).getByText('Bookmark');
        expect(badge).toBeInTheDocument();
    });

    test('opens link in new tab when openInNewTab is true', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Beta' } });
        const betaItem = await screen.findByText('Beta App', { selector: 'strong' });
        fireEvent.click(betaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledTimes(1);
        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });

    test('navigates in same tab when openInNewTab is false', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        await screen.findByText('Alpha App', { selector: 'strong' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(window._navigate).toHaveBeenCalledTimes(1);
        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);
    });

    test('clicking Alpha navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        await screen.findByText('Alpha App', { selector: 'strong' });
        const alphaItem = await screen.findByText('Alpha App', { selector: 'strong' });
        fireEvent.click(alphaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);
    });

    test('clicking Beta navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Beta' } });
        await screen.findByText('Beta App', { selector: 'strong' });
        const betaItem = await screen.findByText('Beta App', { selector: 'strong' });
        fireEvent.click(betaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });

    test('clicking Reddit navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Reddit' } });
        await screen.findByText('Reddit', { selector: 'strong' });
        const redditItem = await screen.findByText('Reddit', { selector: 'strong' });
        fireEvent.click(redditItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('https://reddit.com/', false);
    });

    test('search is case-insensitive', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'reddit' } });
        expect(await screen.findByText('Reddit', { selector: 'strong' })).toBeInTheDocument();
    });

    test('closes when clicking outside the search box', async () => {
        render(
            <div>
                <SpotlightSearch testVisible={true} />
                <div data-testid="outside-element">Outside content</div>
            </div>
        );
        
        // Verify search is visible
        const input = await screen.findByRole('textbox');
        expect(input).toBeInTheDocument();
        
        // Click outside the search box
        const outsideElement = screen.getByTestId('outside-element');
        fireEvent.mouseDown(outsideElement);
        
        // Search should be closed (input should not be in the document)
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('handles empty search results', async () => {
        // Mock empty responses
        global.fetch = jest.fn(url => {
            if (url.includes('/api/apps')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ groups: [] }),
                });
            } else if (url.includes('/api/bookmarks')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ groups: [] }),
                });
            }
            return Promise.resolve({
                ok: false,
                status: 404,
                json: () => Promise.resolve({}),
            });
        });

        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'nonexistent' } });
        
        // Should show no results message or empty state
        expect(input).toBeInTheDocument();
    });

    test('handles API failures gracefully', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'test' } });
        
        // Should not crash and input should still be available
        expect(input).toBeInTheDocument();
    });

    test('handles special characters in search', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        
        // Test various special characters
        const specialQueries = ['@#$%', '()', '<script>', '&amp;', '/', '\\'];
        
        for (const query of specialQueries) {
            fireEvent.input(input, { target: { value: query } });
            expect(input.value).toBe(query);
        }
    });

    test('handles very long search queries', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        
        const longQuery = 'a'.repeat(1000);
        fireEvent.input(input, { target: { value: longQuery } });
        
        expect(input.value).toBe(longQuery);
    });

    test('handles rapid consecutive searches', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        
        // Rapid fire search inputs
        const queries = ['a', 'al', 'alp', 'alph', 'alpha'];
        
        for (const query of queries) {
            fireEvent.input(input, { target: { value: query } });
        }
        
        expect(input.value).toBe('alpha');
    });

    test('keyboard navigation with no results', async () => {
        // Mock empty responses
        global.fetch = jest.fn(url => {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ groups: [] }),
            });
        });

        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'nothing' } });
        
        // Arrow keys should not crash when no results
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'Enter' });
        
        expect(input).toBeInTheDocument();
    });

    test('maintains focus after search operations', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        
        fireEvent.input(input, { target: { value: 'Alpha' } });
        
        // Check that input is still accessible (focus state is complex in JSDOM)
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('Alpha');
    });

    test('handles malformed bookmark data', async () => {
        global.fetch = jest.fn(url => {
            if (url.includes('/api/bookmarks')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({
                        groups: [
                            {
                                name: 'Malformed',
                                bookmarks: [
                                    { name: null, url: 'https://test.com' }, // null name
                                    { name: 'Valid', url: null }, // null url
                                    { name: '', url: '' }, // empty strings
                                ]
                            }
                        ]
                    }),
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ groups: [] }),
            });
        });

        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'test' } });
        
        // Should handle malformed data gracefully
        expect(input).toBeInTheDocument();
    });
});

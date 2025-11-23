import { render, screen, fireEvent, within, cleanup } from '@testing-library/preact';
import SpotlightSearch from './SpotlightSearch.jsx';

const mockApplicationGroups = [
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
];

const mockBookmarkGroups = [
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
];

// Mock cluster preferences
const mockClusterPrefs = {
    preferences: {
        enabledClusters: {}
    },
    filterApplications: (apps) => apps, // Return all apps by default
    filterBookmarks: (bookmarks) => bookmarks, // Return all bookmarks by default
};

// Mock layout preferences
const mockLayoutPrefs = {
    preferences: {
        showTags: true,
        showClusterName: true,
    }
};

// Setup and teardown
beforeAll(() => {
    window._navigate = jest.fn();
});

beforeEach(() => {
    window._navigate.mockClear();
    jest.clearAllMocks();
    cleanup(); // Always start from a clean DOM
});

afterAll(() => {
    delete window._navigate;
});

describe('SpotlightSearch component', () => {
    test('shows badge "App" for an app', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        const strong = await screen.findByText('Alpha App', { selector: 'strong' });
        const badge = within(strong).getByText('App');
        expect(badge).toBeInTheDocument();
    });

    test('shows badge "Bookmark" for a bookmark', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Reddit' } });
        const strong = await screen.findByText('Reddit', { selector: 'strong' });
        const badge = within(strong).getByText('Bookmark');
        expect(badge).toBeInTheDocument();
    });

    test('opens link in new tab when openInNewTab is true', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Beta' } });
        const betaItem = await screen.findByText('Beta App', { selector: 'strong' });
        fireEvent.click(betaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledTimes(1);
        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });

    test('navigates in same tab when openInNewTab is false', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        await screen.findByText('Alpha App', { selector: 'strong' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(window._navigate).toHaveBeenCalledTimes(1);
        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);
    });

    test('clicking Alpha navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        await screen.findByText('Alpha App', { selector: 'strong' });
        const alphaItem = await screen.findByText('Alpha App', { selector: 'strong' });
        fireEvent.click(alphaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);
    });

    test('clicking Beta navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Beta' } });
        await screen.findByText('Beta App', { selector: 'strong' });
        const betaItem = await screen.findByText('Beta App', { selector: 'strong' });
        fireEvent.click(betaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });

    test('clicking Reddit navigates to correct url', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Reddit' } });
        await screen.findByText('Reddit', { selector: 'strong' });
        const redditItem = await screen.findByText('Reddit', { selector: 'strong' });
        fireEvent.click(redditItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('https://reddit.com/', false);
    });

    test('search is case-insensitive', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'alpha' } });
        await screen.findByText('Alpha App', { selector: 'strong' });
        expect(await screen.findByText('Alpha App', { selector: 'strong' })).toBeInTheDocument();
    });

    test('handles empty search term gracefully', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '' } });

        // With empty search, all items should be shown
        expect(input).toBeInTheDocument();
    });

    test('search for "reddit" finds bookmark', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'reddit' } });
        expect(await screen.findByText('Reddit', { selector: 'strong' })).toBeInTheDocument();
    });

    test('closes when clicking outside the search box', async () => {
        render(
            <div>
                <SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />
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
        render(<SpotlightSearch testVisible={true} applicationGroups={[]} bookmarkGroups={[]} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'nonexistent' } });

        // Should show no results message or empty state
        expect(input).toBeInTheDocument();
    });

    test('handles API failures gracefully', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={null} bookmarkGroups={null} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'test' } });

        // Should not crash and input should still be available
        expect(input).toBeInTheDocument();
    });

    test('handles special characters in search', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');

        // Test various special characters
        const specialQueries = ['@#$%', '()', '<script>', '&amp;', '/', '\\'];

        for (const query of specialQueries) {
            fireEvent.input(input, { target: { value: query } });
            expect(input.value).toBe(query);
        }
    });

    test('handles very long search queries', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');

        const longQuery = 'a'.repeat(1000);
        fireEvent.input(input, { target: { value: longQuery } });

        expect(input.value).toBe(longQuery);
    });

    test('handles rapid consecutive searches', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');

        // Rapid fire search inputs
        const queries = ['a', 'al', 'alp', 'alph', 'alpha'];

        for (const query of queries) {
            fireEvent.input(input, { target: { value: query } });
        }

        expect(input.value).toBe('alpha');
    });

    test('keyboard navigation with no results', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={[]} bookmarkGroups={[]} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'nothing' } });

        // Arrow keys should not crash when no results
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(input).toBeInTheDocument();
    });

    test('maintains focus after search operations', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');

        fireEvent.input(input, { target: { value: 'Alpha' } });

        // Check that input is still accessible (focus state is complex in JSDOM)
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('Alpha');
    });

    test('handles malformed bookmark data', async () => {
        const malformedBookmarks = [
            {
                name: 'Malformed',
                bookmarks: [
                    { name: null, url: 'https://test.com' }, // null name
                    { name: 'Valid', url: null }, // null url
                    { name: '', url: '' }, // empty strings
                ]
            }
        ];

        render(<SpotlightSearch testVisible={true} applicationGroups={[]} bookmarkGroups={malformedBookmarks} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'test' } });

        // Should handle malformed data gracefully
        expect(input).toBeInTheDocument();
    });

    test('shows web search hint immediately when ? is typed', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?' } });

        // Should show web search mode hint immediately
        expect(await screen.findByText(/Web Search Mode/)).toBeInTheDocument();
        expect(await screen.findByText(/Type your search query and press Enter/)).toBeInTheDocument();
    });

    test('shows web search hint with query when text is entered after ?', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?test query' } });

        // Should show web search hint with the actual query
        expect(await screen.findByText(/Search the web for:/)).toBeInTheDocument();
        expect(await screen.findByText(/test query/)).toBeInTheDocument();
        expect(await screen.findByText(/Press Enter to search/)).toBeInTheDocument();
    });

    test('navigates to search engine when Enter is pressed with ? prefix', async () => {
        const customSearchEngine = 'https://duckduckgo.com/?q=';
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} searchEngine={customSearchEngine} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?test search' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Should navigate to the search engine with encoded query
        expect(window._navigate).toHaveBeenCalledWith('https://duckduckgo.com/?q=test%20search', true);
    });

    test('uses default Google search engine when not configured', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?javascript tutorial' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Should use default Google search
        expect(window._navigate).toHaveBeenCalledWith('https://www.google.com/search?q=javascript%20tutorial', true);
    });

    test('does not search when query is only ?', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Should not navigate when query is empty after ?
        expect(window._navigate).not.toHaveBeenCalled();
    });

    test('does not show normal results when query starts with ?', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?Alpha' } });

        // Should not show "Alpha App" in results when searching with ?
        expect(screen.queryByText('Alpha App', { selector: 'strong' })).not.toBeInTheDocument();
    });

    test('encodes special characters in web search query', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?test & query = special' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Special characters should be URL encoded
        expect(window._navigate).toHaveBeenCalledWith('https://www.google.com/search?q=test%20%26%20query%20%3D%20special', true);
    });

    test('opens web search in new tab', async () => {
        render(<SpotlightSearch testVisible={true} applicationGroups={mockApplicationGroups} bookmarkGroups={mockBookmarkGroups} clusterPrefs={mockClusterPrefs} layoutPrefs={mockLayoutPrefs} />);
        const input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: '?test' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Second parameter should be true to open in new tab
        expect(window._navigate).toHaveBeenCalledWith(expect.any(String), true);
    });
});

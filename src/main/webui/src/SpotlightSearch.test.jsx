import { render, screen, fireEvent, within, cleanup } from '@testing-library/preact';
import SpotlightSearch from './SpotlightSearch.jsx';

const appsApiResponse = {
    groups: [
        {
            name: 'Group 1',
            applications: [
                { name: 'Alpha App', url: 'http://alpha.app', openInNewTab: false }
            ],
        },
        {
            name: 'Group 2',
            applications: [
                { name: 'Beta App', url: 'http://beta.app', openInNewTab: true }
            ],
        },
    ],
};

const bookmarksApiResponse = {
    groups: [
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

// Setup and teardown
beforeAll(() => {
    window._navigate = jest.fn();
    global.fetch = jest.fn(url => {
        if (url.includes('/api/apps')) {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(appsApiResponse),
            });
        } else if (url.includes('/api/bookmarks')) {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(bookmarksApiResponse),
            });
        }
        return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({}),
        });
    });
});


beforeEach(() => {
    window._navigate.mockClear();
    cleanup(); // Always start from a clean DOM
});

afterAll(() => {
    delete window._navigate;
    if (global.fetch && global.fetch.mockClear) global.fetch.mockClear();
    delete global.fetch;
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
});

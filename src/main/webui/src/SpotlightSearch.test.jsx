import { render, screen, fireEvent } from '@testing-library/preact';
import SpotlightSearch from './SpotlightSearch.jsx';

beforeAll(() => {
    window._navigate = jest.fn();
    global.fetch = jest.fn(() =>
        Promise.resolve({
            json: () =>
                Promise.resolve({
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
                }),
        })
    );

});

afterAll(() => {
    delete window._navigate;
    if (global.fetch && global.fetch.mockClear) global.fetch.mockClear();
    delete global.fetch;
});

describe('SpotlightSearch component', () => {
    test('opens link in new tab when openInNewTab is true', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');

        fireEvent.input(input, { target: { value: 'Beta' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });

    test('navigates in same tab when openInNewTab is false', async () => {
        render(<SpotlightSearch testVisible={true} />);
        const input = await screen.findByRole('textbox');

        fireEvent.input(input, { target: { value: 'Alpha' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);
    });

    test('clicking on item navigates to correct url', async () => {
        // First interaction: Alpha
        render(<SpotlightSearch testVisible={true} />);
        let input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Alpha' } });
        const alphaItem = await screen.findByText('Alpha App');
        fireEvent.click(alphaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://alpha.app', false);

        // Unmount and re-mount for Beta
        render(<SpotlightSearch testVisible={true} />);
        input = await screen.findByRole('textbox');
        fireEvent.input(input, { target: { value: 'Beta' } });
        const betaItem = await screen.findByText('Beta App');
        fireEvent.click(betaItem.closest('li'));
        expect(window._navigate).toHaveBeenCalledWith('http://beta.app', true);
    });
});

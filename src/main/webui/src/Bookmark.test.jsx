/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen } from '@testing-library/preact';

// Mock Icon from @iconify/react to simplify testing
jest.mock('@iconify/react', () => ({
    Icon: (props) => (
        <span
            data-testid="iconify-icon"
            data-icon={props.icon}
            class={props.class || props.className}
            style={{ width: props.width, height: props.height }}
        />
    ),
}));

import Bookmark from './Bookmark';

describe('Bookmark component', () => {
    const baseBookmark = {
        url: 'https://example.com',
        name: 'Example Bookmark',
        info: 'Some info',
        targetBlank: true,
    };

    test('renders link with correct href, target, and rel', () => {
        render(<Bookmark bookmark={baseBookmark} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', baseBookmark.url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'external noopener noreferrer');
    });

    test('renders img when icon is a URL', () => {
        const bookmark = {
            ...baseBookmark,
            icon: 'https://example.com/icon.png',
        };
        render(<Bookmark bookmark={bookmark} />);
        const img = screen.getByRole('img', { name: bookmark.name });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', bookmark.icon);
        expect(img).toHaveClass('me-3');
    });

    test('renders Icon component with mdi: prefix when icon has no colon', () => {
        const bookmark = {
            ...baseBookmark,
            icon: 'account',
        };
        render(<Bookmark bookmark={bookmark} />);
        const icon = screen.getByTestId('iconify-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('data-icon', `mdi:${bookmark.icon}`);
        expect(icon).toHaveClass('me-3', 'fs-2', 'text-primary');
    });

    test('renders Icon component directly when icon has colon', () => {
        const bookmark = {
            ...baseBookmark,
            icon: 'mdi:account',
        };
        render(<Bookmark bookmark={bookmark} />);
        const icon = screen.getByTestId('iconify-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('data-icon', bookmark.icon);
    });

    test('renders no icon element when icon is falsy', () => {
        const bookmark = {
            ...baseBookmark,
            icon: '',
        };
        const { container } = render(<Bookmark bookmark={bookmark} />);
        expect(container.querySelector('[data-testid="iconify-icon"]')).not.toBeInTheDocument();
        expect(container.querySelector('img')).not.toBeInTheDocument();
    });

    test('renders name and info text correctly', () => {
        render(<Bookmark bookmark={baseBookmark} />);
        expect(screen.getByText(baseBookmark.name)).toBeInTheDocument();
        expect(screen.getByText(baseBookmark.info)).toBeInTheDocument();
    });

    test('handles special characters in name and info', () => {
        const specialBookmark = {
            ...baseBookmark,
            name: 'Special <>&" Chars',
            info: 'Info with émojis 🚀 and symbols!',
        };
        render(<Bookmark bookmark={specialBookmark} />);
        expect(screen.getByText(specialBookmark.name)).toBeInTheDocument();
        expect(screen.getByText(specialBookmark.info)).toBeInTheDocument();
    });

    test('handles empty info text', () => {
        const bookmarkNoInfo = {
            ...baseBookmark,
            info: '',
        };
        render(<Bookmark bookmark={bookmarkNoInfo} />);
        expect(screen.getByText(baseBookmark.name)).toBeInTheDocument();
        // Empty info should still create the element but with empty content
        const infoElements = screen.getAllByText('', { selector: 'p.accent' });
        expect(infoElements[0]).toBeInTheDocument();
    });

    test('applies correct CSS classes', () => {
        render(<Bookmark bookmark={baseBookmark} />);
        const container = screen.getByText(baseBookmark.name).closest('.col');
        expect(container).toHaveClass('col', 'd-flex', 'align-items-start');
    });
});

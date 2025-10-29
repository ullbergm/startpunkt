/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen } from '@testing-library/preact';
import BookmarkGroup from './BookmarkGroup';

// Mock Bookmark to isolate tests
jest.mock('./Bookmark', () => ({
    Bookmark: (props) => (
        <div data-testid="bookmark">{props.bookmark.title}</div>
    ),
}));

describe('BookmarkGroup component', () => {
    const bookmarks = [
        { id: 'b1', title: 'Bookmark One', url: 'https://example1.com' },
        { id: 'b2', title: 'Bookmark Two', url: 'https://example2.com' },
    ];

    test('renders group heading with styling and uppercase text', () => {
        render(<BookmarkGroup group="My Bookmarks" bookmarks={bookmarks} />);
        const heading = screen.getByRole('heading', { level: 2, name: /My Bookmarks/i });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass('pb-2', 'border-bottom', 'text-uppercase');
    });

    test('renders correct number of Bookmark components', () => {
        render(<BookmarkGroup group="Bookmarks" bookmarks={bookmarks} />);
        const renderedBookmarks = screen.getAllByTestId('bookmark');
        expect(renderedBookmarks).toHaveLength(bookmarks.length);
        expect(renderedBookmarks[0]).toHaveTextContent('Bookmark One');
        expect(renderedBookmarks[1]).toHaveTextContent('Bookmark Two');
    });

    test('renders nothing when bookmarks prop is falsy or not an array', () => {
        const { container, rerender } = render(<BookmarkGroup group="Empty" bookmarks={null} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);

        rerender(<BookmarkGroup group="Empty" bookmarks={undefined} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);

        rerender(<BookmarkGroup group="Empty" bookmarks={{}} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);
    });

    test('renders empty div when bookmarks array is empty', () => {
        const { container } = render(<BookmarkGroup group="Empty" bookmarks={[]} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);
    });

    test('renders bookmarks inside CSS grid container', () => {
        render(<BookmarkGroup group="Grid Test" bookmarks={bookmarks} />);
        const container = document.querySelector('[style*="display: grid"]');
        expect(container).toBeInTheDocument();
        // Should have grid display style
        expect(container.style.display).toBe('grid');
    });
});

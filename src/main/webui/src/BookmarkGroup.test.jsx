/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen, fireEvent } from '@testing-library/preact';
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
        render(<BookmarkGroup group="My Bookmarks" bookmarks={bookmarks} isCollapsed={false} />);
        // The h2 now has role="button" for accessibility
        const heading = screen.getByRole('button', { name: /collapse my bookmarks/i });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass('pb-2', 'border-bottom', 'text-uppercase');
        expect(heading.textContent).toMatch(/My Bookmarks/i);
    });

    test('renders correct number of Bookmark components when not collapsed', () => {
        render(<BookmarkGroup group="Bookmarks" bookmarks={bookmarks} isCollapsed={false} />);
        const renderedBookmarks = screen.getAllByTestId('bookmark');
        expect(renderedBookmarks).toHaveLength(bookmarks.length);
        expect(renderedBookmarks[0]).toHaveTextContent('Bookmark One');
        expect(renderedBookmarks[1]).toHaveTextContent('Bookmark Two');
    });

    test('does not render Bookmark components when collapsed', () => {
        const { container } = render(<BookmarkGroup group="Bookmarks" bookmarks={bookmarks} isCollapsed={true} />);
        const renderedBookmarks = container.querySelectorAll('[data-testid="bookmark"]');
        expect(renderedBookmarks).toHaveLength(0);
    });

    test('renders nothing when bookmarks prop is falsy or not an array', () => {
        const { container, rerender } = render(<BookmarkGroup group="Empty" bookmarks={null} isCollapsed={false} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);

        rerender(<BookmarkGroup group="Empty" bookmarks={undefined} isCollapsed={false} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);

        rerender(<BookmarkGroup group="Empty" bookmarks={{}} isCollapsed={false} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);
    });

    test('renders empty div when bookmarks array is empty', () => {
        const { container } = render(<BookmarkGroup group="Empty" bookmarks={[]} isCollapsed={false} />);
        expect(container.querySelectorAll('[data-testid="bookmark"]')).toHaveLength(0);
    });

    test('renders bookmarks inside CSS grid container when not collapsed', () => {
        render(<BookmarkGroup group="Grid Test" bookmarks={bookmarks} isCollapsed={false} />);
        const container = document.querySelector('[style*="display: grid"]');
        expect(container).toBeInTheDocument();
        // Should have grid display style
        expect(container.style.display).toBe('grid');
    });

    test('calls onToggle when heading is clicked', () => {
        const onToggle = jest.fn();
        render(<BookmarkGroup group="Test Group" bookmarks={bookmarks} isCollapsed={false} onToggle={onToggle} />);
        
        const heading = screen.getByRole('button', { name: /collapse test group/i });
        fireEvent.click(heading);
        
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('calls onToggle when Enter key is pressed on heading', () => {
        const onToggle = jest.fn();
        render(<BookmarkGroup group="Test Group" bookmarks={bookmarks} isCollapsed={false} onToggle={onToggle} />);
        
        const heading = screen.getByRole('button', { name: /collapse test group/i });
        fireEvent.keyDown(heading, { key: 'Enter' });
        
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('calls onToggle when Space key is pressed on heading', () => {
        const onToggle = jest.fn();
        render(<BookmarkGroup group="Test Group" bookmarks={bookmarks} isCollapsed={false} onToggle={onToggle} />);
        
        const heading = screen.getByRole('button', { name: /collapse test group/i });
        fireEvent.keyDown(heading, { key: ' ' });
        
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('collapse indicator rotates based on collapsed state', () => {
        const { rerender } = render(<BookmarkGroup group="Test Group" bookmarks={bookmarks} isCollapsed={false} />);
        
        // Find the collapse indicator by searching for the specific span
        let indicator = document.querySelector('span[style*="transform"]');
        expect(indicator.style.transform).toContain('rotate(0deg)');
        
        rerender(<BookmarkGroup group="Test Group" bookmarks={bookmarks} isCollapsed={true} />);
        indicator = document.querySelector('span[style*="transform"]');
        expect(indicator.style.transform).toContain('rotate(-90deg)');
    });
});

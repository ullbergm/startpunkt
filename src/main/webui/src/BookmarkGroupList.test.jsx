/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen } from '@testing-library/preact';
import BookmarkGroupList from './BookmarkGroupList';

// Mock BookmarkGroup to isolate tests
jest.mock('./BookmarkGroup', () => ({
  BookmarkGroup: (props) => (
    <section
      data-testid="bookmark-group"
      aria-labelledby={`${props.group.replace(/\s+/g, '-').toLowerCase()}-label`}
      role="region"
    >
      <h3 id={`${props.group.replace(/\s+/g, '-').toLowerCase()}-label`}>{props.group}</h3>
      {/* Display group name for test */}
    </section>
  ),
}));

describe('BookmarkGroupList component', () => {
  const groups = [
    {
      name: 'Group Alpha',
      bookmarks: [
        { id: 'b1', title: 'Bookmark 1', url: 'https://b1.com' },
      ],
    },
    {
      name: 'Group Beta',
      bookmarks: [
        { id: 'b2', title: 'Bookmark 2', url: 'https://b2.com' },
        { id: 'b3', title: 'Bookmark 3', url: 'https://b3.com' },
      ],
    },
  ];

  test('renders container with correct id and Bootstrap classes', () => {
    render(<BookmarkGroupList groups={groups} />);
    const container = document.getElementById('icon-grid');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('container', 'px-4', 'py-5');
  });

  test('renders correct number of BookmarkGroup sections with accessible roles and labels', () => {
    render(<BookmarkGroupList groups={groups} />);
    const renderedGroups = screen.getAllByRole('region');
    expect(renderedGroups).toHaveLength(groups.length);

    groups.forEach((group) => {
      const region = screen.getByRole('region', { name: group.name });
      expect(region).toBeInTheDocument();

      const heading = screen.getByRole('heading', { name: group.name, level: 3 });
      expect(heading).toBeInTheDocument();
      expect(region).toContainElement(heading);
    });
  });

  test('renders nothing if groups prop is falsy or not an array', () => {
    const { container, rerender } = render(<BookmarkGroupList groups={null} />);
    expect(container.querySelectorAll('[data-testid="bookmark-group"]')).toHaveLength(0);

    rerender(<BookmarkGroupList groups={undefined} />);
    expect(container.querySelectorAll('[data-testid="bookmark-group"]')).toHaveLength(0);

    rerender(<BookmarkGroupList groups={{}} />);
    expect(container.querySelectorAll('[data-testid="bookmark-group"]')).toHaveLength(0);
  });

  test('handles empty groups array gracefully', () => {
    const { container } = render(<BookmarkGroupList groups={[]} />);
    expect(container.querySelectorAll('[data-testid="bookmark-group"]')).toHaveLength(0);
  });

  test('renders nested BookmarkGroup with correct group names', () => {
    render(<BookmarkGroupList groups={groups} />);
    const groupElements = screen.getAllByTestId('bookmark-group');
    expect(groupElements[0]).toHaveTextContent('Group Alpha');
    expect(groupElements[1]).toHaveTextContent('Group Beta');
  });
});

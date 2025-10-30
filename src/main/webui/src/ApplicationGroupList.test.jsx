/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen, fireEvent } from '@testing-library/preact';
import ApplicationGroupList from './ApplicationGroupList';

// Mock useCollapsibleGroups hook
jest.mock('./useCollapsibleGroups', () => ({
  useCollapsibleGroups: jest.fn(() => ({
    isCollapsed: jest.fn(() => false),
    toggleGroup: jest.fn(),
    expandAll: jest.fn(),
    collapseAll: jest.fn(),
  })),
}));

// Mock ApplicationGroup to isolate tests
jest.mock('./ApplicationGroup', () => ({
  ApplicationGroup: (props) => (
    <section
      data-testid="application-group"
      aria-labelledby={`${props.group.replace(/\s+/g, '-').toLowerCase()}-label`}
      role="region"
    >
      <h3 id={`${props.group.replace(/\s+/g, '-').toLowerCase()}-label`}>{props.group}</h3>
      {/* Just display group name for test */}
    </section>
  ),
}));

describe('ApplicationGroupList component', () => {
  const groups = [
    {
      name: 'Group One',
      applications: [
        { name: 'App 1', url: '', icon: '', iconColor: '', info: '', targetBlank: false },
      ],
    },
    {
      name: 'Group Two',
      applications: [
        { name: 'App 2', url: '', icon: '', iconColor: '', info: '', targetBlank: true },
        { name: 'App 3', url: '', icon: '', iconColor: '', info: '', targetBlank: false },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders container with correct id and classes', () => {
    render(<ApplicationGroupList groups={groups} />);
    const container = document.getElementById('icon-grid');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('container', 'px-4', 'py-5');
  });

  test('renders Expand All and Collapse All buttons when groups exist', () => {
    render(<ApplicationGroupList groups={groups} />);
    
    const expandButton = screen.getByRole('button', { name: /expand all/i });
    const collapseButton = screen.getByRole('button', { name: /collapse all/i });
    
    expect(expandButton).toBeInTheDocument();
    expect(collapseButton).toBeInTheDocument();
  });

  test('does not render buttons when groups array is empty', () => {
    render(<ApplicationGroupList groups={[]} />);
    
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  test('Expand All button calls expandAll with group names', () => {
    const mockExpandAll = jest.fn();
    const { useCollapsibleGroups } = require('./useCollapsibleGroups');
    useCollapsibleGroups.mockReturnValue({
      isCollapsed: jest.fn(() => false),
      toggleGroup: jest.fn(),
      expandAll: mockExpandAll,
      collapseAll: jest.fn(),
    });

    render(<ApplicationGroupList groups={groups} />);
    
    const expandButton = screen.getByRole('button', { name: /expand all/i });
    fireEvent.click(expandButton);
    
    expect(mockExpandAll).toHaveBeenCalledWith(['Group One', 'Group Two']);
  });

  test('Collapse All button calls collapseAll with group names', () => {
    const mockCollapseAll = jest.fn();
    const { useCollapsibleGroups } = require('./useCollapsibleGroups');
    useCollapsibleGroups.mockReturnValue({
      isCollapsed: jest.fn(() => false),
      toggleGroup: jest.fn(),
      expandAll: jest.fn(),
      collapseAll: mockCollapseAll,
    });

    render(<ApplicationGroupList groups={groups} />);
    
    const collapseButton = screen.getByRole('button', { name: /collapse all/i });
    fireEvent.click(collapseButton);
    
    expect(mockCollapseAll).toHaveBeenCalledWith(['Group One', 'Group Two']);
  });

  test('renders correct number of ApplicationGroup sections with accessible roles and labels', () => {
    render(<ApplicationGroupList groups={groups} />);
    const renderedGroups = screen.getAllByRole('region');
    expect(renderedGroups).toHaveLength(groups.length);

    groups.forEach((group) => {
      // Accessible name is from aria-labelledby h3 text
      const region = screen.getByRole('region', { name: group.name });
      expect(region).toBeInTheDocument();

      const heading = screen.getByRole('heading', { name: group.name, level: 3 });
      expect(heading).toBeInTheDocument();
      expect(region).toContainElement(heading);
    });
  });

  test('renders nothing if groups prop is falsy or not an array', () => {
    const { container, rerender } = render(<ApplicationGroupList groups={null} />);
    expect(container.querySelectorAll('[data-testid="application-group"]')).toHaveLength(0);

    rerender(<ApplicationGroupList groups={undefined} />);
    expect(container.querySelectorAll('[data-testid="application-group"]')).toHaveLength(0);

    rerender(<ApplicationGroupList groups={{}} />);
    expect(container.querySelectorAll('[data-testid="application-group"]')).toHaveLength(0);
  });

  test('handles empty groups array gracefully', () => {
    const { container } = render(<ApplicationGroupList groups={[]} />);
    expect(container.querySelectorAll('[data-testid="application-group"]')).toHaveLength(0);
  });

  test('renders nested ApplicationGroup with correct props', () => {
    render(<ApplicationGroupList groups={groups} />);
    const groupElements = screen.getAllByTestId('application-group');
    expect(groupElements[0]).toHaveTextContent('Group One');
    expect(groupElements[1]).toHaveTextContent('Group Two');
  });
});

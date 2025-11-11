/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen, fireEvent } from '@testing-library/preact';
import ApplicationGroup from './ApplicationGroup';

// Mock the Application component
jest.mock('./Application', () => ({
  Application: (props) => (
    <div data-testid="application">{props.app.name}</div>
  ),
}));

describe('ApplicationGroup component', () => {
  const apps = [
    {
      name: 'App One',
      url: 'https://app1.com',
      icon: 'mdi:app',
      iconColor: 'blue',
      info: 'Info 1',
      targetBlank: true,
    },
    {
      name: 'App Two',
      url: 'https://app2.com',
      icon: '',
      iconColor: 'green',
      info: 'Info 2',
      targetBlank: false,
    },
  ];

  test('renders group title in uppercase with styling', () => {
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} />);
    // The h3 now has role="button" for accessibility
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('pb-2', 'border-bottom', 'text-uppercase');
    expect(heading.textContent).toMatch(/test group/i);
  });

  test('renders Application components for each application when not collapsed', () => {
    render(<ApplicationGroup group="My Group" applications={apps} isCollapsed={false} />);
    const renderedApps = screen.getAllByTestId('application');
    expect(renderedApps).toHaveLength(apps.length);
    expect(renderedApps[0]).toHaveTextContent('App One');
    expect(renderedApps[1]).toHaveTextContent('App Two');
  });

  test('does not render Application components when collapsed', () => {
    const { container } = render(<ApplicationGroup group="My Group" applications={apps} isCollapsed={true} />);
    const renderedApps = container.querySelectorAll('[data-testid="application"]');
    expect(renderedApps).toHaveLength(0);
  });

  test('does not render Application components when applications is not an array', () => {
    const { container } = render(<ApplicationGroup group="Empty Group" applications={null} isCollapsed={false} />);
    const renderedApps = container.querySelectorAll('[data-testid="application"]');
    expect(renderedApps).toHaveLength(0);
  });

  test('calls onToggle when heading is clicked', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} />);

    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.click(heading);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onToggle when Enter key is pressed on heading', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} />);

    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: 'Enter' });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onToggle when Space key is pressed on heading', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} />);

    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: ' ' });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('does not call onToggle when other keys are pressed', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} />);

    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: 'a' });

    expect(onToggle).not.toHaveBeenCalled();
  });

  test('collapse indicator rotates based on collapsed state', () => {
    const { rerender } = render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} />);

    // Find the collapse indicator by searching for the specific span
    let indicator = document.querySelector('span[style*="transform"]');
    expect(indicator.style.transform).toContain('rotate(0deg)');

    rerender(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={true} />);
    indicator = document.querySelector('span[style*="transform"]');
    expect(indicator.style.transform).toContain('rotate(-90deg)');
  });

  describe('Drag and Drop for Favorites', () => {
    const layoutPrefs = {
      preferences: { editMode: true, compactMode: false, columnCount: 5 },
      getCSSVariables: () => ({ '--card-gap': '1rem', '--group-spacing': '3rem' }),
      getGridTemplateColumns: () => 'repeat(5, 1fr)',
      getOptimalColumnCount: (itemCount) => Math.min(itemCount, 5)
    };

    test('makes favorites draggable when in edit mode', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems[0]).toHaveAttribute('draggable', 'true');
      expect(listItems[1]).toHaveAttribute('draggable', 'true');
    });

    test('does not make regular groups draggable', () => {
      const { container } = render(
        <ApplicationGroup
          group="Regular Group"
          applications={apps}
          isCollapsed={false}
          isFavorites={false}
          layoutPrefs={layoutPrefs}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems[0]).toHaveAttribute('draggable', 'false');
      expect(listItems[1]).toHaveAttribute('draggable', 'false');
    });

    test('does not make favorites draggable when not in edit mode', () => {
      const layoutPrefsNoEdit = {
        ...layoutPrefs,
        preferences: { ...layoutPrefs.preferences, editMode: false }
      };
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefsNoEdit}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems[0]).toHaveAttribute('draggable', 'false');
    });

    test('calls onReorderFavorites when item is dropped', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Simulate drag start on first item
      fireEvent.dragStart(listItems[0], { dataTransfer: { effectAllowed: '', setData: jest.fn() } });

      // Simulate drop on second item
      fireEvent.dragOver(listItems[1], { dataTransfer: { dropEffect: '' } });
      fireEvent.drop(listItems[1]);

      expect(onReorderFavorites).toHaveBeenCalledWith(0, 1);
    });

    test('handles keyboard reordering with Alt+ArrowUp', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Press Alt+ArrowUp on second item to move it up
      fireEvent.keyDown(listItems[1], { key: 'ArrowUp', altKey: true });

      expect(onReorderFavorites).toHaveBeenCalledWith(1, 0);
    });

    test('handles keyboard reordering with Alt+ArrowDown', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Press Alt+ArrowDown on first item to move it down
      fireEvent.keyDown(listItems[0], { key: 'ArrowDown', altKey: true });

      expect(onReorderFavorites).toHaveBeenCalledWith(0, 1);
    });

    test('does not move first item up with Alt+ArrowUp', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Try to move first item up (should do nothing)
      fireEvent.keyDown(listItems[0], { key: 'ArrowUp', altKey: true });

      expect(onReorderFavorites).not.toHaveBeenCalled();
    });

    test('does not move last item down with Alt+ArrowDown', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Try to move last item down (should do nothing)
      fireEvent.keyDown(listItems[apps.length - 1], { key: 'ArrowDown', altKey: true });

      expect(onReorderFavorites).not.toHaveBeenCalled();
    });

    test('includes reorder instructions in aria-label when draggable', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');
      const ariaLabel = listItems[0].getAttribute('aria-label');

      expect(ariaLabel).toContain('Press Alt+Up or Alt+Down to reorder');
    });

    test('applies visual feedback styles when dragging', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const listItems = container.querySelectorAll('[role="listitem"]');

      // Check that cursor is set to move
      expect(listItems[0].style.cursor).toBe('move');
    });

    test('uses dynamic column count for favorites based on number of items', () => {
      const onReorderFavorites = jest.fn();
      const threeApps = [apps[0], apps[1], { ...apps[0], name: 'App Three' }];
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={threeApps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const grid = container.querySelector('.application-grid');
      // With 3 favorites and columnCount 5, should use 3 columns
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    });

    test('caps favorites columns at configured column count', () => {
      const onReorderFavorites = jest.fn();
      const sixApps = [
        ...apps,
        { ...apps[0], name: 'App Three' },
        { ...apps[0], name: 'App Four' },
        { ...apps[0], name: 'App Five' },
        { ...apps[0], name: 'App Six' }
      ];
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={sixApps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const grid = container.querySelector('.application-grid');
      // With 6 favorites but columnCount 5, should cap at 5 columns
      expect(grid.style.gridTemplateColumns).toBe('repeat(5, 1fr)');
    });

    test('centers favorites grid with justify-content', () => {
      const onReorderFavorites = jest.fn();
      const { container } = render(
        <ApplicationGroup
          group={null}
          applications={apps}
          isCollapsed={false}
          isFavorites={true}
          layoutPrefs={layoutPrefs}
          onReorderFavorites={onReorderFavorites}
        />
      );

      const grid = container.querySelector('.application-grid');
      // Favorites should have centered justification
      expect(grid.style.justifyContent).toBe('center');
    });
  });

  describe('regular groups use configured column count', () => {
    const layoutPrefs = {
      preferences: { compactMode: false, columnCount: 5 },
      getCSSVariables: () => ({ '--card-padding': '1rem', '--card-gap': '1rem' }),
      getOptimalColumnCount: (itemCount) => Math.min(itemCount, 5)
    };

    test('regular groups use full configured column count', () => {
      const { container } = render(
        <ApplicationGroup
          group="Regular Group"
          applications={apps}
          isCollapsed={false}
          isFavorites={false}
          layoutPrefs={layoutPrefs}
        />
      );

      const grid = container.querySelector('.application-grid');
      // Regular groups should always use the configured columnCount
      expect(grid.style.gridTemplateColumns).toBe('repeat(5, 1fr)');
    });

    test('regular groups have start justification', () => {
      const { container } = render(
        <ApplicationGroup
          group="Regular Group"
          applications={apps}
          isCollapsed={false}
          isFavorites={false}
          layoutPrefs={layoutPrefs}
        />
      );

      const grid = container.querySelector('.application-grid');
      // Regular groups should have start justification (not centered)
      expect(grid.style.justifyContent).toBe('start');
    });
  });

  describe('hideUnreachable filtering', () => {
    const layoutPrefs = {
      preferences: { compactMode: false, columnCount: 5, hideUnreachable: true },
      getCSSVariables: () => ({ '--card-padding': '1rem', '--card-gap': '1rem' }),
      getOptimalColumnCount: (itemCount) => Math.min(itemCount, 5)
    };

    test('filters out unavailable applications when hideUnreachable is enabled', () => {
      const appsWithUnavailable = [
        { ...apps[0], available: true },
        { ...apps[1], available: false },
      ];

      render(
        <ApplicationGroup
          group="Test Group"
          applications={appsWithUnavailable}
          isCollapsed={false}
          layoutPrefs={layoutPrefs}
        />
      );

      const renderedApps = screen.getAllByTestId('application');
      // Should only render the available app
      expect(renderedApps).toHaveLength(1);
      expect(renderedApps[0]).toHaveTextContent('App One');
    });

    test('hides entire group including heading when all apps are filtered out', () => {
      const appsAllUnavailable = [
        { ...apps[0], available: false },
        { ...apps[1], available: false },
      ];

      const { container } = render(
        <ApplicationGroup
          group="Test Group"
          applications={appsAllUnavailable}
          isCollapsed={false}
          layoutPrefs={layoutPrefs}
        />
      );

      // Should not render anything - no heading, no grid
      expect(container.firstChild).toBeNull();
    });

    test('shows all apps when hideUnreachable is disabled', () => {
      const layoutPrefsNoHide = {
        ...layoutPrefs,
        preferences: { ...layoutPrefs.preferences, hideUnreachable: false }
      };

      const appsWithUnavailable = [
        { ...apps[0], available: true },
        { ...apps[1], available: false },
      ];

      render(
        <ApplicationGroup
          group="Test Group"
          applications={appsWithUnavailable}
          isCollapsed={false}
          layoutPrefs={layoutPrefsNoHide}
        />
      );

      const renderedApps = screen.getAllByTestId('application');
      // Should render all apps regardless of availability
      expect(renderedApps).toHaveLength(2);
    });

    test('does not hide group in skeleton mode even if empty', () => {
      const appsAllUnavailable = [
        { ...apps[0], available: false },
        { ...apps[1], available: false },
      ];

      const { container } = render(
        <ApplicationGroup
          group="Test Group"
          applications={appsAllUnavailable}
          isCollapsed={false}
          layoutPrefs={layoutPrefs}
          skeleton={true}
        />
      );

      // Should still render skeleton even with filtered apps
      expect(container.firstChild).not.toBeNull();
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
    });
  });
});

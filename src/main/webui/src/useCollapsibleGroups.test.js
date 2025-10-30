import { renderHook, act } from '@testing-library/preact';
import { useCollapsibleGroups } from './useCollapsibleGroups';

// Mock the useLocalStorage hook
jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: jest.fn((key, initialValue) => {
    const [state, setState] = require('preact/hooks').useState(initialValue);
    return [state, setState];
  }),
}));

describe('useCollapsibleGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with empty collapsed groups', () => {
    const { result } = renderHook(() => useCollapsibleGroups());
    expect(result.current.collapsedGroups).toEqual({});
  });

  test('toggleGroup sets a group to collapsed when not set', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.collapsedGroups['group1']).toBe(true);
  });

  test('toggleGroup toggles existing state', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    act(() => {
      result.current.toggleGroup('group1');
    });
    expect(result.current.collapsedGroups['group1']).toBe(true);

    act(() => {
      result.current.toggleGroup('group1');
    });
    expect(result.current.collapsedGroups['group1']).toBe(false);
  });

  test('expandAll expands all specified groups', () => {
    const { result } = renderHook(() => useCollapsibleGroups());
    
    act(() => {
      result.current.collapseAll(['group1', 'group2', 'group3']);
    });

    expect(result.current.collapsedGroups['group1']).toBe(true);
    expect(result.current.collapsedGroups['group2']).toBe(true);
    expect(result.current.collapsedGroups['group3']).toBe(true);

    act(() => {
      result.current.expandAll(['group1', 'group2', 'group3']);
    });

    expect(result.current.collapsedGroups['group1']).toBe(false);
    expect(result.current.collapsedGroups['group2']).toBe(false);
    expect(result.current.collapsedGroups['group3']).toBe(false);
  });

  test('collapseAll collapses all specified groups', () => {
    const { result } = renderHook(() => useCollapsibleGroups());
    
    act(() => {
      result.current.collapseAll(['group1', 'group2']);
    });

    expect(result.current.collapsedGroups['group1']).toBe(true);
    expect(result.current.collapsedGroups['group2']).toBe(true);
  });

  test('isCollapsed returns correct state for a group', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    expect(result.current.isCollapsed('group1')).toBe(false);

    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.isCollapsed('group1')).toBe(true);
  });

  test('isCollapsed returns defaultCollapsed for undefined groups', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', true));
    
    expect(result.current.isCollapsed('unknownGroup')).toBe(true);
  });

  test('respects defaultCollapsed parameter', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', true));
    
    // First toggle should expand (opposite of default true)
    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.collapsedGroups['group1']).toBe(false);
  });

  test('expandAll preserves state of groups not in the list', () => {
    const { result } = renderHook(() => useCollapsibleGroups());
    
    // Set up some initial state
    act(() => {
      result.current.toggleGroup('group1');
      result.current.toggleGroup('group2');
      result.current.toggleGroup('group3');
    });

    expect(result.current.collapsedGroups['group1']).toBe(true);
    expect(result.current.collapsedGroups['group2']).toBe(true);
    expect(result.current.collapsedGroups['group3']).toBe(true);

    // Expand only group1 and group2, leaving group3 alone
    act(() => {
      result.current.expandAll(['group1', 'group2']);
    });

    expect(result.current.collapsedGroups['group1']).toBe(false);
    expect(result.current.collapsedGroups['group2']).toBe(false);
    expect(result.current.collapsedGroups['group3']).toBe(true); // Should remain unchanged
  });

  test('collapseAll preserves state of groups not in the list', () => {
    const { result } = renderHook(() => useCollapsibleGroups());
    
    // Set up initial state with group3 collapsed
    act(() => {
      result.current.toggleGroup('group3');
    });

    expect(result.current.collapsedGroups['group3']).toBe(true);

    // Collapse only group1 and group2, leaving group3 alone
    act(() => {
      result.current.collapseAll(['group1', 'group2']);
    });

    expect(result.current.collapsedGroups['group1']).toBe(true);
    expect(result.current.collapsedGroups['group2']).toBe(true);
    expect(result.current.collapsedGroups['group3']).toBe(true); // Should remain unchanged
  });
});

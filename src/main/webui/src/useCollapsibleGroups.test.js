import { renderHook, act } from '@testing-library/preact';
import { useCollapsibleGroups } from './useCollapsibleGroups';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useCollapsibleGroups', () => {
  beforeEach(() => {
    localStorageMock.clear();
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
    // When expanded, the group should be removed from storage
    expect(result.current.collapsedGroups['group1']).toBeUndefined();
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

    // When expanded, the group should be removed from storage
    expect(result.current.collapsedGroups['group1']).toBeUndefined();
  });
});

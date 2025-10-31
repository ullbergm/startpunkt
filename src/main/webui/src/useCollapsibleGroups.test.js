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

  test('initializes with default expanded state', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    expect(result.current.isCollapsed('group1')).toBe(false);
  });

  test('toggleGroup collapses a group when it is expanded', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    expect(result.current.isCollapsed('group1')).toBe(false);
    
    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.isCollapsed('group1')).toBe(true);
  });

  test('toggleGroup expands a group when it is collapsed', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    // Collapse the group first
    act(() => {
      result.current.toggleGroup('group1');
    });
    expect(result.current.isCollapsed('group1')).toBe(true);

    // Then expand it
    act(() => {
      result.current.toggleGroup('group1');
    });
    expect(result.current.isCollapsed('group1')).toBe(false);
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
    
    // With defaultCollapsed=true, unknown groups should be collapsed
    expect(result.current.isCollapsed('group1')).toBe(true);
    
    // First toggle should expand (opposite of default true)
    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.isCollapsed('group1')).toBe(false);
  });

  test('persists state to localStorage', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    act(() => {
      result.current.toggleGroup('group1');
    });

    // Check that localStorage was updated
    const stored = JSON.parse(localStorageMock.getItem('test-key'));
    expect(stored).toEqual({ group1: true });
  });

  test('removes expanded groups from localStorage', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    // Collapse group1
    act(() => {
      result.current.toggleGroup('group1');
    });
    
    let stored = JSON.parse(localStorageMock.getItem('test-key'));
    expect(stored).toEqual({ group1: true });

    // Expand group1
    act(() => {
      result.current.toggleGroup('group1');
    });

    stored = JSON.parse(localStorageMock.getItem('test-key'));
    expect(stored).toEqual({});
  });

  test('handles multiple groups independently', () => {
    const { result } = renderHook(() => useCollapsibleGroups('test-key', false));
    
    // Collapse group1
    act(() => {
      result.current.toggleGroup('group1');
    });
    
    expect(result.current.isCollapsed('group1')).toBe(true);
    expect(result.current.isCollapsed('group2')).toBe(false);

    // Collapse group2
    act(() => {
      result.current.toggleGroup('group2');
    });

    expect(result.current.isCollapsed('group1')).toBe(true);
    expect(result.current.isCollapsed('group2')).toBe(true);

    // Expand group1
    act(() => {
      result.current.toggleGroup('group1');
    });

    expect(result.current.isCollapsed('group1')).toBe(false);
    expect(result.current.isCollapsed('group2')).toBe(true);
  });
});

import { h } from 'preact';
import { render, screen, fireEvent } from '@testing-library/preact';
import { AccessibilitySettings } from './AccessibilitySettings';

// Mock local storage
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
});

describe('AccessibilitySettings component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders accessibility button', () => {
    render(<AccessibilitySettings />);
    const button = screen.getByRole('button', { name: /accessibility settings/i });
    expect(button).toBeInTheDocument();
  });

  test('displays font size controls', () => {
    render(<AccessibilitySettings />);
    const decreaseBtn = screen.getByLabelText(/decrease font size/i);
    const increaseBtn = screen.getByLabelText(/increase font size/i);
    const resetBtn = screen.getByLabelText(/reset font size to default/i);

    expect(decreaseBtn).toBeInTheDocument();
    expect(increaseBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();
  });

  test('displays high contrast toggle', () => {
    render(<AccessibilitySettings />);
    const toggle = screen.getByLabelText(/high contrast mode/i);
    expect(toggle).toBeInTheDocument();
  });

  test('displays keyboard shortcuts', () => {
    render(<AccessibilitySettings />);
    expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
  });

  test('font size slider is present', () => {
    render(<AccessibilitySettings />);
    const slider = screen.getByLabelText(/font size slider/i);
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
  });

  test('applies ARIA labels correctly', () => {
    render(<AccessibilitySettings />);
    const button = screen.getByRole('button', { name: /accessibility settings/i });
    expect(button).toHaveAttribute('aria-label', 'Accessibility settings');
  });
});

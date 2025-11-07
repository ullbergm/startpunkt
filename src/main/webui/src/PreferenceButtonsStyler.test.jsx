import { h } from 'preact';
import { render, screen, waitFor } from '@testing-library/preact';
import { PreferenceButtonsStyler } from './PreferenceButtonsStyler';
import * as useBackgroundPreferencesModule from './useBackgroundPreferences';

// Mock the useBackgroundPreferences hook
jest.mock('./useBackgroundPreferences');

describe('PreferenceButtonsStyler', () => {
  let mockButtons;

  beforeEach(() => {
    // Create mock button elements
    mockButtons = [
      document.createElement('button'),
      document.createElement('button'),
      document.createElement('button')
    ];
    
    mockButtons[0].classList.add('btn');
    mockButtons[1].classList.add('btn');
    mockButtons[2].classList.add('btn');

    const layoutToggle = document.createElement('div');
    layoutToggle.classList.add('bd-layout-toggle');
    layoutToggle.appendChild(mockButtons[0]);

    const backgroundToggle = document.createElement('div');
    backgroundToggle.classList.add('bd-background-toggle');
    backgroundToggle.appendChild(mockButtons[1]);

    const accessibilityToggle = document.createElement('div');
    accessibilityToggle.classList.add('bd-accessibility-toggle');
    accessibilityToggle.appendChild(mockButtons[2]);

    document.body.appendChild(layoutToggle);
    document.body.appendChild(backgroundToggle);
    document.body.appendChild(accessibilityToggle);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('does not apply overlay styling for theme background type', async () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'theme',
        typePreferences: {
          theme: {
            contentOverlayOpacity: -0.6
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return -0.6;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('');
      });
    });
  });

  test('applies transparent styling when opacity is 0 (transparent)', async () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'solid',
        typePreferences: {
          solid: {
            contentOverlayOpacity: 0
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return 0;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('transparent');
        expect(btn.style.color).toBe('rgb(113, 44, 249)');
        expect(btn.style.borderColor).toBe('transparent');
        expect(btn.style.boxShadow).toBe('none');
        expect(btn.style.backdropFilter).toBe('none');
      });
    });
  });

  test('applies white overlay styling when opacity is negative', async () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'solid',
        typePreferences: {
          solid: {
            contentOverlayOpacity: -0.6
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return -0.6;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('rgba(255, 255, 255, 0.6)');
        expect(btn.style.color).toBe('rgb(113, 44, 249)');
        expect(btn.style.borderColor).toBe('rgba(0, 0, 0, 0.1)');
      });
    });
  });

  test('applies black overlay styling when opacity is positive', async () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typePreferences: {
          gradient: {
            contentOverlayOpacity: 0.8
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return 0.8;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('rgba(0, 0, 0, 0.8)');
        expect(btn.style.color).toBe('rgb(255, 255, 255)');
        expect(btn.style.borderColor).toBe('rgba(255, 255, 255, 0.2)');
      });
    });
  });

  test('applies backdrop filter and transition to buttons', async () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'image',
        typePreferences: {
          image: {
            contentOverlayOpacity: -0.5
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return -0.5;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backdropFilter).toBe('blur(4px)');
        expect(btn.style.transition).toContain('background-color');
        expect(btn.style.transition).toContain('color');
        expect(btn.style.transition).toContain('border-color');
      });
    });
  });

  test('updates styling when contentOverlayOpacity changes', async () => {
    const { rerender } = render(<PreferenceButtonsStyler />);

    // Initial state with white overlay
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'solid',
        typePreferences: {
          solid: {
            contentOverlayOpacity: -0.6
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return -0.6;
        return undefined;
      }
    });

    rerender(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('rgba(255, 255, 255, 0.6)');
      });
    });

    // Change to black overlay
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'solid',
        typePreferences: {
          solid: {
            contentOverlayOpacity: 0.7
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return 0.7;
        return undefined;
      }
    });

    rerender(<PreferenceButtonsStyler />);

    await waitFor(() => {
      mockButtons.forEach(btn => {
        expect(btn.style.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
      });
    });
  });

  test('component does not render any DOM elements', () => {
    useBackgroundPreferencesModule.useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'solid',
        typePreferences: {
          solid: {
            contentOverlayOpacity: -0.6
          }
        }
      },
      getTypePreference: (key) => {
        if (key === 'contentOverlayOpacity') return -0.6;
        return undefined;
      }
    });

    const { container } = render(<PreferenceButtonsStyler />);
    
    expect(container.firstChild).toBeNull();
  });
});

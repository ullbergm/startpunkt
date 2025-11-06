import { render, waitFor } from '@testing-library/preact';
import { ContentOverlay } from './ContentOverlay';
import { useBackgroundPreferences } from './useBackgroundPreferences';

// Mock the hooks
jest.mock('./useBackgroundPreferences');

describe('ContentOverlay', () => {
  let mainElement;

  beforeEach(() => {
    // Create a main element for testing
    mainElement = document.createElement('main');
    mainElement.id = 'main-content';
    document.body.appendChild(mainElement);

    // Mock dispatchEvent
    window.dispatchEvent = jest.fn();
  });

  afterEach(() => {
    // Clean up
    if (mainElement && mainElement.parentNode) {
      mainElement.parentNode.removeChild(mainElement);
    }
  });

  it('applies overlay styling with positive opacity', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: 0.7
          }
        }
      },
      getContentOverlayOpacity: () => 0.7
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      expect(mainElement.style.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
      expect(mainElement.style.borderRadius).toBe('0.5rem');
      expect(mainElement.style.padding).toBe('1.5rem');
      expect(mainElement.style.backdropFilter).toBe('blur(4px)');
      expect(mainElement.style.transition).toBe('background-color 0.3s ease');
    });
  });

  it('applies white overlay with negative opacity', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'image',
        typeSettings: {
          image: {
            contentOverlayOpacity: -0.8
          }
        }
      },
      getContentOverlayOpacity: () => -0.8
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      expect(mainElement.style.backgroundColor).toBe('rgba(255, 255, 255, 0.8)');
    });
  });

  it('applies transparent overlay when opacity is 0 (disabled)', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: 0
          }
        }
      },
      getContentOverlayOpacity: () => 0
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      // Middle position (0) = disabled, no overlay at all
      expect(mainElement.style.backgroundColor).toBe('');
      expect(mainElement.style.backdropFilter).toBe('');
    });
  });

  it('applies overlay with different opacity', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'meshGradient',
        typeSettings: {
          meshGradient: {
            contentOverlayOpacity: 0.9
          }
        }
      },
      getContentOverlayOpacity: () => 0.9
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      expect(mainElement.style.backgroundColor).toBe('rgba(0, 0, 0, 0.9)');
    });
  });

  it('does not apply overlay for theme background type', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'theme',
        typeSettings: {
          theme: {
            contentOverlayOpacity: 0
          }
        }
      },
      getContentOverlayOpacity: () => 0
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      // Theme backgrounds should not get overlay
      expect(mainElement.style.backgroundColor).toBe('');
      expect(mainElement.style.borderRadius).toBe('');
      expect(mainElement.style.padding).toBe('');
      expect(mainElement.style.backdropFilter).toBe('');
      expect(mainElement.style.transition).toBe('');
    });
  });

  it('uses default opacity if not specified (60% white overlay)', async () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: -0.6
          }
        }
      },
      getContentOverlayOpacity: () => -0.6
    });

    render(<ContentOverlay />);

    await waitFor(() => {
      // Default opacity is -0.6, which means 60% white overlay
      expect(mainElement.style.backgroundColor).toBe('rgba(255, 255, 255, 0.6)');
    });
  });

  it('updates styling when preferences change', async () => {
    const { rerender } = render(<ContentOverlay />);
    
    // Start with no overlay (opacity 0)
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: 0
          }
        }
      },
      getContentOverlayOpacity: () => 0
    });
    
    rerender(<ContentOverlay />);

    await waitFor(() => {
      expect(mainElement.style.backgroundColor).toBe('');
    });

    // Enable overlay with positive opacity
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: 0.8
          }
        }
      },
      getContentOverlayOpacity: () => 0.8
    });
    
    rerender(<ContentOverlay />);

    await waitFor(() => {
      expect(mainElement.style.backgroundColor).toBe('rgba(0, 0, 0, 0.8)');
    });
  });

  it('renders nothing (returns null)', () => {
    useBackgroundPreferences.mockReturnValue({
      preferences: {
        type: 'gradient',
        typeSettings: {
          gradient: {
            contentOverlayOpacity: 0
          }
        }
      },
      getContentOverlayOpacity: () => 0
    });

    const { container } = render(<ContentOverlay />);
    expect(container.firstChild).toBeNull();
  });
});

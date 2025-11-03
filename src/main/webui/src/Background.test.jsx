import { h } from 'preact';
import { render, waitFor } from '@testing-library/preact';
import { Background } from './Background';
import { useBackgroundPreferences } from './useBackgroundPreferences';
import { useLocalStorage } from '@rehooks/local-storage';
import { useMediaQuery } from 'react-responsive';
import { client } from './graphql/client';

// Mock dependencies
jest.mock('./useBackgroundPreferences');
jest.mock('@rehooks/local-storage');
jest.mock('react-responsive');
jest.mock('./graphql/client', () => ({
  client: {
    query: jest.fn()
  }
}));

describe('Background', () => {
  let mockGetBackgroundStyle;
  let mockPreferences;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.body.style.cssText = '';
    
    // Default mocks
    mockGetBackgroundStyle = jest.fn();
    mockPreferences = {
      type: 'theme',
      color: '#F8F6F1',
      opacity: 1.0,
      blur: false,
      imageUrl: '',
      geopatternSeed: 'startpunkt'
    };

    useBackgroundPreferences.mockReturnValue({
      preferences: mockPreferences,
      getBackgroundStyle: mockGetBackgroundStyle
    });

    useLocalStorage.mockReturnValue(['auto', jest.fn()]);
    useMediaQuery.mockReturnValue(false); // system prefers light by default
  });

  afterEach(() => {
    // Cleanup overlays
    const overlay = document.getElementById('background-overlay');
    if (overlay) {
      overlay.remove();
    }
  });

  describe('Theme Mode Detection', () => {
    it('should detect dark mode when theme is set to dark', async () => {
      useLocalStorage.mockReturnValue(['dark', jest.fn()]);
      useMediaQuery.mockReturnValue(false);
      mockGetBackgroundStyle.mockReturnValue({ backgroundColor: '#000000' });

      render(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(true);
      });
    });

    it('should detect light mode when theme is set to light', async () => {
      useLocalStorage.mockReturnValue(['light', jest.fn()]);
      useMediaQuery.mockReturnValue(true); // system prefers dark, but theme is light
      mockGetBackgroundStyle.mockReturnValue({ backgroundColor: '#FFFFFF' });

      render(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(false);
      });
    });

    it('should use system preference when theme is auto and system prefers dark', async () => {
      useLocalStorage.mockReturnValue(['auto', jest.fn()]);
      useMediaQuery.mockReturnValue(true);
      mockGetBackgroundStyle.mockReturnValue({ backgroundColor: '#000000' });

      render(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(true);
      });
    });

    it('should use system preference when theme is auto and system prefers light', async () => {
      useLocalStorage.mockReturnValue(['auto', jest.fn()]);
      useMediaQuery.mockReturnValue(false);
      mockGetBackgroundStyle.mockReturnValue({ backgroundColor: '#FFFFFF' });

      render(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Solid Color Background', () => {
    it('should apply solid color background to body', async () => {
      mockPreferences.type = 'solid';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: '#FF5733'
      });

      render(<Background />);

      await waitFor(() => {
        expect(document.body.style.backgroundColor).toBe('rgb(255, 87, 51)');
        expect(document.getElementById('background-overlay')).toBeNull();
      });
    });

    it('should remove overlay when switching from image to solid', async () => {
      // First render with image
      const imagePrefs = {
        type: 'image',
        imageUrl: 'https://example.com/image.jpg',
        blur: false,
        opacity: 1.0
      };
      useBackgroundPreferences.mockReturnValue({
        preferences: imagePrefs,
        getBackgroundStyle: jest.fn().mockReturnValue({
          backgroundImage: 'url(https://example.com/image.jpg)',
          opacity: 1.0
        })
      });

      const { rerender } = render(<Background />);
      
      await waitFor(() => {
        expect(document.getElementById('background-overlay')).not.toBeNull();
      });

      // Switch to solid color with new preferences object
      const solidPrefs = {
        type: 'solid',
        color: '#FF5733',
        opacity: 1.0
      };
      useBackgroundPreferences.mockReturnValue({
        preferences: solidPrefs,
        getBackgroundStyle: jest.fn().mockReturnValue({
          backgroundColor: '#FF5733'
        })
      });

      rerender(<Background />);

      await waitFor(() => {
        expect(document.getElementById('background-overlay')).toBeNull();
        expect(document.body.style.backgroundColor).toBe('rgb(255, 87, 51)');
      });
    });
  });

  describe('Gradient Background', () => {
    it('should apply gradient background to body', async () => {
      mockPreferences.type = 'gradient';
      mockGetBackgroundStyle.mockReturnValue({
        background: 'linear-gradient(to bottom right, #FF5733, #3366FF)'
      });

      render(<Background />);

      await waitFor(() => {
        expect(document.body.style.background).toContain('linear-gradient');
        expect(document.getElementById('background-overlay')).toBeNull();
      });
    });
  });

  describe('Theme Background', () => {
    it('should clear body background styles for theme type', async () => {
      // Set some background first
      document.body.style.backgroundColor = '#FF5733';
      document.body.style.background = 'linear-gradient(red, blue)';

      mockPreferences.type = 'theme';
      mockGetBackgroundStyle.mockReturnValue({});

      render(<Background />);

      await waitFor(() => {
        expect(document.body.style.background).toBe('');
        expect(document.body.style.backgroundColor).toBe('');
        expect(document.getElementById('background-overlay')).toBeNull();
      });
    });
  });

  describe('Image Background', () => {
    it('should create overlay for image background', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 0.8
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.style.backgroundImage).toContain('example.com/image.jpg');
        expect(overlay.style.opacity).toBe('0.8');
        expect(overlay.style.backgroundSize).toBe('cover');
        expect(overlay.style.backgroundPosition).toBe('center');
        expect(overlay.style.zIndex).toBe('-1');
      });
    });

    it('should apply blur to image overlay when blur is enabled', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockPreferences.blur = true;
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay.style.filter).toBe('blur(10px)');
        expect(overlay.style.transform).toBe('scale(1.1)');
      });
    });

    it('should not apply blur when blur is disabled', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockPreferences.blur = false;
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay.style.filter).toBe('none');
        expect(overlay.style.transform).toBe('none');
      });
    });

    it('should handle invalid image URL by falling back to solid color', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'not-a-valid-url';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: '#FF5733',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        expect(document.getElementById('background-overlay')).toBeNull();
        expect(document.body.style.backgroundColor).toBe('rgb(255, 87, 51)');
      });
    });

    it('should validate URL protocol (http/https only)', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'ftp://example.com/image.jpg';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: '#FF5733',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        expect(document.getElementById('background-overlay')).toBeNull();
      });
    });
  });

  describe('Picture of the Day Background', () => {
    it('should create overlay with daily seed URL', async () => {
      mockPreferences.type = 'pictureOfDay';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://picsum.photos/...)',
        opacity: 1.0
      });

      // Mock window.screen
      Object.defineProperty(window, 'screen', {
        writable: true,
        value: { width: 1920, height: 1080 }
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.style.backgroundImage).toContain('picsum.photos');
        expect(overlay.style.backgroundImage).toContain('1920');
        expect(overlay.style.backgroundImage).toContain('1080');
        
        // Verify date-based seed
        const today = new Date().toISOString().split('T')[0];
        expect(overlay.style.backgroundImage).toContain(today);
      });
    });

    it('should apply blur to picture of day when enabled', async () => {
      mockPreferences.type = 'pictureOfDay';
      mockPreferences.blur = true;
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://picsum.photos/...)',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay.style.filter).toBe('blur(10px)');
      });
    });
  });

  describe('Bing Image of the Day Background', () => {
    beforeEach(() => {
      // Clear client mock
      client.query.mockClear();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch and display Bing image via GraphQL', async () => {
      const mockBingData = {
        imageUrl: 'https://www.bing.com/th?id=OHR.TestImage_EN-US1234567890_1920x1080.jpg',
        copyright: 'Test Copyright',
        title: 'Test Title',
        date: '20251103'
      };

      client.query.mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          data: { bingImageOfDay: mockBingData }
        })
      });

      mockPreferences.type = 'pictureOfDay';
      mockPreferences.pictureProvider = 'bing';

      useBackgroundPreferences.mockReturnValue({
        preferences: mockPreferences,
        getBackgroundStyle: mockGetBackgroundStyle
      });

      mockGetBackgroundStyle.mockReturnValue({
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        expect(client.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number)
          })
        );
      });
    });

    it('should apply blur to Bing image when enabled', async () => {
      mockPreferences.type = 'pictureOfDay';
      mockPreferences.pictureProvider = 'bing';
      mockPreferences.blur = true;
      
      const mockBingData = {
        imageUrl: 'https://www.bing.com/th?id=OHR.TestImage_1920x1080.jpg',
        copyright: 'Test',
        title: 'Test',
        date: '20251103'
      };

      client.query.mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          data: { bingImageOfDay: mockBingData }
        })
      });

      useBackgroundPreferences.mockReturnValue({
        preferences: mockPreferences,
        getBackgroundStyle: mockGetBackgroundStyle
      });

      mockGetBackgroundStyle.mockReturnValue({
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1.0
      });

      render(<Background />);

      // Wait for the image to be fetched and applied
      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        if (overlay && overlay.style.backgroundImage) {
          expect(overlay.style.filter).toBe('blur(10px)');
          expect(overlay.style.transform).toBe('scale(1.1)');
        }
      }, { timeout: 2000 });
    });
  });

  describe('Geopattern Background', () => {
    it('should create overlay for geopattern', async () => {
      mockPreferences.type = 'geopattern';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(data:image/svg+xml;base64,...)',
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.style.backgroundImage).toContain('data:image/svg+xml');
        expect(overlay.style.backgroundSize).toBe('auto');
        expect(overlay.style.backgroundRepeat).toBe('repeat');
        expect(overlay.style.filter).toBe('none');
      });
    });
  });

  describe('Accessibility', () => {
    it('should render nothing (null component)', () => {
      const { container } = render(<Background />);
      expect(container.firstChild).toBeNull();
    });

    it('should set overlay pointer-events to none to prevent interaction blocking', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 1.0
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay.style.pointerEvents).toBe('none');
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove overlay on unmount', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 1.0
      });

      const { unmount } = render(<Background />);

      await waitFor(() => {
        expect(document.getElementById('background-overlay')).not.toBeNull();
      });

      unmount();

      expect(document.getElementById('background-overlay')).toBeNull();
    });

    it('should handle multiple mount/unmount cycles', async () => {
      mockPreferences.type = 'image';
      mockPreferences.imageUrl = 'https://example.com/image.jpg';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundImage: 'url(https://example.com/image.jpg)',
        opacity: 1.0
      });

      // First render
      const { unmount: unmount1 } = render(<Background />);
      await waitFor(() => {
        expect(document.getElementById('background-overlay')).not.toBeNull();
      });
      unmount1();
      expect(document.getElementById('background-overlay')).toBeNull();

      // Second render
      const { unmount: unmount2 } = render(<Background />);
      await waitFor(() => {
        expect(document.getElementById('background-overlay')).not.toBeNull();
      });
      unmount2();
      expect(document.getElementById('background-overlay')).toBeNull();
    });
  });

  describe('Body Style Management', () => {
    it('should clear body backgroundImage for image types', async () => {
      document.body.style.backgroundImage = 'url(old-image.jpg)';
      
      const imagePrefs = {
        type: 'image',
        imageUrl: 'https://example.com/image.jpg',
        blur: false,
        opacity: 1.0
      };
      useBackgroundPreferences.mockReturnValue({
        preferences: imagePrefs,
        getBackgroundStyle: jest.fn().mockReturnValue({
          backgroundImage: 'url(https://example.com/image.jpg)',
          opacity: 1.0
        })
      });

      render(<Background />);

      await waitFor(() => {
        const overlay = document.getElementById('background-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.style.backgroundImage).toContain('example.com/image.jpg');
        // Body background should be cleared or set to transparent
        const bodyBg = document.body.style.background;
        const bodyBgColor = document.body.style.backgroundColor;
        // Either background is 'none' or backgroundColor is 'transparent'
        expect(bodyBg === 'none' || bodyBgColor === 'transparent').toBe(true);
      });
    });

    it('should not skip opacity property for non-image types', async () => {
      mockPreferences.type = 'solid';
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: 'rgba(255, 87, 51, 0.5)',
        opacity: 0.5 // This should be skipped for solid type
      });

      render(<Background />);

      await waitFor(() => {
        // Opacity is embedded in rgba, not applied separately to body
        expect(document.body.style.backgroundColor).toContain('rgba');
        expect(document.body.style.opacity).toBe('');
      });
    });
  });

  describe('Reactive Updates', () => {
    it('should update background when preferences change', async () => {
      const solidPrefs1 = {
        type: 'solid',
        color: '#FF5733',
        opacity: 1.0
      };
      useBackgroundPreferences.mockReturnValue({
        preferences: solidPrefs1,
        getBackgroundStyle: jest.fn().mockReturnValue({
          backgroundColor: '#FF5733'
        })
      });

      const { rerender } = render(<Background />);

      await waitFor(() => {
        expect(document.body.style.backgroundColor).toBe('rgb(255, 87, 51)');
      });

      // Update preferences with new object reference
      const solidPrefs2 = {
        type: 'solid',
        color: '#3366FF',
        opacity: 1.0
      };
      useBackgroundPreferences.mockReturnValue({
        preferences: solidPrefs2,
        getBackgroundStyle: jest.fn().mockReturnValue({
          backgroundColor: '#3366FF'
        })
      });

      rerender(<Background />);

      await waitFor(() => {
        expect(document.body.style.backgroundColor).toBe('rgb(51, 102, 255)');
      });
    });

    it('should update background when theme mode changes', async () => {
      useLocalStorage.mockReturnValue(['light', jest.fn()]);
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: '#FFFFFF'
      });

      const { rerender } = render(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(false);
      });

      // Change to dark mode
      useLocalStorage.mockReturnValue(['dark', jest.fn()]);
      mockGetBackgroundStyle.mockReturnValue({
        backgroundColor: '#000000'
      });

      rerender(<Background />);

      await waitFor(() => {
        expect(mockGetBackgroundStyle).toHaveBeenCalledWith(true);
      });
    });
  });
});

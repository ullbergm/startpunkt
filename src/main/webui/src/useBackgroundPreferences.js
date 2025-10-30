import { useLocalStorage } from '@rehooks/local-storage';
import GeoPattern from 'geopattern';

/**
 * Custom hook for managing background preferences with localStorage persistence
 * 
 * Background preferences include:
 * - type: 'solid' | 'gradient' | 'image' | 'pictureOfDay' | 'geopattern' | 'theme'
 * - color: string (hex color)
 * - secondaryColor: string (hex color for gradients)
 * - gradientDirection: string (CSS gradient direction)
 * - imageUrl: string (URL for custom image)
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 * - geopatternSeed: string (seed for geopattern generation)
 */

const DEFAULT_PREFERENCES = {
  type: 'theme',
  color: '#F8F6F1',
  secondaryColor: '#FFFFFF',
  gradientDirection: 'to bottom right',
  imageUrl: '',
  blur: false,
  opacity: 1.0,
  geopatternSeed: 'startpunkt'
};

export function useBackgroundPreferences() {
  const [preferences, setPreferences] = useLocalStorage(
    'startpunkt:background-preferences',
    DEFAULT_PREFERENCES
  );

  const updatePreference = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  /**
   * Convert hex color to rgba with opacity
   */
  const hexToRgba = (hex, opacity) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  /**
   * Get the CSS style for the background based on current preferences
   */
  const getBackgroundStyle = (isDarkMode) => {
    const style = {};
    
    // Default colors based on theme mode
    const defaultLightColor = '#F8F6F1';
    const defaultDarkColor = '#232530';
    const baseColor = preferences.color || (isDarkMode ? defaultDarkColor : defaultLightColor);
    const opacity = preferences.opacity !== undefined ? preferences.opacity : 1.0;
    
    // Helper to validate and sanitize URLs
    const isValidUrl = (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };
    
    switch (preferences.type) {
      case 'gradient': {
        const secondaryColor = preferences.secondaryColor || (isDarkMode ? '#1a1b26' : '#FFFFFF');
        const direction = preferences.gradientDirection || 'to bottom right';
        
        // Apply opacity to gradient colors
        if (opacity !== 1.0) {
          const color1 = hexToRgba(baseColor, opacity);
          const color2 = hexToRgba(secondaryColor, opacity);
          style.background = `linear-gradient(${direction}, ${color1}, ${color2})`;
        } else {
          style.background = `linear-gradient(${direction}, ${baseColor}, ${secondaryColor})`;
        }
        break;
      }
      
      case 'image':
        if (preferences.imageUrl && isValidUrl(preferences.imageUrl)) {
          style.backgroundImage = `url(${CSS.escape(preferences.imageUrl)})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
          if (preferences.blur) {
            style.filter = 'blur(5px)';
          }
          // For images, opacity needs to be applied to a pseudo-element or overlay
          style.opacity = opacity;
        } else {
          // Fallback to solid color if no valid image URL
          if (opacity !== 1.0) {
            style.backgroundColor = hexToRgba(baseColor, opacity);
          } else {
            style.backgroundColor = baseColor;
          }
        }
        break;
      
      case 'pictureOfDay':
        // Use Lorem Picsum with today's date as seed for daily-changing image, matching screen size
        const todaySeed = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const picsumUrl = `https://picsum.photos/seed/${todaySeed}/${window.screen.width}/${window.screen.height}`;
        if (isValidUrl(picsumUrl)) {
          style.backgroundImage = `url(${CSS.escape(picsumUrl)})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
          if (preferences.blur) {
            style.filter = 'blur(5px)';
          }
          // For images, opacity needs to be applied to a pseudo-element or overlay
          style.opacity = opacity;
        } else {
          // Fallback to solid color
          if (opacity !== 1.0) {
            style.backgroundColor = hexToRgba(baseColor, opacity);
          } else {
            style.backgroundColor = baseColor;
          }
        }
        break;
      
      case 'geopattern': {
        // Generate a geopattern based on seed
        const seed = preferences.geopatternSeed || 'startpunkt';
        const pattern = GeoPattern.generate(seed, {
          color: baseColor
        });
        
        style.backgroundImage = pattern.toDataUrl();
        style.backgroundSize = 'auto';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'repeat';
        
        // Apply opacity if needed
        if (opacity !== 1.0) {
          style.opacity = opacity;
        }
        break;
      }
      
      case 'theme':
        // Use the built-in theme colors (set via CSS variables)
        // The theme automatically handles light/dark mode
        // Return empty style to let the theme background show through
        break;
      
      case 'solid':
      default:
        // Apply opacity to solid color using rgba
        if (opacity !== 1.0) {
          style.backgroundColor = hexToRgba(baseColor, opacity);
        } else {
          style.backgroundColor = baseColor;
        }
        break;
    }
    
    return style;
  };

  return {
    preferences,
    updatePreference,
    resetToDefaults,
    getBackgroundStyle
  };
}

export default useBackgroundPreferences;

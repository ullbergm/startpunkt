import { useLocalStorage } from '@rehooks/local-storage';

/**
 * Custom hook for managing background preferences with localStorage persistence
 * 
 * Background preferences include:
 * - type: 'solid' | 'gradient' | 'image' | 'pictureOfDay'
 * - color: string (hex color)
 * - secondaryColor: string (hex color for gradients)
 * - gradientDirection: string (CSS gradient direction)
 * - imageUrl: string (URL for custom image)
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 */

const DEFAULT_PREFERENCES = {
  type: 'solid',
  color: '#F8F6F1',
  secondaryColor: '#FFFFFF',
  gradientDirection: 'to bottom right',
  imageUrl: '',
  blur: false,
  opacity: 1.0
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
   * Get the CSS style for the background based on current preferences
   */
  const getBackgroundStyle = (isDarkMode) => {
    const style = {};
    
    // Default colors based on theme mode
    const defaultLightColor = '#F8F6F1';
    const defaultDarkColor = '#232530';
    const baseColor = preferences.color || (isDarkMode ? defaultDarkColor : defaultLightColor);
    
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
        style.background = `linear-gradient(${direction}, ${baseColor}, ${secondaryColor})`;
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
        } else {
          // Fallback to solid color if no valid image URL
          style.backgroundColor = baseColor;
        }
        break;
      
      case 'pictureOfDay':
        // Use Unsplash daily image - consider making this configurable in production
        const unsplashUrl = 'https://source.unsplash.com/daily?wallpaper';
        if (isValidUrl(unsplashUrl)) {
          style.backgroundImage = `url(${CSS.escape(unsplashUrl)})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
          if (preferences.blur) {
            style.filter = 'blur(5px)';
          }
        } else {
          // Fallback to solid color
          style.backgroundColor = baseColor;
        }
        break;
      
      case 'solid':
      default:
        style.backgroundColor = baseColor;
        break;
    }
    
    // Apply opacity if not 1.0
    if (preferences.opacity !== 1.0) {
      style.opacity = preferences.opacity;
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

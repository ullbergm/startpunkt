import { useLocalStorage } from '@rehooks/local-storage';
import GeoPattern from 'geopattern';

/**
 * Custom hook for managing background preferences with localStorage persistence
 * 
 * Background preferences include:
 * - type: 'solid' | 'gradient' | 'image' | 'pictureOfDay' | 'geopattern' | 'theme' | 'timeGradient' | 'meshGradient'
 * - pictureProvider: 'picsum' | 'bing' (for pictureOfDay type)
 * - color: string (hex color)
 * - secondaryColor: string (hex color for gradients)
 * - gradientDirection: string (CSS gradient direction)
 * - imageUrl: string (URL for custom image)
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 * - geopatternSeed: string (seed for geopattern generation)
 * - meshColors: string[] (array of hex colors for mesh gradient)
 * - meshAnimated: boolean (whether to animate mesh gradient)
 * - meshComplexity: 'low' | 'medium' | 'high' (complexity of mesh gradient)
 */

const DEFAULT_PREFERENCES = {
  type: 'theme',
  pictureProvider: 'bing', // 'bing' or 'picsum'
  color: '#F8F6F1',
  secondaryColor: '#FFFFFF',
  gradientDirection: 'to bottom right',
  imageUrl: '',
  blur: false,
  opacity: 1.0,
  geopatternSeed: 'startpunkt',
  meshColors: ['#2d5016', '#f4c430', '#003366'],
  meshAnimated: true,
  meshComplexity: 'low',
  contentOverlay: false,
  contentOverlayOpacity: -0.6, // 0 = transparent (default), negative = white, positive = black
  // Per-type color settings to avoid sharing colors between types
  typeColors: {
    solid: {
      color: '#F8F6F1'
    },
    gradient: {
      color: '#F8F6F1',
      secondaryColor: '#FFFFFF',
      gradientDirection: 'to bottom right'
    },
    geopattern: {
      color: '#F8F6F1'
    }
  }
};

export function useBackgroundPreferences() {
  const [rawPreferences, setPreferences] = useLocalStorage(
    'startpunkt:background-preferences',
    DEFAULT_PREFERENCES
  );

  // Migrate old preferences to new per-type structure
  const preferences = (() => {
    // If typeColors doesn't exist, migrate old preferences
    if (!rawPreferences.typeColors) {
      const typeColors = {
        solid: {
          color: rawPreferences.color || DEFAULT_PREFERENCES.color
        },
        gradient: {
          color: rawPreferences.color || DEFAULT_PREFERENCES.gradient?.color || '#F8F6F1',
          secondaryColor: rawPreferences.secondaryColor || DEFAULT_PREFERENCES.secondaryColor,
          gradientDirection: rawPreferences.gradientDirection || DEFAULT_PREFERENCES.gradientDirection
        },
        geopattern: {
          color: rawPreferences.color || DEFAULT_PREFERENCES.color
        }
      };
      
      return {
        ...rawPreferences,
        typeColors
      };
    }
    return rawPreferences;
  })();

  const updatePreference = (key, value) => {
    // Special handling for type-specific color properties
    if (key === 'color' || key === 'secondaryColor' || key === 'gradientDirection') {
      const currentType = preferences.type;
      const typeColors = { ...preferences.typeColors };
      
      // Update the color for the current type
      if (currentType === 'solid' || currentType === 'gradient' || currentType === 'geopattern') {
        typeColors[currentType] = {
          ...typeColors[currentType],
          [key]: value
        };
        
        setPreferences({
          ...preferences,
          [key]: value, // Keep for backward compatibility
          typeColors
        });
      } else {
        // For other types, just update the global value
        setPreferences({
          ...preferences,
          [key]: value
        });
      }
    } else {
      setPreferences({
        ...preferences,
        [key]: value
      });
    }
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
   * Generate smooth time-based gradient background
   */
  const generateTimeBasedGradient = (opacity = 1.0) => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate progress through the hour for smooth transitions
    const timeDecimal = hours + (minutes / 60);
    
    // Define color stops for different times of day
    let colors;
    let angle = 135; // Default diagonal
    
    if (timeDecimal >= 0 && timeDecimal < 6) {
      // Deep night (midnight to 6 AM)
      colors = ['#0f2027', '#203a43', '#2c5364'];
      angle = 180;
    } else if (timeDecimal >= 6 && timeDecimal < 8) {
      // Sunrise (6-8 AM)
      colors = ['#FF9A8B', '#FF6A88', '#FF99AC'];
      angle = 120;
    } else if (timeDecimal >= 8 && timeDecimal < 12) {
      // Morning (8 AM-12 PM)
      colors = ['#a8edea', '#fed6e3', '#a8edea'];
      angle = 135;
    } else if (timeDecimal >= 12 && timeDecimal < 17) {
      // Afternoon (12-5 PM)
      colors = ['#89f7fe', '#66a6ff', '#89f7fe'];
      angle = 90;
    } else if (timeDecimal >= 17 && timeDecimal < 19) {
      // Sunset (5-7 PM)
      colors = ['#fa709a', '#fee140', '#fa709a'];
      angle = 225;
    } else {
      // Evening/Night (7 PM-midnight)
      colors = ['#0f2027', '#203a43', '#2c5364'];
      angle = 180;
    }
    
    // Create gradient with opacity support
    const gradient = opacity !== 1.0
      ? `linear-gradient(${angle}deg, ${colors.map(c => hexToRgba(c, opacity)).join(', ')})`
      : `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    
    const style = {
      background: colors[1],
      backgroundImage: gradient
    };
    
    return style;
  };

  /**
   * Generate mesh gradient CSS with opacity support
   */
  const generateMeshGradient = (colors, complexity, animated, opacity = 1.0) => {
    // Ensure we have at least 3 colors
    const meshColors = colors && colors.length >= 3 ? colors : DEFAULT_PREFERENCES.meshColors;
    
    // Define complexity levels
    const complexityMap = {
      low: { stops: 2, blur: 80 },
      medium: { stops: 3, blur: 60 },
      high: { stops: 4, blur: 40 }
    };
    
    const config = complexityMap[complexity] || complexityMap.medium;
    
    // Create multiple radial gradients at different positions for a mesh effect
    const gradients = [];
    const positions = [
      ['0%', '0%'],
      ['100%', '0%'],
      ['50%', '50%'],
      ['0%', '100%'],
      ['100%', '100%']
    ];
    
    for (let i = 0; i < Math.min(config.stops + 1, meshColors.length); i++) {
      const color = meshColors[i % meshColors.length];
      const pos = positions[i % positions.length];
      // Apply opacity to each gradient color
      const colorWithOpacity = opacity !== 1.0 ? hexToRgba(color, opacity) : color;
      gradients.push(
        `radial-gradient(circle at ${pos[0]} ${pos[1]}, ${colorWithOpacity} 0%, transparent ${config.blur}%)`
      );
    }
    
    const style = {
      background: meshColors[0], // Fallback solid color
      backgroundImage: gradients.join(', '),
      backgroundRepeat: 'no-repeat'
    };
    
    if (animated) {
      // For animation, we need larger background size to allow movement
      style.backgroundSize = '200% 200%';
      style.backgroundPosition = '0% 0%';
      style.animation = 'meshGradientAnimation 40s ease-in-out infinite';
    } else {
      style.backgroundSize = '100% 100%';
      style.backgroundPosition = 'center';
    }
    
    return style;
  };

  /**
   * Get the CSS style for the background based on current preferences
   */
  const getBackgroundStyle = (isDarkMode) => {
    const style = {};
    
    // Helper to get type-specific colors
    const getTypeColor = (type, key) => {
      // Try to get from typeColors first, fallback to global preferences
      if (preferences.typeColors && preferences.typeColors[type] && preferences.typeColors[type][key]) {
        return preferences.typeColors[type][key];
      }
      // Fallback to global preference (for backward compatibility)
      return preferences[key];
    };
    
    // Default colors based on theme mode
    const defaultLightColor = '#F8F6F1';
    const defaultDarkColor = '#232530';
    
    // Get the appropriate base color depending on type
    let baseColor;
    if (preferences.type === 'solid') {
      baseColor = getTypeColor('solid', 'color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
    } else if (preferences.type === 'gradient') {
      baseColor = getTypeColor('gradient', 'color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
    } else if (preferences.type === 'geopattern') {
      baseColor = getTypeColor('geopattern', 'color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
    } else {
      baseColor = preferences.color || (isDarkMode ? defaultDarkColor : defaultLightColor);
    }
    
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
      case 'timeGradient': {
        const timeStyle = generateTimeBasedGradient(opacity);
        Object.assign(style, timeStyle);
        break;
      }
      
      case 'meshGradient': {
        const meshColors = preferences.meshColors || DEFAULT_PREFERENCES.meshColors;
        const complexity = preferences.meshComplexity || 'low';
        const animated = preferences.meshAnimated !== undefined ? preferences.meshAnimated : true;
        
        const meshStyle = generateMeshGradient(meshColors, complexity, animated, opacity);
        Object.assign(style, meshStyle);
        break;
      }
      
      case 'gradient': {
        const secondaryColor = getTypeColor('gradient', 'secondaryColor') || (isDarkMode ? '#1a1b26' : '#FFFFFF');
        const direction = getTypeColor('gradient', 'gradientDirection') || 'to bottom right';
        
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
          style.backgroundImage = `url(${encodeURI(preferences.imageUrl)})`;
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
          style.backgroundImage = `url(${encodeURI(picsumUrl)})`;
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
      
      case 'bingImageOfDay':
        // Bing Image of the Day will be fetched asynchronously
        // The actual image URL will be set by the Background component
        // For now, set a placeholder style
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'no-repeat';
        if (preferences.blur) {
          style.filter = 'blur(5px)';
        }
        style.opacity = opacity;
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

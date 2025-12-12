import { useLocalStorage } from '@rehooks/local-storage';
import GeoPattern from 'geopattern';

/**
 * Custom hook for managing background preferences with localStorage persistence
 *
 * Each background type now has its own isolated preferences stored in the typePreferences object.
 * This prevents settings from one type (e.g., blur in pictureOfDay) from affecting other types.
 */

const DEFAULT_PREFERENCES = {
  type: 'pictureOfDay',
  // Per-type preferences - each type maintains its own settings including content overlay
  typePreferences: {
    theme: {},
    solid: {
      color: '#408080',
      opacity: 1,
      contentOverlayOpacity: 1
    },
    gradient: {
      color: '#008040',
      secondaryColor: '#408080',
      gradientDirection: 'to bottom right',
      opacity: 1,
      contentOverlayOpacity: -1
    },
    image: {
      imageUrl: '',
      blur: 0,
      opacity: 1
    },
    pictureOfDay: {
      pictureProvider: 'bing',
      blur: 0,
      opacity: 1,
      contentOverlayOpacity: 0.7
    },
    geopattern: {
      geopatternSeed: 'startpunkt',
      color: '#408080',
      opacity: 1,
      contentOverlayOpacity: -0.5
    },
    timeGradient: {
      opacity: 1
    },
    meshGradient: {
      meshColors: ['#2d5016', '#f4c430', '#00ffff', '#ff0080', '#800000'],
      meshAnimated: false,
      meshComplexity: 'high',
      opacity: 1,
      contentOverlayOpacity: 0.75
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
    // If typePreferences already exists, we're on the new structure
    if (rawPreferences.typePreferences) {
      return rawPreferences;
    }

    // Migration from old structure (shared settings) to new per-type structure
    const typePreferences = {};

    // Migrate theme
    typePreferences.theme = {};

    // Migrate solid
    typePreferences.solid = {
      color: rawPreferences.color || DEFAULT_PREFERENCES.typePreferences.solid.color,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.solid.opacity,
      contentOverlayOpacity: rawPreferences.contentOverlayOpacity !== undefined ? rawPreferences.contentOverlayOpacity : DEFAULT_PREFERENCES.typePreferences.solid.contentOverlayOpacity
    };

    // Migrate gradient
    typePreferences.gradient = {
      color: rawPreferences.color || DEFAULT_PREFERENCES.typePreferences.gradient.color,
      secondaryColor: rawPreferences.secondaryColor || DEFAULT_PREFERENCES.typePreferences.gradient.secondaryColor,
      gradientDirection: rawPreferences.gradientDirection || DEFAULT_PREFERENCES.typePreferences.gradient.gradientDirection,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.gradient.opacity,
      contentOverlayOpacity: rawPreferences.contentOverlayOpacity !== undefined ? rawPreferences.contentOverlayOpacity : DEFAULT_PREFERENCES.typePreferences.gradient.contentOverlayOpacity
    };

    // Migrate image
    typePreferences.image = {
      imageUrl: rawPreferences.imageUrl || DEFAULT_PREFERENCES.typePreferences.image.imageUrl,
      blur: rawPreferences.blur !== undefined ? (typeof rawPreferences.blur === 'boolean' ? (rawPreferences.blur ? 10 : 0) : rawPreferences.blur) : DEFAULT_PREFERENCES.typePreferences.image.blur,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.image.opacity
    };

    // Migrate pictureOfDay
    typePreferences.pictureOfDay = {
      pictureProvider: rawPreferences.pictureProvider || DEFAULT_PREFERENCES.typePreferences.pictureOfDay.pictureProvider,
      blur: rawPreferences.blur !== undefined ? (typeof rawPreferences.blur === 'boolean' ? (rawPreferences.blur ? 10 : 0) : rawPreferences.blur) : DEFAULT_PREFERENCES.typePreferences.pictureOfDay.blur,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.pictureOfDay.opacity,
      contentOverlayOpacity: rawPreferences.contentOverlayOpacity !== undefined ? rawPreferences.contentOverlayOpacity : DEFAULT_PREFERENCES.typePreferences.pictureOfDay.contentOverlayOpacity
    };

    // Migrate geopattern
    typePreferences.geopattern = {
      geopatternSeed: rawPreferences.geopatternSeed || DEFAULT_PREFERENCES.typePreferences.geopattern.geopatternSeed,
      color: rawPreferences.color || DEFAULT_PREFERENCES.typePreferences.geopattern.color,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.geopattern.opacity,
      contentOverlayOpacity: rawPreferences.contentOverlayOpacity !== undefined ? rawPreferences.contentOverlayOpacity : DEFAULT_PREFERENCES.typePreferences.geopattern.contentOverlayOpacity
    };

    // Migrate timeGradient
    typePreferences.timeGradient = {
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.timeGradient.opacity
    };

    // Migrate meshGradient
    typePreferences.meshGradient = {
      meshColors: rawPreferences.meshColors || DEFAULT_PREFERENCES.typePreferences.meshGradient.meshColors,
      meshAnimated: rawPreferences.meshAnimated !== undefined ? rawPreferences.meshAnimated : DEFAULT_PREFERENCES.typePreferences.meshGradient.meshAnimated,
      meshComplexity: rawPreferences.meshComplexity || DEFAULT_PREFERENCES.typePreferences.meshGradient.meshComplexity,
      opacity: rawPreferences.opacity !== undefined ? rawPreferences.opacity : DEFAULT_PREFERENCES.typePreferences.meshGradient.opacity,
      contentOverlayOpacity: rawPreferences.contentOverlayOpacity !== undefined ? rawPreferences.contentOverlayOpacity : DEFAULT_PREFERENCES.typePreferences.meshGradient.contentOverlayOpacity
    };

    const migratedPrefs = {
      type: rawPreferences.type || DEFAULT_PREFERENCES.type,
      typePreferences
    };

    // Save the migrated preferences
    setPreferences(migratedPrefs);

    return migratedPrefs;
  })();

  const updatePreference = (key, value) => {
    // Handle type changes specially - just update the type
    if (key === 'type') {
      setPreferences({
        ...preferences,
        type: value
      });
      return;
    }

    // All preferences are now type-specific (including contentOverlay and contentOverlayOpacity)
    const currentType = preferences.type;
    const typePreferences = { ...preferences.typePreferences };

    // Update the preference for the current type
    typePreferences[currentType] = {
      ...typePreferences[currentType],
      [key]: value
    };

    setPreferences({
      ...preferences,
      typePreferences
    });
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  /**
   * Helper to get a preference value for the current type
   * Falls back to default if not set
   */
  const getTypePreference = (key) => {
    const currentType = preferences.type;
    const typePrefs = preferences.typePreferences?.[currentType];

    if (typePrefs && typePrefs[key] !== undefined) {
      return typePrefs[key];
    }

    // Fallback to default for this type
    return DEFAULT_PREFERENCES.typePreferences[currentType]?.[key];
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

    // Default colors based on theme mode
    const defaultLightColor = '#F8F6F1';
    const defaultDarkColor = '#232530';

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
        const opacity = getTypePreference('opacity') || 1.0;
        const timeStyle = generateTimeBasedGradient(opacity);
        Object.assign(style, timeStyle);
        break;
      }

      case 'meshGradient': {
        const meshColors = getTypePreference('meshColors') || DEFAULT_PREFERENCES.typePreferences.meshGradient.meshColors;
        const complexity = getTypePreference('meshComplexity') || 'low';
        const animated = getTypePreference('meshAnimated') !== undefined ? getTypePreference('meshAnimated') : true;
        const opacity = getTypePreference('opacity') || 1.0;

        const meshStyle = generateMeshGradient(meshColors, complexity, animated, opacity);
        Object.assign(style, meshStyle);
        break;
      }

      case 'gradient': {
        const color = getTypePreference('color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
        const secondaryColor = getTypePreference('secondaryColor') || (isDarkMode ? '#1a1b26' : '#FFFFFF');
        const direction = getTypePreference('gradientDirection') || 'to bottom right';
        const opacity = getTypePreference('opacity') || 1.0;

        // Apply opacity to gradient colors
        if (opacity !== 1.0) {
          const color1 = hexToRgba(color, opacity);
          const color2 = hexToRgba(secondaryColor, opacity);
          style.background = `linear-gradient(${direction}, ${color1}, ${color2})`;
        } else {
          style.background = `linear-gradient(${direction}, ${color}, ${secondaryColor})`;
        }
        break;
      }

      case 'image': {
        const imageUrl = getTypePreference('imageUrl');
        const blur = getTypePreference('blur') || 0;
        const opacity = getTypePreference('opacity') || 1.0;

        if (imageUrl && isValidUrl(imageUrl)) {
          style.backgroundImage = `url(${encodeURI(imageUrl)})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
          if (blur > 0) {
            style.filter = `blur(${blur}px)`;
          }
          style.opacity = opacity;
        } else {
          // Fallback to solid color if no valid image URL
          const fallbackColor = isDarkMode ? defaultDarkColor : defaultLightColor;
          if (opacity !== 1.0) {
            style.backgroundColor = hexToRgba(fallbackColor, opacity);
          } else {
            style.backgroundColor = fallbackColor;
          }
        }
        break;
      }

      case 'pictureOfDay': {
        const pictureProvider = getTypePreference('pictureProvider') || 'bing';
        const blur = getTypePreference('blur') || 0;
        const opacity = getTypePreference('opacity') || 1.0;

        // Picture provider is handled by Background component via GraphQL for Bing
        // or directly via URL for Picsum
        // For now, prepare the style properties
        if (pictureProvider === 'picsum') {
          const todaySeed = new Date().toISOString().split('T')[0];
          const picsumUrl = `https://picsum.photos/seed/${todaySeed}/${window.screen.width}/${window.screen.height}`;
          if (isValidUrl(picsumUrl)) {
            style.backgroundImage = `url(${encodeURI(picsumUrl)})`;
            style.backgroundSize = 'cover';
            style.backgroundPosition = 'center';
            style.backgroundRepeat = 'no-repeat';
            if (blur > 0) {
              style.filter = `blur(${blur}px)`;
            }
            style.opacity = opacity;
          }
        } else {
          // For Bing, just set basic properties
          // The actual image will be fetched by Background component
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
          if (blur) {
            style.filter = 'blur(5px)';
          }
          style.opacity = opacity;
        }
        break;
      }

      case 'geopattern': {
        const seed = getTypePreference('geopatternSeed') || 'startpunkt';
        const color = getTypePreference('color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
        const opacity = getTypePreference('opacity') || 1.0;

        const pattern = GeoPattern.generate(seed, { color });

        style.backgroundImage = pattern.toDataUrl();
        style.backgroundSize = 'auto';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'repeat';

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
      default: {
        const color = getTypePreference('color') || (isDarkMode ? defaultDarkColor : defaultLightColor);
        const opacity = getTypePreference('opacity') || 1.0;

        // Apply opacity to solid color using rgba
        if (opacity !== 1.0) {
          style.backgroundColor = hexToRgba(color, opacity);
        } else {
          style.backgroundColor = color;
        }
        break;
      }
    }

    return style;
  };

  return {
    preferences,
    updatePreference,
    resetToDefaults,
    getBackgroundStyle,
    getTypePreference
  };
}

export default useBackgroundPreferences;

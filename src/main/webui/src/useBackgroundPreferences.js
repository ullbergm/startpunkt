import { useLocalStorage } from "@rehooks/local-storage";
import GeoPattern from "geopattern";
import { useEffect, useRef } from "preact/hooks";

/**
 * Custom hook for managing background preferences with localStorage persistence
 *
 * Background preferences are organized by type, with each type having its own isolated settings:
 *
 * Global settings:
 * - type: 'solid' | 'gradient' | 'image' | 'pictureOfDay' | 'bingImageOfDay' | 'geopattern' | 'theme' | 'timeGradient' | 'meshGradient'
 *
 * Type-specific settings (stored in typeSettings[type]):
 *
 * solid:
 * - color: string (hex color)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * gradient:
 * - color: string (hex color)
 * - secondaryColor: string (hex color)
 * - gradientDirection: string (CSS gradient direction)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * image:
 * - imageUrl: string (URL for custom image)
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * pictureOfDay:
 * - pictureProvider: 'picsum' | 'bing' (which service to use for daily images)
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * bingImageOfDay:
 * - blur: boolean (whether to blur background)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * geopattern:
 * - color: string (hex color)
 * - geopatternSeed: string (seed for geopattern generation)
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * timeGradient:
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * meshGradient:
 * - meshColors: string[] (array of hex colors)
 * - meshAnimated: boolean (whether to animate mesh gradient)
 * - meshComplexity: 'low' | 'medium' | 'high'
 * - opacity: number (0.0 to 1.0)
 * - contentOverlayOpacity: number (-1.0 to 1.0, negative=white, positive=black)
 *
 * theme:
 * - (no settings, uses CSS variables)
 * - contentOverlayOpacity: 0 (theme type never uses overlay)
 */

const DEFAULT_PREFERENCES = {
  type: "theme",
  contentOverlayOpacity: -0.6, // Global fallback for migration, will be moved to per-type settings
  // Per-type settings - each background type has its own isolated configuration
  typeSettings: {
    solid: {
      color: "#408080",
      opacity: 1.0,
      contentOverlayOpacity: -0.65,
    },
    gradient: {
      color: "#408080",
      secondaryColor: "#FFFFFF",
      gradientDirection: "to bottom right",
      opacity: 1.0,
      contentOverlayOpacity: -0.65,
    },
    image: {
      imageUrl: "",
      blur: false,
      opacity: 1.0,
      contentOverlayOpacity: -0.6,
    },
    pictureOfDay: {
      pictureProvider: 'bing', // 'picsum' or 'bing'
      blur: false,
      opacity: 1.0,
      contentOverlayOpacity: -0.6,
    },
    bingImageOfDay: {
      blur: false,
      opacity: 1.0,
      contentOverlayOpacity: -0.6,
    },
    geopattern: {
      color: "#408080",
      geopatternSeed: "startpunkt",
      opacity: 1.0,
      contentOverlayOpacity: -0.6,
    },
    timeGradient: {
      opacity: 1.0,
      contentOverlayOpacity: 1.0,
    },
    meshGradient: {
      meshColors: ["#408080", "#ffffff", "#808000", "#8000ff", "#804040"],
      meshAnimated: false,
      meshComplexity: "medium",
      opacity: 1.0,
      contentOverlayOpacity: 0.65,
    },
    theme: {
      // Theme type uses CSS variables, no settings needed
      contentOverlayOpacity: 0, // Theme type never uses overlay
    },
  },
};

export function useBackgroundPreferences() {
  const [rawPreferences, setPreferences] = useLocalStorage(
    "startpunkt:background-preferences",
    DEFAULT_PREFERENCES
  );

  // Track if migration has been applied
  const hasMigrated = useRef(false);

  // Migrate old preferences to new per-type structure
  const preferences = (() => {
    // Capture the old global contentOverlayOpacity for migration
    const legacyContentOverlayOpacity = 
      rawPreferences.contentOverlayOpacity ?? 
      DEFAULT_PREFERENCES.contentOverlayOpacity;

    // If typeSettings doesn't exist, migrate old global properties
    if (!rawPreferences.typeSettings) {
      const typeSettings = {
        solid: {
          color:
            rawPreferences.color ||
            DEFAULT_PREFERENCES.typeSettings.solid.color,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.solid.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        gradient: {
          color:
            rawPreferences.color ||
            DEFAULT_PREFERENCES.typeSettings.gradient.color,
          secondaryColor:
            rawPreferences.secondaryColor ||
            DEFAULT_PREFERENCES.typeSettings.gradient.secondaryColor,
          gradientDirection:
            rawPreferences.gradientDirection ||
            DEFAULT_PREFERENCES.typeSettings.gradient.gradientDirection,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.gradient.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        image: {
          imageUrl:
            rawPreferences.imageUrl ||
            DEFAULT_PREFERENCES.typeSettings.image.imageUrl,
          blur:
            rawPreferences.blur ?? DEFAULT_PREFERENCES.typeSettings.image.blur,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.image.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        pictureOfDay: {
          pictureProvider:
            rawPreferences.pictureProvider ??
            DEFAULT_PREFERENCES.typeSettings.pictureOfDay.pictureProvider,
          blur:
            rawPreferences.blur ??
            DEFAULT_PREFERENCES.typeSettings.pictureOfDay.blur,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.pictureOfDay.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        bingImageOfDay: {
          blur:
            rawPreferences.blur ??
            DEFAULT_PREFERENCES.typeSettings.bingImageOfDay.blur,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.bingImageOfDay.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        geopattern: {
          color:
            rawPreferences.color ||
            DEFAULT_PREFERENCES.typeSettings.geopattern.color,
          geopatternSeed:
            rawPreferences.geopatternSeed ||
            DEFAULT_PREFERENCES.typeSettings.geopattern.geopatternSeed,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.geopattern.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        timeGradient: {
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.timeGradient.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        meshGradient: {
          meshColors:
            rawPreferences.meshColors ||
            DEFAULT_PREFERENCES.typeSettings.meshGradient.meshColors,
          meshAnimated:
            rawPreferences.meshAnimated ??
            DEFAULT_PREFERENCES.typeSettings.meshGradient.meshAnimated,
          meshComplexity:
            rawPreferences.meshComplexity ||
            DEFAULT_PREFERENCES.typeSettings.meshGradient.meshComplexity,
          opacity:
            rawPreferences.opacity ??
            DEFAULT_PREFERENCES.typeSettings.meshGradient.opacity,
          contentOverlayOpacity: legacyContentOverlayOpacity,
        },
        theme: {
          contentOverlayOpacity: 0, // Theme type never uses overlay
        },
      };

      const migrated = {
        type: rawPreferences.type || DEFAULT_PREFERENCES.type,
        typeSettings,
      };

      // Mark that we need to persist the migration
      hasMigrated.current = true;

      return migrated;
    }
    
    // Migrate existing typeSettings that don't have contentOverlayOpacity
    let needsMigration = false;
    const updatedTypeSettings = { ...rawPreferences.typeSettings };
    
    Object.keys(DEFAULT_PREFERENCES.typeSettings).forEach((type) => {
      if (updatedTypeSettings[type] && updatedTypeSettings[type].contentOverlayOpacity === undefined) {
        updatedTypeSettings[type] = {
          ...updatedTypeSettings[type],
          contentOverlayOpacity: legacyContentOverlayOpacity,
        };
        needsMigration = true;
      }
    });
    
    if (needsMigration) {
      hasMigrated.current = true;
      return {
        ...rawPreferences,
        typeSettings: updatedTypeSettings,
      };
    }
    
    return rawPreferences;
  })();

  // Persist migrated preferences to localStorage
  useEffect(() => {
    if (hasMigrated.current) {
      setPreferences(preferences);
      hasMigrated.current = false;
    }
  }, [preferences, setPreferences]);

  const updatePreference = (key, value) => {
    const currentType = preferences.type;

    // If updating the type itself, just set it
    if (key === "type") {
      setPreferences({
        ...preferences,
        [key]: value,
      });
      return;
    }

    // contentOverlayOpacity is now per-type, handle it below with other type-specific settings
    // All other updates are type-specific and go into typeSettings
    const typeSettings = { ...preferences.typeSettings };

    // Make sure the current type exists in typeSettings
    if (!typeSettings[currentType]) {
      typeSettings[currentType] = {
        ...DEFAULT_PREFERENCES.typeSettings[currentType],
      };
    }

    // Update the specific setting for the current type
    typeSettings[currentType] = {
      ...typeSettings[currentType],
      [key]: value,
    };

    setPreferences({
      ...preferences,
      typeSettings,
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
    hex = hex.replace("#", "");

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
    const timeDecimal = hours + minutes / 60;

    // Define color stops for different times of day
    let colors;
    let angle = 135; // Default diagonal

    if (timeDecimal >= 0 && timeDecimal < 6) {
      // Deep night (midnight to 6 AM)
      colors = ["#0f2027", "#203a43", "#2c5364"];
      angle = 180;
    } else if (timeDecimal >= 6 && timeDecimal < 8) {
      // Sunrise (6-8 AM)
      colors = ["#FF9A8B", "#FF6A88", "#FF99AC"];
      angle = 120;
    } else if (timeDecimal >= 8 && timeDecimal < 12) {
      // Morning (8 AM-12 PM)
      colors = ["#a8edea", "#fed6e3", "#a8edea"];
      angle = 135;
    } else if (timeDecimal >= 12 && timeDecimal < 17) {
      // Afternoon (12-5 PM)
      colors = ["#89f7fe", "#66a6ff", "#89f7fe"];
      angle = 90;
    } else if (timeDecimal >= 17 && timeDecimal < 19) {
      // Sunset (5-7 PM)
      colors = ["#fa709a", "#fee140", "#fa709a"];
      angle = 225;
    } else {
      // Evening/Night (7 PM-midnight)
      colors = ["#0f2027", "#203a43", "#2c5364"];
      angle = 180;
    }

    // Create gradient with opacity support
    const gradient =
      opacity !== 1.0
        ? `linear-gradient(${angle}deg, ${colors
            .map((c) => hexToRgba(c, opacity))
            .join(", ")})`
        : `linear-gradient(${angle}deg, ${colors.join(", ")})`;

    const style = {
      background: colors[1],
      backgroundImage: gradient,
    };

    return style;
  };

  /**
   * Generate mesh gradient CSS with opacity support
   */
  const generateMeshGradient = (
    colors,
    complexity,
    animated,
    opacity = 1.0
  ) => {
    // Ensure we have at least 3 colors
    const meshColors =
      colors && colors.length >= 3 ? colors : DEFAULT_PREFERENCES.meshColors;

    // Define complexity levels
    const complexityMap = {
      low: { stops: 2, blur: 80 },
      medium: { stops: 3, blur: 60 },
      high: { stops: 4, blur: 40 },
    };

    const config = complexityMap[complexity] || complexityMap.medium;

    // Create multiple radial gradients at different positions for a mesh effect
    const gradients = [];
    const positions = [
      ["0%", "0%"],
      ["100%", "0%"],
      ["50%", "50%"],
      ["0%", "100%"],
      ["100%", "100%"],
    ];

    for (let i = 0; i < Math.min(config.stops + 1, meshColors.length); i++) {
      const color = meshColors[i % meshColors.length];
      const pos = positions[i % positions.length];
      // Apply opacity to each gradient color
      const colorWithOpacity =
        opacity !== 1.0 ? hexToRgba(color, opacity) : color;
      gradients.push(
        `radial-gradient(circle at ${pos[0]} ${pos[1]}, ${colorWithOpacity} 0%, transparent ${config.blur}%)`
      );
    }

    const style = {
      background: meshColors[0], // Fallback solid color
      backgroundImage: gradients.join(", "),
      backgroundRepeat: "no-repeat",
    };

    if (animated) {
      // For animation, we need larger background size to allow movement
      style.backgroundSize = "200% 200%";
      style.backgroundPosition = "0% 0%";
      style.animation = "meshGradientAnimation 40s ease-in-out infinite";
    } else {
      style.backgroundSize = "100% 100%";
      style.backgroundPosition = "center";
    }

    return style;
  };

  /**
   * Get the CSS style for the background based on current preferences
   */
  const getBackgroundStyle = (isDarkMode) => {
    const style = {};
    const currentType = preferences.type;

    // Get settings for the current background type
    const getTypeSetting = (key, defaultValue) => {
      if (preferences.typeSettings && preferences.typeSettings[currentType]) {
        const value = preferences.typeSettings[currentType][key];
        return value !== undefined ? value : defaultValue;
      }
      return defaultValue;
    };

    // Default colors based on theme mode
    const defaultLightColor = "#F8F6F1";
    const defaultDarkColor = "#232530";

    // Helper to validate and sanitize URLs
    const isValidUrl = (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    };

    switch (currentType) {
      case "timeGradient": {
        const opacity = getTypeSetting("opacity", 1.0);
        const timeStyle = generateTimeBasedGradient(opacity);
        Object.assign(style, timeStyle);
        break;
      }

      case "meshGradient": {
        const meshColors = getTypeSetting(
          "meshColors",
          DEFAULT_PREFERENCES.typeSettings.meshGradient.meshColors
        );
        const complexity = getTypeSetting(
          "meshComplexity",
          DEFAULT_PREFERENCES.typeSettings.meshGradient.meshComplexity
        );
        const animated = getTypeSetting(
          "meshAnimated",
          DEFAULT_PREFERENCES.typeSettings.meshGradient.meshAnimated
        );
        const opacity = getTypeSetting("opacity", 1.0);

        const meshStyle = generateMeshGradient(
          meshColors,
          complexity,
          animated,
          opacity
        );
        Object.assign(style, meshStyle);
        break;
      }

      case "gradient": {
        const color = getTypeSetting(
          "color",
          isDarkMode ? defaultDarkColor : defaultLightColor
        );
        const secondaryColor = getTypeSetting(
          "secondaryColor",
          isDarkMode ? "#1a1b26" : "#FFFFFF"
        );
        const direction = getTypeSetting(
          "gradientDirection",
          "to bottom right"
        );
        const opacity = getTypeSetting("opacity", 1.0);

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

      case "image": {
        const imageUrl = getTypeSetting("imageUrl", "");
        const blur = getTypeSetting("blur", false);
        const opacity = getTypeSetting("opacity", 1.0);
        const baseColor = isDarkMode ? defaultDarkColor : defaultLightColor;

        if (imageUrl && isValidUrl(imageUrl)) {
          style.backgroundImage = `url(${encodeURI(imageUrl)})`;
          style.backgroundSize = "cover";
          style.backgroundPosition = "center";
          style.backgroundRepeat = "no-repeat";
          if (blur) {
            style.filter = "blur(5px)";
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
      }

      case "pictureOfDay": {
        const blur = getTypeSetting("blur", false);
        const opacity = getTypeSetting("opacity", 1.0);
        const baseColor = isDarkMode ? defaultDarkColor : defaultLightColor;

        // Use Lorem Picsum with today's date as seed for daily-changing image, matching screen size
        const todaySeed = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        const picsumUrl = `https://picsum.photos/seed/${todaySeed}/${window.screen.width}/${window.screen.height}`;
        if (isValidUrl(picsumUrl)) {
          style.backgroundImage = `url(${encodeURI(picsumUrl)})`;
          style.backgroundSize = "cover";
          style.backgroundPosition = "center";
          style.backgroundRepeat = "no-repeat";
          if (blur) {
            style.filter = "blur(5px)";
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
      }

      case "bingImageOfDay": {
        const blur = getTypeSetting("blur", false);
        const opacity = getTypeSetting("opacity", 1.0);

        // Bing Image of the Day will be fetched asynchronously
        // The actual image URL will be set by the Background component
        // For now, set a placeholder style
        style.backgroundSize = "cover";
        style.backgroundPosition = "center";
        style.backgroundRepeat = "no-repeat";
        if (blur) {
          style.filter = "blur(5px)";
        }
        style.opacity = opacity;
        break;
      }

      case "geopattern": {
        const color = getTypeSetting(
          "color",
          isDarkMode ? defaultDarkColor : defaultLightColor
        );
        const seed = getTypeSetting("geopatternSeed", "startpunkt");
        const opacity = getTypeSetting("opacity", 1.0);

        // Generate a geopattern based on seed
        const pattern = GeoPattern.generate(seed, {
          color: color,
        });

        style.backgroundImage = pattern.toDataUrl();
        style.backgroundSize = "auto";
        style.backgroundPosition = "center";
        style.backgroundRepeat = "repeat";

        // Apply opacity if needed
        if (opacity !== 1.0) {
          style.opacity = opacity;
        }
        break;
      }

      case "theme":
        // Use the built-in theme colors (set via CSS variables)
        // The theme automatically handles light/dark mode
        // Return empty style to let the theme background show through
        break;

      case "solid":
      default: {
        const color = getTypeSetting(
          "color",
          isDarkMode ? defaultDarkColor : defaultLightColor
        );
        const opacity = getTypeSetting("opacity", 1.0);

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
    getContentOverlayOpacity: () => {
      const currentType = preferences.type;
      if (preferences.typeSettings && preferences.typeSettings[currentType]) {
        const value = preferences.typeSettings[currentType].contentOverlayOpacity;
        return value !== undefined ? value : DEFAULT_PREFERENCES.typeSettings[currentType]?.contentOverlayOpacity ?? -0.6;
      }
      return DEFAULT_PREFERENCES.typeSettings[currentType]?.contentOverlayOpacity ?? -0.6;
    },
  };
}

export default useBackgroundPreferences;

import { useEffect } from 'preact/hooks';
import { useMediaQuery } from 'react-responsive';
import { useLocalStorage } from '@rehooks/local-storage';
import { useBackgroundPreferences } from './useBackgroundPreferences';

/**
 * Background component that applies customizable backgrounds to the page
 * Supports solid colors, gradients, images, and picture of the day
 */
export function Background() {
  const backgroundPrefs = useBackgroundPreferences();
  const [theme] = useLocalStorage('theme', 'auto');
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);
  
  // Determine if dark mode is active
  const isDarkMode = theme === 'dark' || (theme === 'auto' && systemPrefersDark);

  // Helper to validate URLs
  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const style = backgroundPrefs.getBackgroundStyle(isDarkMode);
    const isImageType = backgroundPrefs.preferences.type === 'image' || 
                        backgroundPrefs.preferences.type === 'pictureOfDay' ||
                        backgroundPrefs.preferences.type === 'geopattern';
    
    // Get or create background overlay for images (to handle opacity and blur)
    let overlay = document.getElementById('background-overlay');
    
    if (isImageType) {
      // For images, use an overlay to properly handle opacity without affecting content
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'background-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '-1';
        overlay.style.pointerEvents = 'none';
        document.body.insertBefore(overlay, document.body.firstChild);
      }
      
      // Handle different background types
      if (backgroundPrefs.preferences.type === 'geopattern') {
        // Geopattern - apply the generated pattern
        overlay.style.backgroundImage = style.backgroundImage;
        overlay.style.backgroundSize = style.backgroundSize;
        overlay.style.backgroundPosition = style.backgroundPosition;
        overlay.style.backgroundRepeat = style.backgroundRepeat;
        overlay.style.opacity = style.opacity || 1.0;
        overlay.style.filter = 'none';
        overlay.style.transform = 'none';
        
        // Clear body background
        document.body.style.backgroundImage = 'none';
        document.body.style.background = 'none';
        document.body.style.backgroundColor = 'transparent';
      } else {
        // Picture of Day or Custom Image
        const todaySeed = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const imageUrl = backgroundPrefs.preferences.type === 'pictureOfDay' 
          ? `https://picsum.photos/seed/${todaySeed}/${window.screen.width}/${window.screen.height}`
          : backgroundPrefs.preferences.imageUrl;
        
        // Validate URL before using
        if (isValidUrl(imageUrl)) {
          overlay.style.backgroundImage = `url(${CSS.escape(imageUrl)})`;
          overlay.style.backgroundSize = 'cover';
          overlay.style.backgroundPosition = 'center';
          overlay.style.backgroundRepeat = 'no-repeat';
          
          // Apply opacity from style (for images)
          overlay.style.opacity = style.opacity || 1.0;
          
          // Apply blur if enabled
          if (backgroundPrefs.preferences.blur) {
            overlay.style.filter = 'blur(10px)';
            overlay.style.transform = 'scale(1.1)'; // Prevent blur edges from showing
          } else {
            overlay.style.filter = 'none';
            overlay.style.transform = 'none';
          }
          
          // Clear body background to prevent doubling
          document.body.style.backgroundImage = 'none';
          document.body.style.background = 'none';
          document.body.style.backgroundColor = 'transparent';
        } else {
          // Invalid URL, remove overlay and fall back to solid color
          if (overlay) {
            overlay.remove();
          }
          document.body.style.backgroundColor = style.backgroundColor || '';
        }
      }
    } else {
      // For solid colors and gradients, apply directly to body
      // Remove overlay if it exists
      if (overlay) {
        overlay.remove();
      }
      
      // Clear any previous background settings
      document.body.style.backgroundImage = 'none';
      document.body.style.opacity = ''; // Don't apply opacity to body for non-images
      
      // Apply background styles to body
      Object.keys(style).forEach(property => {
        // Skip opacity for non-image types (it's already in rgba colors)
        if (property === 'opacity') {
          return;
        }
        
        if (property === 'backgroundImage' || property === 'backgroundSize' || 
            property === 'backgroundPosition' || property === 'backgroundRepeat') {
          document.body.style[property] = style[property];
        } else if (property === 'background') {
          document.body.style.background = style[property];
        } else if (property === 'backgroundColor') {
          document.body.style.backgroundColor = style[property];
        }
      });
    }

    // Cleanup function to remove overlay on unmount
    return () => {
      const existingOverlay = document.getElementById('background-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    };
  }, [backgroundPrefs.preferences, isDarkMode]);

  return null; // This component doesn't render anything
}

export default Background;

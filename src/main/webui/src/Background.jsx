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
    
    // Apply background styles to body
    Object.keys(style).forEach(property => {
      if (property === 'backgroundImage' || property === 'backgroundSize' || 
          property === 'backgroundPosition' || property === 'backgroundRepeat') {
        document.body.style[property] = style[property];
      } else if (property === 'background') {
        document.body.style.background = style[property];
      } else if (property === 'backgroundColor') {
        document.body.style.backgroundColor = style[property];
      }
    });

    // Handle blur by creating an overlay if needed
    let overlay = document.getElementById('background-overlay');
    if (backgroundPrefs.preferences.type === 'image' || backgroundPrefs.preferences.type === 'pictureOfDay') {
      if (backgroundPrefs.preferences.blur) {
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
        
        const imageUrl = backgroundPrefs.preferences.type === 'pictureOfDay' 
          ? 'https://source.unsplash.com/daily?wallpaper'
          : backgroundPrefs.preferences.imageUrl;
        
        // Validate URL before using
        if (isValidUrl(imageUrl)) {
          overlay.style.backgroundImage = `url(${CSS.escape(imageUrl)})`;
          overlay.style.backgroundSize = 'cover';
          overlay.style.backgroundPosition = 'center';
          overlay.style.backgroundRepeat = 'no-repeat';
          overlay.style.filter = 'blur(10px)';
          overlay.style.transform = 'scale(1.1)'; // Prevent blur edges from showing
          
          // Clear body background to prevent doubling
          document.body.style.backgroundImage = 'none';
          document.body.style.background = 'none';
        }
      } else if (overlay) {
        overlay.remove();
      }
    } else if (overlay) {
      overlay.remove();
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

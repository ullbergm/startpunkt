import { useEffect } from 'preact/hooks';
import { useBackgroundPreferences } from './useBackgroundPreferences';

/**
 * ContentOverlay component applies a translucent background overlay to the main content area
 * to improve readability when using busy backgrounds (images, gradients, patterns, etc.)
 * Also switches theme colors based on overlay darkness
 * 
 * - Does NOT apply to 'theme' background type
 * - Middle position (0) = disabled (no overlay)
 * - White side (< 0) = white overlay with light theme colors
 * - Black side (> 0) = black overlay with dark theme colors
 */
export function ContentOverlay({ children }) {
  const { preferences, getTypePreference } = useBackgroundPreferences();

  useEffect(() => {
    // Don't apply overlay for theme backgrounds
    if (preferences.type === 'theme') {
      // Remove overlay styling
      const mainElement = document.getElementById('main-content');
      if (mainElement) {
        mainElement.style.backgroundColor = '';
        mainElement.style.borderRadius = '';
        mainElement.style.padding = '';
        mainElement.style.backdropFilter = '';
        mainElement.style.transition = '';
      }
      
      // Reset theme hint
      window.dispatchEvent(new CustomEvent('overlay-theme-hint', {
        detail: { theme: null }
      }));
      return;
    }

    const opacity = getTypePreference('contentOverlayOpacity') ?? 0.7;
    
    // Middle position (0) = disabled, no overlay at all
    if (opacity === 0) {
      const mainElement = document.getElementById('main-content');
      if (mainElement) {
        mainElement.style.backgroundColor = '';
        mainElement.style.borderRadius = '';
        mainElement.style.padding = '';
        mainElement.style.backdropFilter = '';
        mainElement.style.transition = '';
      }
      
      // Reset theme hint
      window.dispatchEvent(new CustomEvent('overlay-theme-hint', {
        detail: { theme: null }
      }));
      return;
    }
    
    // Switch theme based on overlay position
    // White side (opacity < 0) = use light theme colors
    // Black side (opacity > 0) = use dark theme colors
    const shouldUseDarkTheme = opacity > 0;
    
    // Dispatch theme hint
    window.dispatchEvent(new CustomEvent('overlay-theme-hint', {
      detail: { theme: shouldUseDarkTheme ? 'dark' : 'light' }
    }));
    
    // Determine color and opacity based on slider value
    // Negative values = white, Positive values = black
    let backgroundColor;
    if (opacity < 0) {
      // White with opacity (opacity ranges from -1 to 0)
      const whiteOpacity = Math.abs(opacity);
      backgroundColor = `rgba(255, 255, 255, ${whiteOpacity})`;
    } else {
      // Black with opacity (opacity ranges from 0 to 1)
      backgroundColor = `rgba(0, 0, 0, ${opacity})`;
    }
    
    // Apply overlay styling to main content
    const mainElement = document.getElementById('main-content');
    if (mainElement) {
      mainElement.style.backgroundColor = backgroundColor;
      mainElement.style.borderRadius = '0.5rem';
      mainElement.style.padding = '1.5rem';
      mainElement.style.backdropFilter = 'blur(4px)';
      mainElement.style.transition = 'background-color 0.3s ease';
    }
  }, [preferences.type, preferences.typePreferences]);

  // This component doesn't render anything - it just applies overlay logic
  return null;
}

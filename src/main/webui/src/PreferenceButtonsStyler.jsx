import { useEffect } from 'preact/hooks';
import { useBackgroundPreferences } from './useBackgroundPreferences';

/**
 * PreferenceButtonsStyler component applies the content overlay opacity
 * to the preference buttons (Background, Layout, Accessibility, WebSocket heart)
 * so they follow the same overlay styling as the main content.
 * 
 * Opacity behavior:
 * - Theme backgrounds: Default white button styling
 * - 0 (center): Fully transparent with icon only, subtle hover effect
 * - Negative values: White background with opacity (light theme)
 * - Positive values: Black background with opacity (dark theme)
 * 
 * This component doesn't render anything - it just applies dynamic styles.
 */
export function PreferenceButtonsStyler() {
  const { preferences, getTypePreference } = useBackgroundPreferences();

  useEffect(() => {
    // Query buttons once at the start
    const buttons = document.querySelectorAll(
      '.bd-layout-toggle .btn, .bd-background-toggle .btn, .bd-accessibility-toggle .btn, .bd-websocket-heart .btn'
    );
    
    // Don't apply overlay styling for theme backgrounds
    if (preferences.type === 'theme') {
      // Reset to default white background styling
      buttons.forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.boxShadow = '';
        btn.style.backdropFilter = '';
      });
      return;
    }

    const opacity = getTypePreference('contentOverlayOpacity') ?? 0.7;
    
    // Middle position (0) = transparent, truly transparent with only icons visible
    if (opacity === 0) {
      buttons.forEach(btn => {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#712cf9'; // Keep primary purple for icon/text
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
        btn.style.backdropFilter = 'none';
        btn.style.transition = 'background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease';
      });
      
      // Add subtle hover effect for transparent buttons
      const handleMouseEnter = (e) => {
        e.currentTarget.style.backgroundColor = 'rgba(113, 44, 249, 0.1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(113, 44, 249, 0.2)';
      };

      const handleMouseLeave = (e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.boxShadow = 'none';
      };

      buttons.forEach(btn => {
        btn.addEventListener('mouseenter', handleMouseEnter);
        btn.addEventListener('mouseleave', handleMouseLeave);
      });

      return () => {
        buttons.forEach(btn => {
          btn.removeEventListener('mouseenter', handleMouseEnter);
          btn.removeEventListener('mouseleave', handleMouseLeave);
        });
      };
    }
    
    // Determine background color and text color based on slider value
    let backgroundColor;
    let textColor;
    
    if (opacity < 0) {
      // White side - white background with opacity
      const whiteOpacity = Math.abs(opacity);
      backgroundColor = `rgba(255, 255, 255, ${whiteOpacity})`;
      textColor = '#712cf9'; // Keep the primary purple color for contrast
    } else {
      // Black side - black background with opacity
      backgroundColor = `rgba(0, 0, 0, ${opacity})`;
      textColor = '#ffffff'; // Use white text for contrast on dark background
    }
    
    // Apply styling to all preference buttons
    buttons.forEach(btn => {
      btn.style.backgroundColor = backgroundColor;
      btn.style.color = textColor;
      btn.style.borderColor = opacity < 0 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
      btn.style.boxShadow = opacity < 0 
        ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
        : '0 2px 8px rgba(0, 0, 0, 0.4)';
      btn.style.backdropFilter = 'blur(4px)';
      btn.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';
    });

    // Add hover effect handlers
    const handleMouseEnter = (e) => {
      if (opacity < 0) {
        e.currentTarget.style.backgroundColor = `rgba(248, 249, 250, ${Math.abs(opacity)})`;
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      } else {
        e.currentTarget.style.backgroundColor = `rgba(50, 50, 50, ${opacity})`;
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
      }
    };

    const handleMouseLeave = (e) => {
      e.currentTarget.style.backgroundColor = backgroundColor;
      e.currentTarget.style.boxShadow = opacity < 0 
        ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
        : '0 2px 8px rgba(0, 0, 0, 0.4)';
    };

    // Attach event listeners
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', handleMouseEnter);
      btn.addEventListener('mouseleave', handleMouseLeave);
    });

    // Cleanup function - removes event listeners from the same buttons captured above
    return () => {
      buttons.forEach(btn => {
        btn.removeEventListener('mouseenter', handleMouseEnter);
        btn.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [preferences.type, preferences.typePreferences]);

  // This component doesn't render anything
  return null;
}

import { useEffect, useState } from 'preact/hooks';
import { useMediaQuery } from 'react-responsive';
import { useLocalStorage } from '@rehooks/local-storage';
import { useBackgroundPreferences } from './useBackgroundPreferences';
import { client } from './graphql/client';
import { BING_IMAGE_QUERY } from './graphql/queries';

/**
 * Background component that applies customizable backgrounds to the page
 * Supports solid colors, gradients, images, picture of the day, and Bing image of the day
 */
export function Background() {
  const backgroundPrefs = useBackgroundPreferences();
  const [theme] = useLocalStorage('theme', 'auto');
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);
  const [bingImageUrl, setBingImageUrl] = useState(null);
  
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

  // Fetch Bing Image of the Day when type is pictureOfDay and provider is bing
  useEffect(() => {
    if (backgroundPrefs.preferences.type === 'pictureOfDay' && 
        backgroundPrefs.preferences.pictureProvider === 'bing') {
      // Fetch image via GraphQL - server-side caching and browser HTTP cache will handle performance
      const fetchBingImage = async () => {
        try {
          const result = await client.query(BING_IMAGE_QUERY, {
            width: window.screen.width,
            height: window.screen.height
          }).toPromise();

          if (result.data && result.data.bingImageOfDay) {
            setBingImageUrl(result.data.bingImageOfDay.imageUrl);
          } else if (result.error) {
            console.error('GraphQL error fetching Bing image:', result.error);
          }
        } catch (error) {
          console.error('Error fetching Bing image:', error);
        }
      };

      fetchBingImage();
    }
  }, [backgroundPrefs.preferences.type, backgroundPrefs.preferences.pictureProvider]);

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
        let imageUrl;
        
        if (backgroundPrefs.preferences.type === 'pictureOfDay') {
          // Check which provider to use
          const provider = backgroundPrefs.preferences.pictureProvider || 'picsum';
          if (provider === 'bing') {
            imageUrl = bingImageUrl; // Use the fetched Bing image URL
          } else {
            // Default to Lorem Picsum
            imageUrl = `https://picsum.photos/seed/${todaySeed}/${window.screen.width}/${window.screen.height}`;
          }
        } else {
          imageUrl = backgroundPrefs.preferences.imageUrl;
        }
        
        // Validate URL before using
        if (imageUrl && isValidUrl(imageUrl)) {
          overlay.style.backgroundImage = `url(${encodeURI(imageUrl)})`;
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
      // For solid colors, gradients, theme, timeGradient, meshGradient - apply directly to body
      // Remove overlay if it exists
      if (overlay) {
        overlay.remove();
      }
      
      // Clear any previous background settings
      document.body.style.backgroundImage = 'none';
      document.body.style.opacity = ''; // Don't apply opacity to body for non-images
      
      // For 'theme' type, clear background to let theme colors show through
      if (backgroundPrefs.preferences.type === 'theme') {
        document.body.style.background = '';
        document.body.style.backgroundColor = '';
        document.body.style.animation = '';
      } else {
        // Apply background styles to body for solid/gradient/timeGradient/meshGradient
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
          } else if (property === 'animation') {
            // Handle mesh gradient animation
            document.body.style.animation = style[property];
          }
        });
        
        // Add keyframes for mesh gradient animation if needed
        if (backgroundPrefs.preferences.type === 'meshGradient' && backgroundPrefs.preferences.meshAnimated) {
          let styleSheet = document.getElementById('background-animation-styles');
          if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'background-animation-styles';
            document.head.appendChild(styleSheet);
          }
          styleSheet.textContent = `
            @keyframes meshGradientAnimation {
              0% {
                background-position: 0% 0%;
              }
              12% {
                background-position: 85% 15%;
              }
              28% {
                background-position: 92% 72%;
              }
              45% {
                background-position: 23% 88%;
              }
              62% {
                background-position: 8% 45%;
              }
              78% {
                background-position: 67% 12%;
              }
              92% {
                background-position: 18% 65%;
              }
              100% {
                background-position: 0% 0%;
              }
            }
          `;
        } else {
          // Remove animation keyframes if not needed
          const styleSheet = document.getElementById('background-animation-styles');
          if (styleSheet) {
            styleSheet.remove();
          }
          document.body.style.animation = '';
        }
      }
    }

    // Cleanup function to remove overlay and animation styles on unmount
    return () => {
      const existingOverlay = document.getElementById('background-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      const styleSheet = document.getElementById('background-animation-styles');
      if (styleSheet) {
        styleSheet.remove();
      }
    };
  }, [backgroundPrefs.preferences, isDarkMode, bingImageUrl]);

  return null; // This component doesn't render anything
}

export default Background;

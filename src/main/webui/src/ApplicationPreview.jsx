import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import './ApplicationPreview.scss';

/**
 * ApplicationPreview component displays a screenshot preview of an application
 * after the user hovers over it for a specified delay period.
 * 
 * Screenshots are captured server-side to avoid CORS and CSP restrictions.
 * 
 * @param {Object} props - Component props
 * @param {string} props.url - The URL to preview
 * @param {string} props.name - The name of the application
 * @param {boolean} props.isHovering - Whether the parent element is being hovered
 * @param {number} props.delay - Delay in milliseconds before showing preview (default: 5000)
 * @param {boolean} props.enabled - Whether preview feature is enabled (default: true)
 */
export function ApplicationPreview({ url, name, isHovering, delay = 5000, enabled = true }) {
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const containerRef = useRef(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);

  // Memoize the screenshot URL to prevent re-fetching
  const screenshotUrl = useMemo(() => 
    `/api/screenshots?url=${encodeURIComponent(url)}`,
    [url]
  );

  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      
      // Update preview position if it's visible
      if (containerRef.current && showPreview) {
        containerRef.current.style.left = `${e.clientX + 20}px`;
        containerRef.current.style.top = `${e.clientY + 20}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showPreview]);

  // Set initial position when preview becomes visible
  useEffect(() => {
    if (showPreview && containerRef.current) {
      containerRef.current.style.left = `${mousePositionRef.current.x + 20}px`;
      containerRef.current.style.top = `${mousePositionRef.current.y + 20}px`;
    }
  }, [showPreview]);

  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!enabled || !url) {
      setShowPreview(false);
      setIsLoading(false);
      setImageLoaded(false);
      setError(null);
      return;
    }

    if (!isHovering && !showPreview) {
      // Not hovering and preview not shown - do nothing
      return;
    }

    if (!isHovering && showPreview) {
      // Stopped hovering - close preview immediately
      setShowPreview(false);
      setIsLoading(false);
      setImageLoaded(false);
      setError(null);
      return;
    }

    // Start hovering - start the delay timer
    timerRef.current = setTimeout(() => {
      setShowPreview(true);
      setError(null);
      // Note: Don't set isLoading here - let the image element handle it
      // Image will show immediately if cached, or trigger onLoad if not
    }, delay);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isHovering, url, delay, enabled, name, showPreview]);

  const handleImageLoad = (e) => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  const handleImageError = async (e) => {
    setIsLoading(false);
    setImageLoaded(false);
    
    // Try to fetch the error message from the server
    try {
      const response = await fetch(screenshotUrl);
      if (!response.ok) {
        const errorText = await response.text();
        // Check for specific error messages
        if (errorText.includes('authentication') || errorText.includes('auth') || errorText.includes('login')) {
          setError('Preview unavailable - site requires authentication');
        } else if (errorText.includes('blank') || errorText.includes('unavailable')) {
          setError('Preview unavailable - site may require authentication');
        } else if (errorText.includes('unreachable')) {
          setError('Preview unavailable - site is unreachable');
        } else if (errorText.includes('HTTP 401') || errorText.includes('HTTP 403')) {
          setError('Preview unavailable - authentication required');
        } else {
          setError('Preview unavailable');
        }
        return;
      }
    } catch (err) {
      // Network error or other issue
    }
    setError('Failed to load preview');
  };

  // Check if image is already cached
  useEffect(() => {
    if (showPreview && imgRef.current) {
      if (imgRef.current.complete) {
        // Image is cached, show it immediately
        setImageLoaded(true);
        setIsLoading(false);
      } else {
        // Image is loading
        setImageLoaded(false);
        setIsLoading(true);
      }
    }
  }, [showPreview, screenshotUrl]);

  if (!enabled || !showPreview) {
    return null;
  }

  // Calculate preview position (offset from cursor) - only on initial render
  const previewStyle = useMemo(() => ({
    left: '0px',
    top: '0px'
  }), []);

  return createPortal(
    <div 
      class="application-preview-container"
      style={previewStyle}
      ref={containerRef}
      role="dialog"
      aria-label={`Preview of ${name || url}`}
      aria-live="polite"
    >
      <div class="application-preview-content">
        {isLoading && !imageLoaded && (
          <div class="application-preview-loading" role="status">
            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            <span>Loading preview...</span>
          </div>
        )}
        {error && (
          <div class="application-preview-error" role="alert">
            <div class="error-icon">🔒</div>
            <div class="error-message">{error}</div>
            <div class="error-hint">The site may require login or have access restrictions</div>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open {name || 'site'} directly →
            </a>
          </div>
        )}
        {!error && (
          <img
            ref={imgRef}
            src={screenshotUrl}
            alt={`Screenshot of ${name || url}`}
            class="application-preview-image"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: (isLoading && !imageLoaded) ? 'none' : 'block' }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

export default ApplicationPreview;

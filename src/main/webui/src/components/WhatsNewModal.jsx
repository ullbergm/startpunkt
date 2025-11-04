/**
 * What's New Modal - Shows changelog when app version changes
 * Displays new features, improvements, and bug fixes for each version
 * Fetches changelog from GitHub releases API
 */

import { useEffect, useState } from 'preact/hooks';
import { Text } from 'preact-i18n';
import { getLatestRelease } from '../services/changelogService';
import './WhatsNewModal.scss';

/**
 * Get stored last seen version from localStorage
 */
function getLastSeenVersion() {
  try {
    return localStorage.getItem('startpunkt-last-seen-version') || null;
  } catch (e) {
    console.error('Failed to read last seen version:', e);
    return null;
  }
}

/**
 * Store version as seen in localStorage
 */
function setLastSeenVersion(version) {
  try {
    localStorage.setItem('startpunkt-last-seen-version', version);
  } catch (e) {
    console.error('Failed to store last seen version:', e);
  }
}

/**
 * Compare version strings (semantic versioning)
 */
function isNewerVersion(current, last) {
  if (!last) return true;
  
  const parseCurrent = current.split('.').map(Number);
  const parseLast = last.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const c = parseCurrent[i] || 0;
    const l = parseLast[i] || 0;
    if (c > l) return true;
    if (c < l) return false;
  }
  
  return false;
}

/**
 * Get icon for change type
 */
function getChangeTypeIcon(type) {
  switch (type) {
    case 'feature':
      return '✨';
    case 'improvement':
      return '🚀';
    case 'bugfix':
      return '🐛';
    case 'security':
      return '🔒';
    default:
      return '📝';
  }
}

/**
 * What's New Modal Component
 */
export function WhatsNewModal({ release, onClose }) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Show loading state if no release data
  if (!release) {
    return null;
  }
  
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  const handleClose = () => {
    setLastSeenVersion(release.version);
    onClose();
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };
  
  return (
    <div 
      class="whats-new-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div class="whats-new-modal">
        <div class="whats-new-header">
          <div>
            <h2 id="whats-new-title" class="whats-new-title">
              <span class="whats-new-emoji">🎉</span>
              <Text id="whatsNew.title">What's New</Text>
            </h2>
            <p class="whats-new-version">
              Version {release.version} • {release.date}
            </p>
          </div>
          <button
            class="whats-new-close"
            onClick={handleClose}
            aria-label="Close what's new dialog"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        <div class="whats-new-content">
          {/* Highlights Section */}
          <div class="whats-new-highlights">
            {release.highlights.map((highlight, index) => (
              <div key={index} class="whats-new-highlight">
                <div class="whats-new-highlight-icon">
                  {getChangeTypeIcon(highlight.type)}
                </div>
                <div class="whats-new-highlight-content">
                  <h3 class="whats-new-highlight-title">{highlight.title}</h3>
                  <p class="whats-new-highlight-description">{highlight.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Details Toggle */}
          <button
            class="whats-new-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            type="button"
          >
            <span>{showDetails ? '▼' : '▶'}</span>
            <Text id="whatsNew.allChanges">All Changes</Text>
            <span class="whats-new-badge">{release.allChanges.length}</span>
          </button>
          
          {/* All Changes List */}
          {showDetails && (
            <ul class="whats-new-changes-list">
              {release.allChanges.map((change, index) => (
                <li key={index} class="whats-new-change-item">
                  <span class="whats-new-change-bullet">•</span>
                  {change}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div class="whats-new-footer">
          <button
            class="whats-new-button whats-new-button-primary"
            onClick={handleClose}
            type="button"
          >
            <Text id="whatsNew.gotIt">Got it, thanks!</Text>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage What's New modal state
 * Fetches latest release from GitHub and determines if modal should show
 */
export function useWhatsNew() {
  const [shouldShow, setShouldShow] = useState(false);
  const [latestRelease, setLatestRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function checkForNewVersion() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch latest release from GitHub
        const release = await getLatestRelease();
        
        if (!release) {
          console.warn('No release data available');
          setLoading(false);
          return;
        }
        
        setLatestRelease(release);
        
        const lastSeenVersion = getLastSeenVersion();
        const currentVersion = release.version;
        
        // Show modal if:
        // 1. Never seen before (first time user)
        // 2. Current version is newer than last seen version
        if (isNewerVersion(currentVersion, lastSeenVersion)) {
          // Small delay to let the app load first
          setTimeout(() => {
            setShouldShow(true);
          }, 1000);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to check for new version:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    checkForNewVersion();
  }, []);
  
  const hideModal = () => {
    setShouldShow(false);
  };
  
  return { 
    shouldShow, 
    latestRelease, 
    loading, 
    error, 
    hideModal 
  };
}

export default WhatsNewModal;

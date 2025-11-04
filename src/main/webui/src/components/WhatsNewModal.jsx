/**
 * What's New Modal - Shows changelog when app version changes
 * Displays new features, improvements, and bug fixes for each version
 * Fetches changelog from GitHub releases API
 */

import { useEffect, useState } from 'preact/hooks';
import { Text } from 'preact-i18n';
import { getNewReleasesSince } from '../services/changelogService';
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
 * Now supports displaying multiple releases
 */
export function WhatsNewModal({ releases, onClose }) {
  const [showDetails, setShowDetails] = useState({});
  
  // Show loading state if no release data
  if (!releases || releases.length === 0) {
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
    // Mark the latest version as seen
    setLastSeenVersion(releases[0].version);
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
  
  const toggleDetails = (version) => {
    setShowDetails(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
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
              {releases.length === 1 
                ? `Version ${releases[0].version} • ${releases[0].date}`
                : `${releases.length} new versions`
              }
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
          {releases.map((release, releaseIndex) => (
            <div key={release.version} class="whats-new-release">
              {releases.length > 1 && (
                <div class="whats-new-release-header">
                  <h3 class="whats-new-release-version">
                    Version {release.version}
                  </h3>
                  <span class="whats-new-release-date">{release.date}</span>
                </div>
              )}
              
              {/* Highlights Section */}
              {release.highlights.length > 0 && (
                <div class="whats-new-highlights">
                  {release.highlights.map((highlight, index) => (
                    <div key={index} class="whats-new-highlight">
                      <div class="whats-new-highlight-icon">
                        {getChangeTypeIcon(highlight.type)}
                      </div>
                      <div class="whats-new-highlight-content">
                        <h3 
                          class="whats-new-highlight-title"
                          dangerouslySetInnerHTML={{ __html: highlight.title }}
                        />
                        <p 
                          class="whats-new-highlight-description"
                          dangerouslySetInnerHTML={{ __html: highlight.description }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Details Toggle */}
              {release.allChanges.length > 0 && (
                <>
                  <button
                    class="whats-new-details-toggle"
                    onClick={() => toggleDetails(release.version)}
                    aria-expanded={showDetails[release.version]}
                    type="button"
                  >
                    <span>{showDetails[release.version] ? '▼' : '▶'}</span>
                    <Text id="whatsNew.allChanges">All Changes</Text>
                    <span class="whats-new-badge">{release.allChanges.length}</span>
                  </button>
                  
                  {/* All Changes List */}
                  {showDetails[release.version] && (
                    <ul class="whats-new-changes-list">
                      {release.allChanges.map((change, index) => (
                        <li key={index} class="whats-new-change-item">
                          <span class="whats-new-change-bullet">•</span>
                          <span dangerouslySetInnerHTML={{ __html: change }} />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              
              {/* Separator between releases */}
              {releaseIndex < releases.length - 1 && (
                <hr class="whats-new-separator" />
              )}
            </div>
          ))}
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
 * Fetches new releases since last seen version from GitHub
 */
export function useWhatsNew() {
  const [shouldShow, setShouldShow] = useState(false);
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function checkForNewVersions() {
      try {
        setLoading(true);
        setError(null);
        
        const lastSeenVersion = getLastSeenVersion();
        
        // Fetch new releases since last seen version
        // If never seen before, this returns only the latest release
        const releases = await getNewReleasesSince(lastSeenVersion);
        
        if (!releases || releases.length === 0) {
          console.log('[WhatsNew] No new releases to show');
          setLoading(false);
          return;
        }
        
        console.log(`[WhatsNew] Found ${releases.length} new release(s) since ${lastSeenVersion || 'never'}`);
        setNewReleases(releases);
        
        // Show modal if there are new releases
        // Small delay to let the app load first
        setTimeout(() => {
          setShouldShow(true);
        }, 1000);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to check for new versions:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    checkForNewVersions();
  }, []);
  
  const hideModal = () => {
    setShouldShow(false);
  };
  
  return { 
    shouldShow, 
    releases: newReleases, 
    loading, 
    error, 
    hideModal 
  };
}

export default WhatsNewModal;

/**
 * What's New Modal - Shows changelog when app version changes
 * Displays new features, improvements, and bug fixes for each version
 */

import { useEffect, useState } from 'preact/hooks';
import { Text } from 'preact-i18n';
import './WhatsNewModal.scss';

/**
 * Changelog data structure
 * Add new versions at the top of the array
 */
const CHANGELOG = [
  {
    version: '4.1.0',
    date: '2025-11-03',
    highlights: [
      {
        type: 'feature',
        title: 'Tailwind-Inspired Skeleton Loading',
        description: 'Beautiful shimmer animations during data loading with utility-first styling'
      },
      {
        type: 'improvement',
        title: 'Enhanced Form Validation',
        description: 'Real-time field validation with visual feedback in application and bookmark editors'
      },
      {
        type: 'improvement',
        title: 'Improved Accessibility',
        description: 'Better ARIA labels, keyboard navigation, and screen reader support'
      }
    ],
    allChanges: [
      'Added Tailwind CSS-inspired utility classes',
      'Implemented skeleton loading components with shimmer animation',
      'Real-time form validation with field-level error messages',
      'Visual error states in all form inputs',
      'Helper text for all form fields',
      'Changed targetBlank default to false for security',
      'Standardized class vs className usage across components',
      'Enhanced dark mode support for skeleton loading',
      'Improved high contrast mode accessibility',
      'Support for reduced motion preferences'
    ]
  },
  {
    version: '4.0.0',
    date: '2025-10-15',
    highlights: [
      {
        type: 'feature',
        title: 'GraphQL API',
        description: 'New GraphQL endpoint with real-time subscriptions'
      },
      {
        type: 'feature',
        title: 'WebSocket Support',
        description: 'Live updates without page refresh'
      }
    ],
    allChanges: [
      'Migrated from REST to GraphQL API',
      'Added real-time updates via WebSocket subscriptions',
      'Improved performance with optimized queries',
      'Better error handling and retry logic'
    ]
  }
];

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
export function WhatsNewModal({ currentVersion, onClose }) {
  const [showDetails, setShowDetails] = useState(false);
  const latestChangelog = CHANGELOG[0];
  
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  const handleClose = () => {
    setLastSeenVersion(currentVersion);
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
              Version {latestChangelog.version} • {latestChangelog.date}
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
            {latestChangelog.highlights.map((highlight, index) => (
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
            <span class="whats-new-badge">{latestChangelog.allChanges.length}</span>
          </button>
          
          {/* All Changes List */}
          {showDetails && (
            <ul class="whats-new-changes-list">
              {latestChangelog.allChanges.map((change, index) => (
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
 */
export function useWhatsNew(currentVersion) {
  const [shouldShow, setShouldShow] = useState(false);
  
  useEffect(() => {
    if (!currentVersion) return;
    
    const lastSeenVersion = getLastSeenVersion();
    
    // Show modal if:
    // 1. Never seen before (first time user)
    // 2. Current version is newer than last seen version
    if (isNewerVersion(currentVersion, lastSeenVersion)) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentVersion]);
  
  const hideModal = () => {
    setShouldShow(false);
  };
  
  return { shouldShow, hideModal };
}

export default WhatsNewModal;

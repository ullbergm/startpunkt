import { useEffect, useState } from 'preact/hooks';
import { useMediaQuery } from 'react-responsive';
import { useLocalStorage } from '@rehooks/local-storage';
import { ApplicationGroup } from '../ApplicationGroup';
import './SkeletonLoader.scss';

/**
 * SkeletonLoader component - displays skeleton UI while data is loading
 * Uses actual ApplicationGroup components with skeleton mode for perfect visual matching
 * Respects theme mode and overlay opacity settings
 *
 * Props:
 * - layoutPrefs: layout preferences object with showDescription, showTags, showStatus, columnCount
 * - backgroundPrefs: background preferences object with type, contentOverlayOpacity
 */
export function SkeletonLoader({ layoutPrefs, backgroundPrefs }) {
  const [theme] = useLocalStorage('theme', 'auto');
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);

  // Determine theme mode
  const isThemeMode = backgroundPrefs?.type === 'theme';
  const isDarkTheme = isThemeMode && (theme === 'dark' || (theme === 'auto' && systemPrefersDark));

  // For non-theme modes, determine skeleton color based on overlay opacity
  const overlayOpacity = backgroundPrefs?.contentOverlayOpacity || 0;
  const shouldUseLightSkeleton = !isThemeMode && overlayOpacity < 0; // Negative = white overlay
  const shouldUseDarkSkeleton = !isThemeMode && overlayOpacity > 0;  // Positive = black overlay

  // Determine final skeleton theme
  const skeletonTheme = isThemeMode
    ? (isDarkTheme ? 'dark' : 'light')
    : shouldUseDarkSkeleton
      ? 'dark'
      : shouldUseLightSkeleton
        ? 'light'
        : 'auto'; // Auto will be neutral gray

  // Create mock application data for skeleton rendering
  // Use realistic names, descriptions, and categories based on actual applications
  const mockApps = [
    // Home Automation category
    { name: 'home assistant', info: 'Home Automation', category: 'Home Automation' },
    { name: 'node-red', info: 'A flow-based development tool.', category: 'Home Automation' },
    { name: 'vacuum', info: 'Home automation', category: 'Home Automation' },
    // Infrastructure category
    { name: 'openshift', info: 'openshift console', category: 'Infrastructure' },
    { name: 'emqx', info: 'MQTT broker', category: 'Infrastructure' },
    { name: 'gatus', info: 'Service health monitoring', category: 'Infrastructure' },
    { name: 'github repo', info: 'GitHub Repo', category: 'Infrastructure' },
    { name: 'gitops', info: 'GitOps', category: 'Infrastructure' },
    { name: 'kasten k10', info: 'Manages backups and disaster recovery', category: 'Infrastructure' },
    { name: 'load balancer', info: 'Load Balancer status', category: 'Infrastructure' },
    { name: 'synology', info: 'Storage', category: 'Infrastructure' },
    { name: 'unifi', info: 'Manage WIFI', category: 'Infrastructure' },
    // Productivity category
    { name: 'cyberchef', info: 'The cyber Swiss Army knife', category: 'Productivity' },
    { name: 'excalidraw', info: 'Collaborative whiteboard tool', category: 'Productivity' },
    { name: 'it-tools', info: 'Useful tools for IT engineers', category: 'Productivity' }
  ];

  const createMockApp = (index) => {
    const mockData = mockApps[index % mockApps.length];
    return {
      name: mockData.name,
      url: '#',
      info: mockData.info,  // Use 'info' to match Application component's expected field
      icon: null,
      tags: 'tag1,tag2',  // Tags should be comma-separated string, not array
      status: 'available'
    };
  };

  // Group apps by category for realistic skeleton structure
  const homeAutomationApps = mockApps
    .filter(app => app.category === 'Home Automation')
    .map((app, i) => createMockApp(mockApps.indexOf(app)));

  const infrastructureApps = mockApps
    .filter(app => app.category === 'Infrastructure')
    .map((app, i) => createMockApp(mockApps.indexOf(app)));

  const productivityApps = mockApps
    .filter(app => app.category === 'Productivity')
    .map((app, i) => createMockApp(mockApps.indexOf(app)));

  // 3 favorites (mix from different categories)
  const favorites = Array.from({ length: 3 }, (_, i) => createMockApp(i));

  return (
    <div class={`skeleton-loader skeleton-theme-${skeletonTheme}`} role="status" aria-live="polite" aria-label="Loading applications and bookmarks">
      <div class="container px-4" id="icon-grid">
        {/* Favorites section - no heading, using ApplicationGroup with isFavorites=true */}
        <ApplicationGroup
          applications={favorites}
          layoutPrefs={layoutPrefs}
          isFavorites={true}
          group={null}
          skeleton={true}
        />

        {/* Home Automation group */}
        <ApplicationGroup
          applications={homeAutomationApps}
          layoutPrefs={layoutPrefs}
          isFavorites={false}
          group="Home Automation"
          skeleton={true}
        />

        {/* Infrastructure group */}
        <ApplicationGroup
          applications={infrastructureApps}
          layoutPrefs={layoutPrefs}
          isFavorites={false}
          group="Infrastructure"
          skeleton={true}
        />

        {/* Productivity group */}
        <ApplicationGroup
          applications={productivityApps}
          layoutPrefs={layoutPrefs}
          isFavorites={false}
          group="Productivity"
          skeleton={true}
        />
      </div>

      {/* Screen reader announcement */}
      <span class="visually-hidden">Loading content, please wait...</span>
    </div>
  );
}

export default SkeletonLoader;

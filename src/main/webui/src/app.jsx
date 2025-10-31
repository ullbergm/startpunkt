import { useEffect, useState } from 'preact/hooks';
import { IntlProvider } from 'preact-i18n';
import { Text } from 'preact-i18n';
import { useLocalStorage } from '@rehooks/local-storage';
import { writeStorage } from '@rehooks/local-storage';
import { useMediaQuery } from 'react-responsive';
import versionCheck from '@version-checker/browser';
import SpotlightSearch from './SpotlightSearch';
import { useServerSentEvents } from './useServerSentEvents';
import { useLayoutPreferences } from './useLayoutPreferences';
import { useBackgroundPreferences } from './useBackgroundPreferences';
import { LayoutSettings } from './LayoutSettings';
import { AccessibilitySettings } from './AccessibilitySettings';

// This is required for Bootstrap to work
import * as bootstrap from 'bootstrap'

import startpunktLogo from './assets/logo.png';
import './app.scss';

import { ApplicationGroupList } from './ApplicationGroupList';
import { BookmarkGroupList } from './BookmarkGroupList';
import { ForkMe } from './ForkMe';
import { Background } from './Background';
import { BackgroundSettings } from './BackgroundSettings';

/**
 * ThemeApplier - applies theme colors to CSS variables without rendering UI
 * The UI for theme switching is in BackgroundSettings component
 */
export function ThemeApplier() {
  const [themes, setThemes] = useState({
    light: {
      bodyBgColor: '#f8f9fa',
      bodyColor: '#696969',
      emphasisColor: '#000',
      textPrimaryColor: '#4C432E',
      textAccentColor: '#AA9A73'
    },
    dark: {
      bodyBgColor: '#232530',
      bodyColor: '#696969',
      emphasisColor: '#FAB795',
      textPrimaryColor: '#FAB795',
      textAccentColor: '#E95678'
    }
  });

  useEffect(() => {
    fetch('/api/theme')
      .then((res) => res.json())
      .then((res) => {
        if (res && res.light && res.dark) setThemes(res);
        // If response is bad, keep the default
      }).catch(() => {});
  }, []);

  // Read the theme preference from local storage
  const [theme] = useLocalStorage('theme', 'auto');
  
  // Read the background type to determine if we should override the theme
  const { preferences: backgroundPrefs } = useBackgroundPreferences();

  // Read the system prefers-color-scheme and set the theme
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);

  // Apply the theme colors as CSS variables
  useEffect(() => {
    // For non-theme backgrounds, always use light theme for UI visibility
    // This doesn't change the user's theme preference, just the applied theme
    const shouldUseDark = backgroundPrefs.type === 'theme' && 
                          (theme === 'dark' || (theme === 'auto' && systemPrefersDark));
    
    if (shouldUseDark) {
      document.body.style.setProperty('--bs-body-bg', themes.dark.bodyBgColor);
      document.body.style.setProperty('--bs-body-color', themes.dark.bodyColor);
      document.body.style.setProperty('--bs-emphasis-color', themes.dark.emphasisColor);
      document.body.style.setProperty('--color-text-pri', themes.dark.textPrimaryColor);
      document.body.style.setProperty('--color-text-acc', themes.dark.textAccentColor);
      // Additional Bootstrap variables for dark theme
      document.body.style.setProperty('--bs-border-color', '#495057');
      document.body.style.setProperty('--bs-secondary-bg', '#2d3139');
      document.body.style.setProperty('--bs-secondary-color', '#adb5bd');
    } else {
      document.body.style.setProperty('--bs-body-bg', themes.light.bodyBgColor);
      document.body.style.setProperty('--bs-body-color', themes.light.bodyColor);
      document.body.style.setProperty('--bs-emphasis-color', themes.light.emphasisColor);
      document.body.style.setProperty('--color-text-pri', themes.light.textPrimaryColor);
      document.body.style.setProperty('--color-text-acc', themes.light.textAccentColor);
      // Additional Bootstrap variables for light theme
      document.body.style.setProperty('--bs-border-color', '#dee2e6');
      document.body.style.setProperty('--bs-secondary-bg', '#e9ecef');
      document.body.style.setProperty('--bs-secondary-color', '#6c757d');
    }
  }, [theme, themes, systemPrefersDark, backgroundPrefs.type]);

  // This component doesn't render anything - it just applies theme logic
  return null;
}

export function App() {
  const [definition, setDefinition] = useState([]);

  // Initialize layout preferences hook
  const layoutPrefs = useLayoutPreferences();

  useEffect(() => {
    var lang = navigator.language;
    console.log("switching language to " + lang);
    fetch('/api/i8n/' + lang)
      .then((res) => res.json())
      .then(setDefinition)
      .catch((err) => {
        // Ignore errors
      });
  }, []);

  // read the /api/config endpoint to get the configuration
  const [showGitHubLink, setShowGitHubLink] = useState(false);
  const [title, setTitle] = useState("Startpunkt");
  const [version, setVersion] = useState("dev");
  const [checkForUpdates, setCheckForUpdates] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  
  useEffect(() => {
    var config = fetch('/api/config')
      .then((res) => res.json())
      .then((res) => {
        console.log('Config loaded:', res);
        setShowGitHubLink(res.config.web.showGithubLink);
        setTitle(res.config.web.title);
        setVersion(res.config.version);
        setCheckForUpdates(res.config.web.checkForUpdates);
        setRefreshInterval(res.config.web.refreshInterval || 0);
        const rtEnabled = res.config.realtime?.enabled || false;
        console.log('Real-time updates enabled:', rtEnabled);
        setRealtimeEnabled(rtEnabled);
      });

  }, [])

  const [applicationGroups, setApplicationGroups] = useState(null);
  const [bookmarkGroups, setBookmarkGroups] = useState(null);

  // Extract tags from URL path for filtering
  const getTagsFromUrl = () => {
    const pathname = window.location.pathname;
    // Remove leading slash and return tags if present
    const path = pathname.replace(/^\//, '');
    return path && path !== '' ? path : null;
  };

  // Function to fetch applications and bookmarks
  const fetchData = () => {
    const tags = getTagsFromUrl();
    const appsEndpoint = tags ? `/api/apps/${encodeURIComponent(tags)}` : '/api/apps';
    
    console.log('[fetchData] Fetching applications from:', appsEndpoint);
    fetch(appsEndpoint)
      .then(res => res.json())
      .then(res => {
        console.log('[fetchData] Received application data:', res);
        setApplicationGroups(res.groups || []);
      })
      .catch(err => {
        console.error('[fetchData] Error fetching applications:', err);
        setApplicationGroups([]);
      });
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(res => {
        setBookmarkGroups(res.groups || []);
      })
      .catch(err => {
        setBookmarkGroups([]);
      });
    
    // Dispatch custom event to notify SpotlightSearch to refresh
    window.dispatchEvent(new CustomEvent('startpunkt-refresh'));
  };

  // Server-Sent Events connection for real-time updates
  const websocket = useServerSentEvents(
    `${window.location.origin}/api/updates/stream`,
    {
      enabled: realtimeEnabled,
      onMessage: (message) => {
        console.log('WebSocket message received:', message);
        
        // Handle different event types
        if (message.type === 'APPLICATION_ADDED' || 
            message.type === 'APPLICATION_REMOVED' || 
            message.type === 'APPLICATION_UPDATED' ||
            message.type === 'STATUS_CHANGED') {
          // Refresh applications when changes occur or status changes
          console.log('Refreshing applications due to:', message.type);
          // Add a small delay to ensure backend cache is fully updated
          setTimeout(() => {
            fetchData();
          }, 100); // 100ms delay to avoid race condition
        } else if (message.type === 'BOOKMARK_ADDED' || 
                   message.type === 'BOOKMARK_REMOVED' || 
                   message.type === 'BOOKMARK_UPDATED') {
          // Refresh bookmarks when changes occur
          fetchData();
        } else if (message.type === 'CONFIG_CHANGED') {
          // Reload config and data when configuration changes
          window.location.reload();
        }
      },
      onOpen: () => {
        console.log('SSE connected for real-time updates');
      }
    }
  );

  // Calculate seconds since last heartbeat
  const [secondsSinceHeartbeat, setSecondsSinceHeartbeat] = useState(null);
  
  useEffect(() => {
    if (!websocket.lastHeartbeat) {
      setSecondsSinceHeartbeat(null);
      return;
    }
    
    // Update every second
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - websocket.lastHeartbeat) / 1000);
      setSecondsSinceHeartbeat(seconds);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [websocket.lastHeartbeat]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Set up periodic refresh if configured (only when real-time updates are not connected)
  useEffect(() => {
    if (refreshInterval > 0 && (!realtimeEnabled || !websocket.isConnected)) {
      const intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);

      // Cleanup function to clear interval on unmount or when refreshInterval changes
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, realtimeEnabled, websocket.isConnected]);

  const hasApplications = () => {
    return Array.isArray(applicationGroups) &&
      applicationGroups.some(group => Array.isArray(group.applications) && group.applications.length > 0);
  };

  const hasBookmarks = () => {
    return Array.isArray(bookmarkGroups) &&
      bookmarkGroups.some(group => Array.isArray(group.bookmarks) && group.bookmarks.length > 0);
  };

  const getDefaultPage = () => {
    if (hasApplications()) return "applications";
    if (hasBookmarks()) return "bookmarks";
    return "empty";
  };

  const [currentPage, setCurrentPage] = useState("loading");

  useEffect(() => {
    if (applicationGroups === null || bookmarkGroups === null) {
      return; // Still loading
    }

    const defaultPage = getDefaultPage();

    if (currentPage === "loading") {
      setCurrentPage(defaultPage);
    } else {
      if (currentPage === "applications" && !hasApplications() && hasBookmarks()) {
        setCurrentPage("bookmarks");
      } else if (currentPage === "bookmarks" && !hasBookmarks() && hasApplications()) {
        setCurrentPage("applications");
      } else if (currentPage !== "empty" && defaultPage === "empty") {
        setCurrentPage("empty");
      }
    }
  }, [applicationGroups, bookmarkGroups]);

  const bookmarksClass = currentPage === "bookmarks" ? "nav-link fw-bold py-1 px-0 active" : "nav-link fw-bold py-1 px-0";
  const applicationsClass = currentPage === "applications" ? "nav-link fw-bold py-1 px-0 active" : "nav-link fw-bold py-1 px-0";

  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (checkForUpdates && version != "dev") {
      var checkVersion = "v" + version.replace("-SNAPSHOT", "");
      console.log("Checking for updates (current version: " + checkVersion + ")");
      versionCheck({
        owner: 'ullbergm',
        repo: 'startpunkt',
        currentVersion: checkVersion,
      })
        .then((res) => {
          if (res.update) {
            console.log('There is a new version available! You should update to', res.update.name);
            setUpdateAvailable(true);
          }
        })
        .catch((err) => {
          // Ignore errors
        });
    }
  }, [version, checkForUpdates]);

  return (
    <IntlProvider definition={definition}>
      {/* Skip to content link for screen readers */}
      <a 
        href="#main-content" 
        class="visually-hidden-focusable position-absolute top-0 start-0 p-3 m-3 bg-primary text-white"
        style="z-index: 9999;"
      >
        Skip to main content
      </a>

      {(showGitHubLink || updateAvailable) && <ForkMe color={updateAvailable ? "orange" : "white"} link={updateAvailable ? "releases" : ""} />}

      <ThemeApplier />
      <Background />
      <AccessibilitySettings />
      <LayoutSettings layoutPrefs={layoutPrefs} />
      <BackgroundSettings />
      <SpotlightSearch />

      <div class="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
        <header class="mb-auto" role="banner">
          <div>
            <h3 class="float-md-start mb-0">
              <img src={startpunktLogo} alt="Startpunkt logo" width="48" height="48" />&nbsp;{title}
              {realtimeEnabled && (
                <span 
                  class={`badge ms-2 ${websocket.isConnected ? 'bg-success' : websocket.isConnecting ? 'bg-warning' : 'bg-secondary'}`}
                  style="font-size: 0.5rem; vertical-align: middle;"
                  title={
                    websocket.isConnected 
                      ? (secondsSinceHeartbeat !== null 
                          ? `Real-time updates active (${secondsSinceHeartbeat}s since last heartbeat)` 
                          : 'Real-time updates active')
                      : websocket.isConnecting 
                        ? 'Connecting...' 
                        : 'Using HTTP polling'
                  }
                >
                  {websocket.isConnected ? '●' : websocket.isConnecting ? '○' : '◌'}
                </span>
              )}
            </h3>
            <nav class="nav nav-masthead justify-content-center float-md-end" role="navigation" aria-label="Main navigation">
              {hasApplications() && (
                <a class={applicationsClass} aria-current={currentPage === "applications" ? "page" : undefined} href="#" onClick={() => { setCurrentPage("applications"); }}><Text id="home.applications">Applications</Text></a>
              )}
              {hasBookmarks() && (
                <a class={bookmarksClass} aria-current={currentPage === "bookmarks" ? "page" : undefined} href="#" onClick={() => { setCurrentPage("bookmarks"); }}><Text id="home.bookmarks">Bookmarks</Text></a>
              )}
            </nav>
          </div>
        </header>

        <main class="px-3" id="main-content" role="main" aria-live="polite" aria-atomic="false">
          {currentPage === 'applications' && hasApplications() && <ApplicationGroupList groups={applicationGroups} layoutPrefs={layoutPrefs} />}
          {currentPage === 'bookmarks' && hasBookmarks() && <BookmarkGroupList groups={bookmarkGroups} layoutPrefs={layoutPrefs} />}
          {currentPage === "loading" && (
            <div class="text-center" role="status" aria-live="polite">
              <h1 class="display-4">Loading...</h1>
              <p class="lead">Checking for configured applications and bookmarks...</p>
              <p>If none are found, you can add them to get started.</p>
            </div>
          )}
          {currentPage === "empty" && (
            <div class="text-center" role="status">
              <h1 class="display-4">No Items Available</h1>
              <p class="lead">There are currently no applications or bookmarks configured.</p>
              <p>Please add some applications or bookmarks to get started.</p>
            </div>
          )}
        </main>

        <footer class="mt-auto text-white-50" role="contentinfo">
          <p><a href="https://github.com/ullbergm/startpunkt" class="text-white-50" target="_blank" rel="noopener noreferrer">Startpunkt</a> v{version}, by <a href="https://ullberg.us" class="text-white-50" target="_blank" rel="noopener noreferrer">Magnus Ullberg</a>.</p>
        </footer>
      </div>
    </IntlProvider>
  )
}

import { useEffect, useState } from 'preact/hooks';
import { IntlProvider } from 'preact-i18n';
import { Text } from 'preact-i18n';
import { useLocalStorage } from '@rehooks/local-storage';
import { writeStorage } from '@rehooks/local-storage';
import { useMediaQuery } from 'react-responsive';
import versionCheck from '@version-checker/browser';
import { Icon } from '@iconify/react';
import SpotlightSearch from './SpotlightSearch';
import { useWebSocket } from './useWebSocket';
import { useLayoutPreferences } from './useLayoutPreferences';
import { useBackgroundPreferences } from './useBackgroundPreferences';
import { LayoutSettings } from './LayoutSettings';
import { AccessibilitySettings } from './AccessibilitySettings';
import { ApplicationEditor } from './ApplicationEditor';
import { BookmarkEditor } from './BookmarkEditor';

// This is required for Bootstrap to work
import * as bootstrap from 'bootstrap'

import startpunktLogo from './assets/logo.png';
import './app.scss';

import { ApplicationGroupList } from './ApplicationGroupList';
import { BookmarkGroupList } from './BookmarkGroupList';
import { ForkMe } from './ForkMe';
import { Background } from './Background';
import { BackgroundSettings } from './BackgroundSettings';
import { ContentOverlay } from './ContentOverlay';
import { WebSocketHeartIndicator } from './WebSocketHeartIndicator';

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

  // Listen for overlay theme hints
  const [overlayThemeHint, setOverlayThemeHint] = useState(null);

  useEffect(() => {
    const handleOverlayThemeHint = (e) => {
      setOverlayThemeHint(e.detail.theme);
    };
    
    window.addEventListener('overlay-theme-hint', handleOverlayThemeHint);
    return () => window.removeEventListener('overlay-theme-hint', handleOverlayThemeHint);
  }, []);

  // Read the system prefers-color-scheme and set the theme
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);

  // Apply the theme colors as CSS variables
  useEffect(() => {
    // Overlay theme hint takes priority when content overlay is active
    let shouldUseDark;
    if (overlayThemeHint) {
      shouldUseDark = overlayThemeHint === 'dark';
    } else {
      // For non-theme backgrounds, always use light theme for UI visibility
      // This doesn't change the user's theme preference, just the applied theme
      shouldUseDark = backgroundPrefs.type === 'theme' && 
                            (theme === 'dark' || (theme === 'auto' && systemPrefersDark));
    }
    
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
  }, [theme, themes, systemPrefersDark, backgroundPrefs.type, overlayThemeHint]);

  // This component doesn't render anything - it just applies theme logic
  return null;
}

export function App() {
  const [definition, setDefinition] = useState([]);

  // Initialize layout preferences hook
  const layoutPrefs = useLayoutPreferences();

  // Editor states
  const [showAppEditor, setShowAppEditor] = useState(false);
  const [showBookmarkEditor, setShowBookmarkEditor] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [editorMode, setEditorMode] = useState('create');

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
  const [websocketEnabled, setWebsocketEnabled] = useState(false);
  
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
        const wsEnabled = res.config.websocket?.enabled || false;
        console.log('WebSocket enabled:', wsEnabled);
        setWebsocketEnabled(wsEnabled);
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

  // WebSocket connection for real-time updates
  // Convert relative path to WebSocket URL
  const websocket = useWebSocket(
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/updates`,
    {
      enabled: websocketEnabled,
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
        console.log('WebSocket connected for real-time updates');
      }
    }
  );

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Set up periodic refresh if configured (only when WebSocket is not connected)
  useEffect(() => {
    if (refreshInterval > 0 && (!websocketEnabled || !websocket.isConnected)) {
      const intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);

      // Cleanup function to clear interval on unmount or when refreshInterval changes
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, websocketEnabled, websocket.isConnected]);

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

  // Application editor handlers
  const handleCreateApp = () => {
    setEditingApp(null);
    setEditorMode('create');
    setShowAppEditor(true);
  };

  const handleSaveApp = async (namespace, name, spec) => {
    const endpoint = editorMode === 'create' 
      ? `/api/apps/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`
      : `/api/apps/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`;
    
    const method = editorMode === 'create' ? 'POST' : 'PUT';
    
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to save application');
    }

    setShowAppEditor(false);
    setEditingApp(null);
    // Refresh data
    setTimeout(() => fetchData(), 500);
  };

  const handleDeleteApp = async (namespace, name) => {
    const endpoint = `/api/apps/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`;
    
    const response = await fetch(endpoint, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to delete application');
    }

    setShowAppEditor(false);
    setEditingApp(null);
    // Refresh data
    setTimeout(() => fetchData(), 500);
  };

  // Bookmark editor handlers
  const handleCreateBookmark = () => {
    setEditingBookmark(null);
    setEditorMode('create');
    setShowBookmarkEditor(true);
  };

  const handleSaveBookmark = async (namespace, name, spec) => {
    const endpoint = editorMode === 'create' 
      ? `/api/bookmarks/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`
      : `/api/bookmarks/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`;
    
    const method = editorMode === 'create' ? 'POST' : 'PUT';
    
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to save bookmark');
    }

    setShowBookmarkEditor(false);
    setEditingBookmark(null);
    // Refresh data
    setTimeout(() => fetchData(), 500);
  };

  const handleDeleteBookmark = async (namespace, name) => {
    const endpoint = `/api/bookmarks/manage?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}`;
    
    const response = await fetch(endpoint, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to delete bookmark');
    }

    setShowBookmarkEditor(false);
    setEditingBookmark(null);
    // Refresh data
    setTimeout(() => fetchData(), 500);
  };

  return (
    <IntlProvider definition={definition}>
      {/* Skip to content link for screen readers */}
      <a 
        href="#main-content" 
        class="visually-hidden-focusable position-absolute top-0 start-0 p-3 m-3 bg-primary text-white"
        style="z-index: 9999;"
      >
        <Text id="home.skipToContent">Skip to main content</Text>
      </a>

      {(showGitHubLink || updateAvailable) && <ForkMe color={updateAvailable ? "orange" : "white"} link={updateAvailable ? "releases" : ""} />}

      <ThemeApplier />
      <Background />
      <ContentOverlay />
      <AccessibilitySettings />
      <LayoutSettings layoutPrefs={layoutPrefs} />
      <BackgroundSettings />
      <SpotlightSearch />
      
      {websocketEnabled && <WebSocketHeartIndicator websocket={websocket} />}

      <div class="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
        <header class="mb-auto" role="banner">
          <div>
            <h3 class="float-md-start mb-0">
              <img src={startpunktLogo} alt="Startpunkt logo" width="48" height="48" />&nbsp;{title}
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
              <h1 class="display-4"><Text id="home.loading">Loading...</Text></h1>
              <p class="lead"><Text id="home.checkingForItems">Checking for configured applications and bookmarks...</Text></p>
              <p><Text id="home.noItemsHelp">If none are found, you can add them to get started.</Text></p>
            </div>
          )}
          {currentPage === "empty" && (
            <div class="text-center" role="status">
              <h1 class="display-4"><Text id="home.noItemsAvailable">No Items Available</Text></h1>
              <p class="lead"><Text id="home.noItemsConfigured">There are currently no applications or bookmarks configured.</Text></p>
              <p><Text id="home.pleaseAddItems">Please add some applications or bookmarks to get started.</Text></p>
            </div>
          )}
        </main>

        <footer class="mt-auto text-white-50" role="contentinfo">
          <p><a href="https://github.com/ullbergm/startpunkt" class="text-white-50" target="_blank" rel="noopener noreferrer">Startpunkt</a> v{version}, by <a href="https://ullberg.us" class="text-white-50" target="_blank" rel="noopener noreferrer">Magnus Ullberg</a>.</p>
        </footer>
      </div>

      {/* Floating action buttons for adding items */}
      {currentPage === 'applications' && (
        <button
          class="btn btn-primary rounded-circle"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '56px',
            height: '56px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
          onClick={handleCreateApp}
          aria-label="Add new application"
          title="Add new application"
        >
          <Icon icon="mdi:plus" width="24" height="24" />
        </button>
      )}
      
      {currentPage === 'bookmarks' && (
        <button
          class="btn btn-primary rounded-circle"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '56px',
            height: '56px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
          onClick={handleCreateBookmark}
          aria-label="Add new bookmark"
          title="Add new bookmark"
        >
          <Icon icon="mdi:plus" width="24" height="24" />
        </button>
      )}

      {/* Application Editor Modal */}
      {showAppEditor && (
        <ApplicationEditor
          application={editingApp}
          onSave={handleSaveApp}
          onCancel={() => { setShowAppEditor(false); setEditingApp(null); }}
          onDelete={handleDeleteApp}
          mode={editorMode}
        />
      )}

      {/* Bookmark Editor Modal */}
      {showBookmarkEditor && (
        <BookmarkEditor
          bookmark={editingBookmark}
          onSave={handleSaveBookmark}
          onCancel={() => { setShowBookmarkEditor(false); setEditingBookmark(null); }}
          onDelete={handleDeleteBookmark}
          mode={editorMode}
        />
      )}
    </IntlProvider>
  )
}

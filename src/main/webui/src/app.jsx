import { useEffect, useState } from 'preact/hooks';
import { IntlProvider } from 'preact-i18n';
import { Text } from 'preact-i18n';
import { useLocalStorage } from '@rehooks/local-storage';
import { writeStorage } from '@rehooks/local-storage';
import { useMediaQuery } from 'react-responsive';
import versionCheck from '@version-checker/browser';
import { Icon } from '@iconify/react';
import SpotlightSearch from './SpotlightSearch';
import { useLayoutPreferences } from './useLayoutPreferences';
import { useBackgroundPreferences } from './useBackgroundPreferences';
import { LayoutSettings } from './LayoutSettings';
import { AccessibilitySettings } from './AccessibilitySettings';
import { ApplicationEditor } from './ApplicationEditor';
import { BookmarkEditor } from './BookmarkEditor';
import { client, setOnPingCallback } from './graphql/client';
import { INIT_QUERY, APPLICATION_GROUPS_QUERY, BOOKMARK_GROUPS_QUERY } from './graphql/queries';
import { DELETE_APPLICATION_MUTATION, DELETE_BOOKMARK_MUTATION, CREATE_APPLICATION_MUTATION, UPDATE_APPLICATION_MUTATION, CREATE_BOOKMARK_MUTATION, UPDATE_BOOKMARK_MUTATION } from './graphql/mutations';
import { APPLICATION_UPDATES_SUBSCRIPTION, BOOKMARK_UPDATES_SUBSCRIPTION } from './graphql/subscriptions';
import { useSubscription } from './graphql/useSubscription';

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
export function ThemeApplier({ themes: themesProp }) {
  const [themes, setThemes] = useState(themesProp || {
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

  // Update themes when prop changes
  useEffect(() => {
    if (themesProp) {
      setThemes(themesProp);
    }
  }, [themesProp]);

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

  // Configuration state
  const [showGitHubLink, setShowGitHubLink] = useState(false);
  const [title, setTitle] = useState("Startpunkt");
  const [version, setVersion] = useState("dev");
  const [checkForUpdates, setCheckForUpdates] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(true);

  // Theme state
  const [themes, setThemes] = useState(null);

  // Data state
  const [applicationGroups, setApplicationGroups] = useState(null);
  const [bookmarkGroups, setBookmarkGroups] = useState(null);
  const [lastDataReceived, setLastDataReceived] = useState(null);

  // Helper function to compute subscription connection status
  const getSubscriptionStatus = (appSub, bookmarkSub) => {
    const isConnected = appSub.isSubscribed || bookmarkSub.isSubscribed;
    const isLoading = appSub.loading || bookmarkSub.loading;
    const hasError = !!(appSub.error || bookmarkSub.error);
    
    return {
      status: isConnected ? 'connected' : 
              isLoading ? 'connecting' : 
              hasError ? 'error' : 'disconnected',
      isConnected,
      isConnecting: isLoading,
      isDisconnected: !isConnected && !isLoading,
      hasError,
      lastHeartbeat: lastDataReceived
    };
  };

  // Extract tags from URL path for filtering
  const getTagsFromUrl = () => {
    const pathname = window.location.pathname;
    const path = pathname.replace(/^\//, '');
    return path && path !== '' ? path : null;
  };

  // Single initialization query to fetch all data at once
  useEffect(() => {
    const lang = navigator.language;
    const tags = getTagsFromUrl();
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : null;
    
    console.log('[INIT] Fetching all data with language:', lang, 'tags:', tagsArray);
    
    // Single query to fetch config, theme, translations, applications, and bookmarks
    client.query({
      query: INIT_QUERY,
      variables: { language: lang, tags: tagsArray }
    }).then((result) => {
        if (result.data) {
          console.log('[INIT] Received data:', result.data);
          
          // Set translations (parse JSON string)
          if (result.data.translations) {
            try {
              const translations = typeof result.data.translations === 'string' 
                ? JSON.parse(result.data.translations) 
                : result.data.translations;
              setDefinition(translations);
            } catch (e) {
              console.error('[INIT] Failed to parse translations:', e);
              setDefinition({});
            }
          }
          
          // Set config
          if (result.data.config) {
            const config = result.data.config;
            setShowGitHubLink(config.web.showGithubLink);
            setTitle(config.web.title);
            setVersion(config.version);
            setCheckForUpdates(config.web.checkForUpdates);
            setRefreshInterval(config.web.refreshInterval || 0);
            const subEnabled = config.graphql?.subscription?.enabled !== false;
            console.log('[INIT] GraphQL Subscriptions enabled:', subEnabled);
            setSubscriptionsEnabled(subEnabled);
          }
          
          // Set theme
          if (result.data.theme) {
            setThemes(result.data.theme);
          }
          
          // Set applications
          if (result.data.applicationGroups) {
            const groups = result.data.applicationGroups.map(group => ({
              name: group.name,
              applications: group.applications
            }));
            setApplicationGroups(groups);
          }
          
          // Set bookmarks
          if (result.data.bookmarkGroups) {
            const groups = result.data.bookmarkGroups.map(group => ({
              name: group.name,
              bookmarks: group.bookmarks
            }));
            setBookmarkGroups(groups);
          }
        }
      })
      .catch((err) => {
        console.error('[INIT] Error fetching data:', err);
        // Set empty arrays to prevent loading state
        setApplicationGroups([]);
        setBookmarkGroups([]);
      });
  }, []);

  // Function to fetch applications using GraphQL (for refreshes)
  const fetchApplications = () => {
    const tags = getTagsFromUrl();
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : null;
    
    console.log('[App] Fetching applications with tags:', tagsArray);
    
    // Fetch applications with 'network-only' to bypass cache on refresh
    client.query({
      query: APPLICATION_GROUPS_QUERY,
      variables: { tags: tagsArray },
      fetchPolicy: 'network-only'
    }).then(result => {
        if (result.data && result.data.applicationGroups) {
          console.log('[App] Received', result.data.applicationGroups.length, 'application group(s)');
          const groups = result.data.applicationGroups.map(group => ({
            name: group.name,
            applications: group.applications
          }));
          setApplicationGroups(groups);
        }
      })
      .catch(err => {
        console.error('[App] Error fetching applications:', err);
        setApplicationGroups([]);
      });
  };

  // Function to fetch bookmarks using GraphQL (for refreshes)
  const fetchBookmarks = () => {
    console.log('[App] Fetching bookmarks');
    
    // Fetch bookmarks with 'network-only' to bypass cache on refresh
    client.query({
      query: BOOKMARK_GROUPS_QUERY,
      variables: {},
      fetchPolicy: 'network-only'
    }).then(result => {
        if (result.data && result.data.bookmarkGroups) {
          console.log('[App] Received', result.data.bookmarkGroups.length, 'bookmark group(s)');
          const groups = result.data.bookmarkGroups.map(group => ({
            name: group.name,
            bookmarks: group.bookmarks
          }));
          setBookmarkGroups(groups);
        }
      })
      .catch(err => {
        console.error('[App] Error fetching bookmarks:', err);
        setBookmarkGroups([]);
      });
  };

  // Function to fetch both applications and bookmarks (for full refreshes)
  const fetchData = () => {
    fetchApplications();
    fetchBookmarks();
  };

  // GraphQL Subscriptions for real-time updates
  const tags = getTagsFromUrl();
  const tagsArray = tags ? tags.split(',').map(t => t.trim()) : null;
  
  // Subscribe to application updates
  const appSubscription = useSubscription(
    APPLICATION_UPDATES_SUBSCRIPTION,
    { namespace: null, tags: tagsArray },
    subscriptionsEnabled
  );

  // Subscribe to bookmark updates
  const bookmarkSubscription = useSubscription(
    BOOKMARK_UPDATES_SUBSCRIPTION,
    {},
    subscriptionsEnabled
  );
  
  // Handle application subscription updates
  useEffect(() => {
    if (appSubscription.data && appSubscription.data.applicationUpdates) {
      const { type, application } = appSubscription.data.applicationUpdates;
      console.log('[App] GraphQL subscription - application update:', type, application);
      
      // Update last data received timestamp (for heartbeat indicator)
      setLastDataReceived(Date.now());
      
      // Refresh applications on any change
      // Add a small delay to ensure backend cache is fully updated
      setTimeout(() => {
        fetchApplications();
      }, 100);
    }
  }, [appSubscription.data]);

  // Handle bookmark subscription updates
  useEffect(() => {
    if (bookmarkSubscription.data && bookmarkSubscription.data.bookmarkUpdates) {
      const { type, bookmark } = bookmarkSubscription.data.bookmarkUpdates;
      console.log('[App] GraphQL subscription - bookmark update:', type, bookmark);
      
      // Update last data received timestamp (for heartbeat indicator)
      setLastDataReceived(Date.now());
      
      // Refresh bookmarks on any change
      // Add a small delay to ensure backend cache is fully updated
      setTimeout(() => {
        fetchBookmarks();
      }, 100);
    }
  }, [bookmarkSubscription.data]);

  // Update lastDataReceived when subscriptions first connect
  useEffect(() => {
    if (appSubscription.isSubscribed || bookmarkSubscription.isSubscribed) {
      setLastDataReceived(Date.now());
    }
  }, [appSubscription.isSubscribed, bookmarkSubscription.isSubscribed]);

  // Register callback for WebSocket ping events (keepalive heartbeat)
  useEffect(() => {
    if (subscriptionsEnabled) {
      setOnPingCallback(() => {
        setLastDataReceived(Date.now());
      });
      
      // Cleanup callback on unmount or when subscriptions disabled
      return () => {
        setOnPingCallback(null);
      };
    }
  }, [subscriptionsEnabled]);

  // Set up periodic refresh if configured (only when subscriptions are not enabled)
  useEffect(() => {
    if (refreshInterval > 0 && !subscriptionsEnabled) {
      const intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);

      // Cleanup function to clear interval on unmount or when refreshInterval changes
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, subscriptionsEnabled]);

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
      console.log('[App] Checking for updates, current version:', checkVersion);
      versionCheck({
        owner: 'ullbergm',
        repo: 'startpunkt',
        currentVersion: checkVersion,
      })
        .then((res) => {
          if (res.update) {
            console.log('[App] Update available:', res.update.name);
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

  const handleEditApp = async (app) => {
    // Transform GraphQL data to match the format expected by ApplicationEditor
    // GraphQL already provides all necessary fields including namespace and resourceName
    const fullApp = {
      metadata: {
        namespace: app.namespace || 'default',
        name: app.resourceName || app.name,
      },
      spec: {
        name: app.name,
        group: app.group,
        icon: app.icon,
        iconColor: app.iconColor,
        url: app.url,
        info: app.info,
        targetBlank: app.targetBlank,
        location: app.location,
        enabled: app.enabled,
        rootPath: app.rootPath,
        tags: app.tags,
      },
      hasOwnerReferences: app.hasOwnerReferences,
    };
    setEditingApp(fullApp);
    setEditorMode('edit');
    setShowAppEditor(true);
  };

  const handleSaveApp = async (namespace, name, spec) => {
    try {
      if (editorMode === 'create') {
        // Use GraphQL create mutation
        const input = {
          namespace,
          resourceName: name,  // Kubernetes resource name
          name: spec.name,     // Display name
          group: spec.group,
          url: spec.url,
          icon: spec.icon,
          iconColor: spec.iconColor,
          info: spec.info,
          targetBlank: spec.targetBlank,
          location: spec.location,
          enabled: spec.enabled,
          rootPath: spec.rootPath,
          tags: spec.tags
        };

        const result = await client.mutate({
          mutation: CREATE_APPLICATION_MUTATION,
          variables: { input }
        });

        if (result.errors) {
          throw new Error(result.errors[0].message || 'Failed to create application');
        }
      } else {
        // Use GraphQL update mutation
        const input = {
          namespace,
          resourceName: name,  // Kubernetes resource name
          name: spec.name,     // Display name
          group: spec.group,
          url: spec.url,
          icon: spec.icon,
          iconColor: spec.iconColor,
          info: spec.info,
          targetBlank: spec.targetBlank,
          location: spec.location,
          enabled: spec.enabled,
          rootPath: spec.rootPath,
          tags: spec.tags
        };

        const result = await client.mutate({
          mutation: UPDATE_APPLICATION_MUTATION,
          variables: { input }
        });

        if (result.errors) {
          throw new Error(result.errors[0].message || 'Failed to update application');
        }
      }

      setShowAppEditor(false);
      setEditingApp(null);
      // Refresh only applications
      setTimeout(() => fetchApplications(), 500);
    } catch (error) {
      console.error('[App] Error saving application:', error);
      throw error;
    }
  };

  const handleDeleteApp = async (namespace, name) => {
    // Use GraphQL mutation
    const result = await client.mutate({
      mutation: DELETE_APPLICATION_MUTATION,
      variables: { namespace, name }
    });

    if (result.errors) {
      throw new Error(result.errors[0].message || 'Failed to delete application');
    }

    setShowAppEditor(false);
    setEditingApp(null);
    // Refresh only applications
    setTimeout(() => fetchApplications(), 500);
  };

  // Bookmark editor handlers
  const handleCreateBookmark = () => {
    setEditingBookmark(null);
    setEditorMode('create');
    setShowBookmarkEditor(true);
  };

  const handleEditBookmark = async (bookmark) => {
    // Transform GraphQL data to match the format expected by BookmarkEditor
    // GraphQL already provides all necessary fields including namespace and resourceName
    const fullBookmark = {
      metadata: {
        namespace: bookmark.namespace || 'default',
        name: bookmark.resourceName || bookmark.name,
      },
      spec: {
        name: bookmark.name,
        group: bookmark.group,
        icon: bookmark.icon,
        url: bookmark.url,
        info: bookmark.info,
        targetBlank: bookmark.targetBlank,
        location: bookmark.location,
      },
      hasOwnerReferences: bookmark.hasOwnerReferences,
    };
    setEditingBookmark(fullBookmark);
    setEditorMode('edit');
    setShowBookmarkEditor(true);
  };

  const handleSaveBookmark = async (namespace, name, spec) => {
    try {
      if (editorMode === 'create') {
        // Use GraphQL create mutation
        const input = {
          namespace,
          name,  // This is the resource name
          bookmarkName: spec.name,  // This is the display name
          group: spec.group,
          url: spec.url,
          icon: spec.icon,
          info: spec.info,
          targetBlank: spec.targetBlank,
          location: spec.location
        };

        const result = await client.mutate({
          mutation: CREATE_BOOKMARK_MUTATION,
          variables: { input }
        });

        if (result.errors) {
          throw new Error(result.errors[0].message || 'Failed to create bookmark');
        }
      } else {
        // Use GraphQL update mutation
        const input = {
          namespace,
          name,  // This is the resource name
          bookmarkName: spec.name,  // This is the display name
          group: spec.group,
          url: spec.url,
          icon: spec.icon,
          info: spec.info,
          targetBlank: spec.targetBlank,
          location: spec.location
        };

        const result = await client.mutate({
          mutation: UPDATE_BOOKMARK_MUTATION,
          variables: { input }
        });

        if (result.errors) {
          throw new Error(result.errors[0].message || 'Failed to update bookmark');
        }
      }

      setShowBookmarkEditor(false);
      setEditingBookmark(null);
      // Refresh only bookmarks
      setTimeout(() => fetchBookmarks(), 500);
    } catch (error) {
      console.error('[App] Error saving bookmark:', error);
      throw error;
    }
  };

  const handleDeleteBookmark = async (namespace, name) => {
    // Use GraphQL mutation
    const result = await client.mutate({
      mutation: DELETE_BOOKMARK_MUTATION,
      variables: { namespace, name }
    });

    if (result.errors) {
      throw new Error(result.errors[0].message || 'Failed to delete bookmark');
    }

    setShowBookmarkEditor(false);
    setEditingBookmark(null);
    // Refresh only bookmarks
    setTimeout(() => fetchBookmarks(), 500);
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

      <ThemeApplier themes={themes} />
      <Background />
      <ContentOverlay />
      <AccessibilitySettings />
      <LayoutSettings layoutPrefs={layoutPrefs} />
      <BackgroundSettings />
      <SpotlightSearch applicationGroups={applicationGroups} bookmarkGroups={bookmarkGroups} />
      
      {/* Show subscription status indicator */}
      {subscriptionsEnabled && (
        <WebSocketHeartIndicator 
          websocket={getSubscriptionStatus(appSubscription, bookmarkSubscription)} 
        />
      )}

      <div class="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
        <header class="mb-auto" role="banner">
          <div class="d-flex flex-column flex-md-row align-items-center align-items-md-start">
            <h3 class="mb-2 mb-md-0 me-md-auto">
              <img src={startpunktLogo} alt="Startpunkt logo" width="48" height="48" />&nbsp;{title}{layoutPrefs?.preferences.editMode && ' (Edit Mode)'}
            </h3>
            <nav class="nav nav-masthead justify-content-center mt-2 mt-md-0" role="navigation" aria-label="Main navigation">
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
          {currentPage === 'applications' && hasApplications() && <ApplicationGroupList groups={applicationGroups} layoutPrefs={layoutPrefs} onEditApp={handleEditApp} />}
          {currentPage === 'bookmarks' && hasBookmarks() && <BookmarkGroupList groups={bookmarkGroups} layoutPrefs={layoutPrefs} onEditBookmark={handleEditBookmark} />}
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

      {/* Floating action buttons for adding items - only visible in edit mode */}
      {layoutPrefs?.preferences.editMode && currentPage === 'applications' && (
        <button
          class="btn btn-primary rounded-circle"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
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
      
      {layoutPrefs?.preferences.editMode && currentPage === 'bookmarks' && (
        <button
          class="btn btn-primary rounded-circle"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
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

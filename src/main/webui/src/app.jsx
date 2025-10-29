import { useEffect, useState } from 'preact/hooks';
import { IntlProvider } from 'preact-i18n';
import { Text } from 'preact-i18n';
import { useLocalStorage } from '@rehooks/local-storage';
import { writeStorage } from '@rehooks/local-storage';
import { useMediaQuery } from 'react-responsive';
import versionCheck from '@version-checker/browser';
import SpotlightSearch from './SpotlightSearch';
import { useWebSocket } from './useWebSocket';

// This is required for Bootstrap to work
import * as bootstrap from 'bootstrap'

import startpunktLogo from './assets/logo.png';
import './app.scss';

import { ApplicationGroupList } from './ApplicationGroupList';
import { BookmarkGroupList } from './BookmarkGroupList';
import { ForkMe } from './ForkMe';

export function ThemeSwitcher() {
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

  // Read the theme from local storage and set the theme
  const [theme] = useLocalStorage('theme', 'auto');

  // Read the system prefers-color-scheme and set the theme
  const systemPrefersDark = useMediaQuery({ query: "(prefers-color-scheme: dark)" }, undefined, undefined);

  // Set the active class based on the current theme
  const lightClass = 'dropdown-item d-flex align-items-center' + (theme === 'light' ? ' active' : '');
  const darkClass = 'dropdown-item d-flex align-items-center' + (theme === 'dark' ? ' active' : '');
  const autoClass = 'dropdown-item d-flex align-items-center' + (theme === 'auto' ? ' active' : '');

  // Set the icon based on the current theme
  const themeIcon = theme === 'light' ? "#sun-fill" : theme === 'dark' ? "#moon-stars-fill" : "#circle-half";

  // Toggle the color scheme based on the state
  useEffect(() => {
    if (theme === 'dark' || (theme === 'auto' && systemPrefersDark)) {
      console.log("Setting dark theme");
      document.body.style.setProperty('--bs-body-bg', themes.dark.bodyBgColor);
      document.body.style.setProperty('--bs-body-color', themes.dark.bodyColor);
      document.body.style.setProperty('--bs-emphasis-color', themes.dark.emphasisColor);
      document.body.style.setProperty('--color-text-pri', themes.dark.textPrimaryColor);
      document.body.style.setProperty('--color-text-acc', themes.dark.textAccentColor);
    } else {
      console.log("Setting light theme");
      document.body.style.setProperty('--bs-body-bg', themes.light.bodyBgColor);
      document.body.style.setProperty('--bs-body-color', themes.light.bodyColor);
      document.body.style.setProperty('--bs-emphasis-color', themes.light.emphasisColor);
      document.body.style.setProperty('--color-text-pri', themes.light.textPrimaryColor);
      document.body.style.setProperty('--color-text-acc', themes.light.textAccentColor);
    }
  }, [theme, themes, systemPrefersDark]);

  return (<>
    <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
      <symbol id="check2" viewBox="0 0 16 16">
        <path
          d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
      </symbol>
      <symbol id="circle-half" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z" />
      </symbol>
      <symbol id="moon-stars-fill" viewBox="0 0 16 16">
        <path
          d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
        <path
          d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z" />
      </symbol>
      <symbol id="sun-fill" viewBox="0 0 16 16">
        <path
          d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
      </symbol>
    </svg>

    <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-mode-toggle">
      <button class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" id="bd-theme" type="button"
        aria-expanded="false" data-bs-toggle="dropdown" aria-label="Toggle theme (auto)">
        <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
          <use href={themeIcon}></use>
        </svg>
        <span class="visually-hidden" id="bd-theme-text"><Text id="home.theme.toggle">Toggle theme</Text></span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="bd-theme-text">
        <li>
          <button type="button" class={lightClass} data-bs-theme-value="light"
            aria-pressed="false" onClick={() => { writeStorage('theme', 'light') }}>
            <svg class="bi me-2 opacity-50" width="1em" height="1em">
              <use href="#sun-fill"></use>
            </svg>
            <Text id="home.theme.light">Light</Text>
            <svg class="bi ms-auto d-none" width="1em" height="1em">
              <use href="#check2"></use>
            </svg>
          </button>
        </li>
        <li>
          <button type="button" class={darkClass} data-bs-theme-value="dark"
            aria-pressed="false" onClick={() => { writeStorage('theme', 'dark') }}>
            <svg class="bi me-2 opacity-50" width="1em" height="1em">
              <use href="#moon-stars-fill"></use>
            </svg>
            <Text id="home.theme.dark">Dark</Text>
            <svg class="bi ms-auto d-none" width="1em" height="1em">
              <use href="#check2"></use>
            </svg>
          </button>
        </li>
        <li>
          <button type="button" class={autoClass} data-bs-theme-value="auto"
            aria-pressed="true" onClick={() => { writeStorage('theme', 'auto') }}>
            <svg class="bi me-2 opacity-50" width="1em" height="1em">
              <use href="#circle-half"></use>
            </svg>
            <Text id="home.theme.auto">Auto</Text>
            <svg class="bi ms-auto d-none" width="1em" height="1em">
              <use href="#check2"></use>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </>
  );
}

export function App() {
  const [definition, setDefinition] = useState([]);

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
  const websocket = useWebSocket(
    `${window.location.origin}/api/ws/updates`,
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
      },
      onClose: () => {
        console.log('WebSocket disconnected, falling back to HTTP polling');
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

  return (
    <IntlProvider definition={definition}>
      {(showGitHubLink || updateAvailable) && <ForkMe color={updateAvailable ? "orange" : "white"} link={updateAvailable ? "releases" : ""} />}

      <ThemeSwitcher />
      <SpotlightSearch />

      <div class="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
        <header class="mb-auto">
          <div>
            <h3 class="float-md-start mb-0">
              <img src={startpunktLogo} alt="Startpunkt" width="48" height="48" />&nbsp;{title}
              {websocketEnabled && (
                <span 
                  class={`badge ms-2 ${websocket.isConnected ? 'bg-success' : websocket.isConnecting ? 'bg-warning' : 'bg-secondary'}`}
                  style="font-size: 0.5rem; vertical-align: middle;"
                  title={websocket.isConnected ? 'Real-time updates active' : websocket.isConnecting ? 'Connecting...' : 'Using HTTP polling'}
                >
                  {websocket.isConnected ? '●' : websocket.isConnecting ? '○' : '◌'}
                </span>
              )}
            </h3>
            <nav class="nav nav-masthead justify-content-center float-md-end">
              {hasApplications() && (
                <a class={applicationsClass} aria-current="page" href="#" onClick={() => { setCurrentPage("applications"); }}><Text id="home.applications">Applications</Text></a>
              )}
              {hasBookmarks() && (
                <a class={bookmarksClass} href="#" onClick={() => { setCurrentPage("bookmarks"); }}><Text id="home.bookmarks">Bookmarks</Text></a>
              )}
            </nav>
          </div>
        </header>

        <main class="px-3">
          {currentPage === 'applications' && hasApplications() && <ApplicationGroupList groups={applicationGroups} />}
          {currentPage === 'bookmarks' && hasBookmarks() && <BookmarkGroupList groups={bookmarkGroups} />}
          {currentPage === "loading" && (
            <div class="text-center">
              <h1 class="display-4">Loading...</h1>
              <p class="lead">Checking for configured applications and bookmarks...</p>
              <p>If none are found, you can add them to get started.</p>
            </div>
          )}
          {currentPage === "empty" && (
            <div class="text-center">
              <h1 class="display-4">No Items Available</h1>
              <p class="lead">There are currently no applications or bookmarks configured.</p>
              <p>Please add some applications or bookmarks to get started.</p>
            </div>
          )}
        </main>

        <footer class="mt-auto text-white-50">
          <p><a href="https://github.com/ullbergm/startpunkt" class="text-white-50" target="_blank">Startpunkt</a> v{version}, by <a href="https://ullberg.us" class="text-white-50" target="_blank">Magnus Ullberg</a>.</p>
        </footer>
      </div>
    </IntlProvider>
  )
}

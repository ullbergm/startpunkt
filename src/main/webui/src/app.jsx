import { useEffect, useState } from 'preact/hooks'
import { Suspense, lazy } from 'preact/compat';

import { IntlProvider } from 'preact-i18n';
import { Text } from 'preact-i18n';

import startpunktLogo from './assets/logo.png'
import './app.scss'
import * as bootstrap from 'bootstrap'

import { ApplicationGroupList } from './ApplicationGroupList'
import { BookmarkGroupList } from './BookmarkGroupList'

export function App() {
  const [definition, setDefinition] = useState([]);

  useEffect(() => {
    var lang = navigator.language;
    console.log("switching language to " + lang);
    fetch('/i8n/' + lang + '.json')
    .then((res) => res.json())
    .then(setDefinition)
    .catch((err) => {
      // Ignore errors
    } );
  }, []);

  // read the /api/apps endpoint and update the groups state
  const [applicationGroups, setApplicationGroups] = useState([]);
  useEffect(() => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then(setApplicationGroups)
  }, [])

  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  useEffect(() => {
    fetch('/api/bookmarks')
      .then((res) => res.json())
      .then(setBookmarkGroups)
  }, [])

  // When someone clicks on Bookmarks, switch to showing bookmarks instead of applications
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showApplications, setShowApplications] = useState(true);

  function handleBookmarksClick() {
    console.log("showing bookmarks");

    setShowBookmarks(true);
    setShowApplications(false);
  }
  function handleApplicationsClick() {
    console.log("showing applications");
    setShowBookmarks(false);
    setShowApplications(true);
  }
  function handleLightThemeClick() {
    console.log("light theme");
    document.body.style.setProperty('--bs-body-bg', '#F8F6F1');
    document.body.style.setProperty('--bs-body-color', '#696969');
    document.body.style.setProperty('--color-text-pri', '#4C432E');
    document.body.style.setProperty('--color-text-acc', '#AA9A73');
  }
  function handleDarkThemeClick() {
    console.log("dark theme");
    document.body.style.setProperty('--bs-body-bg', '#232530');
    document.body.style.setProperty('--bs-body-color', '#696969');
    document.body.style.setProperty('--color-text-pri', '#FAB795');
    document.body.style.setProperty('--color-text-acc', '#E95678');
  }
  function handleAutoThemeClick() {
    console.log("auto theme");
    // if its after dark, set dark theme
    // else set light theme
    const now = new Date();
    const hour = now.getHours();
    if (hour > 18 || hour < 6) {
      handleDarkThemeClick();
    } else {
      handleLightThemeClick();
    }
  }

  function BookmarkList() {
    return (
      <div class="container px-4 py-5" id="icon-grid">
        <h2 class="pb-2 border-bottom text-uppercase">Bookmarks</h2>
      </div>
    )
  }

  return (
      <IntlProvider definition={definition}>
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
              <use href="#circle-half"></use>
            </svg>
            <span class="visually-hidden" id="bd-theme-text">Toggle theme</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="bd-theme-text">
            <li>
              <button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="light"
                aria-pressed="false" onClick={handleLightThemeClick}>
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
              <button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="dark"
                aria-pressed="false" onClick={handleDarkThemeClick}>
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
              <button type="button" class="dropdown-item d-flex align-items-center active" data-bs-theme-value="auto"
                aria-pressed="true" onClick={handleAutoThemeClick}>
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
        <div class="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
          <header class="mb-auto">
            <div>
              <h3 class="float-md-start mb-0"><img src={startpunktLogo} alt="Startpunkt" width="48" height="48" />&nbsp;Startpunkt</h3>
              <nav class="nav nav-masthead justify-content-center float-md-end">
                <a class="nav-link fw-bold py-1 px-0 active" aria-current="page" href="#" onClick={handleApplicationsClick}><Text id="home.applications">Applications</Text></a>
                <a class="nav-link fw-bold py-1 px-0" href="#" onClick={handleBookmarksClick}><Text id="home.bookmarks">Bookmarks</Text></a>
              </nav>
            </div>
          </header>

          <main class="px-3">

            {showApplications && <ApplicationGroupList groups={applicationGroups} />}
            {showBookmarks && <BookmarkGroupList groups={bookmarkGroups} />}

          </main>
          <footer class="mt-auto text-white-50">
            <p>Startpunkt, by <a href="https://ullberg.us" class="text-white">Magnus Ullberg</a>.</p>
          </footer>
        </div>
      </IntlProvider>
  )
}

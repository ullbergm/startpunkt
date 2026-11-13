# Agents Guide: the page

The page is Preact with signals and TypeScript, built with Vite into `web/dist`, which the Go binary embeds. Read the repository's `AGENTS.md` first; this file adds what is particular to `web/`.

## Checks

Run in `web/`, with npm: `npm run check` (the type check), `npm test` (Vitest with jsdom and Testing Library) and `npm run build`. The build prints an `INEFFECTIVE_DYNAMIC_IMPORT` warning about `en-US.json`, which is imported both directly and through the glob of languages; it is harmless.

`npm run dev` serves the page with reloading and passes `/api` on to `http://localhost:8080`, so a binary, or a port-forward to an instance, has to listen there. The development server sends no Content-Security-Policy: check anything that touches scripts, styles, fonts or requests against the page as the binary serves it.

## State

State is module-level signals; components read `.value` while rendering.

| Module | Signals |
| --- | --- |
| `state.ts` | `serverState`, `connection`, `fatalError`. Only `connect()` writes `serverState`, from the event stream. |
| `prefs.ts` | `prefs`, everything the visitor has chosen |
| `editing.ts` | `editKey`, `unlocked`, `canEdit`, `editMode`, `editTarget` |
| `i18n.ts` | `language` |
| `clusters.ts` | `clusterColors` |

What is only about the moment, such as which dialog is open or which tab is chosen, is `useState` in `App`.

## Preferences

- Change preferences only through `updatePrefs(fn)`. It checks the result and stores it.
- An instance can give the preferences a browser starts from (`config.defaultPreferences`, taken in by `setServerDefaults`). They go through `sanitize` like stored ones. `defaults()` is what the page has built in; `startingPrefs()` is what a browser without preferences gets, and what a reset goes back to.
- A new preference is added in three places: the `Preferences` type, `defaults()`, and the matching `sanitize` function. Every value read from storage is checked on its own and replaced by its default when it does not fit; nothing from storage is trusted.
- A preset holds `layout` and `background`, so a field added to either is part of presets without more work. The active preset is found by comparing JSON text, so `sanitize` must keep building its objects in a fixed order.
- Theme and panel depend on each other. Change them with `setTheme` and `setPanel`, not directly.
- `localStorage` has four keys: `startpunkt.preferences`, `startpunkt.editKey`, `startpunkt.seenVersion` (the version the page was last opened with, in `changelog.ts`) and `startpunkt.appearance`, the last being a copy of the colours for `public/boot.js`. Every access is in a try/catch, and the page has to work without storage.

## Translations

- Every string a visitor sees is a key in `src/locales/en-US.json` and in every other language file. `i18n.test.ts` fails when the files differ in keys or placeholders.
- Keys are type-checked from `en-US.json`. A key put together at run time needs a cast and is not checked, so avoid it.
- Call `t()` while rendering, so that the component follows a change of language.
- A new language is a new file in `src/locales`, named by its language tag; add the tag to the list in `i18n.test.ts`.

## Styles and themes

- The page's own styles are one stylesheet, `src/style.css`. No CSS modules, no CSS-in-JS.
- The controls inside the dialogs (settings, unlocking, the editor, the list of changes) are drawn by daisyUI, a set of component classes built with Tailwind CSS. Both are tools of the build, set up in `src/kit.css`: nothing of them runs in the browser. Every daisyUI class has the prefix `d-` (`d-btn`, `d-toggle`, `d-select`, `d-input`, `d-range`, `d-tabs`), and only the components listed in `kit.css` are built, so add one there before using it. The classes go on the native element, which keeps its role and its keyboard behaviour. How the controls are laid out stays in `style.css`.
- The kit is for the dialogs only. Tiles, groups, the page's tabs, the corner buttons and the search are the page's own and take no `d-` class. Tailwind's reset is not loaded, for the same reason.
- The kit's colours are set on `dialog` from the five colours of the palette, so a theme still names only those. `--border` is the kit's name for the width of a border; the page's colour for lines is `--line`.
- Tailwind turns any word in the sources that is the name of one of its utilities into a rule, such as `.fixed` or `.hidden`. Do not give an element of the page a class with such a name.
- The palette from the server becomes five custom properties (`--bg`, `--muted`, `--text`, `--primary`, `--accent`); surfaces and borders are derived from them with `color-mix`. Preferences become `data-*` attributes on the root element, set in `theme.ts`.
- Inline styles are style objects, never strings: the Content-Security-Policy refuses style attributes written as text.
- A control that shows on hover also shows on `:focus-visible` and under `@media (hover: none)`. The controls of a tile are not such controls: they are rendered only while `editMode` is on, and are then always shown. Motion is off under `prefers-reduced-motion`, and `forced-colors` has rules of its own.
- Below 640 pixels the grid ignores the chosen number of columns and fits what it can.

## Security

- No inline script. What has to run before the first frame is in `public/boot.js`; when a colour variable is added, change `theme.ts` and the list that `boot.js` accepts together (`boot.test.ts` covers it).
- Requests go to the page's own origin only, and fonts are part of the bundle. Pictures are the one thing loaded from other hosts.
- Tile content comes from cluster resources and from other instances. Render it as text, and pass every address through the helpers in `url.ts`: `safeHref` for links, `iconSource` for icons, `imageAddress` and `cssUrl` for backgrounds.

## The contract with the server

`types.ts` mirrors `internal/tile` and `internal/api`, and holds `SCHEMA_VERSION`. A page that receives another version asks to be reloaded. Change the three together.

## Tests

- `src/testing.ts` has the fixtures. `openFake` and `FakeStream` stand in for the event stream: pass `open={openFake}` to `App` and send events with `FakeStream.last.emit('snapshot', …)` inside `act()`.
- Two things about the fixtures that surprise: `serverState()` sets `showAllClusters: true`, where a real instance defaults to false, and `tile()` has a source type that is not editable, so a test of editing gives it `applications.startpunkt.ullberg.us`.
- State is global, so reset it between tests: `reset()`, `localStorage.clear()`, `reloadPrefs()`, `reloadEditKey()`, `editMode.value = false`, `await setLanguage('en-US')` and `cleanup()`.
- Components take what they would otherwise reach for, such as `open`, `fetcher`, `fetchVersion`, `navigate` and `now`, as properties, so that a test can supply them.

## Accessibility

Every control has a name, is reachable and usable from the keyboard, and shows focus. A state is never told by colour alone: availability, a hidden cluster and an active preset each have a shape or a text as well. Changes that happen without the visitor acting, or far from the focus, are announced through a live region. Dialogs are native `dialog` elements, through `Modal`.

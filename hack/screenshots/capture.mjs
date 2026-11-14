// Takes the screenshots in docs/images from a running instance.
//
//   node capture.mjs <base url> <edit key> <docs/images directory>
//
// Needs playwright-core and a Chromium (CHROMIUM, default /usr/bin/chromium).
// Each shot starts in a fresh browser with its preferences stored the way
// the page stores them.
import { chromium } from 'playwright-core';

const [base, editKey, out] = process.argv.slice(2);
const state = await (await fetch(`${base}/api/v1/state`)).json();
const id = (cluster, name) => state.tiles.find((t) => t.cluster === cluster && t.name === name).id;
const favorites = ['Grafana', 'Home Assistant', 'Jellyfin', 'Argo CD', 'Gitea'].map((name) => id('prod', name));
const bothClusters = { shownClusters: ['prod', 'staging'] };
// Collapsed groups are stored as "<list>:<group>": "applications", or
// "applications-<cluster>" in the sections of the cluster-first layout.
const collapsed = (...groups) =>
  groups.flatMap((group) => ['applications', 'applications-prod', 'applications-staging'].map((list) => `${list}:${group}`));

// Every capture uses the actual generated-pattern preference, with a fixed
// seed for repeatability. Individual examples vary colour and panel strength.
const pattern = {
  type: 'geopattern',
  patternSeed: 'startpunkt',
  color: '#2d4a6b',
  overlayOpacity: 0.45,
};
const dark = (background = {}, more = {}) => ({ theme: 'dark', favorites, background: { ...pattern, overlayOpacity: 0.7, ...background }, ...more });
const light = (background = {}, more = {}) => ({ theme: 'light', favorites, background: { ...pattern, overlayOpacity: -0.7, ...background }, ...more });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });

// Opens the page with the given preferences and waits until it is complete:
// tiles drawn, every icon on screen loaded, fonts ready.
// seen is the version the browser last opened the page with: an older one
// makes the page say what is new.
async function open(prefs, { width = 1440, height = 900, path = '/', key = false, scale = 2, mobile = false, seen = null, update = null, snapshot = null } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
    colorScheme: prefs.theme === 'light' ? 'light' : 'dark',
    locale: 'en-US',
  });
  await context.addInitScript(
    ([p, k, v]) => {
      localStorage.setItem('startpunkt.preferences', JSON.stringify(p));
      if (k) localStorage.setItem('startpunkt.editKey', k);
      if (v) localStorage.setItem('startpunkt.seenVersion', v);
    },
    [prefs, key ? editKey : null, seen],
  );
  const page = await context.newPage();
  // update is a version to announce as newer than the running one. The
  // instances of the shots do not look for updates themselves.
  if (update) {
    await page.route('**/api/v1/version', async (route) => {
      const answer = await (await route.fetch()).json();
      await route.fulfill({
        json: { ...answer, latest: update, updateAvailable: true, url: `https://github.com/ullbergm/startpunkt/releases/tag/${update}` },
      });
    });
  }
  // A fixed snapshot lets the freshness shot demonstrate a past disconnect
  // without waiting in real time or changing the other screenshot instances.
  if (snapshot) {
    await page.route('**/api/v1/events', (route) => route.fulfill({
      contentType: 'text/event-stream',
      body: `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`,
    }));
  }
  await page.goto(base + path);
  await page.waitForSelector('.tile');
  await page.mouse.move(width - 2, height / 2);
  await settle(page);
  // Verify product state and the generated SVG, never a screenshot-only CSS
  // override. All figures must show the requested GeoPattern background.
  const generated = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('startpunkt.preferences'));
    const drawn = document.querySelector('.background-pattern');
    return stored.background.type === 'geopattern' && Boolean(drawn?.style.backgroundImage.includes('data:image/svg+xml'));
  });
  if (!generated) throw new Error('screenshot does not use the GeoPattern preference');
  return page;
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every((img) => {
      const r = img.getBoundingClientRect();
      const onScreen = r.bottom > 0 && r.top < innerHeight && r.width > 0;
      return !onScreen || (img.complete && img.naturalWidth > 0);
    }),
  );
  await page.waitForTimeout(600);
}

async function shot(page, name, options = {}) {
  await settle(page);
  await page.screenshot({ path: `${out}/${name}.png`, ...options });
  console.log(name);
}

async function close(page) {
  await page.context().close();
}

async function settings(page, tab) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  if (tab) await page.getByRole('tab', { name: tab }).click();
}

let page;
const f = (name) => `features/${name}`;

// CAPTURE_ONLY=24 refreshes just the deterministic freshness example.
if (process.env.CAPTURE_ONLY !== '24') {
// The picture at the top of the README.
page = await open(dark(pattern));
// Secondary destinations are separate links and can receive keyboard focus.
const docs = page.locator('.tile-secondary-links a').first();
await docs.waitFor({ state: 'visible' });
await docs.focus();
if (!(await docs.evaluate((link) => document.activeElement === link && !link.parentElement.closest('a')))) {
  throw new Error('secondary link is not independently keyboard reachable');
}
await page.locator('h1').click();
await shot(page, 'screenshot');
await close(page);


page = await open(light({ type: 'geopattern' }));
await shot(page, f('01-light-theme'));
await close(page);

page = await open(dark({ type: 'geopattern' }));
await shot(page, f('02-dark-theme'));
await close(page);

page = await open(dark(pattern, bothClusters));
await page.keyboard.type('g');
await page.waitForSelector('.spotlight [role=option]');
await shot(page, f('03-search'));
await close(page);

page = await open(dark({ type: 'geopattern' }));
await page.getByRole('button', { name: 'Edit the page' }).click();
await shot(page, f('04-favorites'), { clip: { x: 0, y: 0, width: 1440, height: 420 } });
await close(page);

page = await open(dark(pattern));
await page.getByRole('tab', { name: 'Bookmarks' }).click();
await shot(page, f('05-bookmarks'));
await close(page);

page = await open(dark(pattern, bothClusters));
await settings(page, 'Layout');
await shot(page, f('06-settings-layout'));
await close(page);
page = await open(dark(pattern, bothClusters));
await settings(page, 'Tiles');
await shot(page, f('25-settings-tiles'));
await close(page);

page = await open(dark(pattern, { ...bothClusters, layout: { showDiagnostics: true } }));
await page.getByRole('button', { name: 'Inspect Grafana', exact: true }).first().click();
await shot(page, f('26-tile-diagnostics'));
await close(page);


page = await open(dark(pattern));
await settings(page, 'Background');
await page.getByLabel('Pattern text').waitFor({ state: 'visible' });
await shot(page, f('07-settings-background'));
await close(page);

page = await open(dark({ type: 'geopattern', color: '#1e3a5f', overlayOpacity: 0 }));
await shot(page, f('08-background-solid'));
await close(page);

page = await open(light({ type: 'geopattern', color: '#bbd2f0', overlayOpacity: -0.4 }));
await shot(page, f('09-background-gradient'));
await close(page);

page = await open(dark({ type: 'geopattern', color: '#3b577c', overlayOpacity: 0.65 }));
await shot(page, f('10-background-time-of-day'));
await close(page);

page = await open(dark({ type: 'geopattern', color: '#5b2a86', overlayOpacity: 0.45 }));
await shot(page, f('11-background-mesh'));
await close(page);

page = await open(dark({ type: 'geopattern', patternSeed: 'startpunkt', color: '#2d4a6b', overlayOpacity: 0.55 }));
await shot(page, f('12-background-pattern'));
await close(page);

page = await open(
  dark({ type: 'geopattern' }, { layout: { columns: 3, showBoxes: true, descriptionLines: 1 } }),
);
await shot(page, f('13-layout-columns'));
await close(page);

page = await open(dark(pattern, { ...bothClusters, collapsed: collapsed('home', 'media', 'infrastructure') }));
await shot(page, f('14-clusters'));
await close(page);

page = await open(
  dark(pattern, { ...bothClusters, favorites: [], collapsed: collapsed('home', 'media'), layout: { byCluster: true } }),
  { height: 1180 },
);
await shot(page, f('15-cluster-sections'));
await close(page);

page = await open(dark(pattern), { key: true });
await page.getByRole('button', { name: 'Edit the page' }).click();
await page.getByRole('button', { name: 'Change NAS' }).click();
await page.waitForSelector('.editor input');
await shot(page, f('16-edit-application'));
await close(page);

// Adding a tile: the form asks which kind it is.
page = await open(dark(pattern), { key: true });
await page.getByRole('button', { name: 'Edit the page' }).click();
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.waitForSelector('.editor select');
await page.getByLabel('Name', { exact: true }).fill('Paperless');
await page.getByLabel('Address', { exact: true }).fill('https://paperless.example.com');
await page.getByLabel(/^Group/).fill('home');
await page.getByLabel('Tags', { exact: true }).fill('documents,');
await page.getByLabel('Tags', { exact: true }).fill('scanner,');
await page.getByRole('button', { name: 'Choose an icon' }).click();
await page.getByRole('searchbox', { name: 'Search icons' }).fill('paper');
await page.waitForSelector('.icon-results img');
await page.waitForSelector('.address-up');
await page.locator('.icon-search').scrollIntoViewIfNeeded();
await settle(page);
await shot(page, f('20-add-tile'));
await close(page);

// The first visit after an update: what changed since the version last seen.
page = await open(dark(pattern), { seen: '5.0.0' });
await page.waitForSelector('.changes li');
await shot(page, f('19-whats-new'));
await close(page);

// A newer release: the ribbon across the corner.
page = await open(dark(pattern), { update: 'v5.8.0' });
await page.waitForSelector('.update-ribbon');
await shot(page, f('21-update-ribbon'), { clip: { x: 720, y: 0, width: 720, height: 300 } });
await close(page);

// At /admin, the tiles tagged "admin" are shown too.
page = await open(
  dark(pattern, { ...bothClusters, favorites: [], collapsed: collapsed('development', 'home', 'media'), layout: { showTags: true } }),
  { path: '/admin' },
);
await shot(page, f('17-unavailable-and-tags'));
await close(page);

page = await open(dark(pattern), { width: 390, height: 844, scale: 3, mobile: true });
await shot(page, f('18-mobile'));
await close(page);

// Ordered-character matching finds OpenShift without requiring a prefix.
page = await open(dark(pattern));
await page.keyboard.press('/');
await page.getByRole('combobox').waitFor({ state: 'visible' });
await page.getByRole('combobox').fill('Osft');
await page.waitForFunction(() => [...document.querySelectorAll('.spotlight [role=option]')].some((option) => option.textContent.includes('OpenShift')));
await page.waitForSelector('.spotlight [role=option]');
const options = page.getByRole('option');
if (!(await options.allTextContents()).some((text) => text.includes('OpenShift'))) {
  throw new Error('Osft did not find OpenShift');
}
await shot(page, f('22-fuzzy-search'));
await close(page);

// HTTP failure and workload readiness remain separate signals. The demo
// Deployment is scaled to zero, so 0/0 ready is a legitimate desired state.
page = await open(dark({ type: 'geopattern' }, { favorites: [], layout: { showWorkload: true, showConsole: true }, collapsed: collapsed('development', 'home', 'media', 'monitoring') }));
const backupCard = page.locator('.tile').filter({ has: page.getByText('Backup server', { exact: true }) });
await backupCard.getByText('Offline', { exact: true }).waitFor();
await backupCard.locator('.tile-workload').filter({ hasText: 'Workload ready · 0/0' }).waitFor();
const consoleLink = backupCard.getByRole('link', { name: 'Open Backup server in OpenShift' });
if ((await consoleLink.getAttribute('href')) !== 'https://console.prod.example.com/k8s/ns/startpunkt/startpunkt.ullberg.us~v1~Application/backup') {
  throw new Error('OpenShift resource link does not name the source resource');
}
await consoleLink.focus();
if (!(await consoleLink.evaluate((link) => document.activeElement === link && !link.parentElement.closest('a')))) {
  throw new Error('OpenShift resource link is not independently keyboard reachable');
}
await page.locator('h1').click();
await shot(page, f('23-workload-readiness'));
await close(page);

}

// Preserve the real demo tiles but show a deterministic remote disconnect.
const staleSnapshot = structuredClone(state);
const past = new Date(Date.now() - 17 * 60_000).toISOString();
staleSnapshot.clusters = staleSnapshot.clusters.map((cluster) => cluster.name === 'staging'
  ? { ...cluster, state: 'stale', lastSeen: past, staleSince: past }
  : cluster);
page = await open(dark({ type: 'geopattern' }, { ...bothClusters, favorites: [], collapsed: collapsed('development', 'home', 'media', 'infrastructure') }), { snapshot: staleSnapshot });
await page.locator('.cluster-freshness').filter({ hasText: 'staging' }).waitFor();
const freshness = page.locator('.cluster-freshness').filter({ hasText: 'staging' });
if (!(await freshness.textContent()).includes('Last seen') || !(await freshness.textContent()).includes('Data stale for') || !(await freshness.textContent()).includes('minutes')) {
  throw new Error('stale remote does not show last contact and elapsed duration');
}
if (!(await freshness.locator('time').getAttribute('datetime'))) {
  throw new Error('last contact has no machine-readable time');
}
await shot(page, f('24-remote-freshness'));
await close(page);

await browser.close();

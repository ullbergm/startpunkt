// What changed between versions, as the server reads it from the project's
// changelog, and which version this browser last saw.

export interface ReleaseSection {
  title: string;
  changes: string[];
}

export interface Release {
  version: string;
  date?: string;
  sections: ReleaseSection[];
}

// The three numbers of "1.2.3", "v1.2.3" and "1.2.3-anything". Anything
// else, such as the name of a development build, is no version.
export function parseVersion(text: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(text.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

// Whether a is a newer version than b. What is not a version is never
// newer, and nothing is newer than it.
export function newerVersion(a: string, b: string): boolean {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return false;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i]! > right[i]!;
  }
  return false;
}

// The releases after one version and up to another. Without "after" there
// is no lower end.
export function releasesBetween(releases: Release[], after: string | null, upTo: string): Release[] {
  return releases.filter(
    (release) =>
      parseVersion(release.version) !== null &&
      !newerVersion(release.version, upTo) &&
      (after === null || newerVersion(release.version, after)),
  );
}

const text = (value: unknown): value is string => typeof value === 'string';

// Asks the server for the changelog. Whatever does not have the expected
// shape is left out, and a failure is an empty list.
export async function fetchChangelog(fetcher: typeof fetch = fetch): Promise<Release[]> {
  try {
    const response = await fetcher('/api/v1/changelog');
    if (!response.ok) return [];
    const document = (await response.json()) as { releases?: unknown };
    if (!Array.isArray(document.releases)) return [];
    const releases: Release[] = [];
    for (const item of document.releases as Partial<Release>[]) {
      if (!item || !text(item.version) || !Array.isArray(item.sections)) continue;
      const sections = item.sections
        .filter((section) => section && Array.isArray(section.changes))
        .map((section) => ({ title: text(section.title) ? section.title : '', changes: section.changes.filter(text) }))
        .filter((section) => section.changes.length > 0);
      if (sections.length > 0) {
        releases.push({ version: item.version, date: text(item.date) ? item.date : undefined, sections });
      }
    }
    return releases;
  } catch {
    return [];
  }
}

const KEY = 'startpunkt.seenVersion';

// The version this browser last opened the page with.
export function seenVersion(): string | null {
  try {
    return window.localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function rememberVersion(version: string): void {
  try {
    window.localStorage.setItem(KEY, version);
  } catch {
    // Without storage nothing is announced: every visit looks like the first.
  }
}

// With a "v" in front when it is a version, as releases are named.
export const versionName = (version: string) => (/^\d/.test(version) ? `v${version}` : version);

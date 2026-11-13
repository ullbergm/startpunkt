import { useEffect, useState } from 'preact/hooks';
import { parseVersion, versionName } from '../changelog';
import { t } from '../i18n';

export interface VersionInfo {
  version: string;
  latest?: string;
  updateAvailable: boolean;
  url?: string;
  // Whether the footer is shown.
  githubLink?: boolean;
}

const RELEASES = 'https://github.com/ullbergm/startpunkt/releases/';

// Asks the server which version is running and whether a newer one exists.
// The server does the looking; the page only ever asks its own server.
//
// The answer is undefined until the server has been asked, and null when it
// had nothing to say.
export function useVersion(fetcher: typeof fetch = fetch): VersionInfo | null | undefined {
  const [info, setInfo] = useState<VersionInfo | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    fetcher('/api/v1/version')
      .then((response) => (response.ok ? (response.json() as Promise<VersionInfo>) : null))
      .then((found) => {
        if (current) setInfo(found && typeof found.version === 'string' ? found : null);
      })
      .catch(() => current && setInfo(null));
    return () => {
      current = false;
    };
  }, [fetcher]);
  return info;
}

// The newer release, when there is one and its link points at the project's
// release pages. Any other link is ignored.
export function availableUpdate(info: VersionInfo | null | undefined): { version: string; url: string } | undefined {
  return info?.updateAvailable && info.latest && info.url?.startsWith(RELEASES)
    ? { version: info.latest, url: info.url }
    : undefined;
}

// The line under the content: what is running and where it comes from. The
// version opens the list of what changed in it. A newer release is not
// announced here: the corner at the top of the page does that.
//
// The instance can turn the footer off. It is not drawn before the instance
// has been asked, so that it does not show for a moment where it is off.
export function Footer({ info, onChanges }: { info: VersionInfo | null | undefined; onChanges?: () => void }) {
  if (info === undefined || info?.githubLink === false) return null;
  const version = info ? versionName(info.version) : '';
  // A development build has no entry in the changelog.
  const released = info !== null && parseVersion(info.version) !== null;
  return (
    <footer class="page-footer">
      <p>
        <a href="https://github.com/ullbergm/startpunkt" target="_blank" rel="noopener noreferrer">
          Startpunkt
        </a>
        {version && ' '}
        {version && released && onChanges ? (
          <button type="button" class="link-button" title={t('changes.open', { version })} onClick={onChanges}>
            {version}
          </button>
        ) : (
          version
        )}
        , {t('footer.by')}{' '}
        <a href="https://ullberg.us" target="_blank" rel="noopener noreferrer">
          Magnus Ullberg
        </a>
        .
      </p>
    </footer>
  );
}

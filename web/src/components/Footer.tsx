import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

export interface VersionInfo {
  version: string;
  latest?: string;
  updateAvailable: boolean;
  url?: string;
  githubLink?: boolean;
}

const RELEASES = 'https://github.com/ullbergm/startpunkt/releases/';

// Asks the server which version is running and whether a newer one exists.
// The server does the looking; the page only ever asks its own server.
export function useVersion(fetcher: typeof fetch = fetch): VersionInfo | null {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  useEffect(() => {
    let current = true;
    fetcher('/api/v1/version')
      .then((response) => (response.ok ? (response.json() as Promise<VersionInfo>) : null))
      .then((found) => {
        if (current && found && typeof found.version === 'string') setInfo(found);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [fetcher]);
  return info;
}

// The newer release, when there is one and its link points at the project's
// release pages. Any other link is ignored.
export function availableUpdate(info: VersionInfo | null): { version: string; url: string } | undefined {
  return info?.updateAvailable && info.latest && info.url?.startsWith(RELEASES)
    ? { version: info.latest, url: info.url }
    : undefined;
}

// The line under the content: what is running, where it comes from, and a
// notice when a newer release exists.
export function Footer({ info }: { info: VersionInfo | null }) {
  const update = availableUpdate(info);
  const version = info ? (/^\d/.test(info.version) ? `v${info.version}` : info.version) : '';
  return (
    <footer class="page-footer">
      <p>
        <a href="https://github.com/ullbergm/startpunkt" target="_blank" rel="noopener noreferrer">
          Startpunkt
        </a>
        {version && ` ${version}`}, {t('footer.by')}{' '}
        <a href="https://ullberg.us" target="_blank" rel="noopener noreferrer">
          Magnus Ullberg
        </a>
        .
      </p>
      {update && (
        <p role="status">
          <a class="update" href={update.url} target="_blank" rel="noopener noreferrer">
            {t('footer.update', { version: update.version })}
          </a>
        </p>
      )}
    </footer>
  );
}

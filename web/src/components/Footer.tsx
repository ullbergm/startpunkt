import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

interface VersionInfo {
  version: string;
  latest?: string;
  updateAvailable: boolean;
  url?: string;
}

const RELEASES = 'https://github.com/ullbergm/startpunkt/releases/';

// The line under the content: what is running, where it comes from, and a
// notice when a newer release exists. The server does the looking; the page
// only asks its own server.
export function Footer({ fetcher = fetch }: { fetcher?: typeof fetch }) {
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

  // The link is only used when it points at the project's release pages.
  const update = info?.updateAvailable && info.latest && info.url?.startsWith(RELEASES) ? info : null;
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
            {t('footer.update', { version: update.latest! })}
          </a>
        </p>
      )}
    </footer>
  );
}

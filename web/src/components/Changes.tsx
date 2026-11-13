import type { Release } from '../changelog';
import { versionName } from '../changelog';
import { t } from '../i18n';
import { Icon } from './Icons';
import { Modal } from './Modal';

// What changed in a number of releases, newest first. The text comes from
// the project's changelog by way of the server and is shown as text.
export function Changes({
  title,
  intro,
  releases,
  link,
  onClose,
}: {
  title: string;
  intro?: string;
  // null while they are being asked for.
  releases: Release[] | null;
  // The page of the release, for an update.
  link?: string;
  onClose: () => void;
}) {
  return (
    <Modal label={title} class="settings editor changes" onClose={onClose}>
      <header class="settings-header">
        <h2>{title}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div class="settings-body">
        {intro && <p class="help">{intro}</p>}
        {releases === null && <p role="status">{t('changes.loading')}</p>}
        {releases !== null && releases.length === 0 && <p>{t('changes.none')}</p>}
        {releases?.map((release) => (
          <section key={release.version} aria-label={versionName(release.version)}>
            <h3>
              {versionName(release.version)}
              {release.date && <small class="d-badge d-badge-ghost d-badge-sm"> {release.date}</small>}
            </h3>
            {release.sections.map((section, index) => (
              <div key={index}>
                {section.title && <h4>{section.title}</h4>}
                <ul>
                  {section.changes.map((change, at) => (
                    <li key={at}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
        {link && (
          <p class="changes-link">
            <a class="d-btn d-btn-outline d-btn-sm" href={link} target="_blank" rel="noopener noreferrer">
              {t('changes.release')}
            </a>
          </p>
        )}
      </div>
    </Modal>
  );
}

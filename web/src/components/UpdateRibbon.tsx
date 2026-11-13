import { t } from '../i18n';

// A golden ribbon across the top right corner, shown when a newer release
// exists. It says which version there is and opens the list of what has
// changed.
export function UpdateRibbon({ update, onOpen }: { update: { version: string; url: string }; onOpen?: () => void }) {
  const label = t('footer.update', { version: update.version });
  return (
    // The button is the square the ribbon crosses; only the ribbon itself
    // takes clicks, so that what is under the rest of the square stays
    // reachable.
    <button type="button" class="update-ribbon" aria-label={label} title={label} onClick={onOpen}>
      <span class="update-ribbon-band">{t('update.ribbon', { version: update.version })}</span>
    </button>
  );
}

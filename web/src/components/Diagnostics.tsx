import { signal } from '@preact/signals';
import { t } from '../i18n';
import { serverState } from '../state';
import type { TileSource } from '../types';
import { safeHref } from '../url';
import { Icon } from './Icons';
import { Modal } from './Modal';

// null is closed, [] shows every resource, otherwise inspect these tile ids.
export const diagnosticTarget = signal<string[] | null>(null);

function Source({ source }: { source: TileSource }) {
  return (
    <dl class="diagnostic-fields">
      <dt>{t('diagnostics.resource')}</dt>
      <dd>{source.kind || source.type}</dd>
      <dt>{t('diagnostics.namespace')}</dt>
      <dd>{source.namespace || '—'}</dd>
      <dt>{t('diagnostics.name')}</dt>
      <dd>{source.name}</dd>
      <dt>{t('diagnostics.version')}</dt>
      <dd>{source.version}</dd>
    </dl>
  );
}

export function Diagnostics({ clusters, onClose }: { clusters: string[]; onClose: () => void }) {
  const state = serverState.value;
  const target = diagnosticTarget.value ?? [];
  const tiles = (state?.tiles ?? []).filter(
    (tile) => clusters.includes(tile.cluster) && (!target.length || target.includes(tile.id)),
  );
  const errors = (state?.diagnostics ?? []).filter(
    (d) => clusters.includes(d.cluster) && (!target.length || target.includes(d.id)),
  );
  return (
    <Modal label={t('diagnostics.title')} class="diagnostics" onClose={onClose}>
      <header class="settings-header">
        <h2>{t('diagnostics.title')}</h2>
        <button
          type="button"
          class="d-btn d-btn-ghost d-btn-sm d-btn-circle"
          aria-label={t('settings.close')}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div class="settings-body">
        {errors.map((d) => (
          <section key={d.id} class="diagnostic-resource">
            <h3>
              {d.source.name} · {d.cluster}
            </h3>
            <p class="notice-error">{t('diagnostics.failed')}</p>
            <p>{d.message}</p>
            <Source source={d.source} />
          </section>
        ))}
        {tiles.map((tile) => {
          const href = safeHref(tile.url);
          const when = tile.lastProbe ? new Date(tile.lastProbe) : null;
          const validTime = when && Number.isFinite(when.getTime());
          const cluster = state?.clusters.find((c) => c.name === tile.cluster);
          return (
            <details key={tile.id} class="diagnostic-resource" open={target.length > 0}>
              <summary>
                {tile.name} · {tile.cluster}
              </summary>
              <Source source={tile.source} />
              <dl class="diagnostic-fields">
                <dt>{t('diagnostics.url')}</dt>
                <dd>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {tile.url}
                    </a>
                  ) : (
                    tile.url
                  )}
                </dd>
                <dt>{t('diagnostics.availability')}</dt>
                <dd>
                  {t(
                    tile.available === true
                      ? 'diagnostics.available'
                      : tile.available === false
                        ? 'diagnostics.unavailable'
                        : 'diagnostics.unknown',
                  )}
                </dd>
                {validTime && (
                  <>
                    <dt>{t('diagnostics.since')}</dt>
                    <dd>
                      <time dateTime={tile.lastProbe}>{when.toLocaleString()}</time>
                    </dd>
                  </>
                )}
                <dt>{t('diagnostics.workload')}</dt>
                <dd>
                  {tile.workload
                    ? t(`tile.workload.${tile.workload.state}`, {
                        ready: tile.workload.ready,
                        desired: tile.workload.desired,
                      })
                    : t('diagnostics.unknown')}
                </dd>
                <dt>{t('diagnostics.feed')}</dt>
                <dd>{cluster ? t(`diagnostics.${cluster.state}`) : t('diagnostics.unknown')}</dd>
              </dl>
            </details>
          );
        })}
        {!tiles.length && !errors.length && <p>{t('diagnostics.empty')}</p>}
        <p class="help">{t('diagnostics.probeHelp')}</p>
      </div>
    </Modal>
  );
}

import { useEffect, useState } from 'preact/hooks';
import { language, t } from './i18n';
import type { Cluster } from './types';

export const FRESHNESS_INTERVAL_MS = 30_000;
const systemNow = () => Date.now();

// The server sends RFC3339 values. Ignore missing/malformed values instead
// of letting an invalid Date prevent the rest of the page from rendering.
export function timestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function disconnected(cluster: Cluster): boolean {
  return cluster.state === 'stale' || (!cluster.local && cluster.state === 'syncing');
}

export function staleDuration(since: number, now: number, locale = language.value): string {
  const minutes = Math.floor(Math.max(0, now - since) / 60_000);
  if (minutes === 0) return t('clusters.freshness.lessThanMinute');
  const [value, unit] = minutes >= 1440
    ? [Math.floor(minutes / 1440), 'day'] as const
    : minutes >= 60
      ? [Math.floor(minutes / 60), 'hour'] as const
      : [minutes, 'minute'] as const;
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);
}

export interface Freshness {
  lastSeen: { dateTime: string; label: string } | null;
  duration: string | null;
  neverReached: boolean;
}

export function clusterFreshness(cluster: Cluster, now: number, locale = language.value): Freshness {
  const lastSeen = timestamp(cluster.lastSeen);
  const staleSince = timestamp(cluster.staleSince);
  // A remote clock may be ahead. It must never produce negative ages or
  // claim that the last successful contact is still in the future.
  const seen = lastSeen === null ? null : Math.min(lastSeen, now);
  return {
    lastSeen: seen === null ? null : {
      dateTime: new Date(seen).toISOString(),
      label: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(seen),
    },
    duration: disconnected(cluster) && staleSince !== null ? staleDuration(staleSince, now, locale) : null,
    neverReached: disconnected(cluster) && lastSeen === null,
  };
}

export function freshnessText(cluster: Cluster, now: number, locale = language.value): string {
  const fresh = clusterFreshness(cluster, now, locale);
  return [
    fresh.lastSeen ? t('clusters.freshness.lastSeen', { time: fresh.lastSeen.label }) : '',
    fresh.neverReached ? t('clusters.freshness.neverReached') : '',
    fresh.duration ? t('clusters.freshness.staleFor', { duration: fresh.duration }) : '',
  ].filter(Boolean).join(' · ');
}

// A stale duration changes even when no server event arrives. There is no
// timer while everything is connected; callers can inject a clock in tests.
export function useFreshnessNow(active: boolean, clock: () => number = systemNow): number {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    setNow(clock());
    if (!active) return;
    const timer = window.setInterval(() => setNow(clock()), FRESHNESS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, clock]);
  return active ? now : clock();
}

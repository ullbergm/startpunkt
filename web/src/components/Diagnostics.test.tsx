import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { setLanguage } from '../i18n';
import { serverState, reset } from '../state';
import { serverState as fixture, tile } from '../testing';
import { diagnosticTarget, Diagnostics } from './Diagnostics';

beforeEach(async () => {
  reset();
  diagnosticTarget.value = [];
  await setLanguage('en-US');
});
afterEach(() => {
  cleanup();
  diagnosticTarget.value = null;
});

it('shows untrusted resolution failures as text and removes recovered errors live', () => {
  const message = '<img src=x onerror=alert(1)>';
  serverState.value = fixture({
    diagnostics: [
      {
        id: 'c/apps/ns/bad',
        cluster: 'c',
        source: { type: 'apps', version: 'v1', namespace: 'ns', name: 'bad' },
        message,
      },
    ],
  });
  const { container } = render(<Diagnostics clusters={['c']} onClose={() => {}} />);
  expect(screen.getByText(message)).toBeTruthy();
  expect(container.querySelector('img')).toBeNull();
  act(() => {
    serverState.value = fixture({ diagnostics: [] });
  });
  expect(screen.queryByText(message)).toBeNull();
});
it('shows only selected visible tiles with source and availability transition details', () => {
  const selected = tile({
    name: 'Grafana',
    available: false,
    lastProbe: '2026-01-01T00:00:00Z',
  });
  serverState.value = fixture({
    tiles: [selected, tile({ name: 'Other', cluster: 'hidden' })],
  });
  diagnosticTarget.value = [selected.id];
  const { container } = render(<Diagnostics clusters={['c']} onClose={() => {}} />);
  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect(screen.getByText('Resolved URL')).toBeTruthy();
  expect(container.querySelector('time')?.dateTime).toBe('2026-01-01T00:00:00Z');
  expect(screen.queryByText(/Other/)).toBeNull();
});

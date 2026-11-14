import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editMode } from '../editing';
import { setLanguage } from '../i18n';
import { reloadPrefs } from '../prefs';
import { tile } from '../testing';
import { TileCard } from './TileCard';

beforeEach(async () => {
  localStorage.clear();
  reloadPrefs();
  editMode.value = false;
  await setLanguage('en-US');
});
afterEach(cleanup);

describe('secondary tile links', () => {
  it('renders independent named links outside the primary anchor', () => {
    const primary = tile({ name: 'Grafana', targetBlank: true, links: [{ name: 'Documentation', url: 'https://docs.example.com' }] });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    const docs = screen.getByRole('link', { name: 'Documentation' });
    expect(docs.getAttribute('href')).toBe('https://docs.example.com');
    expect(docs.getAttribute('target')).toBe('_blank');
    expect(docs.getAttribute('rel')).toBe('noopener noreferrer');
    expect(docs.parentElement?.closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'Grafana' }).textContent).not.toContain('Documentation');
  });

  it('distinguishes each cluster’s secondary links on combined cards', () => {
    const primary = tile({ name: 'Grafana', cluster: 'prod', links: [{ name: 'Logs', url: 'https://logs.prod.example.com' }] });
    const other = tile({ name: 'Grafana', id: 'other', cluster: 'stage', links: [{ name: 'Logs', url: 'https://logs.stage.example.com' }] });
    render(<TileCard card={{ key: primary.id, primary, members: [primary, other] }} iconColor="red" />);
    expect(screen.getByRole('link', { name: 'Logs · prod' }).getAttribute('href')).toBe('https://logs.prod.example.com');
    expect(screen.getByRole('link', { name: 'Logs · stage' }).getAttribute('href')).toBe('https://logs.stage.example.com');
  });

  it('does not render unsafe secondary destinations from a remote', () => {
    const primary = tile({ links: [{ name: 'Unsafe', url: 'javascript:alert(1)' }, { name: 'File', url: 'file:///tmp/x' }] });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'File' })).toBeNull();
  });
});

import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editMode } from '../editing';
import { setLanguage } from '../i18n';
import { reloadPrefs, updatePrefs } from '../prefs';
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
    const primary = tile({
      name: 'Grafana',
      targetBlank: true,
      links: [{ name: 'Documentation', url: 'https://docs.example.com' }],
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    const docs = screen.getByRole('link', { name: 'Documentation' });
    expect(docs.getAttribute('href')).toBe('https://docs.example.com');
    expect(docs.getAttribute('target')).toBe('_blank');
    expect(docs.getAttribute('rel')).toBe('noopener noreferrer');
    expect(docs.parentElement?.closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'Grafana' }).textContent).not.toContain('Documentation');
  });

  it('distinguishes each cluster’s secondary links on combined cards', () => {
    const primary = tile({
      name: 'Grafana',
      cluster: 'prod',
      links: [{ name: 'Logs', url: 'https://logs.prod.example.com' }],
    });
    const other = tile({
      name: 'Grafana',
      id: 'other',
      cluster: 'stage',
      links: [{ name: 'Logs', url: 'https://logs.stage.example.com' }],
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary, other] }} iconColor="red" />);
    expect(screen.getByRole('link', { name: 'Logs · prod' }).getAttribute('href')).toBe(
      'https://logs.prod.example.com',
    );
    expect(screen.getByRole('link', { name: 'Logs · stage' }).getAttribute('href')).toBe(
      'https://logs.stage.example.com',
    );
  });

  it('does not render unsafe secondary destinations from a remote', () => {
    const primary = tile({
      links: [
        { name: 'Unsafe', url: 'javascript:alert(1)' },
        { name: 'File', url: 'file:///tmp/x' },
      ],
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'File' })).toBeNull();
  });
});

describe('workload readiness and OpenShift links', () => {
  beforeEach(() =>
    updatePrefs((p) => ({
      ...p,
      layout: { ...p.layout, showWorkload: true, showConsole: true },
    })),
  );
  it('shows workload readiness independently of an HTTP failure', () => {
    const primary = tile({
      name: 'Grafana',
      available: false,
      workload: { state: 'ready', ready: 2, desired: 2 },
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByText('Workload ready · 2/2')).toBeTruthy();
  });

  it('names clusters when combined workloads have different readiness', () => {
    const primary = tile({
      name: 'Grafana',
      cluster: 'prod',
      workload: { state: 'ready', ready: 2, desired: 2 },
    });
    const other = tile({
      name: 'Grafana',
      id: 'stage',
      cluster: 'stage',
      workload: { state: 'starting', ready: 0, desired: 1 },
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary, other] }} iconColor="red" />);
    expect(screen.getByText('prod: Workload ready · 2/2')).toBeTruthy();
    expect(screen.getByText('stage: Workload starting · 0/1')).toBeTruthy();
  });

  it('renders a separately reachable console resource link', () => {
    const primary = tile({
      name: 'Grafana',
      consoleURL: 'https://console.test/k8s/ns/monitoring/routes/grafana',
      targetBlank: true,
    });
    render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    const consoleLink = screen.getByRole('link', {
      name: 'Open Grafana in OpenShift',
    });
    expect(consoleLink.getAttribute('href')).toBe(primary.consoleURL);
    expect(consoleLink.parentElement?.closest('a')).toBeNull();
    expect(consoleLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not render unsafe console URLs or console links during editing', () => {
    const primary = tile({
      name: 'Grafana',
      consoleURL: 'javascript:alert(1)',
    });
    const rendered = render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    expect(screen.queryByRole('link', { name: 'Open Grafana in OpenShift' })).toBeNull();
    primary.consoleURL = 'https://console.test';
    editMode.value = true;
    rendered.rerender(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
    expect(screen.queryByRole('link', { name: 'Open Grafana in OpenShift' })).toBeNull();
  });
});

it('hides workload and console visuals by default and lets each be enabled independently', () => {
  const primary = tile({
    name: 'Grafana',
    available: false,
    workload: { state: 'ready', ready: 2, desired: 2 },
    consoleURL: 'https://console.test',
    links: [{ name: 'Docs', url: 'https://docs.test' }],
  });
  const { rerender } = render(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
  expect(screen.queryByText('Workload ready · 2/2')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Open Grafana in OpenShift' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Docs' })).toBeTruthy();
  updatePrefs((p) => ({
    ...p,
    layout: {
      ...p.layout,
      showConsole: true,
      showLinks: false,
      showStatus: false,
    },
  }));
  rerender(<TileCard card={{ key: primary.id, primary, members: [primary] }} iconColor="red" />);
  expect(screen.getByRole('link', { name: 'Open Grafana in OpenShift' })).toBeTruthy();
  expect(screen.queryByText('Workload ready · 2/2')).toBeNull();
  expect(screen.queryByText('Offline')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Docs' })).toBeNull();
});

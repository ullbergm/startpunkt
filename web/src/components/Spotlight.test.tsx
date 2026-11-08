import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { tile } from '../testing';
import { Spotlight } from './Spotlight';

const tiles = [
  tile({ id: 'prod/a/ns/grafana', name: 'Grafana', cluster: 'prod', group: 'observability', url: 'https://grafana.prod' }),
  tile({ id: 'dev/a/ns/grafana', name: 'Grafana', cluster: 'dev', group: 'observability', url: 'https://grafana.dev', targetBlank: true }),
  tile({ name: 'Docs', kind: 'bookmark', group: 'reference', url: 'https://docs.example.com' }),
  tile({ name: 'Evil', url: 'javascript:alert(1)' }),
];

function open(showCluster = true) {
  const navigate = vi.fn();
  const onClose = vi.fn();
  render(
    <Spotlight
      tiles={tiles}
      searchEngine="https://search.example.com/?q="
      showCluster={showCluster}
      onClose={onClose}
      navigate={navigate}
    />,
  );
  const input = screen.getByRole('combobox');
  const type = (value: string) => fireEvent.input(input, { target: { value } });
  return { navigate, onClose, input, type };
}

beforeEach(() => setLanguage('en-US'));
afterEach(() => cleanup());

describe('Spotlight', () => {
  it('focuses the input and shows the hint', () => {
    const { input } = open();
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('status').textContent).toContain('Enter to open');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('lists matches with their cluster and kind', () => {
    const { type, input } = open();
    type('graf');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]!.textContent).toContain('prod');
    expect(options[0]!.textContent).toContain('App');
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    expect(screen.getByRole('status').textContent).toBe('2 results');
  });

  it('leaves the cluster out when there is only one', () => {
    const { type } = open(false);
    type('graf');
    expect(screen.getAllByRole('option')[0]!.textContent).not.toContain('prod');
  });

  it('moves with the arrow keys, wraps around, and opens with Enter', () => {
    const { type, input, navigate, onClose } = open();
    type('graf');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('https://grafana.dev', true);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens a result on click', () => {
    const { type, navigate } = open();
    type('docs');
    fireEvent.click(screen.getByRole('option'));
    expect(navigate).toHaveBeenCalledWith('https://docs.example.com', false);
  });

  it('says when nothing matches and does nothing on Enter', () => {
    const { type, input, navigate } = open();
    type('nothing like this');
    expect(screen.getByRole('status').textContent).toBe('No results');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('never offers a tile whose link would run script', () => {
    const { type } = open();
    type('evil');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('sends a query that starts with ? to the search engine', () => {
    const { type, input, navigate } = open();
    type('?kubernetes & ingress');
    expect(screen.getByRole('option').textContent).toContain('kubernetes & ingress');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('https://search.example.com/?q=kubernetes%20%26%20ingress', true);
  });

  it('resets the selection when the query changes', () => {
    const { type, input } = open();
    type('graf');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    type('grafa');
    expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('true');
  });
});

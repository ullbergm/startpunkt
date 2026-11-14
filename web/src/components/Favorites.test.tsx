import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toCards } from '../cards';
import { editMode } from '../editing';
import { setLanguage } from '../i18n';
import { prefs, reloadPrefs, updatePrefs } from '../prefs';
import { reset } from '../state';
import { tile } from '../testing';
import { Favorites } from './Section';

beforeEach(async () => {
  reset();
  localStorage.clear();
  reloadPrefs();
  editMode.value = true;
  await setLanguage('en-US');
});
afterEach(cleanup);

const members = [
  tile({ id: 'local/grafana', name: 'Grafana', cluster: 'local' }),
  tile({ id: 'prod/grafana', name: 'Grafana', cluster: 'prod' }),
  tile({ id: 'local/plex', name: 'Plex', cluster: 'local' }),
];
function FavoriteRow() {
  const stored = prefs.value.favorites;
  const cards = toCards(members, true, ['local', 'prod'])
    .filter((card) => card.members.some((member) => stored.includes(member.id)))
    .sort((a, b) => Math.min(...a.members.map((member) => stored.indexOf(member.id)).filter((index) => index >= 0))
      - Math.min(...b.members.map((member) => stored.indexOf(member.id)).filter((index) => index >= 0)));
  return <Favorites cards={cards} iconColor="red" showCluster />;
}
const names = () => [...document.querySelectorAll('.favorites .tile-name')].map((node) => node.textContent);

describe('combined favorites', () => {
  it('moves every favorite member by keyboard and announces the actual new position', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['local/grafana', 'prod/grafana', 'local/plex'] }));
    render(<FavoriteRow />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Grafana later' }));
    await waitFor(() => expect(names()).toEqual(['Plex', 'Grafana']));
    expect(prefs.value.favorites).toEqual(['local/plex', 'local/grafana', 'prod/grafana']);
    expect(screen.getByRole('status').textContent).toContain('2');
    fireEvent.click(screen.getByRole('button', { name: 'Move Grafana earlier' }));
    await waitFor(() => expect(names()).toEqual(['Grafana', 'Plex']));
  });

  it('moves all members by dragging and keeps hidden favorites in place', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['local/grafana', 'hidden', 'prod/grafana', 'local/plex'] }));
    render(<FavoriteRow />);
    const rows = document.querySelectorAll('.favorites .tiles > li');
    fireEvent.dragStart(rows[0]!);
    fireEvent.dragOver(rows[1]!);
    fireEvent.drop(rows[1]!);
    await waitFor(() => expect(names()).toEqual(['Plex', 'Grafana']));
    expect(prefs.value.favorites).toEqual(['local/plex', 'hidden', 'local/grafana', 'prod/grafana']);
  });

  it('removes a partially starred combined card when its button says remove', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['local/grafana'] }));
    render(<FavoriteRow />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Grafana from favorites' }));
    await waitFor(() => expect(prefs.value.favorites).toEqual([]));
    expect(screen.queryByRole('region', { name: 'Favorites' })).toBeNull();
  });
});

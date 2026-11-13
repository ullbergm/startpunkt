import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { Footer, useVersion } from './Footer';
import { UpdateRibbon } from './UpdateRibbon';
import { availableUpdate } from './Footer';

// The footer and the ribbon as the page wires them together.
const onUpdate = vi.fn();
const onChanges = vi.fn();
function Wired({ fetcher }: { fetcher: typeof fetch }) {
  const info = useVersion(fetcher);
  const update = availableUpdate(info);
  return (
    <>
      {update && <UpdateRibbon update={update} onOpen={onUpdate} />}
      <Footer info={info} onChanges={onChanges} />
    </>
  );
}

const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

beforeEach(() => {
  onUpdate.mockClear();
  onChanges.mockClear();
  return setLanguage('en-US');
});
afterEach(() => cleanup());

describe('Footer', () => {
  it('names the version and links to the project and its author', async () => {
    const fetcher = answer({ version: '5.0.0', updateAvailable: false });
    render(<Wired fetcher={fetcher} />);
    const footer = screen.getByRole('contentinfo');
    await waitFor(() => expect(footer.textContent).toContain('Startpunkt v5.0.0, by Magnus Ullberg.'));
    expect(fetcher).toHaveBeenCalledWith('/api/v1/version');
    expect(screen.getByRole('link', { name: 'Startpunkt' }).getAttribute('href')).toBe(
      'https://github.com/ullbergm/startpunkt',
    );
    const author = screen.getByRole('link', { name: 'Magnus Ullberg' });
    expect(author.getAttribute('href')).toBe('https://ullberg.us');
    expect(author.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.queryByRole('status')).toBeNull();
    // The version opens the list of what changed in it.
    fireEvent.click(screen.getByRole('button', { name: 'v5.0.0' }));
    expect(onChanges).toHaveBeenCalledTimes(1);
  });

  it('shows a development build as it is named', async () => {
    render(<Wired fetcher={answer({ version: 'dev', updateAvailable: false })} />);
    await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('Startpunkt dev, by'));
    // It has no entry in the changelog, so there is nothing to open.
    expect(within(screen.getByRole('contentinfo')).queryByRole('button')).toBeNull();
  });

  it('leaves a newer release to the corner, and says nothing of it in the footer', async () => {
    render(
      <Wired
        fetcher={answer({
          version: '5.0.0',
          latest: 'v5.1.0',
          updateAvailable: true,
          url: 'https://github.com/ullbergm/startpunkt/releases/tag/v5.1.0',
        })}
      />,
    );
    const notice = await screen.findByRole('button', { name: 'Update available: v5.1.0' });
    // It is the ribbon across the corner, and reads as the version.
    expect(notice.className).toBe('update-ribbon');
    expect(notice.textContent).toBe('v5.1.0 available');
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).not.toContain('Update available');
    expect(within(footer).queryByRole('status')).toBeNull();
    fireEvent.click(notice);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('has nothing in the corner while there is no newer release', async () => {
    const fetcher = answer({ version: '5.0.0', updateAvailable: false });
    render(<Wired fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('v5.0.0'));
    expect(document.querySelector('.update-ribbon')).toBeNull();
    // The project is still linked, from the footer.
    expect(screen.getAllByRole('link', { name: 'Startpunkt' })).toHaveLength(1);
  });

  it('ignores an update whose link points somewhere else', async () => {
    const fetcher = answer({ version: '5.0.0', latest: 'v9', updateAvailable: true, url: 'https://evil.example/x' });
    render(<Wired fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('v5.0.0'));
    expect(screen.queryByRole('button', { name: /Update available/ })).toBeNull();
  });

  it('still shows the links when the version is not available', async () => {
    const fetcher = answer({ error: 'not found' }, 404);
    render(<Wired fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByRole('contentinfo').textContent).toContain('Startpunkt, by Magnus Ullberg.');
  });
});

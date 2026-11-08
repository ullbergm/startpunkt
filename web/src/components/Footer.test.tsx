import { cleanup, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { Footer } from './Footer';

const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

beforeEach(() => setLanguage('en-US'));
afterEach(() => cleanup());

describe('Footer', () => {
  it('names the version and links to the project and its author', async () => {
    const fetcher = answer({ version: '5.0.0', updateAvailable: false });
    render(<Footer fetcher={fetcher} />);
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
  });

  it('shows a development build as it is named', async () => {
    render(<Footer fetcher={answer({ version: 'dev', updateAvailable: false })} />);
    await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('Startpunkt dev, by'));
  });

  it('says when a newer release exists and links to it', async () => {
    render(
      <Footer
        fetcher={answer({
          version: '5.0.0',
          latest: 'v5.1.0',
          updateAvailable: true,
          url: 'https://github.com/ullbergm/startpunkt/releases/tag/v5.1.0',
        })}
      />,
    );
    const link = await screen.findByRole('link', { name: 'Update available: v5.1.0' });
    expect(link.getAttribute('href')).toBe('https://github.com/ullbergm/startpunkt/releases/tag/v5.1.0');
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('ignores an update whose link points somewhere else', async () => {
    const fetcher = answer({ version: '5.0.0', latest: 'v9', updateAvailable: true, url: 'https://evil.example/x' });
    render(<Footer fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('v5.0.0'));
    expect(screen.queryByRole('link', { name: /Update available/ })).toBeNull();
  });

  it('still shows the links when the version is not available', async () => {
    const fetcher = answer({ error: 'not found' }, 404);
    render(<Footer fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByRole('contentinfo').textContent).toContain('Startpunkt, by Magnus Ullberg.');
  });
});

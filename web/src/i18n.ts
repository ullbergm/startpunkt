import { signal } from '@preact/signals';
import english from './locales/en-US.json';

// English is part of the bundle and is the fallback for every missing key.
// The other languages are separate files, fetched when they are chosen.
export type MessageKey = keyof typeof english;
type Messages = Partial<Record<MessageKey, string>>;

export const FALLBACK = 'en-US';

const loaders = import.meta.glob<{ default: Messages }>('./locales/*.json');
const tagOf = (path: string) => path.replace('./locales/', '').replace('.json', '');

// The languages there is a translation for.
export const languages: string[] = Object.keys(loaders).map(tagOf).sort();

export const language = signal(FALLBACK);
const messages = signal<Messages>(english);

// Translates a key, filling {placeholders} from values. Reading it inside a
// component makes the component follow a change of language.
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  const template = messages.value[key] ?? english[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

// Picks the language to show: the visitor's own choice, else the first of
// the browser's languages that is available, else the server's default.
// A tag matches exactly or by its language part, so "sv" finds "sv-SE".
export function chooseLanguage(
  preferred: string | null,
  browser: readonly string[],
  serverDefault: string,
  available: readonly string[] = languages,
): string {
  const find = (wanted: string | null | undefined) => {
    if (!wanted) return undefined;
    const lower = wanted.toLowerCase();
    return (
      available.find((tag) => tag.toLowerCase() === lower) ??
      available.find((tag) => tag.toLowerCase().split('-')[0] === lower.split('-')[0])
    );
  };
  if (find(preferred)) return find(preferred)!;
  for (const tag of browser) {
    const match = find(tag);
    if (match) return match;
  }
  return find(serverDefault) ?? FALLBACK;
}

let wanted = FALLBACK;

// Switches the language. Until the translation has loaded the page stays in
// the previous language; if loading fails it stays there for good.
export async function setLanguage(tag: string): Promise<void> {
  wanted = tag;
  const load = loaders[`./locales/${tag}.json`];
  let next: Messages = english;
  if (tag !== FALLBACK && load) {
    try {
      next = (await load()).default;
    } catch {
      return;
    }
  }
  if (wanted !== tag) return; // A later choice won.
  messages.value = next;
  language.value = tag;
  document.documentElement.lang = tag;
}

import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';
import type { Preferences } from '../prefs';

interface Picture {
  url: string;
  title: string;
  copyright: string;
}

// Returns the address when it is an http or https URL, in a form that is
// safe inside a CSS url("..."): parsing percent-encodes quotes, spaces and
// control characters.
export function imageAddress(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const cssUrl = (address: string) => `url("${address.replace(/["\\\n\r]/g, '')}")`;

// The page background, behind everything else. With the "theme" type there
// is nothing to draw: the page colour comes from the theme.
export function Background({ background, fetcher = fetch }: { background: Preferences['background']; fetcher?: typeof fetch }) {
  const [picture, setPicture] = useState<Picture | null>(null);
  const wantsPicture = background.type === 'pictureOfDay';
  useEffect(() => {
    if (!wantsPicture) return;
    let current = true;
    fetcher('/api/v1/background')
      .then((response) => (response.ok ? (response.json() as Promise<Picture>) : null))
      .then((found) => {
        if (current && found && imageAddress(found.url)) setPicture(found);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [wantsPicture, fetcher]);

  let style: Record<string, string> | null = null;
  let credit: string | null = null;
  if (background.type === 'solid') {
    style = { backgroundColor: background.color };
  } else if (background.type === 'gradient') {
    style = { backgroundImage: `linear-gradient(${background.direction}, ${background.color}, ${background.color2})` };
  } else if (background.type === 'image') {
    const address = imageAddress(background.imageUrl);
    if (address) style = { backgroundImage: cssUrl(address) };
  } else if (wantsPicture && picture) {
    style = { backgroundImage: cssUrl(imageAddress(picture.url)!) };
    credit = t('background.credit', { title: picture.title, copyright: picture.copyright });
  }
  if (!style) return null;
  return (
    <>
      <div class={background.blur ? 'background background-blur' : 'background'} style={style} aria-hidden="true" />
      {credit && <p class="background-credit">{credit}</p>}
    </>
  );
}

import { useEffect, useMemo, useState } from 'preact/hooks';
import { t } from '../i18n';
import { generatePattern } from '../pattern';
import type { Background as BackgroundPrefs, Complexity } from '../prefs';

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

// The gradient for a time of day: night, sunrise, morning, afternoon,
// sunset, and night again.
export function timeGradient(date: Date): string {
  const hour = date.getHours() + date.getMinutes() / 60;
  const night = 'linear-gradient(180deg, #0f2027, #203a43, #2c5364)';
  if (hour < 6) return night;
  if (hour < 8) return 'linear-gradient(120deg, #ff9a8b, #ff6a88, #ff99ac)';
  if (hour < 12) return 'linear-gradient(135deg, #a8edea, #fed6e3, #a8edea)';
  if (hour < 17) return 'linear-gradient(90deg, #89f7fe, #66a6ff, #89f7fe)';
  if (hour < 19) return 'linear-gradient(225deg, #fa709a, #fee140, #fa709a)';
  return night;
}

// Soft blobs of colour in the corners and the centre. A higher complexity
// uses more of the colours and makes each blob tighter.
export function meshGradient(colors: string[], complexity: Complexity): string {
  const { count, spread } = { low: { count: 3, spread: 80 }, medium: { count: 4, spread: 60 }, high: { count: 5, spread: 40 } }[
    complexity
  ];
  const positions = ['0% 0%', '100% 0%', '50% 50%', '0% 100%', '100% 100%'];
  return colors
    .slice(0, count)
    .map((color, i) => `radial-gradient(circle at ${positions[i]}, ${color} 0%, transparent ${spread}%)`)
    .join(', ');
}

// One picture per day, the same for everyone that day.
export function picsumAddress(date: Date): string {
  return `https://picsum.photos/seed/${date.toISOString().slice(0, 10)}/1920/1080`;
}

// The page background, behind everything else. With the "theme" type there
// is nothing to draw: the page colour comes from the theme.
export function Background({
  background,
  fetcher = fetch,
  now = () => new Date(),
}: {
  background: BackgroundPrefs;
  fetcher?: typeof fetch;
  now?: () => Date;
}) {
  const { type } = background;
  const [picture, setPicture] = useState<Picture | null>(null);
  const wantsBing = type === 'pictureOfDay' && background.provider === 'bing';
  useEffect(() => {
    if (!wantsBing) return;
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
  }, [wantsBing, fetcher]);

  // The time-of-day gradient is looked at again every few minutes.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (type !== 'timeGradient') return;
    const timer = setInterval(() => setTick((n) => n + 1), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [type]);

  const pattern = useMemo(
    () => (type === 'geopattern' ? generatePattern(background.patternSeed, background.color).dataUrl : ''),
    [type, background.patternSeed, background.color],
  );

  let style: Record<string, string> | null = null;
  let classes = 'background';
  let credit: string | null = null;
  let isPicture = false;
  switch (type) {
    case 'solid':
      style = { backgroundColor: background.color };
      break;
    case 'gradient':
      style = { backgroundImage: `linear-gradient(${background.direction}, ${background.color}, ${background.color2})` };
      break;
    case 'timeGradient':
      style = { backgroundImage: timeGradient(now()) };
      break;
    case 'meshGradient':
      style = {
        backgroundColor: background.meshColors[0]!,
        backgroundImage: meshGradient(background.meshColors, background.meshComplexity),
      };
      if (background.meshAnimated) classes += ' background-animated';
      break;
    case 'geopattern':
      style = { backgroundImage: cssUrl(pattern) };
      classes += ' background-pattern';
      break;
    case 'image': {
      const address = imageAddress(background.imageUrl);
      if (address) style = { backgroundImage: cssUrl(address) };
      isPicture = true;
      break;
    }
    case 'pictureOfDay':
      isPicture = true;
      if (background.provider === 'picsum') {
        style = { backgroundImage: cssUrl(picsumAddress(now())) };
      } else if (picture) {
        style = { backgroundImage: cssUrl(imageAddress(picture.url)!) };
        credit = t('background.credit', { title: picture.title, copyright: picture.copyright });
      }
      break;
  }
  if (!style) return null;
  if (background.opacity < 1) style.opacity = String(background.opacity);
  if (isPicture && background.blur > 0) {
    style.filter = `blur(${background.blur}px)`;
    // Blurring fades the edges; draw past them so the fade is off screen.
    style.inset = `-${background.blur * 2}px`;
  }
  return (
    <>
      <div class={classes} style={style} aria-hidden="true" />
      {credit && <p class="background-credit">{credit}</p>}
    </>
  );
}

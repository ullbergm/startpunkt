// Generates a repeating background pattern from a piece of text: the same
// text always gives the same pattern. The result is an SVG, returned as a
// data URL that can be used as a CSS background image.

// FNV-1a, then a small generator seeded with it. Nothing here needs to be
// unpredictable, only stable and well spread.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generator(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

type Shape = (x: number, y: number, size: number, fill: string) => string;

const shapes: Record<string, Shape> = {
  squares: (x, y, s, fill) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" ${fill}/>`,
  circles: (x, y, s, fill) => `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.42}" ${fill}/>`,
  diamonds: (x, y, s, fill) =>
    `<path d="M${x + s / 2} ${y}L${x + s} ${y + s / 2}L${x + s / 2} ${y + s}L${x} ${y + s / 2}Z" ${fill}/>`,
  triangles: (x, y, s, fill) => `<path d="M${x} ${y + s}L${x + s / 2} ${y}L${x + s} ${y + s}Z" ${fill}/>`,
  plus: (x, y, s, fill) => {
    const t = s / 3;
    return `<path d="M${x + t} ${y}h${t}v${t}h${t}v${t}h${-t}v${t}h${-t}v${-t}h${-t}v${-t}h${t}Z" ${fill}/>`;
  },
  chevrons: (x, y, s, fill) =>
    `<path d="M${x} ${y + s * 0.3}L${x + s / 2} ${y}L${x + s} ${y + s * 0.3}V${y + s * 0.7}L${x + s / 2} ${y + s * 0.4}L${x} ${y + s * 0.7}Z" ${fill}/>`,
};

export const SHAPES = Object.keys(shapes);
const HEX = /^#[0-9a-fA-F]{6}$/;

export interface Pattern {
  shape: string;
  svg: string;
  dataUrl: string;
}

// The pattern is a grid of one shape. Each cell is tinted lighter or darker
// than the base colour by an amount taken from the text, which is what makes
// two texts look different.
export function generatePattern(text: string, color: string): Pattern {
  const base = HEX.test(color) ? color : '#408080';
  const seed = hash(text);
  const next = generator(seed);
  const shape = SHAPES[seed % SHAPES.length]!;
  const cells = 4 + (seed >>> 8) % 4;
  const size = 24 + ((seed >>> 16) % 4) * 8;
  const total = cells * size;
  let body = '';
  for (let row = 0; row < cells; row++) {
    for (let column = 0; column < cells; column++) {
      const value = next();
      const tint = value < 0.5 ? '#000' : '#fff';
      const opacity = (0.03 + Math.abs(value - 0.5) * 0.3).toFixed(3);
      body += shapes[shape]!(column * size, row * size, size, `fill="${tint}" fill-opacity="${opacity}"`);
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">` +
    `<rect width="100%" height="100%" fill="${base}"/>${body}</svg>`;
  return { shape, svg, dataUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` };
}

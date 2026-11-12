import { describe, expect, it } from 'vitest';
import { generatePattern, SHAPES } from './pattern';

describe('generatePattern', () => {
  it('gives the same pattern for the same text and colour', () => {
    expect(generatePattern('startpunkt', '#408080')).toEqual(generatePattern('startpunkt', '#408080'));
  });

  it('gives different patterns for different texts', () => {
    const urls = new Set(['a', 'b', 'startpunkt', 'home lab', ''].map((t) => generatePattern(t, '#408080').dataUrl));
    expect(urls.size).toBe(5);
  });

  it('uses every shape across a range of texts', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => generatePattern(`seed ${i}`, '#408080').shape));
    expect([...seen].sort()).toEqual([...SHAPES].sort());
  });

  it('produces a well-formed SVG in the given colour', () => {
    const { svg, dataUrl } = generatePattern('startpunkt', '#123456');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.querySelector('rect')?.getAttribute('fill')).toBe('#123456');
    expect(dataUrl.startsWith('data:image/svg+xml,%3Csvg')).toBe(true);
  });

  it('never puts the text or an invalid colour into the image', () => {
    const { svg } = generatePattern('"/><script>alert(1)</script>', '"/><script>');
    expect(svg).not.toContain('script');
    expect(svg).toContain('fill="#408080"');
  });
});

import { describe, expect, it } from 'vitest';
import { iconSource, safeHref } from './url';

describe('safeHref', () => {
  it('accepts ordinary links', () => {
    expect(safeHref('https://grafana.example.com/d')).toBe('https://grafana.example.com/d');
    expect(safeHref(' http://plex:32400 ')).toBe('http://plex:32400');
    expect(safeHref('ssh://host')).toBe('ssh://host');
    expect(safeHref('/relative')).toBe('/relative');
  });

  it('rejects links that would run script', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('  JavaScript:alert(1)')).toBeNull();
    expect(safeHref('java\nscript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:x')).toBeNull();
  });

  it('rejects empty and unparsable values', () => {
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
    expect(safeHref('http://[bad')).toBeNull();
  });
});

describe('iconSource', () => {
  it('maps Iconify names to image URLs', () => {
    expect(iconSource('mdi:home', '#4c8dd6')).toBe(
      'https://api.iconify.design/mdi/home.svg?color=%234c8dd6',
    );
    expect(iconSource('simple-icons:grafana', 'orange')).toBe(
      'https://api.iconify.design/simple-icons/grafana.svg?color=orange',
    );
  });

  it('defaults to the mdi set', () => {
    expect(iconSource('home', 'red')).toBe('https://api.iconify.design/mdi/home.svg?color=red');
  });

  it('passes image URLs through', () => {
    expect(iconSource('https://example.com/icon.png', 'red')).toBe('https://example.com/icon.png');
  });

  it('drops a colour it cannot pass on safely', () => {
    expect(iconSource('mdi:home', 'red&x=1')).toBe('https://api.iconify.design/mdi/home.svg');
  });

  it('returns null for missing or malformed icons', () => {
    expect(iconSource(undefined, 'red')).toBeNull();
    expect(iconSource('  ', 'red')).toBeNull();
    expect(iconSource('mdi:../../x', 'red')).toBeNull();
    expect(iconSource('a:b:c', 'red')).toBeNull();
    expect(iconSource('javascript://x', 'red')).toBeNull();
  });
});

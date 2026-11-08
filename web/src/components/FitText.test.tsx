import { cleanup, render } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { fit, FIT_STEPS, FitText } from './FitText';

afterEach(() => cleanup());

// A text that is `lines` lines tall at full size and gets shorter as it
// shrinks, the way wrapped text does. Each line is 20px at full size.
const text = (lines: number) => (scale: number) => Math.ceil(lines * scale) * 20 * scale;
const allow = (lines: number) => (scale: number) => lines * 20 * scale;

describe('fit', () => {
  it('leaves a text that fits at its normal size', () => {
    expect(fit(text(2), allow(2))).toEqual({ scale: 1, cut: false });
    expect(fit(text(1), allow(3))).toEqual({ scale: 1, cut: false });
  });

  it('shrinks a text that is a little too long, as little as needed', () => {
    // 2.3 lines: at 0.85 it wraps into two.
    const result = fit(text(2.3), allow(2));
    expect(result.cut).toBe(false);
    expect(result.scale).toBe(0.85);
    // 3.2 lines into three: fits at the first step down.
    expect(fit(text(3.2), allow(3))).toEqual({ scale: 0.92, cut: false });
  });

  it('cuts a text that does not fit even at the smallest size', () => {
    expect(fit(text(6), allow(2))).toEqual({ scale: FIT_STEPS[FIT_STEPS.length - 1], cut: true });
  });

  it('never goes below the smallest step', () => {
    expect(Math.min(...FIT_STEPS)).toBe(0.7);
    expect(fit(text(50), allow(1)).scale).toBe(0.7);
  });
});

describe('FitText', () => {
  // jsdom lays nothing out: every height is 0, so every text "fits".
  it('shows the text untouched when it fits', () => {
    const { container } = render(<FitText class="tile-info" text="Short" lines={2} />);
    expect(container.querySelector('.tile-info')?.textContent).toBe('Short');
    const element = container.querySelector('.tile-info > .fit') as HTMLElement;
    expect(element.style.fontSize).toBe('');
    expect(element.className).toBe('fit');
    expect(element.hasAttribute('title')).toBe(false);
  });

  it('shrinks and cuts by what it measures', () => {
    const { container, rerender } = render(<FitText class="tile-info" text="Long" lines={2} />);
    const element = container.querySelector('.tile-info > .fit') as HTMLElement;
    // Pretend the text is four 20px lines tall at any size.
    Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => 80 });
    const original = window.getComputedStyle;
    window.getComputedStyle = ((e: Element) =>
      e === element ? ({ lineHeight: '20px', fontSize: '14px' } as CSSStyleDeclaration) : original(e)) as typeof getComputedStyle;
    try {
      rerender(<FitText class="tile-info" text="Long text" lines={2} />);
      expect(element.style.fontSize).toBe('0.7em');
      expect(element.classList.contains('fit-cut')).toBe(true);
      expect(element.style.getPropertyValue('--lines')).toBe('2');
      expect(element.title).toBe('Long text');

      // With the limit off, everything is put back.
      rerender(<FitText class="tile-info" text="Long text" lines={0} />);
      expect(element.style.fontSize).toBe('');
      expect(element.classList.contains('fit-cut')).toBe(false);
      expect(element.hasAttribute('title')).toBe(false);
    } finally {
      window.getComputedStyle = original;
    }
  });
});

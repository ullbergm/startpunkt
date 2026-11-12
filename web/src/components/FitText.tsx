import { useLayoutEffect, useRef } from 'preact/hooks';

// Sizes to try, as a fraction of the normal size, largest first.
export const FIT_STEPS = [1, 0.92, 0.85, 0.78, 0.7];

// Picks the largest size at which a text of the given natural height fits.
// measure(scale) returns the height the text takes at that scale and
// limit(scale) the height the allowed number of lines takes. When nothing
// fits it returns the smallest size and says the text has to be cut.
export function fit(measure: (scale: number) => number, limit: (scale: number) => number) {
  for (const scale of FIT_STEPS) {
    // Half a pixel of slack for rounding.
    if (measure(scale) <= limit(scale) + 0.5) return { scale, cut: false };
  }
  return { scale: FIT_STEPS[FIT_STEPS.length - 1]!, cut: true };
}

// Text that stays within a number of lines. A text that is too long is
// first made smaller, step by step; if it still does not fit at the
// smallest size it is cut off with an ellipsis, and the whole text is then
// available as a tooltip. With lines at 0 the text is shown as it is.
export function FitText({ text, lines, class: className }: { text: string; lines: number; class?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reset = () => {
      element.style.fontSize = '';
      element.style.removeProperty('--lines');
      element.classList.remove('fit-cut');
      element.removeAttribute('title');
    };
    if (lines <= 0) {
      reset();
      return;
    }
    const apply = () => {
      reset();
      const lineHeight = (scale: number) => {
        element.style.fontSize = `${scale}em`;
        const style = getComputedStyle(element);
        return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
      };
      const result = fit(
        (scale) => {
          element.style.fontSize = `${scale}em`;
          return element.scrollHeight;
        },
        (scale) => lineHeight(scale) * lines,
      );
      element.style.fontSize = result.scale === 1 ? '' : `${result.scale}em`;
      if (result.cut) {
        element.style.setProperty('--lines', String(lines));
        element.classList.add('fit-cut');
        element.title = text;
      }
    };
    apply();
    // The width of a tile changes with the window and the layout.
    if (typeof ResizeObserver === 'undefined') return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) {
        width = element.clientWidth;
        apply();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, lines]);

  // The sizing is done on an inner element. The outer one is usually an
  // item of a flex container, where the clamp that cuts text off with an
  // ellipsis has no effect.
  return (
    <span class={className}>
      <span ref={ref} class="fit">
        {text}
      </span>
    </span>
  );
}

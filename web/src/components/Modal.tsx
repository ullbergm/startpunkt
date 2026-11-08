import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

// A modal dialog. The native element keeps focus inside, closes on Escape
// and makes the rest of the page inert. Focus goes back to whatever opened
// it when it closes.
export function Modal({
  label,
  class: className,
  onClose,
  children,
}: {
  label: string;
  class?: string;
  onClose: () => void;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    return () => opener?.focus?.();
  }, []);
  return (
    <dialog
      ref={ref}
      class={className}
      aria-label={label}
      // Escape closes the native dialog by itself. Following its close
      // event, instead of intercepting the key, keeps this in step with the
      // browser however the dialog came to be closed.
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog itself, not its content, is on the backdrop.
        if (event.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

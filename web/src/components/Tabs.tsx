// A row of tabs with the usual keyboard pattern: only the selected tab is a
// Tab stop, and the arrow keys, Home and End move between tabs and select
// them. The panel is rendered by the caller, with id `${id}-panel` and
// labelled by `${id}-tab-${selected}`.
export function Tabs<T extends string>({
  id,
  label,
  tabs,
  selected,
  onSelect,
  kit = false,
}: {
  id: string;
  label: string;
  tabs: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
  // Drawn with the component kit of the dialogs, not as the page's own tabs.
  kit?: boolean;
}) {
  const move = (key: T) => {
    onSelect(key);
    document.getElementById(`${id}-tab-${key}`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.key === selected);
    const count = tabs.length;
    const target =
      event.key === 'ArrowRight'
        ? tabs[(index + 1) % count]
        : event.key === 'ArrowLeft'
          ? tabs[(index - 1 + count) % count]
          : event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[count - 1]
              : undefined;
    if (target) {
      event.preventDefault();
      move(target.key);
    }
  };
  return (
    <div class={kit ? 'd-tabs d-tabs-border' : 'tabs'} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          class={kit ? (tab.key === selected ? 'd-tab d-tab-active' : 'd-tab') : undefined}
          role="tab"
          id={`${id}-tab-${tab.key}`}
          aria-selected={tab.key === selected}
          aria-controls={`${id}-panel`}
          tabIndex={tab.key === selected ? 0 : -1}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

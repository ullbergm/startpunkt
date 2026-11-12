// Placeholders in the shape of the page, shown until the first snapshot has
// arrived. They are decoration only: the status line next to them says in
// words that the page is loading.
export function Skeleton() {
  const group = (count: number) => (
    <div class="group">
      <span class="skeleton skeleton-heading" />
      <ul class="tiles" style={{ '--columns': String(Math.min(count, 4)) }}>
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <span class="skeleton skeleton-tile" />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div class="skeleton-page" aria-hidden="true">
      <div class="tabs">
        <span class="skeleton skeleton-tab" />
        <span class="skeleton skeleton-tab" />
      </div>
      {group(3)}
      {group(8)}
      {group(4)}
    </div>
  );
}

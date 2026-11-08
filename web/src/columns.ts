// How many columns a list of tiles gets when the layout is on "auto": the
// number that needs the fewest rows, and among those the smallest, so that
// rows come out even. Up to five tiles sit in one row.
export const MAX_AUTO_COLUMNS = 5;

export function optimalColumns(count: number, max = MAX_AUTO_COLUMNS): number {
  if (count <= 0) return max;
  if (count <= max) return count;
  const rows = Math.ceil(count / max);
  return Math.ceil(count / rows);
}

// The most columns a window of the given width has room for. Below the
// first step the stylesheet takes over and fits what it can.
export function columnsThatFit(width: number): number {
  if (width >= 1150) return 6;
  if (width >= 950) return 4;
  if (width >= 640) return 3;
  return 2;
}

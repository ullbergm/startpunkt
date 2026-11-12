import { describe, expect, it } from 'vitest';
import { columnsThatFit, optimalColumns } from './columns';

describe('optimalColumns', () => {
  it('puts up to five tiles in one row', () => {
    expect([1, 2, 3, 4, 5].map((n) => optimalColumns(n))).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the fewest rows, and then the fewest columns for that', () => {
    // count -> columns; rows are ceil(count / columns)
    expect(optimalColumns(6)).toBe(3); // 2 rows of 3, not 5 + 1
    expect(optimalColumns(7)).toBe(4);
    expect(optimalColumns(8)).toBe(4);
    expect(optimalColumns(10)).toBe(5);
    expect(optimalColumns(11)).toBe(4); // 3 rows either way
    expect(optimalColumns(13)).toBe(5);
    expect(optimalColumns(16)).toBe(4);
  });

  it('never needs more rows than the maximum number of columns would', () => {
    for (let count = 1; count <= 60; count++) {
      const columns = optimalColumns(count);
      expect(columns).toBeLessThanOrEqual(5);
      expect(Math.ceil(count / columns)).toBe(Math.ceil(count / 5));
    }
  });

  it('respects a smaller maximum', () => {
    expect(optimalColumns(6, 3)).toBe(3);
    expect(optimalColumns(7, 3)).toBe(3);
    expect(optimalColumns(4, 3)).toBe(2);
  });

  it('has an answer for an empty list', () => {
    expect(optimalColumns(0)).toBe(5);
  });
});

describe('columnsThatFit', () => {
  it('grows with the window', () => {
    expect([320, 640, 949, 950, 1150, 2560].map(columnsThatFit)).toEqual([2, 3, 3, 4, 6, 6]);
  });
});

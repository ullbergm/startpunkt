import { describe, expect, it } from 'vitest';
import { assignColors, CLUSTER_COLORS, orderClusters } from './clusters';
import type { Cluster } from './types';

const cluster = (name: string, local = false): Cluster => ({ name, local, state: 'connected' });

describe('cluster colours', () => {
  it('orders the local cluster first, then by name', () => {
    expect(orderClusters([cluster('prod'), cluster('dev'), cluster('home', true)]).map((c) => c.name)).toEqual([
      'home',
      'dev',
      'prod',
    ]);
  });

  it('gives each cluster its own colour', () => {
    const colors = assignColors([cluster('prod'), cluster('dev'), cluster('home', true)]);
    expect(colors).toEqual({ home: CLUSTER_COLORS[0], dev: CLUSTER_COLORS[1], prod: CLUSTER_COLORS[2] });
    expect(new Set(Object.values(colors)).size).toBe(3);
  });

  it('does not depend on the order the server lists them in', () => {
    const a = assignColors([cluster('prod'), cluster('home', true)]);
    const b = assignColors([cluster('home', true), cluster('prod')]);
    expect(a).toEqual(b);
  });

  it('repeats colours only when there are more clusters than colours', () => {
    const many = Array.from({ length: CLUSTER_COLORS.length + 1 }, (_, i) => cluster(`c${String(i).padStart(2, '0')}`));
    const colors = Object.values(assignColors(many));
    expect(new Set(colors.slice(0, CLUSTER_COLORS.length)).size).toBe(CLUSTER_COLORS.length);
    expect(colors[CLUSTER_COLORS.length]).toBe(colors[0]);
  });

  it('has distinct colours to hand out', () => {
    expect(new Set(CLUSTER_COLORS).size).toBe(CLUSTER_COLORS.length);
  });
});

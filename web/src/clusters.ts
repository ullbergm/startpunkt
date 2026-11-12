import { computed } from '@preact/signals';
import { serverState } from './state';
import type { Cluster } from './types';

// Colours that are easy to tell apart, each readable on a light and on a
// dark surface. A cluster's colour is on its pills and on its button, next
// to its name: the colour helps the eye, the name says which it is.
export const CLUSTER_COLORS = ['#4c9aff', '#f5a623', '#b58cff', '#2fbfa7', '#ff6fa5', '#9aa832', '#ff8a5c', '#8fa3bf'];

// The order clusters are listed in: the local one first, then by name.
export function orderClusters(clusters: Cluster[]): Cluster[] {
  return [...clusters].sort((a, b) => Number(b.local) - Number(a.local) || a.name.localeCompare(b.name));
}

// Gives every cluster a colour by its place in that order, so a cluster
// keeps its colour whichever clusters are hidden. With more clusters than
// colours they repeat.
export function assignColors(clusters: Cluster[]): Record<string, string> {
  const colors: Record<string, string> = {};
  orderClusters(clusters).forEach((cluster, index) => {
    colors[cluster.name] = CLUSTER_COLORS[index % CLUSTER_COLORS.length]!;
  });
  return colors;
}

export const clusterColors = computed(() => assignColors(serverState.value?.clusters ?? []));

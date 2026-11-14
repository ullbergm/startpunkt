// The JSON contract of /api/v1. Keep in step with internal/tile and
// internal/api on the server.

export const SCHEMA_VERSION = 1;

export type TileKind = 'application' | 'bookmark';

export interface TileSource {
  type: string;
  kind?: string;
  version: string;
  namespace: string;
  name: string;
}

export interface TileLink {
  name: string;
  url: string;
}

export interface WorkloadReadiness {
  state: 'ready' | 'starting' | 'degraded' | 'unknown';
  ready: number;
  desired: number;
}

export interface Tile {
  id: string;
  kind: TileKind;
  cluster: string;
  name: string;
  group: string;
  url: string;
  icon?: string;
  iconColor?: string;
  info?: string;
  links?: TileLink[];
  consoleURL?: string;
  workload?: WorkloadReadiness;
  targetBlank: boolean;
  location: number;
  tags: string[];
  source: TileSource;
  editable: boolean;
  available?: boolean;
  // Probe that established the current availability; unchanged by confirmations.
  lastProbe?: string;
}

export type ClusterState = 'syncing' | 'connected' | 'stale';

export interface Cluster {
  name: string;
  local: boolean;
  state: ClusterState;
  lastSeen?: string;
  staleSince?: string;
}

export interface ServerState {
  schemaVersion: number;
  tiles: Tile[];
  clusters: Cluster[];
  config: UIConfig;
  // namespace is where a new resource is created.
  editing: { available: boolean; namespace?: string };
}

export interface Palette {
  bodyBgColor: string;
  bodyColor: string;
  emphasisColor: string;
  textPrimaryColor: string;
  textAccentColor: string;
}

export interface UIConfig {
  title: string;
  defaultLanguage: string;
  searchEngine: string;
  showAllClusters: boolean;
  theme: { light: Palette; dark: Palette };
  // What a browser without preferences of its own starts from, in the form
  // preferences are stored in. It is not trusted: prefs.ts checks it.
  defaultPreferences?: unknown;
}

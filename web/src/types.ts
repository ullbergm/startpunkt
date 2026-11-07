// The JSON contract of /api/v1. Keep in step with internal/tile and
// internal/api on the server.

export const SCHEMA_VERSION = 1;

export type TileKind = 'application' | 'bookmark';

export interface TileSource {
  type: string;
  version: string;
  namespace: string;
  name: string;
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
  targetBlank: boolean;
  location: number;
  tags: string[];
  source: TileSource;
  editable: boolean;
  available?: boolean;
  lastProbe?: string;
}

export type ClusterState = 'syncing' | 'connected' | 'stale';

export interface Cluster {
  name: string;
  local: boolean;
  state: ClusterState;
}

export interface ServerState {
  schemaVersion: number;
  tiles: Tile[];
  clusters: Cluster[];
  config: { title: string };
  editing: { available: boolean };
}

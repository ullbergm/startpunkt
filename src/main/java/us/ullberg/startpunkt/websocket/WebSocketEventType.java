package us.ullberg.startpunkt.websocket;

import io.quarkus.runtime.annotations.RegisterForReflection;

/** Enumeration of WebSocket event types for real-time updates. */
@RegisterForReflection
public enum WebSocketEventType {
  /** A new application was added to the cluster. */
  APPLICATION_ADDED,

  /** An existing application was removed from the cluster. */
  APPLICATION_REMOVED,

  /** An application was updated (metadata or configuration changed). */
  APPLICATION_UPDATED,

  /** Configuration changed (theme, settings, etc.). */
  CONFIG_CHANGED,

  /** Application status changed (up/down/degraded). */
  STATUS_CHANGED,

  /** A bookmark was added. */
  BOOKMARK_ADDED,

  /** A bookmark was removed. */
  BOOKMARK_REMOVED,

  /** A bookmark was updated. */
  BOOKMARK_UPDATED,

  /** Heartbeat/ping message to keep connection alive. */
  HEARTBEAT
}

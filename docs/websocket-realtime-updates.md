# WebSocket Real-time Updates

Startpunkt supports WebSocket-based real-time updates to push changes to clients without requiring periodic HTTP polling.

## Overview

When enabled, WebSocket connections provide instant notifications to clients about:
- Application changes (additions, removals, updates)
- Bookmark changes
- Configuration updates
- Application status changes

## Configuration

WebSocket support is configured in `application.yaml`:

```yaml
startpunkt:
  websocket:
    # Enable/disable WebSocket support
    enabled: true
    
    # Heartbeat interval in seconds to keep connections alive
    heartbeatInterval: 30
    
    # Debounce time in milliseconds for events to prevent flooding
    eventDebounceMs: 500
```

### Configuration Options

- **`enabled`** (default: `true`): Master switch for WebSocket functionality
- **`heartbeatInterval`** (default: `30s`): Seconds between heartbeat messages
- **`eventDebounceMs`** (default: `500`): Milliseconds to wait before broadcasting rapid events

## WebSocket Endpoint

Clients connect to: `ws://your-server/api/ws/updates` (or `wss://` for secure connections)

## Message Protocol

All messages are JSON-formatted with the following structure:

```json
{
  "type": "EVENT_TYPE",
  "timestamp": "2025-10-29T12:00:00Z",
  "data": { /* event-specific data */ }
}
```

### Event Types

- **`APPLICATION_ADDED`**: A new application was added to the cluster
- **`APPLICATION_REMOVED`**: An application was removed
- **`APPLICATION_UPDATED`**: Application metadata or configuration changed
- **`BOOKMARK_ADDED`**: A new bookmark was added
- **`BOOKMARK_REMOVED`**: A bookmark was removed
- **`BOOKMARK_UPDATED`**: Bookmark metadata changed
- **`CONFIG_CHANGED`**: System configuration was modified
- **`STATUS_CHANGED`**: Application status changed (up/down/degraded)
- **`HEARTBEAT`**: Keep-alive message (no data)

### Example Messages

#### Application Added
```json
{
  "type": "APPLICATION_ADDED",
  "timestamp": "2025-10-29T10:30:00Z",
  "data": {
    "name": "my-app",
    "namespace": "default",
    "group": "Production",
    "url": "https://my-app.example.com",
    "tags": "frontend,react"
  }
}
```

#### Heartbeat
```json
{
  "type": "HEARTBEAT",
  "timestamp": "2025-10-29T10:31:00Z",
  "data": null
}
```

## Frontend Integration

The frontend automatically connects to the WebSocket endpoint when enabled. A connection status indicator appears in the header:

- **● (green)**: Connected, real-time updates active
- **○ (yellow)**: Connecting...
- **◌ (gray)**: Disconnected, using HTTP polling

### Behavior

1. On page load, the frontend fetches the configuration to determine if WebSocket is enabled
2. If enabled, it establishes a WebSocket connection
3. When connected, HTTP polling is automatically disabled
4. If the connection is lost, the client attempts to reconnect with exponential backoff
5. If reconnection fails, the client falls back to HTTP polling
6. When events are received, the frontend automatically refreshes the affected data

## Broadcasting Events

Services can broadcast events using the `WebSocketEventBroadcaster`:

```java
@Inject
WebSocketEventBroadcaster broadcaster;

public void notifyApplicationAdded(ApplicationSpec app) {
    broadcaster.broadcastApplicationAdded(app);
}
```

### Available Methods

- `broadcastApplicationAdded(Object data)`
- `broadcastApplicationRemoved(Object data)`
- `broadcastApplicationUpdated(Object data)`
- `broadcastBookmarkAdded(Object data)`
- `broadcastBookmarkRemoved(Object data)`
- `broadcastBookmarkUpdated(Object data)`
- `broadcastConfigChanged(Object data)`
- `broadcastStatusChanged(Object data)`

Events are automatically debounced based on the configured `eventDebounceMs` value.

## Troubleshooting

### WebSocket Connection Fails

1. Verify WebSocket is enabled in configuration
2. Check browser console for connection errors
3. Ensure firewall/proxy allows WebSocket connections
4. Verify the server is accessible at the expected URL

### No Real-time Updates

1. Check the connection status indicator in the UI
2. Verify events are being broadcast on the backend
3. Check browser developer console for JavaScript errors
4. Ensure the correct WebSocket endpoint is being used

### High CPU/Memory Usage

1. Reduce the frequency of event broadcasts
2. Increase `eventDebounceMs` to batch more events
3. Check the number of active connections
4. Monitor for connection leaks

## Performance Considerations

- WebSocket connections use minimal resources when idle
- Heartbeat messages are small and infrequent (every 30s by default)
- Event debouncing prevents flooding clients with rapid updates
- Connection cleanup is automatic when clients disconnect
- HTTP polling is more resource-intensive for both client and server

## Security

- WebSocket connections inherit the same security context as HTTP
- All WebSocket messages are encrypted when using `wss://`
- Connection management prevents resource exhaustion
- Event debouncing provides basic rate limiting

## Backward Compatibility

- HTTP polling remains fully functional when WebSocket is disabled
- Clients gracefully fall back to HTTP polling if WebSocket fails
- All existing REST endpoints remain unchanged
- Configuration defaults maintain existing behavior

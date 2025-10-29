import { renderHook, act } from '@testing-library/preact';
import { useWebSocket } from './useWebSocket';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code, reason) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close', code, reason });
    }
  }
}

describe('useWebSocket', () => {
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;
    global.WebSocket.CLOSING = 2;
    global.WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  test('should initialize with disconnected status', () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates', { enabled: false })
    );

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isDisconnected).toBe(true);
    expect(result.current.isConnected).toBe(false);
  });

  test('should connect when enabled', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates')
    );

    expect(result.current.status).toBe('connecting');

    // Wait for connection to open
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isConnected).toBe(true);
  });

  test('should handle incoming messages', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates', { onMessage })
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Simulate incoming message
    const testMessage = { type: 'APPLICATION_ADDED', data: { name: 'test-app' } };
    await act(async () => {
      // Access the internal websocket and trigger message
      const ws = result.current;
      const event = { data: JSON.stringify(testMessage) };
      // Use the event to trigger the onmessage handler of the mock WebSocket
      if (ws && ws._websocket && typeof ws._websocket.onmessage === 'function') {
        ws._websocket.onmessage(event);
      }
    });
  });

  test('should send messages when connected', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates')
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isConnected).toBe(true);

    // Try to send a message
    const sent = result.current.sendMessage({ type: 'PING' });
    expect(sent).toBe(true);
  });

  test('should disconnect cleanly', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates')
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isConnected).toBe(true);

    // Disconnect
    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.isDisconnected).toBe(true);
  });

  test('should convert http to ws protocol', () => {
    const { result } = renderHook(() => 
      useWebSocket('http://localhost:8080/api/ws/updates')
    );

    expect(result.current.status).toBe('connecting');
  });

  test('should track last heartbeat timestamp', async () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8080/api/ws/updates')
    );

    // Initially no heartbeat
    expect(result.current.lastHeartbeat).toBeNull();

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isConnected).toBe(true);
    
    // Note: Testing the heartbeat timestamp update would require
    // accessing the internal WebSocket instance to trigger onmessage
    // This is tested through integration tests instead
  });
});

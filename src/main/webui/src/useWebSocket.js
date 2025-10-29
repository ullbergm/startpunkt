import { useEffect, useState, useCallback, useRef } from 'preact/hooks';

/**
 * Hook for WebSocket connection management with automatic reconnection
 * @param {string} url - WebSocket URL
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether WebSocket is enabled (default: true)
 * @param {number} options.reconnectDelay - Initial reconnect delay in ms (default: 1000)
 * @param {number} options.maxReconnectDelay - Max reconnect delay in ms (default: 30000)
 * @param {function} options.onMessage - Callback for incoming messages
 * @param {function} options.onOpen - Callback for connection opened
 * @param {function} options.onClose - Callback for connection closed
 * @param {function} options.onError - Callback for errors
 * @returns {object} WebSocket state and control functions
 */
export function useWebSocket(url, options = {}) {
  const {
    enabled = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;

  const [status, setStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [lastMessage, setLastMessage] = useState(null);
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  const mountedRef = useRef(true);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) {
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connected or connecting
    }

    try {
      setStatus('connecting');
      
      // Convert http/https to ws/wss
      const wsUrl = url.replace(/^http/, 'ws');
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        
        if (onOpen) {
          onOpen(event);
        }
      };

      ws.current.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        ws.current = null;
        
        if (onClose) {
          onClose(event);
        }

        // Attempt to reconnect if it was not a clean close and reconnect is enabled
        if (shouldReconnect.current && event.code !== 1000) {
          const delay = getReconnectDelay();
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (event) => {
        if (!mountedRef.current) return;
        
        console.error('WebSocket error:', event);
        setStatus('error');
        
        if (onError) {
          onError(event);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setStatus('error');
    }
  }, [enabled, url, onMessage, onOpen, onClose, onError, getReconnectDelay]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  // Send a message through the WebSocket
  const sendMessage = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        ws.current.send(message);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Initial connection and cleanup
  useEffect(() => {
    mountedRef.current = true;
    shouldReconnect.current = true;
    
    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      shouldReconnect.current = false;
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmount');
      }
    };
  }, [enabled, connect]);

  return {
    status,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error'
  };
}

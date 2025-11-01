import { useEffect, useState, useCallback, useRef } from 'preact/hooks';

/**
 * Hook for Server-Sent Events (SSE) connection management with automatic reconnection
 * @param {string} url - SSE endpoint URL
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether SSE is enabled (default: true)
 * @param {number} options.reconnectDelay - Initial reconnect delay in ms (default: 1000)
 * @param {number} options.maxReconnectDelay - Max reconnect delay in ms (default: 30000)
 * @param {function} options.onMessage - Callback for incoming messages
 * @param {function} options.onOpen - Callback for connection opened
 * @param {function} options.onError - Callback for errors
 * @returns {object} SSE state and control functions
 */
export function useServerSentEvents(url, options = {}) {
  const {
    enabled = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    onMessage,
    onOpen,
    onError
  } = options;

  const [status, setStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [lastMessage, setLastMessage] = useState(null);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  
  const eventSource = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  const mountedRef = useRef(true);
  const urlRef = useRef(url);
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({ onMessage, onOpen, onError });
  const getReconnectDelayRef = useRef(null);

  // Update refs when props change
  useEffect(() => {
    urlRef.current = url;
    enabledRef.current = enabled;
    callbacksRef.current = { onMessage, onOpen, onError };
  }, [url, enabled, onMessage, onOpen, onError]);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay]);
  
  getReconnectDelayRef.current = getReconnectDelay;

  // Connect to SSE endpoint - stable function that doesn't change
  const connect = useCallback(() => {
    if (!enabledRef.current || !mountedRef.current) {
      return;
    }

    if (eventSource.current) {
      return; // Already connected or connecting
    }

    try {
      setStatus('connecting');
      
      eventSource.current = new EventSource(urlRef.current);

      eventSource.current.onopen = (event) => {
        if (!mountedRef.current) return;
        
        console.log('SSE connected');
        setStatus('connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        
        if (callbacksRef.current.onOpen) {
          callbacksRef.current.onOpen(event);
        }
      };

      // Listen for the default message event (server sends all messages as 'message' events)
      eventSource.current.onmessage = handleMessage;

      eventSource.current.onerror = (event) => {
        if (!mountedRef.current) return;
        
        console.error('SSE error:', event);
        setStatus('error');
        
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(event);
        }

        // Close and attempt to reconnect
        if (eventSource.current) {
          eventSource.current.close();
          eventSource.current = null;
        }

        if (shouldReconnect.current) {
          const delay = getReconnectDelayRef.current();
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating EventSource:', error);
      setStatus('error');
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    if (!mountedRef.current) return;
    
    try {
      const message = JSON.parse(event.data);
      console.log('[SSE] Message received:', {
        type: message.type,
        data: message.data,
        timestamp: new Date().toISOString()
      });
      setLastMessage(message);
      
      // Track heartbeat timestamp
      if (message.type === 'HEARTBEAT') {
        setLastHeartbeat(Date.now());
      }
      
      if (callbacksRef.current.onMessage) {
        callbacksRef.current.onMessage(message);
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  // Initial connection and cleanup
  useEffect(() => {
    mountedRef.current = true;
    shouldReconnect.current = true;
    
    if (enabled) {
      connect();
    } else {
      // Disconnect if disabled
      if (eventSource.current) {
        eventSource.current.close();
        eventSource.current = null;
      }
      setStatus('disconnected');
    }

    return () => {
      mountedRef.current = false;
      shouldReconnect.current = false;
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (eventSource.current) {
        eventSource.current.close();
      }
    };
  }, [enabled, connect]);

  return {
    status,
    lastMessage,
    lastHeartbeat,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error'
  };
}

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'preact/hooks';
import './SSEHeartIndicator.scss';

/**
 * SSE Heart Indicator component
 * Displays a heart icon in the bottom left corner to indicate SSE connection status
 * - Beats when heartbeat messages are received
 * - Shows green heart only when successfully connected
 * - Shows broken red heart when connecting, disconnected, or has errors
 */
export function SSEHeartIndicator({ websocket }) {
  const [isBeating, setIsBeating] = useState(false);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(null);

  // Track heartbeat changes and trigger beat animation
  useEffect(() => {
    if (websocket.lastHeartbeat && websocket.lastHeartbeat !== lastHeartbeatTime) {
      setLastHeartbeatTime(websocket.lastHeartbeat);
      setIsBeating(true);
      
      // Stop the beat animation after 500ms
      const timer = setTimeout(() => {
        setIsBeating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [websocket.lastHeartbeat, lastHeartbeatTime]);

  // Calculate seconds since last heartbeat
  const [secondsSinceHeartbeat, setSecondsSinceHeartbeat] = useState(null);
  
  useEffect(() => {
    if (!websocket.lastHeartbeat) {
      setSecondsSinceHeartbeat(null);
      return;
    }
    
    // Update every second
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - websocket.lastHeartbeat) / 1000);
      setSecondsSinceHeartbeat(seconds);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [websocket.lastHeartbeat]);

  // Determine which icon to show and its color
  const getHeartState = () => {
    // Show green heart only when successfully connected
    if (websocket.isConnected && !websocket.hasError) {
      return {
        icon: 'mdi:heart',
        color: '#198754', // Bootstrap success color
        title: secondsSinceHeartbeat !== null 
          ? `Real-time updates active (${secondsSinceHeartbeat}s since last heartbeat)` 
          : 'Real-time updates active'
      };
    }
    
    // Show broken heart for all other states (connecting, disconnected, or error)
    return {
      icon: 'mdi:heart-broken',
      color: '#dc3545', // Bootstrap danger color
      title: websocket.hasError 
        ? 'Connection error - using HTTP polling'
        : (websocket.isConnecting 
            ? 'Connecting to real-time updates...' 
            : 'Real-time updates not connected')
    };
  };

  const heartState = getHeartState();

  return (
    <div 
      className={`sse-heart-indicator ${isBeating ? 'beating' : ''}`}
      title={heartState.title}
      role="status"
      aria-label={heartState.title}
    >
      <Icon 
        icon={heartState.icon} 
        style={{ color: heartState.color }}
        width="32"
        height="32"
      />
    </div>
  );
}

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'preact/hooks';
import './SSEHeartIndicator.scss';

/**
 * SSE Heart Indicator component
 * Displays a heart icon in the bottom left corner to indicate SSE connection status
 * - Beats when heartbeat messages are received
 * - Shows broken heart when connection has errors
 * - Shows regular heart when connected
 * - Grayed out when disconnected or connecting
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
    if (websocket.hasError) {
      return {
        icon: 'mdi:heart-broken',
        color: '#dc3545', // Bootstrap danger color
        title: 'Connection error - using HTTP polling'
      };
    }
    
    if (websocket.isConnected) {
      return {
        icon: 'mdi:heart',
        color: '#198754', // Bootstrap success color
        title: secondsSinceHeartbeat !== null 
          ? `Real-time updates active (${secondsSinceHeartbeat}s since last heartbeat)` 
          : 'Real-time updates active'
      };
    }
    
    if (websocket.isConnecting) {
      return {
        icon: 'mdi:heart-outline',
        color: '#ffc107', // Bootstrap warning color
        title: 'Connecting to real-time updates...'
      };
    }
    
    return {
      icon: 'mdi:heart-outline',
      color: '#6c757d', // Bootstrap secondary color
      title: 'Real-time updates not connected'
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

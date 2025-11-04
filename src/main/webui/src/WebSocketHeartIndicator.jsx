import { Icon } from '@iconify/react';
import { useEffect, useState } from 'preact/hooks';
import './WebSocketHeartIndicator.scss';

/**
 * WebSocket Heart Indicator component
 * Displays a heart icon in the bottom right corner to indicate GraphQL subscription status
 * - Styled to match the preferences buttons (Background, Layout, Accessibility)
 * - Respects the content overlay opacity settings via PreferenceButtonsStyler
 * - Beats when real-time data is received OR when keepalive pings are sent
 * - Shows green heart when successfully connected
 * - Shows broken red heart when connecting, disconnected, or has errors
 * - Clicking opens the changelog/What's New modal
 * 
 * Note: GraphQL subscriptions use websocket ping/pong for keepalive (30s interval),
 * and the heart beats on every ping to show the connection is alive.
 */
export function WebSocketHeartIndicator({ websocket, onClick }) {
  const [isBeating, setIsBeating] = useState(false);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(null);

  // Track heartbeat changes and trigger beat animation
  useEffect(() => {
    // Only trigger if we have a heartbeat timestamp and it's different from the last one we saw
    if (websocket.lastHeartbeat && websocket.lastHeartbeat !== lastHeartbeatTime) {
      setLastHeartbeatTime(websocket.lastHeartbeat);
      setIsBeating(true);
      
      // Stop the beat animation after 500ms
      const timer = setTimeout(() => {
        setIsBeating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [websocket.lastHeartbeat]);

  // Determine which icon to show and its color
  const getHeartState = () => {
    // Show green heart only when successfully connected
    if (websocket.isConnected && !websocket.hasError) {
      return {
        icon: 'mdi:heart',
        color: '#198754', // Bootstrap success color
        title: 'Real-time updates active (GraphQL subscriptions connected)'
      };
    }
    
    // Show broken heart for all other states (connecting, disconnected, or error)
    return {
      icon: 'mdi:heart-broken',
      color: '#dc3545', // Bootstrap danger color
      title: websocket.hasError 
        ? 'GraphQL subscription error'
        : (websocket.isConnecting 
            ? 'Connecting to real-time updates...' 
            : 'Real-time updates not connected')
    };
  };

  const heartState = getHeartState();

  return (
    <button 
      className={`btn btn-bd-primary py-2 d-flex align-items-center ${isBeating ? 'beating' : ''}`}
      title={heartState.title}
      role="status"
      aria-label={heartState.title}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'help',
        minWidth: '35px',  // Match the width of dropdown-toggle buttons
        paddingLeft: '0.65rem',
        paddingRight: '0.65rem'
      }}
      type="button"
    >
      <Icon 
        icon={heartState.icon} 
        style={{ color: heartState.color }}
        width="1em"
        height="1em"
        class="my-1 theme-icon-active"
      />
      <span class="visually-hidden">Real-time updates</span>
    </button>
  );
}

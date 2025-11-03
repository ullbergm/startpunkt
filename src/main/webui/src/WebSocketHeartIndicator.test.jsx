import { render, screen } from '@testing-library/preact';
import { WebSocketHeartIndicator } from './WebSocketHeartIndicator';
import '@testing-library/jest-dom';

// Mock the Icon component from @iconify/react
jest.mock('@iconify/react', () => ({
  Icon: ({ icon, style }) => (
    <div data-testid="icon" data-icon={icon} style={style}>
      {icon}
    </div>
  ),
}));

describe('WebSocketHeartIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render broken heart icon when connection has error', () => {
    const websocket = {
      hasError: true,
      isConnected: false,
      isConnecting: false,
      lastHeartbeat: null,
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'mdi:heart-broken');
    expect(icon).toHaveStyle({ color: '#dc3545' });
  });

  it('should render filled heart icon when connected', () => {
    const websocket = {
      hasError: false,
      isConnected: true,
      isConnecting: false,
      lastHeartbeat: Date.now(),
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'mdi:heart');
    expect(icon).toHaveStyle({ color: '#198754' });
  });

  it('should render broken heart icon when connecting', () => {
    const websocket = {
      hasError: false,
      isConnected: false,
      isConnecting: true,
      lastHeartbeat: null,
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'mdi:heart-broken');
    expect(icon).toHaveStyle({ color: '#dc3545' });
  });

  it('should render broken heart icon when disconnected', () => {
    const websocket = {
      hasError: false,
      isConnected: false,
      isConnecting: false,
      lastHeartbeat: null,
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'mdi:heart-broken');
    expect(icon).toHaveStyle({ color: '#dc3545' });
  });

  it('should display appropriate title for connected state', () => {
    const websocket = {
      hasError: false,
      isConnected: true,
      isConnecting: false,
      lastHeartbeat: Date.now(),
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('title', expect.stringContaining('Real-time updates active'));
  });

  it('should display appropriate title for error state', () => {
    const websocket = {
      hasError: true,
      isConnected: false,
      isConnecting: false,
      lastHeartbeat: null,
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('title', 'GraphQL subscription error');
  });

  it('should display appropriate title for connecting state', () => {
    const websocket = {
      hasError: false,
      isConnected: false,
      isConnecting: true,
      lastHeartbeat: null,
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('title', 'Connecting to real-time updates...');
  });

  it('should have proper accessibility attributes', () => {
    const websocket = {
      hasError: false,
      isConnected: true,
      isConnecting: false,
      lastHeartbeat: Date.now(),
    };

    render(<WebSocketHeartIndicator websocket={websocket} />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label');
    expect(indicator).toHaveAttribute('title');
  });
});

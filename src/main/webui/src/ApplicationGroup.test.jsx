/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen, fireEvent } from '@testing-library/preact';
import ApplicationGroup from './ApplicationGroup';

// Mock the Application component
jest.mock('./Application', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="application">{props.app.name}</div>
  ),
}));

// Mock the ApplicationPreview component
jest.mock('./ApplicationPreview', () => ({
  __esModule: true,
  default: () => null
}));

// Mock objects for layout preferences and preview config
const mockLayoutPrefs = {
  preferences: {
    compactMode: false
  },
  getCSSVariables: () => ({}),
  getGridTemplateColumns: () => 'repeat(auto-fill, minmax(280px, 1fr))'
};

const mockPreviewConfig = {
  enabled: true,
  delay: 5000
};

describe('ApplicationGroup Component', () => {
  const apps = [
    {
      name: 'App One',
      url: 'https://app1.com',
      icon: 'mdi:app',
      iconColor: 'blue',
      info: 'Info 1',
      targetBlank: true,
    },
    {
      name: 'App Two',
      url: 'https://app2.com',
      icon: '',
      iconColor: 'green',
      info: 'Info 2',
      targetBlank: false,
    },
  ];

  test('renders group title in uppercase with styling', () => {
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    // The h3 now has role="button" for accessibility
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('pb-2', 'border-bottom', 'text-uppercase');
    expect(heading.textContent).toMatch(/test group/i);
  });

  test('renders Application components for each application when not collapsed', () => {
    render(<ApplicationGroup group="My Group" applications={apps} isCollapsed={false} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    const renderedApps = screen.getAllByTestId('application');
    expect(renderedApps).toHaveLength(apps.length);
    expect(renderedApps[0]).toHaveTextContent('App One');
    expect(renderedApps[1]).toHaveTextContent('App Two');
  });

  test('does not render Application components when collapsed', () => {
    const { container } = render(<ApplicationGroup group="My Group" applications={apps} isCollapsed={true} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    const renderedApps = container.querySelectorAll('[data-testid="application"]');
    expect(renderedApps).toHaveLength(0);
  });

  test('does not render Application components when applications is not an array', () => {
    const { container } = render(<ApplicationGroup group="Empty Group" applications={null} isCollapsed={false} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    const renderedApps = container.querySelectorAll('[data-testid="application"]');
    expect(renderedApps).toHaveLength(0);
  });

  test('calls onToggle when heading is clicked', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.click(heading);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onToggle when Enter key is pressed on heading', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: 'Enter' });
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onToggle when Space key is pressed on heading', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: ' ' });
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('does not call onToggle when other keys are pressed', () => {
    const onToggle = jest.fn();
    render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} onToggle={onToggle} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    
    const heading = screen.getByRole('button', { name: /collapse test group/i });
    fireEvent.keyDown(heading, { key: 'a' });
    
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('collapse indicator rotates based on collapsed state', () => {
    const { rerender } = render(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={false} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    
    // Find the collapse indicator by searching for the specific span
    let indicator = document.querySelector('span[style*="transform"]');
    expect(indicator.style.transform).toContain('rotate(0deg)');
    
    rerender(<ApplicationGroup group="Test Group" applications={apps} isCollapsed={true} layoutPrefs={mockLayoutPrefs} previewConfig={mockPreviewConfig} />);
    indicator = document.querySelector('span[style*="transform"]');
    expect(indicator.style.transform).toContain('rotate(-90deg)');
  });
});

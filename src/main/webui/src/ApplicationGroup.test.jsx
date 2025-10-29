/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen } from '@testing-library/preact';
import ApplicationGroup from './ApplicationGroup';

// Mock the Application component
jest.mock('./Application', () => ({
  Application: (props) => (
    <div data-testid="application">{props.app.name}</div>
  ),
}));

describe('ApplicationGroup component', () => {
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
    render(<ApplicationGroup group="Test Group" applications={apps} />);
    // Match original casing or use case-insensitive regex
    const heading = screen.getByRole('heading', { level: 3, name: /test group/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('pb-2', 'border-bottom', 'text-uppercase');
  });

  test('renders Application components for each application', () => {
    render(<ApplicationGroup group="My Group" applications={apps} />);
    const renderedApps = screen.getAllByTestId('application');
    expect(renderedApps).toHaveLength(apps.length);
    expect(renderedApps[0]).toHaveTextContent('App One');
    expect(renderedApps[1]).toHaveTextContent('App Two');
  });

  test('does not render Application components when applications is not an array', () => {
    const { container } = render(<ApplicationGroup group="Empty Group" applications={null} />);
    const renderedApps = container.querySelectorAll('[data-testid="application"]');
    expect(renderedApps).toHaveLength(0);
  });
});

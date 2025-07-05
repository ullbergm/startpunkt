import { h } from 'preact';

jest.mock('@iconify/react', () => ({
  Icon: (props) => (
    <span
      data-testid="iconify-icon"
      data-icon={props.icon}
      class={props.className || props.class}
      style={{ width: props.width, height: props.height, color: props.color }}
    />
  ),
}));

import { render, screen } from '@testing-library/preact';
import Application from './Application';

describe('Application component', () => {
  const defaultApp = {
    url: 'https://example.com',
    targetBlank: true,
    icon: 'mdi:account',
    iconColor: 'red',
    name: 'Example App',
    info: 'Some info text',
  };

  test('renders Icon component when icon is an icon string', async () => {
    // no top-level await, just normal code here
    render(<Application app={defaultApp} />);
    const icon = await screen.findByTestId('iconify-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.getAttribute('data-icon')).toBe(defaultApp.icon);
  });

  test('renders link with correct href and target', () => {
    render(<Application app={defaultApp} />);
    const link = screen.getByRole('link', { name: defaultApp.name });
    expect(link).toHaveAttribute('href', defaultApp.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'external noopener noreferrer');
  });

  test('renders img element when icon is a URL', () => {
    const appWithUrlIcon = {
      ...defaultApp,
      icon: 'https://example.com/my-icon.png',
    };
    render(<Application app={appWithUrlIcon} />);
    const img = screen.getByRole('img', { name: appWithUrlIcon.name });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', appWithUrlIcon.icon);
  });

  test('renders name and info text correctly', () => {
    render(<Application app={defaultApp} />);
    expect(screen.getByText(defaultApp.name)).toBeInTheDocument();
    expect(screen.getByText(defaultApp.info)).toBeInTheDocument();
  });

  test('sets target to _self when targetBlank is false', () => {
    const appSelfTarget = {
      ...defaultApp,
      targetBlank: false,
    };
    render(<Application app={appSelfTarget} />);
    const link = screen.getByRole('link', { name: appSelfTarget.name });
    expect(link).toHaveAttribute('target', '_self');
  });

  test('renders null when icon is falsy', () => {
    const appNoIcon = {
      ...defaultApp,
      icon: '',
    };
    const { container } = render(<Application app={appNoIcon} />);
    expect(container.querySelector('span[data-testid="iconify-icon"]')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});

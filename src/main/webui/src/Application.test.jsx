import { h } from 'preact';

jest.mock('@iconify/react', () => ({
  Icon: (props) => (
    <span
      data-testid="iconify-icon"
      data-icon={props.icon}
      class={props.className || props.class}
      style={{ ...props.style, width: props.width, height: props.height, color: props.color }}
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

  test('handles missing required props gracefully', () => {
    const minimalApp = {
      name: 'Minimal App',
      url: 'https://minimal.com',
    };
    render(<Application app={minimalApp} />);
    expect(screen.getByText(minimalApp.name)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: minimalApp.name });
    expect(link).toHaveAttribute('href', minimalApp.url);
  });

  test('handles undefined app prop', () => {
    expect(() => {
      render(<Application app={undefined} />);
    }).toThrow();
  });

  test('handles null app prop', () => {
    expect(() => {
      render(<Application app={null} />);
    }).toThrow();
  });

  test('applies icon color when provided', async () => {
    render(<Application app={defaultApp} />);
    const icon = await screen.findByTestId('iconify-icon');
    expect(icon.style.color).toBe(defaultApp.iconColor);
  });

  test('renders without info text when not provided', () => {
    const appNoInfo = {
      ...defaultApp,
      info: undefined,
    };
    render(<Application app={appNoInfo} />);
    expect(screen.getByText(appNoInfo.name)).toBeInTheDocument();
    expect(screen.queryByText('Some info text')).not.toBeInTheDocument();
  });

  test('handles special characters in app name', () => {
    const appSpecialChars = {
      ...defaultApp,
      name: 'App with "quotes" & <tags>',
    };
    render(<Application app={appSpecialChars} />);
    expect(screen.getByText(appSpecialChars.name)).toBeInTheDocument();
  });

  test('handles empty string values', () => {
    const appEmptyStrings = {
      ...defaultApp,
      name: '',
      info: '',
      url: 'https://empty.com',
    };
    render(<Application app={appEmptyStrings} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', appEmptyStrings.url);
  });

  test('handles very long app names', () => {
    const longName = 'A'.repeat(100);
    const appLongName = {
      ...defaultApp,
      name: longName,
    };
    render(<Application app={appLongName} />);
    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  test('handles invalid URL icons gracefully', () => {
    const appInvalidIcon = {
      ...defaultApp,
      icon: 'not-a-valid-url-or-icon',
    };
    render(<Application app={appInvalidIcon} />);
    // Should still render the app name
    expect(screen.getByText(appInvalidIcon.name)).toBeInTheDocument();
  });

  test('renders with data URL icon', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const appDataIcon = {
      ...defaultApp,
      icon: dataUrl,
    };
    render(<Application app={appDataIcon} />);
    // Just verify the component renders without crashing
    expect(screen.getByText(appDataIcon.name)).toBeInTheDocument();
  });

  test('renders unavailable app with greyed out appearance', () => {
    const unavailableApp = {
      ...defaultApp,
      available: false,
    };
    const { container } = render(<Application app={unavailableApp} />);
    const appContainer = container.querySelector('.col');
    expect(appContainer).toHaveClass('unavailable');
    expect(appContainer.style.opacity).toBe('0.5');
    expect(appContainer.style.cursor).toBe('not-allowed');
  });

  test('does not render link for unavailable app', () => {
    const unavailableApp = {
      ...defaultApp,
      available: false,
    };
    render(<Application app={unavailableApp} />);
    const link = screen.queryByRole('link', { name: unavailableApp.name });
    expect(link).not.toBeInTheDocument();
  });

  test('renders link for available app', () => {
    const availableApp = {
      ...defaultApp,
      available: true,
    };
    render(<Application app={availableApp} />);
    const link = screen.getByRole('link', { name: availableApp.name });
    expect(link).toBeInTheDocument();
  });

  test('renders icon with reduced opacity for unavailable app', async () => {
    const unavailableApp = {
      ...defaultApp,
      available: false,
    };
    render(<Application app={unavailableApp} />);
    const icon = await screen.findByTestId('iconify-icon');
    expect(icon.style.opacity).toBe('0.4');
  });

  test('renders icon with normal opacity for available app', async () => {
    const availableApp = {
      ...defaultApp,
      available: true,
    };
    render(<Application app={availableApp} />);
    const icon = await screen.findByTestId('iconify-icon');
    expect(icon.style.opacity).toBe('1');
  });

  test('treats undefined availability as available', () => {
    const appNoAvailability = {
      ...defaultApp,
      available: undefined,
    };
    render(<Application app={appNoAvailability} />);
    const link = screen.getByRole('link', { name: appNoAvailability.name });
    expect(link).toBeInTheDocument();
  });
});

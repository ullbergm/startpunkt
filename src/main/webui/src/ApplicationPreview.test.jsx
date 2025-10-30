/** @jsxImportSource preact */
import { h } from 'preact';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { ApplicationPreview } from './ApplicationPreview';

describe('ApplicationPreview component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('does not render when enabled is false', () => {
    const { container } = render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={false} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('does not render when not hovering', () => {
    const { container } = render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={false} 
        enabled={true} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('does not render when url is empty', () => {
    const { container } = render(
      <ApplicationPreview 
        url=""
        name="Test App"
        isHovering={true} 
        enabled={true} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('shows preview after default 5 second delay', async () => {
    render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={true} 
      />
    );

    // Should not be visible immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Fast-forward time by 5 seconds
    jest.advanceTimersByTime(5000);

    // Preview should now be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('shows preview after custom delay', async () => {
    render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={true}
        delay={3000}
      />
    );

    // Should not be visible immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Fast-forward time by 3 seconds
    jest.advanceTimersByTime(3000);

    // Preview should now be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('cancels preview when hover stops before delay completes', async () => {
    const { rerender } = render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={true}
        delay={5000}
      />
    );

    // Fast-forward time by 3 seconds (not enough to show preview)
    jest.advanceTimersByTime(3000);

    // Stop hovering
    rerender(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={false} 
        enabled={true}
        delay={5000}
      />
    );

    // Fast-forward remaining time
    jest.advanceTimersByTime(2000);

    // Preview should not appear
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders image with correct src', async () => {
    const testUrl = 'https://example.com/test';
    render(
      <ApplicationPreview 
        url={testUrl}
        name="Test App"
        isHovering={true} 
        enabled={true}
        delay={1000}
      />
    );

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      const img = screen.getByAltText('Screenshot of Test App');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', `/api/screenshots?url=${encodeURIComponent(testUrl)}`);
    });
  });

  test('displays preview with proper image', async () => {
    const testName = 'My Application';
    render(
      <ApplicationPreview 
        url="https://example.com"
        name={testName}
        isHovering={true} 
        enabled={true}
        delay={1000}
      />
    );

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      const img = screen.getByAltText(`Screenshot of ${testName}`);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/api/screenshots?url=https%3A%2F%2Fexample.com');
    });
  });

  test('has proper ARIA attributes', async () => {
    render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={true}
        delay={1000}
      />
    );

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Preview of Test App');
      expect(dialog).toHaveAttribute('aria-live', 'polite');
    });
  });

  test('preview closes when hover ends', async () => {
    const { rerender } = render(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={true} 
        enabled={true}
        delay={1000}
      />
    );

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Stop hovering
    rerender(
      <ApplicationPreview 
        url="https://example.com"
        name="Test App"
        isHovering={false} 
        enabled={true}
        delay={1000}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/preact';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('should render with label', () => {
    render(<Toggle id="test-toggle" label="Test Toggle" checked={false} onChange={() => {}} />);
    expect(screen.getByText('Test Toggle')).toBeInTheDocument();
  });

  it('should be checked when checked prop is true', () => {
    render(<Toggle id="test-toggle" label="Toggle" checked={true} onChange={() => {}} />);
    const input = screen.getByRole('switch');
    expect(input).toBeChecked();
  });

  it('should not be checked when checked prop is false', () => {
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={() => {}} />);
    const input = screen.getByRole('switch');
    expect(input).not.toBeChecked();
  });

  it('should call onChange when clicked', () => {
    const handleChange = jest.fn();
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    fireEvent.click(input);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should toggle on Space key', () => {
    const handleChange = jest.fn();
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    fireEvent.keyDown(input, { key: ' ' });

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should toggle on Enter key', () => {
    const handleChange = jest.fn();
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={() => {}} disabled />);
    const input = screen.getByRole('switch');
    expect(input).toBeDisabled();
  });

  it('should not call onChange when disabled', () => {
    const handleChange = jest.fn();
    render(<Toggle id="test-toggle" label="Toggle" checked={false} onChange={handleChange} disabled />);

    const input = screen.getByRole('switch');
    fireEvent.click(input);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    render(<Toggle id="test-toggle" label="Toggle" checked={true} onChange={() => {}} />);

    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('role', 'switch');
    expect(input).toHaveAttribute('aria-checked', 'true');
  });

  it('should use ariaLabel when provided', () => {
    render(<Toggle id="test-toggle" ariaLabel="Custom Label" checked={false} onChange={() => {}} />);

    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('should fall back to label for aria-label', () => {
    render(<Toggle id="test-toggle" label="Fallback Label" checked={false} onChange={() => {}} />);

    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('aria-label', 'Fallback Label');
  });
});

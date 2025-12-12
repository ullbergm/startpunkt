import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('should render with label', () => {
    render(<ColorPicker id="test-color" label="Test Color" value="" onChange={() => {}} />);
    expect(screen.getByText('Test Color')).toBeInTheDocument();
  });

  it('should display current color value', () => {
    render(<ColorPicker id="test-color" label="Color" value="#ff0000" onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Color value' });
    expect(input.value).toBe('#ff0000');
  });

  it('should call onChange when color is selected', async () => {
    const handleChange = jest.fn();
    render(<ColorPicker id="test-color" label="Color" value="" onChange={handleChange} />);

    const button = screen.getByRole('button', { name: 'Open color picker' });
    fireEvent.click(button);

    await waitFor(() => {
      const redButton = screen.getByRole('button', { name: 'Select Red' });
      fireEvent.click(redButton);
    });

    expect(handleChange).toHaveBeenCalledWith('#dc3545');
  });

  it('should be keyboard accessible', () => {
    render(<ColorPicker id="test-color" label="Color" value="" onChange={() => {}} />);
    const button = screen.getByRole('button', { name: 'Open color picker' });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ColorPicker id="test-color" label="Color" value="" onChange={() => {}} disabled />);
    const button = screen.getByRole('button', { name: 'Open color picker' });
    const input = screen.getByRole('textbox', { name: 'Color value' });

    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('should update value when typing in input', () => {
    const handleChange = jest.fn();
    render(<ColorPicker id="test-color" label="Color" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Color value' });
    fireEvent.input(input, { target: { value: '#00ff00' } });
    fireEvent.blur(input);

    expect(handleChange).toHaveBeenCalledWith('#00ff00');
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <ColorPicker id="test-color" label="Color" value="" onChange={() => {}} />
        <button>Outside</button>
      </div>
    );

    const button = screen.getByRole('button', { name: 'Open color picker' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Color picker' })).toBeInTheDocument();
    });

    const outsideButton = screen.getByRole('button', { name: 'Outside' });
    fireEvent.mouseDown(outsideButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Color picker' })).not.toBeInTheDocument();
    });
  });
});

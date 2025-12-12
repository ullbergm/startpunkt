import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { IconPicker } from './IconPicker';

// Mock the GraphQL client
jest.mock('../graphql/client', () => ({
  client: {
    query: jest.fn(),
  },
}));

// Mock the Icon component from @iconify/react
jest.mock('@iconify/react', () => ({
  Icon: ({ icon }) => <span data-testid="icon">{icon}</span>,
}));

import { client } from '../graphql/client';

describe('IconPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('should display current icon value', () => {
    render(<IconPicker id="test-icon" label="Icon" value="mdi:home" onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    expect(input.value).toBe('mdi:home');
  });

  it('should show icon preview for iconify icons', () => {
    render(<IconPicker id="test-icon" label="Icon" value="mdi:home" onChange={() => {}} />);
    const preview = screen.getByTestId('icon');
    expect(preview).toHaveTextContent('mdi:home');
  });

  it('should show image preview for URLs', () => {
    render(<IconPicker id="test-icon" label="Icon" value="https://example.com/icon.png" onChange={() => {}} />);
    const img = screen.getByRole('img', { name: 'Icon preview' });
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('should search icons when typing', async () => {
    client.query.mockResolvedValue({
      data: {
        searchIcons: {
          icons: ['mdi:home', 'mdi:house', 'fa:home'],
          total: 3,
        },
      },
    });

    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'home' } });

    await waitFor(() => {
      expect(client.query).toHaveBeenCalled();
    });
  });

  it('should not search for queries less than 2 characters', () => {
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'a' } });

    expect(client.query).not.toHaveBeenCalled();
  });

  it('should call onChange when icon is selected', async () => {
    client.query.mockResolvedValue({
      data: {
        searchIcons: {
          icons: ['mdi:home', 'mdi:house'],
          total: 2,
        },
      },
    });

    const handleChange = jest.fn();
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'home' } });

    await waitFor(() => {
      const option = screen.getByRole('option', { name: /mdi:home/ });
      fireEvent.click(option);
    });

    expect(handleChange).toHaveBeenCalledWith('mdi:home');
  });

  it('should navigate options with arrow keys', async () => {
    client.query.mockResolvedValue({
      data: {
        searchIcons: {
          icons: ['mdi:home', 'mdi:house', 'fa:home'],
          total: 3,
        },
      },
    });

    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'home' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const firstOption = screen.getByRole('option', { name: /mdi:home/ });
    expect(firstOption).toHaveClass('selected');
  });

  it('should select option on Enter key', async () => {
    client.query.mockResolvedValue({
      data: {
        searchIcons: {
          icons: ['mdi:home'],
          total: 1,
        },
      },
    });

    const handleChange = jest.fn();
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'home' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('mdi:home');
  });

  it('should close dropdown on Escape key', async () => {
    client.query.mockResolvedValue({
      data: {
        searchIcons: {
          icons: ['mdi:home'],
          total: 1,
        },
      },
    });

    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    fireEvent.input(input, { target: { value: 'home' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} disabled />);
    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    expect(input).toBeDisabled();
  });

  it('should have proper ARIA attributes', () => {
    render(<IconPicker id="test-icon" label="Icon" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: 'Icon name or URL' });
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});

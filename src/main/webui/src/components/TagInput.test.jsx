import { render, screen, fireEvent } from '@testing-library/preact';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('should render with label', () => {
    render(<TagInput id="test-tags" label="Tags" value="" onChange={() => {}} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('should display existing tags', () => {
    render(<TagInput id="test-tags" label="Tags" value="tag1,tag2,tag3" onChange={() => {}} />);
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should add tag on Enter key', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Add new tag' });
    fireEvent.input(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('newtag');
  });

  it('should add tag on Space key', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Add new tag' });
    fireEvent.input(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: ' ' });

    expect(handleChange).toHaveBeenCalledWith('newtag');
  });

  it('should add tag on Comma key', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Add new tag' });
    fireEvent.input(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(handleChange).toHaveBeenCalledWith('newtag');
  });

  it('should remove tag when clicking X button', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="tag1,tag2" onChange={handleChange} />);

    const removeButton = screen.getByRole('button', { name: 'Remove tag tag1' });
    fireEvent.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith('tag2');
  });

  it('should remove last tag on Backspace when input is empty', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="tag1,tag2" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Add new tag' });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(handleChange).toHaveBeenCalledWith('tag1');
  });

  it('should not add duplicate tags', () => {
    const handleChange = jest.fn();
    render(<TagInput id="test-tags" label="Tags" value="tag1" onChange={handleChange} />);

    const input = screen.getByRole('textbox', { name: 'Add new tag' });
    fireEvent.input(input, { target: { value: 'tag1' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should be keyboard accessible', () => {
    render(<TagInput id="test-tags" label="Tags" value="tag1" onChange={() => {}} />);

    const removeButton = screen.getByRole('button', { name: 'Remove tag tag1' });
    expect(removeButton).toHaveAttribute('tabIndex', '0');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TagInput id="test-tags" label="Tags" value="tag1" onChange={() => {}} disabled />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove tag/ })).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<TagInput id="test-tags" label="Tags" value="tag1,tag2" onChange={() => {}} />);

    const group = screen.getByRole('group', { name: 'Tags' });
    expect(group).toBeInTheDocument();
  });
});

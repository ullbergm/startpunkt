import { useState, useRef, useEffect } from 'preact/hooks';
import './TagInput.scss';

/**
 * TagInput component similar to OpenShift's UI
 * Tags are space-delimited and show up with an X to remove each one
 * @param {Object} props - Component props
 * @param {string} props.value - Current comma-separated tag string
 * @param {Function} props.onChange - Callback when tags change
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.label - Label text
 * @param {string} props.placeholder - Placeholder text
 */
export function TagInput({ value = '', onChange, disabled = false, id, label, placeholder = 'Add tag...' }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Parse comma-separated string into tags array
    const parsedTags = value
      ? value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];
    setTags(parsedTags);
  }, [value]);

  const notifyChange = (newTags) => {
    // Convert tags array back to comma-separated string
    onChange(newTags.join(','));
  };

  const addTag = (tagText) => {
    const trimmedTag = tagText.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      notifyChange(newTags);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    notifyChange(newTags);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Add tag on Enter, Space, or Comma
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
    // Remove last tag on Backspace when input is empty
    else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleInputBlur = () => {
    // Add tag on blur if there's text
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div class="tag-input-container">
      {label && (
        <label htmlFor={id} class="form-label">
          {label}
        </label>
      )}
      <div
        class={`tag-input-wrapper ${disabled ? 'disabled' : ''}`}
        onClick={handleContainerClick}
        role="group"
        aria-label="Tags"
      >
        {tags.map((tag) => (
          <span key={tag} class="tag-badge" role="listitem">
            <span class="tag-text">{tag}</span>
            {!disabled && (
              <button
                type="button"
                class="tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                aria-label={`Remove tag ${tag}`}
                tabIndex="0"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            id={id}
            class="tag-input"
            value={inputValue}
            onInput={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            aria-label="Add new tag"
          />
        )}
      </div>
      <small class="form-text text-muted">Press Enter, Space, or Comma to add tags</small>
    </div>
  );
}

export default TagInput;

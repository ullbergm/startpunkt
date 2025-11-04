import { useState, useRef, useEffect } from 'preact/hooks';
import { Icon } from '@iconify/react';
import { client } from '../graphql/client';
import { ICONIFY_SEARCH_QUERY } from '../graphql/queries';
import './IconPicker.scss';

/**
 * IconPicker component with autocomplete from Iconify API
 * @param {Object} props - Component props
 * @param {string} props.value - Current icon value
 * @param {Function} props.onChange - Callback when icon changes
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.label - Label text
 */
export function IconPicker({ value = '', onChange, disabled = false, id, label }) {
  const [inputValue, setInputValue] = useState(value);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const searchIcons = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const result = await client.query({
        query: ICONIFY_SEARCH_QUERY,
        variables: { query, limit: 20 }
      });
      
      if (result.data?.searchIcons?.icons) {
        setSearchResults(result.data.searchIcons.icons);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching icons:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search
    if (newValue && newValue.length >= 2) {
      setShowDropdown(true);
      searchTimeout.current = setTimeout(() => {
        searchIcons(newValue);
      }, 300);
    } else {
      setShowDropdown(false);
      setSearchResults([]);
    }
  };

  const handleIconSelect = (icon) => {
    setInputValue(icon);
    onChange(icon);
    setShowDropdown(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const handleInputBlur = () => {
    // Update parent if value changed
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleIconSelect(searchResults[selectedIndex]);
        } else {
          onChange(inputValue);
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const renderIconPreview = (iconName) => {
    // Check if it's an iconify icon or a URL
    if (iconName && (iconName.startsWith('http://') || iconName.startsWith('https://'))) {
      return <img src={iconName} alt="Icon preview" class="icon-preview-image" />;
    } else if (iconName && iconName.includes(':')) {
      return <Icon icon={iconName} class="icon-preview-iconify" />;
    }
    return <span class="icon-preview-placeholder">?</span>;
  };

  return (
    <div class="icon-picker-container" ref={dropdownRef}>
      {label && (
        <label htmlFor={id} class="form-label">
          {label}
        </label>
      )}
      <div class="icon-picker-input-group">
        <span class="icon-preview">
          {renderIconPreview(inputValue)}
        </span>
        <input
          ref={inputRef}
          type="text"
          class="form-control"
          id={id}
          value={inputValue}
          onInput={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="mdi:home or https://..."
          aria-label="Icon name or URL"
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
          aria-expanded={showDropdown}
        />
        {loading && <span class="icon-picker-spinner" aria-label="Loading icons">⟳</span>}
      </div>
      
      {showDropdown && searchResults.length > 0 && (
        <div
          id={`${id}-suggestions`}
          class="icon-picker-dropdown"
          role="listbox"
          aria-label="Icon suggestions"
        >
          {searchResults.map((icon, index) => (
            <button
              key={icon}
              type="button"
              class={`icon-picker-option ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleIconSelect(icon)}
              role="option"
              aria-selected={index === selectedIndex}
              tabIndex="-1"
            >
              <span class="icon-option-preview">
                <Icon icon={icon} />
              </span>
              <span class="icon-option-name">{icon}</span>
            </button>
          ))}
        </div>
      )}
      
      <small class="form-text text-muted">Icon name (e.g., mdi:home) or URL</small>
    </div>
  );
}

export default IconPicker;

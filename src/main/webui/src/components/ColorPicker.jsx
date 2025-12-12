import { useState, useRef, useEffect } from 'preact/hooks';
import './ColorPicker.scss';

/**
 * ColorPicker component with predefined colors and custom input
 * @param {Object} props - Component props
 * @param {string} props.value - Current color value
 * @param {Function} props.onChange - Callback when color changes
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.label - Label text
 */
export function ColorPicker({ value = '', onChange, disabled = false, id, label }) {
  const [showPicker, setShowPicker] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const pickerRef = useRef(null);

  const presetColors = [
    { name: 'Red', value: '#dc3545' },
    { name: 'Orange', value: '#fd7e14' },
    { name: 'Yellow', value: '#ffc107' },
    { name: 'Green', value: '#28a745' },
    { name: 'Teal', value: '#20c997' },
    { name: 'Cyan', value: '#17a2b8' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Indigo', value: '#6610f2' },
    { name: 'Purple', value: '#6f42c1' },
    { name: 'Pink', value: '#e83e8c' },
    { name: 'Gray', value: '#6c757d' },
    { name: 'Dark', value: '#343a40' },
  ];

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleColorSelect = (color) => {
    setCustomColor(color);
    onChange(color);
    setShowPicker(false);
  };

  const handleCustomColorChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
  };

  const handleInputBlur = () => {
    onChange(customColor);
  };

  const togglePicker = () => {
    if (!disabled) {
      setShowPicker(!showPicker);
    }
  };

  return (
    <div class="color-picker-container" ref={pickerRef}>
      {label && (
        <label htmlFor={id} class="form-label">
          {label}
        </label>
      )}
      <div class="color-picker-input-group">
        <button
          type="button"
          class="color-preview-button"
          onClick={togglePicker}
          disabled={disabled}
          aria-label="Open color picker"
          aria-expanded={showPicker}
          aria-controls={`${id}-picker`}
        >
          <span
            class="color-preview-swatch"
            style={{ backgroundColor: customColor || '#ffffff' }}
          ></span>
        </button>
        <input
          type="text"
          class="form-control"
          id={id}
          value={customColor}
          onInput={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder="#ff0000 or red"
          aria-label="Color value"
        />
      </div>

      {showPicker && (
        <div
          id={`${id}-picker`}
          class="color-picker-dropdown"
          role="dialog"
          aria-label="Color picker"
        >
          <div class="color-picker-presets">
            {presetColors.map((color) => (
              <button
                key={color.value}
                type="button"
                class="color-preset-button"
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color.value)}
                aria-label={`Select ${color.name}`}
                title={color.name}
              >
                {customColor === color.value && (
                  <span class="color-selected-icon" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>
          <div class="color-picker-custom">
            <label htmlFor={`${id}-hex`} class="form-label">Custom Color</label>
            <input
              type="color"
              id={`${id}-hex`}
              class="form-control form-control-color"
              value={customColor.startsWith('#') ? customColor : '#000000'}
              onInput={handleCustomColorChange}
              aria-label="Custom color picker"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;

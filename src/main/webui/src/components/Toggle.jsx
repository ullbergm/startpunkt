import './Toggle.scss';

/**
 * Modern toggle switch component to replace checkboxes
 * @param {Object} props - Component props
 * @param {boolean} props.checked - Whether the toggle is on
 * @param {Function} props.onChange - Callback when toggle changes
 * @param {boolean} props.disabled - Whether the toggle is disabled
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.label - Label text
 * @param {string} props.ariaLabel - ARIA label for accessibility
 */
export function Toggle({ checked = false, onChange, disabled = false, id, label, ariaLabel }) {
  const handleChange = (e) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  const handleKeyDown = (e) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div class="toggle-container">
      <label class="toggle-label" htmlFor={id}>
        <input
          type="checkbox"
          id={id}
          class="toggle-input"
          checked={checked}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel || label}
        />
        <span class={`toggle-slider ${disabled ? 'disabled' : ''}`} aria-hidden="true">
          <span class="toggle-slider-dot"></span>
        </span>
        {label && <span class="toggle-text">{label}</span>}
      </label>
    </div>
  );
}

export default Toggle;

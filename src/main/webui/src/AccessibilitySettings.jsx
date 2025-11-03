import { useLocalStorage, writeStorage } from '@rehooks/local-storage';
import { Text } from 'preact-i18n';
import { useEffect } from 'preact/hooks';

export function AccessibilitySettings() {
  // Font size controls: default 100%, range 75% to 200%
  const [fontSize, setFontSize] = useLocalStorage('accessibility-fontSize', 100);
  // High contrast mode toggle
  const [highContrast, setHighContrast] = useLocalStorage('accessibility-highContrast', false);

  // Apply font size to root element
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const increaseFontSize = () => {
    if (fontSize < 200) {
      const newSize = Math.min(fontSize + 10, 200);
      writeStorage('accessibility-fontSize', newSize);
    }
  };

  const decreaseFontSize = () => {
    if (fontSize > 75) {
      const newSize = Math.max(fontSize - 10, 75);
      writeStorage('accessibility-fontSize', newSize);
    }
  };

  const resetFontSize = () => {
    writeStorage('accessibility-fontSize', 100);
  };

  const toggleHighContrast = () => {
    writeStorage('accessibility-highContrast', !highContrast);
  };

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="universal-access" viewBox="0 0 16 16">
          <path d="M9.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM6 5.5l-4.535-.442A.531.531 0 0 1 1.531 4H14.47a.531.531 0 0 1 .066 1.058L10 5.5V9l.452 6.42a.535.535 0 0 1-1.053.174L8.243 9.97c-.064-.252-.422-.252-.486 0l-1.156 5.624a.535.535 0 0 1-1.053-.174L6 9V5.5Z"/>
        </symbol>
      </svg>

      <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-accessibility-toggle" style="margin-right: 0.75rem !important;">
        <button 
          class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" 
          id="bd-accessibility" 
          type="button"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          aria-label="Accessibility settings"
        >
          <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
            <use href="#universal-access"></use>
          </svg>
          <span class="visually-hidden" id="bd-accessibility-text"><Text id="accessibility.title">Accessibility</Text></span>
        </button>
        
        <div 
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="bd-accessibility-text"
          style="width: 275px; max-height: 80vh; overflow-y: auto;"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-3 py-2">
            <h6 class="mb-3"><Text id="accessibility.settings">Accessibility Settings</Text></h6>
            
            {/* Font Size Controls */}
            <div class="mb-3">
              <label class="form-label small mb-2">
                <Text id="accessibility.fontSize">Font Size</Text>: {fontSize}%
              </label>
              <div class="d-flex gap-2 mb-2">
                <button 
                  class="btn btn-sm btn-outline-primary flex-grow-1"
                  onClick={decreaseFontSize}
                  disabled={fontSize <= 75}
                  aria-label="Decrease font size"
                  title="Decrease font size (Ctrl + -)"
                >
                  A−
                </button>
                <button 
                  class="btn btn-sm btn-outline-secondary"
                  onClick={resetFontSize}
                  aria-label="Reset font size to default"
                  title="Reset to default (Ctrl + 0)"
                >
                  <Text id="accessibility.resetFontSize">Reset</Text>
                </button>
                <button 
                  class="btn btn-sm btn-outline-primary flex-grow-1"
                  onClick={increaseFontSize}
                  disabled={fontSize >= 200}
                  aria-label="Increase font size"
                  title="Increase font size (Ctrl + +)"
                >
                  A+
                </button>
              </div>
              <input 
                type="range"
                class="form-range"
                id="fontSizeSlider"
                min="75"
                max="200"
                step="5"
                value={fontSize}
                onChange={(e) => writeStorage('accessibility-fontSize', parseInt(e.target.value))}
                aria-label="Font size slider"
              />
            </div>

            <hr class="my-2" />

            {/* High Contrast Mode */}
            <div class="mb-3">
              <div class="form-check form-switch">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="highContrastMode"
                  checked={highContrast}
                  onChange={toggleHighContrast}
                  aria-describedby="highContrastHelp"
                />
                <label class="form-check-label small" for="highContrastMode">
                  <Text id="accessibility.highContrastMode">High Contrast Mode</Text>
                </label>
              </div>
              <small id="highContrastHelp" class="form-text text-muted">
                <Text id="accessibility.highContrastHelp">Enhances color contrast for better readability</Text>
              </small>
            </div>

            <hr class="my-2" />

            {/* Keyboard Shortcuts Info */}
            <div>
              <label class="form-label small mb-1"><Text id="accessibility.keyboardShortcuts">Keyboard Shortcuts</Text></label>
              <ul class="small mb-0" style="list-style: none; padding-left: 0;">
                <li class="mb-1">
                  <kbd>/</kbd> <Text id="accessibility.shortcut.search">Search</Text>
                </li>
                <li class="mb-1">
                  <kbd>Tab</kbd> <Text id="accessibility.shortcut.navigateForward">Navigate forward</Text>
                </li>
                <li>
                  <kbd>Shift</kbd> + <kbd>Tab</kbd> <Text id="accessibility.shortcut.navigateBack">Navigate back</Text>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AccessibilitySettings;

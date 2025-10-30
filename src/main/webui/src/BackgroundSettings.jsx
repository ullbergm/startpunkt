import { useLocalStorage, writeStorage } from '@rehooks/local-storage';
import { useBackgroundPreferences } from './useBackgroundPreferences';

export function BackgroundSettings() {
  const { preferences, updatePreference, resetToDefaults } = useBackgroundPreferences();
  const [theme] = useLocalStorage('theme', 'auto');

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="palette" viewBox="0 0 16 16">
          <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
          <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8zm-8 7c.611 0 .654-.171.655-.176.078-.146.124-.464.07-1.119-.014-.168-.037-.37-.061-.591-.052-.464-.112-1.005-.118-1.462-.01-.707.083-1.61.704-2.314.369-.417.845-.578 1.272-.618.404-.038.812.026 1.16.104.343.077.702.186 1.025.284l.028.008c.346.105.658.199.953.266.653.148.904.083.991.024C14.717 9.38 15 9.161 15 8a7 7 0 1 0-7 7z"/>
        </symbol>
      </svg>

      <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-background-toggle" style="margin-right: 8.25rem !important;">
        <button 
          class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" 
          id="bd-background" 
          type="button"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          aria-label="Background settings"
        >
          <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
            <use href="#palette"></use>
          </svg>
          <span class="visually-hidden" id="bd-background-text">Background</span>
        </button>
        
        <div 
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="bd-background-text"
          style="min-width: 225px; max-height: 80vh; overflow-y: auto;"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-3 py-2">
            <h6 class="mb-2">Background Settings</h6>
            
            {/* Background Type */}
            <div class="mb-3">
              <label class="form-label small mb-1">Background Type</label>
              <select 
                class="form-select form-select-sm"
                value={preferences.type}
                onChange={(e) => updatePreference('type', e.target.value)}
              >
                <option value="theme">Theme (Auto Light/Dark)</option>
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Custom Image</option>
                <option value="pictureOfDay">Picture of the Day</option>
                <option value="geopattern">Geopattern</option>
              </select>
            </div>

            {/* Theme Mode Selection - only show when using theme background */}
            {preferences.type === 'theme' && (
              <div class="mb-3">
                <label class="form-label small mb-1">Theme Mode</label>
                <div class="btn-group w-100" role="group" aria-label="Theme selection">
                  <button
                    type="button"
                    class={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Removed debug console.log statement
                      writeStorage('theme', 'light');
                      // Force a storage event dispatch for same-window updates
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'theme',
                        newValue: 'light',
                        storageArea: localStorage
                      }));
                    }}
                    title="Light mode"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Setting theme to dark, current:', theme);
                      writeStorage('theme', 'dark');
                      // Force a storage event dispatch for same-window updates
                      window.dispatchEvent(new CustomEvent('theme-changed', {
                        detail: {
                          key: 'theme',
                          newValue: 'dark'
                        }
                      }));
                    }}
                    title="Dark mode"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                      <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm ${theme === 'auto' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Setting theme to auto, current:', theme);
                      writeStorage('theme', 'auto');
                      // Force a storage event dispatch for same-window updates
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'theme',
                        newValue: 'auto',
                        storageArea: localStorage
                      }));
                    }}
                    title="Auto (follow system)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Solid Color Settings */}
            {preferences.type === 'solid' && (
              <div class="mb-3">
                <label for="bgColor" class="form-label small mb-1">
                  Color
                </label>
                <input 
                  type="color"
                  class="form-control form-control-color"
                  id="bgColor"
                  value={preferences.color}
                  onChange={(e) => updatePreference('color', e.target.value)}
                />
              </div>
            )}

            {/* Gradient Settings */}
            {preferences.type === 'gradient' && (
              <>
                <div class="mb-3">
                  <label for="bgColorPrimary" class="form-label small mb-1">
                    Primary Color
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="bgColorPrimary"
                    value={preferences.color}
                    onChange={(e) => updatePreference('color', e.target.value)}
                  />
                </div>
                
                <div class="mb-3">
                  <label for="bgColorSecondary" class="form-label small mb-1">
                    Secondary Color
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="bgColorSecondary"
                    value={preferences.secondaryColor}
                    onChange={(e) => updatePreference('secondaryColor', e.target.value)}
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label small mb-1">Gradient Direction</label>
                  <select 
                    class="form-select form-select-sm"
                    value={preferences.gradientDirection}
                    onChange={(e) => updatePreference('gradientDirection', e.target.value)}
                  >
                    <option value="to bottom">Top to Bottom</option>
                    <option value="to top">Bottom to Top</option>
                    <option value="to right">Left to Right</option>
                    <option value="to left">Right to Left</option>
                    <option value="to bottom right">Top-Left to Bottom-Right</option>
                    <option value="to bottom left">Top-Right to Bottom-Left</option>
                  </select>
                </div>
              </>
            )}

            {/* Image Settings */}
            {preferences.type === 'image' && (
              <div class="mb-3">
                <label for="bgImageUrl" class="form-label small mb-1">
                  Image URL
                </label>
                <input 
                  type="text"
                  class="form-control form-control-sm"
                  id="bgImageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={preferences.imageUrl}
                  onInput={(e) => updatePreference('imageUrl', e.target.value)}
                />
                <small class="form-text text-muted">Enter a valid image URL</small>
              </div>
            )}

            {/* Geopattern Settings */}
            {preferences.type === 'geopattern' && (
              <>
                <div class="mb-3">
                  <label for="geopatternSeed" class="form-label small mb-1">
                    Pattern Seed
                  </label>
                  <input 
                    type="text"
                    class="form-control form-control-sm"
                    id="geopatternSeed"
                    placeholder="Enter text to generate pattern"
                    value={preferences.geopatternSeed}
                    onInput={(e) => updatePreference('geopatternSeed', e.target.value)}
                  />
                  <small class="form-text text-muted">Change the text to generate different patterns</small>
                </div>
                
                <div class="mb-3">
                  <label for="geopatternColor" class="form-label small mb-1">
                    Pattern Color
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="geopatternColor"
                    value={preferences.color}
                    onChange={(e) => updatePreference('color', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Blur Option for Images */}
            {(preferences.type === 'image' || preferences.type === 'pictureOfDay') && (
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    id="bgBlur"
                    checked={preferences.blur}
                    onChange={(e) => updatePreference('blur', e.target.checked)}
                  />
                  <label class="form-check-label small" for="bgBlur">
                    Blur Background
                  </label>
                </div>
              </div>
            )}

            {/* Opacity - hide for theme type */}
            {preferences.type !== 'theme' && (
              <div class="mb-3">
                <label for="bgOpacity" class="form-label small mb-1">
                  Opacity: {Math.round(preferences.opacity * 100)}%
                </label>
                <input 
                  type="range"
                  class="form-range"
                  id="bgOpacity"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={preferences.opacity}
                  onChange={(e) => updatePreference('opacity', parseFloat(e.target.value))}
                />
              </div>
            )}

            <hr class="my-2" />

            {/* Reset Button */}
            <button 
              class="btn btn-sm btn-outline-secondary w-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                resetToDefaults();
                // Also reset theme to auto
                writeStorage('theme', 'auto');
                window.dispatchEvent(new CustomEvent('themeChanged', {
                  detail: {
                    key: 'theme',
                    newValue: 'auto'
                  }
                }));
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default BackgroundSettings;

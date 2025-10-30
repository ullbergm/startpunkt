import { Text } from 'preact-i18n';
import { useBackgroundPreferences } from './useBackgroundPreferences';

export function BackgroundSettings() {
  const { preferences, updatePreference, resetToDefaults } = useBackgroundPreferences();

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="palette" viewBox="0 0 16 16">
          <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
          <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8zm-8 7c.611 0 .654-.171.655-.176.078-.146.124-.464.07-1.119-.014-.168-.037-.37-.061-.591-.052-.464-.112-1.005-.118-1.462-.01-.707.083-1.61.704-2.314.369-.417.845-.578 1.272-.618.404-.038.812.026 1.16.104.343.077.702.186 1.025.284l.028.008c.346.105.658.199.953.266.653.148.904.083.991.024C14.717 9.38 15 9.161 15 8a7 7 0 1 0-7 7z"/>
        </symbol>
      </svg>

      <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-background-toggle" style="margin-right: 10rem !important;">
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
          style="max-width: 320px; max-height: 80vh; overflow-y: auto;"
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

            {/* Opacity */}
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

            <hr class="my-2" />

            {/* Reset Button */}
            <button 
              class="btn btn-sm btn-outline-secondary w-100"
              onClick={resetToDefaults}
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

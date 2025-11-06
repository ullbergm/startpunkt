import { useLocalStorage, writeStorage } from '@rehooks/local-storage';
import { Text } from 'preact-i18n';
import { useBackgroundPreferences } from './useBackgroundPreferences';

export function BackgroundSettings() {
  const { preferences, updatePreference, resetToDefaults } = useBackgroundPreferences();
  const [theme] = useLocalStorage('theme', 'auto');

  // Helper to get type-specific color values
  const getTypeColor = (type, key) => {
    if (preferences.typeColors && preferences.typeColors[type] && preferences.typeColors[type][key] !== undefined) {
      return preferences.typeColors[type][key];
    }
    // Fallback to global preference
    return preferences[key];
  };

  // Get current color based on the active type
  const currentColor = getTypeColor(preferences.type, 'color') || preferences.color;
  
  // Get gradient-specific values (only used when type is 'gradient')
  const currentSecondaryColor = preferences.type === 'gradient' 
    ? (getTypeColor('gradient', 'secondaryColor') || preferences.secondaryColor)
    : preferences.secondaryColor;
  const currentGradientDirection = preferences.type === 'gradient'
    ? (getTypeColor('gradient', 'gradientDirection') || preferences.gradientDirection)
    : preferences.gradientDirection;

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="palette" viewBox="0 0 16 16">
          <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
          <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8zm-8 7c.611 0 .654-.171.655-.176.078-.146.124-.464.07-1.119-.014-.168-.037-.37-.061-.591-.052-.464-.112-1.005-.118-1.462-.01-.707.083-1.61.704-2.314.369-.417.845-.578 1.272-.618.404-.038.812.026 1.16.104.343.077.702.186 1.025.284l.028.008c.346.105.658.199.953.266.653.148.904.083.991.024C14.717 9.38 15 9.161 15 8a7 7 0 1 0-7 7z"/>
        </symbol>
      </svg>

      <div class="dropdown bd-background-toggle">
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
          <span class="visually-hidden" id="bd-background-text"><Text id="background.title">Background</Text></span>
        </button>
        
        <div 
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="bd-background-text"
          style="width: 275px; max-height: 80vh; overflow-y: auto;"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-3 py-2">
            <h6 class="mb-2"><Text id="background.settings">Background Settings</Text></h6>
            
            {/* Background Type */}
            <div class="mb-3">
              <label class="form-label small mb-1"><Text id="background.type">Background Type</Text></label>
              <select 
                class="form-select form-select-sm"
                value={preferences.type}
                onChange={(e) => updatePreference('type', e.target.value)}
              >
                <option value="theme"><Text id="background.types.theme">Theme (Auto Light/Dark)</Text></option>
                <option value="solid"><Text id="background.types.solid">Solid Color</Text></option>
                <option value="gradient"><Text id="background.types.gradient">Gradient</Text></option>
                <option value="timeGradient"><Text id="background.types.timeGradient">Time-Based Gradient</Text></option>
                <option value="meshGradient"><Text id="background.types.meshGradient">Mesh Gradient</Text></option>
                <option value="image"><Text id="background.types.image">Custom Image</Text></option>
                <option value="pictureOfDay"><Text id="background.types.pictureOfDay">Picture of the Day</Text></option>
                <option value="geopattern"><Text id="background.types.geopattern">Geopattern</Text></option>
              </select>
            </div>

            {/* Picture Provider Selection */}
            {preferences.type === 'pictureOfDay' && (
              <div class="mb-3">
                <label class="form-label small mb-1"><Text id="background.pictureProvider">Picture Provider</Text></label>
                <select 
                  class="form-select form-select-sm"
                  value={preferences.pictureProvider || 'bing'}
                  onChange={(e) => updatePreference('pictureProvider', e.target.value)}
                >
                  <option value="bing"><Text id="background.providers.bing">Bing</Text></option>
                  <option value="picsum"><Text id="background.providers.picsum">Lorem Picsum</Text></option>
                </select>
              </div>
            )}

            {/* Theme Mode Selection - only show when using theme background */}
            {preferences.type === 'theme' && (
              <div class="mb-3">
                <label class="form-label small mb-1"><Text id="background.themeMode">Theme Mode</Text></label>
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
                  <Text id="background.color">Color</Text>
                </label>
                <input 
                  type="color"
                  class="form-control form-control-color"
                  id="bgColor"
                  value={currentColor}
                  onChange={(e) => updatePreference('color', e.target.value)}
                />
              </div>
            )}

            {/* Gradient Settings */}
            {preferences.type === 'gradient' && (
              <>
                <div class="mb-3">
                  <label for="bgColorPrimary" class="form-label small mb-1">
                    <Text id="background.primaryColor">Primary Color</Text>
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="bgColorPrimary"
                    value={currentColor}
                    onChange={(e) => updatePreference('color', e.target.value)}
                  />
                </div>
                
                <div class="mb-3">
                  <label for="bgColorSecondary" class="form-label small mb-1">
                    <Text id="background.secondaryColor">Secondary Color</Text>
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="bgColorSecondary"
                    value={currentSecondaryColor}
                    onChange={(e) => updatePreference('secondaryColor', e.target.value)}
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label small mb-1"><Text id="background.gradientDirection">Gradient Direction</Text></label>
                  <select 
                    class="form-select form-select-sm"
                    value={currentGradientDirection}
                    onChange={(e) => updatePreference('gradientDirection', e.target.value)}
                  >
                    <option value="to bottom"><Text id="background.directions.toBottom">Top to Bottom</Text></option>
                    <option value="to top"><Text id="background.directions.toTop">Bottom to Top</Text></option>
                    <option value="to right"><Text id="background.directions.toRight">Left to Right</Text></option>
                    <option value="to left"><Text id="background.directions.toLeft">Right to Left</Text></option>
                    <option value="to bottom right"><Text id="background.directions.toBottomRight">Top-Left to Bottom-Right</Text></option>
                    <option value="to bottom left"><Text id="background.directions.toBottomLeft">Top-Right to Bottom-Left</Text></option>
                  </select>
                </div>
              </>
            )}

            {/* Image Settings */}
            {preferences.type === 'image' && (
              <div class="mb-3">
                <label for="bgImageUrl" class="form-label small mb-1">
                  <Text id="background.imageUrl">Image URL</Text>
                </label>
                <input 
                  type="text"
                  class="form-control form-control-sm"
                  id="bgImageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={preferences.imageUrl}
                  onInput={(e) => updatePreference('imageUrl', e.target.value)}
                />
                <small class="form-text text-muted"><Text id="background.imageUrlHelp">Enter a valid image URL</Text></small>
              </div>
            )}

            {/* Geopattern Settings */}
            {preferences.type === 'geopattern' && (
              <>
                <div class="mb-3">
                  <label for="geopatternSeed" class="form-label small mb-1">
                    <Text id="background.patternSeed">Pattern Seed</Text>
                  </label>
                  <input 
                    type="text"
                    class="form-control form-control-sm"
                    id="geopatternSeed"
                    placeholder="Enter text to generate pattern"
                    value={preferences.geopatternSeed}
                    onInput={(e) => updatePreference('geopatternSeed', e.target.value)}
                  />
                  <small class="form-text text-muted"><Text id="background.patternSeedHelp">Change the text to generate different patterns</Text></small>
                </div>
                
                <div class="mb-3">
                  <label for="geopatternColor" class="form-label small mb-1">
                    <Text id="background.patternColor">Pattern Color</Text>
                  </label>
                  <input 
                    type="color"
                    class="form-control form-control-color"
                    id="geopatternColor"
                    value={currentColor}
                    onChange={(e) => updatePreference('color', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Time-Based Gradient Info */}
            {preferences.type === 'timeGradient' && (
              <div class="mb-3">
                <div class="alert alert-info small py-2 px-3" role="alert">
                  <Text id="background.timeGradientInfo">
                    Colors automatically change based on time of day: warm tones in morning/evening, bright colors in afternoon, deep colors at night.
                  </Text>
                </div>
              </div>
            )}

            {/* Mesh Gradient Settings */}
            {preferences.type === 'meshGradient' && (
              <>
                <div class="mb-3">
                  <label class="form-label small mb-1"><Text id="background.meshColors">Mesh Colors (3-5)</Text></label>
                  <div class="d-flex gap-2 flex-wrap align-items-center">
                    {(preferences.meshColors || ['#2d5016', '#f4c430', '#003366']).map((color, index) => (
                      <div key={index} class="d-flex align-items-center gap-1">
                        <input 
                          type="color"
                          class="form-control form-control-color"
                          style="width: 3rem; height: 2rem;"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...(preferences.meshColors || ['#2d5016', '#f4c430', '#003366'])];
                            newColors[index] = e.target.value;
                            updatePreference('meshColors', newColors);
                          }}
                          title={`Color ${index + 1}`}
                        />
                        {(preferences.meshColors || []).length > 3 && (
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger p-0"
                            style="width: 1.5rem; height: 1.5rem; line-height: 1;"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const newColors = [...(preferences.meshColors || ['#2d5016', '#f4c430', '#003366'])];
                              newColors.splice(index, 1);
                              updatePreference('meshColors', newColors);
                            }}
                            title="Remove color"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {(preferences.meshColors || []).length < 5 && (
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        style="width: 3rem; height: 2rem;"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newColors = [...(preferences.meshColors || ['#2d5016', '#f4c430', '#003366'])];
                          // Add a random color
                          const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                          newColors.push(randomColor);
                          updatePreference('meshColors', newColors);
                        }}
                        title="Add color"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <small class="form-text text-muted"><Text id="background.meshColorsHelp">Choose 3-5 colors for the mesh effect</Text></small>
                </div>

                <div class="mb-3">
                  <label class="form-label small mb-1"><Text id="background.meshComplexity">Complexity</Text></label>
                  <select 
                    class="form-select form-select-sm"
                    value={preferences.meshComplexity || 'low'}
                    onChange={(e) => updatePreference('meshComplexity', e.target.value)}
                  >
                    <option value="low"><Text id="background.complexity.low">Low (Subtle)</Text></option>
                    <option value="medium"><Text id="background.complexity.medium">Medium (Balanced)</Text></option>
                    <option value="high"><Text id="background.complexity.high">High (Intense)</Text></option>
                  </select>
                </div>

                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="meshAnimated"
                      checked={preferences.meshAnimated !== undefined ? preferences.meshAnimated : true}
                      onChange={(e) => updatePreference('meshAnimated', e.target.checked)}
                    />
                    <label class="form-check-label small" for="meshAnimated">
                      <Text id="background.meshAnimated">Animate Mesh</Text>
                    </label>
                  </div>
                  <small class="form-text text-muted"><Text id="background.meshAnimatedHelp">Slowly animate the mesh gradient</Text></small>
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
                    <Text id="background.blur">Blur Background</Text>
                  </label>
                </div>
              </div>
            )}

            {/* Opacity - hide for theme type */}
            {preferences.type !== 'theme' && preferences.type !== 'timeGradient' && (
              <div class="mb-3">
                <label for="bgOpacity" class="form-label small mb-1">
                  <Text id="background.opacity">Opacity</Text>: {Math.round(preferences.opacity * 100)}%
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

            {/* Content Overlay Opacity - hide for theme background type */}
            {preferences.type !== 'theme' && (
              <div class="mb-3">
                <label for="contentOverlayOpacity" class="form-label small mb-1">
                  <Text id="background.overlayOpacity">Overlay Opacity</Text>: 
                  {preferences.contentOverlayOpacity === 0 ? ' Transparent' : 
                   preferences.contentOverlayOpacity < 0 ? ` White ${Math.round(Math.abs(preferences.contentOverlayOpacity) * 100)}%` :
                   ` Black ${Math.round(preferences.contentOverlayOpacity * 100)}%`}
                </label>
                <input 
                  type="range"
                  class="form-range"
                  id="contentOverlayOpacity"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={preferences.contentOverlayOpacity || 0}
                  onChange={(e) => {
                    let value = parseFloat(e.target.value);
                    // Snap to center (0) when within 0.1 of center
                    if (Math.abs(value) < 0.1) {
                      value = 0;
                    }
                    updatePreference('contentOverlayOpacity', value);
                  }}
                />
                <div class="d-flex justify-content-between">
                  <small class="text-muted">White</small>
                  <small class="text-muted">Transparent</small>
                  <small class="text-muted">Black</small>
                </div>
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
              <Text id="background.resetToDefaults">Reset to Defaults</Text>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default BackgroundSettings;

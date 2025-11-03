import { useState, useRef, useEffect } from 'preact/hooks';
import { Text } from 'preact-i18n';

export function LayoutSettings({ layoutPrefs }) {
  const { preferences, updatePreference, savePreset, loadPreset, deletePreset, resetToDefaults } = layoutPrefs;
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const presetInputRef = useRef(null);

  // Auto-focus the preset name input when it becomes visible
  useEffect(() => {
    if (showPresetInput && presetInputRef.current) {
      presetInputRef.current.focus();
      presetInputRef.current.select();
    }
  }, [showPresetInput]);

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
      setShowPresetInput(false);
    }
  };

  const presetList = Object.keys(preferences.savedPresets || {});

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="grid-3x3-gap" viewBox="0 0 16 16">
          <path d="M4 2v2H2V2h2zm1 12v-2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V7a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm5 10v-2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zM9 2v2H7V2h2zm5 0v2h-2V2h2zM4 7v2H2V7h2zm5 0v2H7V7h2zm5 0h-2v2h2V7zM4 12v2H2v-2h2zm5 0v2H7v-2h2zm5 0v2h-2v-2h2zM12 1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zm-1 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V7zm1 4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2z"/>
        </symbol>
      </svg>

      <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-layout-toggle" style="margin-right: 4.5rem !important;">
        <button 
          class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" 
          id="bd-layout" 
          type="button"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          aria-label="Layout settings"
        >
          <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
            <use href="#grid-3x3-gap"></use>
          </svg>
          <span class="visually-hidden" id="bd-layout-text"><Text id="layout.title">Layout</Text></span>
        </button>
        
        <div 
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="bd-layout-text"
          style="width: 275px; max-height: 80vh; overflow-y: auto;"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-3 py-2">
            <h6 class="mb-2"><Text id="layout.settings">Layout Settings</Text></h6>
            
            {/* Column Count */}
            <div class="mb-3">
              <label for="columnCountSlider" class="form-label small mb-1">
                <Text id="layout.columns">Columns</Text>: {preferences.columnCount}
              </label>
              <input 
                type="range"
                class="form-range"
                id="columnCountSlider"
                min="1"
                max="6"
                value={preferences.columnCount}
                onChange={(e) => updatePreference('columnCount', parseInt(e.target.value))}
              />
            </div>

            {/* Spacing */}
            <div class="mb-3">
              <label class="form-label small mb-1"><Text id="layout.spacing">Spacing</Text></label>
              <div class="btn-group w-100" role="group">
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingTight" 
                  checked={preferences.spacing === 'tight'}
                  onChange={() => updatePreference('spacing', 'tight')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingTight"><Text id="layout.spacingTypes.tight">Tight</Text></label>
                
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingNormal" 
                  checked={preferences.spacing === 'normal'}
                  onChange={() => updatePreference('spacing', 'normal')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingNormal"><Text id="layout.spacingTypes.normal">Normal</Text></label>
                
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingRelaxed" 
                  checked={preferences.spacing === 'relaxed'}
                  onChange={() => updatePreference('spacing', 'relaxed')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingRelaxed"><Text id="layout.spacingTypes.relaxed">Relaxed</Text></label>
              </div>
            </div>

            {/* Compact Mode */}
            <div class="mb-3">
              <div class="form-check form-switch">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="compactMode"
                  checked={preferences.compactMode}
                  onChange={(e) => updatePreference('compactMode', e.target.checked)}
                />
                <label class="form-check-label small" for="compactMode">
                  <Text id="layout.compactMode">Compact Mode</Text>
                </label>
              </div>
            </div>

            {/* Edit Mode */}
            <div class="mb-3">
              <div class="form-check form-switch">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="editMode"
                  checked={preferences.editMode}
                  onChange={(e) => updatePreference('editMode', e.target.checked)}
                />
                <label class="form-check-label small" for="editMode">
                  <Text id="layout.editMode">Edit Mode</Text>
                </label>
              </div>
              <small class="form-text text-muted">
                <Text id="layout.editModeHelp">Enable to add/edit applications and bookmarks</Text>
              </small>
            </div>

            {/* Card Content Visibility */}
            <div class="mb-3">
              <label class="form-label small mb-1"><Text id="layout.showHide">Show/Hide</Text></label>
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="showDescription"
                  checked={preferences.showDescription}
                  onChange={(e) => updatePreference('showDescription', e.target.checked)}
                />
                <label class="form-check-label small" for="showDescription">
                  <Text id="layout.description">Description</Text>
                </label>
              </div>
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="showTags"
                  checked={preferences.showTags}
                  onChange={(e) => updatePreference('showTags', e.target.checked)}
                />
                <label class="form-check-label small" for="showTags">
                  <Text id="layout.tags">Tags</Text>
                </label>
              </div>
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="showStatus"
                  checked={preferences.showStatus}
                  onChange={(e) => updatePreference('showStatus', e.target.checked)}
                />
                <label class="form-check-label small" for="showStatus">
                  <Text id="layout.statusIndicators">Status Indicators</Text>
                </label>
              </div>
            </div>

            <hr class="my-2" />

            {/* Presets */}
            <div class="mb-2">
              <label class="form-label small mb-1"><Text id="layout.presets">Layout Presets</Text></label>
              
              {presetList.length > 0 && (
                <div class="mb-2">
                  {presetList.map(name => (
                    <div key={name} class="d-flex align-items-center mb-1">
                      <button 
                        class={`btn btn-sm flex-grow-1 text-start ${preferences.currentPreset === name ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => loadPreset(name)}
                      >
                        {name}
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-danger ms-1"
                        onClick={() => deletePreset(name)}
                        aria-label={`Delete ${name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showPresetInput ? (
                <div class="input-group input-group-sm">
                  <input 
                    ref={presetInputRef}
                    type="text" 
                    class="form-control" 
                    placeholder="Preset name"
                    value={presetName}
                    onInput={(e) => setPresetName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSavePreset();
                      }
                    }}
                  />
                  <button 
                    class="btn btn-primary" 
                    onClick={handleSavePreset}
                  >
                    <Text id="layout.save">Save</Text>
                  </button>
                  <button 
                    class="btn btn-secondary" 
                    onClick={() => {
                      setShowPresetInput(false);
                      setPresetName('');
                    }}
                  >
                    <Text id="layout.cancel">Cancel</Text>
                  </button>
                </div>
              ) : (
                <button 
                  class="btn btn-sm btn-outline-primary w-100"
                  onClick={() => setShowPresetInput(true)}
                >
                  <Text id="layout.saveCurrentPreset">+ Save Current as Preset</Text>
                </button>
              )}
            </div>

            <hr class="my-2" />

            {/* Reset Button */}
            <button 
              class="btn btn-sm btn-outline-secondary w-100"
              onClick={resetToDefaults}
            >
              <Text id="layout.resetToDefaults">Reset to Defaults</Text>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default LayoutSettings;

import { useState } from 'preact/hooks';
import { Text } from 'preact-i18n';

export function LayoutSettings({ layoutPrefs }) {
  const { preferences, updatePreference, savePreset, loadPreset, deletePreset, resetToDefaults } = layoutPrefs;
  const [showSettings, setShowSettings] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

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
        <symbol id="list-ul" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </symbol>
      </svg>

      <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-layout-toggle" style="margin-right: 5rem !important;">
        <button 
          class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" 
          id="bd-layout" 
          type="button"
          aria-expanded={showSettings}
          data-bs-toggle="dropdown" 
          aria-label="Layout settings"
          onClick={toggleSettings}
        >
          <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
            <use href={preferences.viewMode === 'list' ? '#list-ul' : '#grid-3x3-gap'}></use>
          </svg>
          <span class="visually-hidden" id="bd-layout-text">Layout</span>
        </button>
        
        <div 
          class={`dropdown-menu dropdown-menu-end shadow ${showSettings ? 'show' : ''}`}
          aria-labelledby="bd-layout-text"
          style="max-width: 300px; max-height: 80vh; overflow-y: auto;"
        >
          <div class="px-3 py-2">
            <h6 class="mb-2">Layout Settings</h6>
            
            {/* View Mode */}
            <div class="mb-3">
              <label class="form-label small mb-1">View Mode</label>
              <div class="btn-group w-100" role="group">
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="viewMode" 
                  id="viewModeGrid" 
                  checked={preferences.viewMode === 'grid'}
                  onChange={() => updatePreference('viewMode', 'grid')}
                />
                <label class="btn btn-outline-primary btn-sm" for="viewModeGrid">Grid</label>
                
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="viewMode" 
                  id="viewModeList" 
                  checked={preferences.viewMode === 'list'}
                  onChange={() => updatePreference('viewMode', 'list')}
                />
                <label class="btn btn-outline-primary btn-sm" for="viewModeList">List</label>
              </div>
            </div>

            {/* Grid Size (only in grid mode) */}
            {preferences.viewMode === 'grid' && (
              <div class="mb-3">
                <label class="form-label small mb-1">Card Size</label>
                <div class="btn-group w-100" role="group">
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="gridSize" 
                    id="gridSizeSmall" 
                    checked={preferences.gridSize === 'small'}
                    onChange={() => updatePreference('gridSize', 'small')}
                  />
                  <label class="btn btn-outline-primary btn-sm" for="gridSizeSmall">S</label>
                  
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="gridSize" 
                    id="gridSizeMedium" 
                    checked={preferences.gridSize === 'medium'}
                    onChange={() => updatePreference('gridSize', 'medium')}
                  />
                  <label class="btn btn-outline-primary btn-sm" for="gridSizeMedium">M</label>
                  
                  <input 
                    type="radio" 
                    class="btn-check" 
                    name="gridSize" 
                    id="gridSizeLarge" 
                    checked={preferences.gridSize === 'large'}
                    onChange={() => updatePreference('gridSize', 'large')}
                  />
                  <label class="btn btn-outline-primary btn-sm" for="gridSizeLarge">L</label>
                </div>
              </div>
            )}

            {/* Column Count (only in grid mode) */}
            {preferences.viewMode === 'grid' && (
              <div class="mb-3">
                <label for="columnCountSelect" class="form-label small mb-1">Columns</label>
                <select 
                  id="columnCountSelect"
                  class="form-select form-select-sm" 
                  value={preferences.columnCount}
                  onChange={(e) => updatePreference('columnCount', e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                >
                  <option value="auto">Auto</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            )}

            {/* Spacing */}
            <div class="mb-3">
              <label class="form-label small mb-1">Spacing</label>
              <div class="btn-group w-100" role="group">
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingTight" 
                  checked={preferences.spacing === 'tight'}
                  onChange={() => updatePreference('spacing', 'tight')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingTight">Tight</label>
                
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingNormal" 
                  checked={preferences.spacing === 'normal'}
                  onChange={() => updatePreference('spacing', 'normal')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingNormal">Normal</label>
                
                <input 
                  type="radio" 
                  class="btn-check" 
                  name="spacing" 
                  id="spacingRelaxed" 
                  checked={preferences.spacing === 'relaxed'}
                  onChange={() => updatePreference('spacing', 'relaxed')}
                />
                <label class="btn btn-outline-primary btn-sm" for="spacingRelaxed">Relaxed</label>
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
                  Compact Mode
                </label>
              </div>
            </div>

            {/* Card Content Visibility */}
            <div class="mb-3">
              <label class="form-label small mb-1">Show/Hide</label>
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="showDescription"
                  checked={preferences.showDescription}
                  onChange={(e) => updatePreference('showDescription', e.target.checked)}
                />
                <label class="form-check-label small" for="showDescription">
                  Description
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
                  Tags
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
                  Status Indicators
                </label>
              </div>
            </div>

            <hr class="my-2" />

            {/* Presets */}
            <div class="mb-2">
              <label class="form-label small mb-1">Layout Presets</label>
              
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
                    Save
                  </button>
                  <button 
                    class="btn btn-secondary" 
                    onClick={() => {
                      setShowPresetInput(false);
                      setPresetName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  class="btn btn-sm btn-outline-primary w-100"
                  onClick={() => setShowPresetInput(true)}
                >
                  + Save Current as Preset
                </button>
              )}
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

export default LayoutSettings;

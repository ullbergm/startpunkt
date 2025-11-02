import { useEffect, useState } from 'preact/hooks';
import { Text } from 'preact-i18n';

/**
 * Modal editor component for creating and editing Application CRDs.
 * Supports both create and edit modes with proper validation.
 */
export function ApplicationEditor({ application, onSave, onCancel, onDelete, mode = 'create' }) {
  const [formData, setFormData] = useState({
    namespace: application?.metadata?.namespace || 'default',
    resourceName: application?.metadata?.name || '',
    name: application?.spec?.name || '',
    group: application?.spec?.group || '',
    icon: application?.spec?.icon || '',
    iconColor: application?.spec?.iconColor || '',
    url: application?.spec?.url || '',
    info: application?.spec?.info || '',
    targetBlank: application?.spec?.targetBlank !== false,
    location: application?.spec?.location || 1000,
    enabled: application?.spec?.enabled !== false,
    rootPath: application?.spec?.rootPath || '',
    tags: application?.spec?.tags || '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    // Check if application has owner references (read-only)
    if (application?.metadata?.ownerReferences?.length > 0) {
      setIsReadOnly(true);
    }
  }, [application]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.namespace.trim()) {
      newErrors.namespace = 'Namespace is required';
    }
    if (!formData.resourceName.trim()) {
      newErrors.resourceName = 'Resource name is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    }
    if (!formData.group.trim()) {
      newErrors.group = 'Group is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    
    try {
      const spec = {
        name: formData.name,
        group: formData.group,
        icon: formData.icon || undefined,
        iconColor: formData.iconColor || undefined,
        url: formData.url,
        info: formData.info || undefined,
        targetBlank: formData.targetBlank,
        location: parseInt(formData.location) || 1000,
        enabled: formData.enabled,
        rootPath: formData.rootPath || undefined,
        tags: formData.tags || undefined,
      };

      await onSave(formData.namespace, formData.resourceName, spec);
    } catch (error) {
      alert('Error saving application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    setLoading(true);
    
    try {
      await onDelete(formData.namespace, formData.resourceName);
    } catch (error) {
      alert('Error deleting application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <div class="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-labelledby="appEditorTitle" aria-modal="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="appEditorTitle">
              {isReadOnly && <span class="badge bg-secondary me-2">Read Only</span>}
              {mode === 'create' ? 'Create Application' : 'Edit Application'}
            </h5>
            <button type="button" class="btn-close" onClick={onCancel} aria-label="Close"></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div class="modal-body">
              {isReadOnly && (
                <div class="alert alert-warning" role="alert">
                  <strong>Read-only:</strong> This application is managed by another system and cannot be edited here.
                  {application?.metadata?.ownerReferences?.[0] && ` (Owned by: ${application.metadata.ownerReferences[0].kind})`}
                </div>
              )}

              <div class="row mb-3">
                <div class="col-md-6">
                  <label htmlFor="namespace" class="form-label">Namespace *</label>
                  <input
                    type="text"
                    class={`form-control ${errors.namespace ? 'is-invalid' : ''}`}
                    id="namespace"
                    value={formData.namespace}
                    onInput={(e) => updateField('namespace', e.target.value)}
                    disabled={mode === 'edit' || isReadOnly}
                    aria-required="true"
                    aria-invalid={!!errors.namespace}
                  />
                  {errors.namespace && <div class="invalid-feedback">{errors.namespace}</div>}
                </div>
                
                <div class="col-md-6">
                  <label htmlFor="resourceName" class="form-label">Resource Name *</label>
                  <input
                    type="text"
                    class={`form-control ${errors.resourceName ? 'is-invalid' : ''}`}
                    id="resourceName"
                    value={formData.resourceName}
                    onInput={(e) => updateField('resourceName', e.target.value)}
                    disabled={mode === 'edit' || isReadOnly}
                    aria-required="true"
                    aria-invalid={!!errors.resourceName}
                  />
                  {errors.resourceName && <div class="invalid-feedback">{errors.resourceName}</div>}
                  <small class="form-text text-muted">Kubernetes resource name (lowercase, no spaces)</small>
                </div>
              </div>

              <div class="mb-3">
                <label htmlFor="name" class="form-label">Display Name *</label>
                <input
                  type="text"
                  class={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  id="name"
                  value={formData.name}
                  onInput={(e) => updateField('name', e.target.value)}
                  disabled={isReadOnly}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <div class="invalid-feedback">{errors.name}</div>}
              </div>

              <div class="mb-3">
                <label htmlFor="group" class="form-label">Group *</label>
                <input
                  type="text"
                  class={`form-control ${errors.group ? 'is-invalid' : ''}`}
                  id="group"
                  value={formData.group}
                  onInput={(e) => updateField('group', e.target.value)}
                  disabled={isReadOnly}
                  aria-required="true"
                  aria-invalid={!!errors.group}
                />
                {errors.group && <div class="invalid-feedback">{errors.group}</div>}
              </div>

              <div class="mb-3">
                <label htmlFor="url" class="form-label">URL *</label>
                <input
                  type="url"
                  class={`form-control ${errors.url ? 'is-invalid' : ''}`}
                  id="url"
                  value={formData.url}
                  onInput={(e) => updateField('url', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="https://example.com"
                  aria-required="true"
                  aria-invalid={!!errors.url}
                />
                {errors.url && <div class="invalid-feedback">{errors.url}</div>}
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <label htmlFor="icon" class="form-label">Icon</label>
                  <input
                    type="text"
                    class="form-control"
                    id="icon"
                    value={formData.icon}
                    onInput={(e) => updateField('icon', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="mdi:home or https://..."
                  />
                  <small class="form-text text-muted">Icon name (e.g., mdi:home) or URL</small>
                </div>
                
                <div class="col-md-6">
                  <label htmlFor="iconColor" class="form-label">Icon Color</label>
                  <input
                    type="text"
                    class="form-control"
                    id="iconColor"
                    value={formData.iconColor}
                    onInput={(e) => updateField('iconColor', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="red, #ff0000, etc."
                  />
                </div>
              </div>

              <div class="mb-3">
                <label htmlFor="info" class="form-label">Description</label>
                <input
                  type="text"
                  class="form-control"
                  id="info"
                  value={formData.info}
                  onInput={(e) => updateField('info', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              <div class="mb-3">
                <label htmlFor="tags" class="form-label">Tags</label>
                <input
                  type="text"
                  class="form-control"
                  id="tags"
                  value={formData.tags}
                  onInput={(e) => updateField('tags', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="tag1,tag2,tag3"
                />
                <small class="form-text text-muted">Comma-separated tags for filtering</small>
              </div>

              <div class="mb-3">
                <label htmlFor="rootPath" class="form-label">Root Path</label>
                <input
                  type="text"
                  class="form-control"
                  id="rootPath"
                  value={formData.rootPath}
                  onInput={(e) => updateField('rootPath', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="/path"
                />
                <small class="form-text text-muted">Path to append to URL</small>
              </div>

              <div class="row mb-3">
                <div class="col-md-4">
                  <label htmlFor="location" class="form-label">Sort Order</label>
                  <input
                    type="number"
                    class="form-control"
                    id="location"
                    value={formData.location}
                    onInput={(e) => updateField('location', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                
                <div class="col-md-4">
                  <div class="form-check mt-4">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      id="targetBlank"
                      checked={formData.targetBlank}
                      onChange={(e) => updateField('targetBlank', e.target.checked)}
                      disabled={isReadOnly}
                    />
                    <label class="form-check-label" htmlFor="targetBlank">
                      Open in new tab
                    </label>
                  </div>
                </div>
                
                <div class="col-md-4">
                  <div class="form-check mt-4">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      id="enabled"
                      checked={formData.enabled}
                      onChange={(e) => updateField('enabled', e.target.checked)}
                      disabled={isReadOnly}
                    />
                    <label class="form-check-label" htmlFor="enabled">
                      Enabled
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              {mode === 'edit' && !isReadOnly && (
                <button
                  type="button"
                  class="btn btn-danger me-auto"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </button>
              )}
              <button type="button" class="btn btn-secondary" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              {!isReadOnly && (
                <button type="submit" class="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ApplicationEditor;

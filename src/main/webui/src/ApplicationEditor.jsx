import { useEffect, useState } from 'preact/hooks';
import { Text } from 'preact-i18n';
import { ColorPicker } from './components/ColorPicker';
import { TagInput } from './components/TagInput';
import { Toggle } from './components/Toggle';
import { IconPicker } from './components/IconPicker';

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
    targetBlank: application?.spec?.targetBlank ?? false, // Changed default to false
    location: application?.spec?.location || 1000,
    enabled: application?.spec?.enabled !== false,
    rootPath: application?.spec?.rootPath || '',
    tags: application?.spec?.tags || '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    // Check if application has owner references (read-only)
    if (application?.hasOwnerReferences === true) {
      setIsReadOnly(true);
    }
  }, [application]);

  // Validate individual field
  const validateField = (field, value) => {
    let error = null;

    switch (field) {
      case 'namespace':
        if (!value.trim()) {
          error = 'Namespace is required';
        } else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(value)) {
          error = 'Must be lowercase alphanumeric with hyphens';
        }
        break;
      case 'resourceName':
        if (!value.trim()) {
          error = 'Resource name is required';
        } else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(value)) {
          error = 'Must be lowercase alphanumeric with hyphens';
        }
        break;
      case 'name':
        if (!value.trim()) {
          error = 'Display name is required';
        }
        break;
      case 'url':
        if (!value.trim()) {
          error = 'URL is required';
        } else if (!/^https?:\/\/.+/.test(value)) {
          error = 'Must be a valid URL starting with http:// or https://';
        }
        break;
      case 'group':
        if (!value.trim()) {
          error = 'Group is required';
        }
        break;
    }

    return error;
  };

  // Validate all required fields
  const validate = () => {
    const newErrors = {};

    ['namespace', 'resourceName', 'name', 'url', 'group'].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

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

    // Mark field as touched
    setTouched({ ...touched, [field]: true });

    // Validate field in real-time
    const error = validateField(field, value);
    setErrors({ ...errors, [field]: error });
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(field, formData[field]);
    setErrors({ ...errors, [field]: error });
  };

  return (
    <div class="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog" aria-labelledby="appEditorTitle" aria-modal="true">
      <div class="modal-dialog modal-lg" role="document" style={{ margin: '1.75rem auto' }}>
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
                  <strong>Read-only:</strong> This application is managed by another system (such as ArgoCD) and cannot be edited here.
                </div>
              )}

              {/* Kubernetes Resource Information */}
              <div class="mb-4">
                <h6 class="text-muted text-uppercase mb-3" style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Kubernetes Resource
                </h6>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label htmlFor="namespace" class="form-label">Namespace *</label>
                    <input
                      type="text"
                      class={`form-control ${touched.namespace && errors.namespace ? 'is-invalid' : ''}`}
                      id="namespace"
                      value={formData.namespace}
                      onInput={(e) => updateField('namespace', e.target.value)}
                      onBlur={() => handleBlur('namespace')}
                      disabled={mode === 'edit' || isReadOnly}
                      aria-required="true"
                      aria-invalid={!!(touched.namespace && errors.namespace)}
                      aria-describedby="namespace-help namespace-error"
                    />
                    <small id="namespace-help" class="form-text text-muted">Kubernetes namespace (lowercase, alphanumeric, hyphens)</small>
                    {touched.namespace && errors.namespace && <div id="namespace-error" class="invalid-feedback">{errors.namespace}</div>}
                  </div>

                  <div class="col-md-6">
                    <label htmlFor="resourceName" class="form-label">Resource Name *</label>
                    <input
                      type="text"
                      class={`form-control ${touched.resourceName && errors.resourceName ? 'is-invalid' : ''}`}
                      id="resourceName"
                      value={formData.resourceName}
                      onInput={(e) => updateField('resourceName', e.target.value)}
                      onBlur={() => handleBlur('resourceName')}
                      disabled={mode === 'edit' || isReadOnly}
                      aria-required="true"
                      aria-invalid={!!(touched.resourceName && errors.resourceName)}
                      aria-describedby="resourceName-help resourceName-error"
                    />
                    <small id="resourceName-help" class="form-text text-muted">Kubernetes resource name (lowercase, alphanumeric, hyphens)</small>
                    {touched.resourceName && errors.resourceName && <div id="resourceName-error" class="invalid-feedback">{errors.resourceName}</div>}
                  </div>
                </div>
              </div>

              {/* Application Information */}
              <div class="mb-3">
                <h6 class="text-muted text-uppercase mb-3" style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Application Details
                </h6>
              </div>

              <div class="mb-3">
                <label htmlFor="name" class="form-label">Display Name *</label>
                <input
                  type="text"
                  class={`form-control ${touched.name && errors.name ? 'is-invalid' : ''}`}
                  id="name"
                  value={formData.name}
                  onInput={(e) => updateField('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  disabled={isReadOnly}
                  aria-required="true"
                  aria-invalid={!!(touched.name && errors.name)}
                  aria-describedby="name-help name-error"
                />
                <small id="name-help" class="form-text text-muted">Human-readable name shown in the UI</small>
                {touched.name && errors.name && <div id="name-error" class="invalid-feedback">{errors.name}</div>}
              </div>

              <div class="mb-3">
                <label htmlFor="group" class="form-label">Group *</label>
                <input
                  type="text"
                  class={`form-control ${touched.group && errors.group ? 'is-invalid' : ''}`}
                  id="group"
                  value={formData.group}
                  onInput={(e) => updateField('group', e.target.value)}
                  onBlur={() => handleBlur('group')}
                  disabled={isReadOnly}
                  aria-required="true"
                  aria-invalid={!!(touched.group && errors.group)}
                  aria-describedby="group-help group-error"
                />
                <small id="group-help" class="form-text text-muted">Category to organize applications (e.g., "monitoring", "databases")</small>
                {touched.group && errors.group && <div id="group-error" class="invalid-feedback">{errors.group}</div>}
              </div>

              <div class="mb-3">
                <label htmlFor="url" class="form-label">URL *</label>
                <input
                  type="url"
                  class={`form-control ${touched.url && errors.url ? 'is-invalid' : ''}`}
                  id="url"
                  value={formData.url}
                  onInput={(e) => updateField('url', e.target.value)}
                  onBlur={() => handleBlur('url')}
                  disabled={isReadOnly}
                  placeholder="https://example.com"
                  aria-required="true"
                  aria-invalid={!!(touched.url && errors.url)}
                  aria-describedby="url-help url-error"
                />
                <small id="url-help" class="form-text text-muted">Full URL including protocol (http:// or https://)</small>
                {touched.url && errors.url && <div id="url-error" class="invalid-feedback">{errors.url}</div>}
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <IconPicker
                    id="icon"
                    label="Icon"
                    value={formData.icon}
                    onChange={(value) => updateField('icon', value)}
                    disabled={isReadOnly}
                  />
                </div>

                <div class="col-md-6">
                  <ColorPicker
                    id="iconColor"
                    label="Icon Color"
                    value={formData.iconColor}
                    onChange={(value) => updateField('iconColor', value)}
                    disabled={isReadOnly}
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
                  aria-describedby="info-help"
                />
                <small id="info-help" class="form-text text-muted">Optional short description or subtitle</small>
              </div>

              <TagInput
                id="tags"
                label="Tags"
                value={formData.tags}
                onChange={(value) => updateField('tags', value)}
                disabled={isReadOnly}
                placeholder="Add tag..."
              />
              <small class="form-text text-muted d-block mb-3">Optional comma-separated tags for filtering</small>

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
                  aria-describedby="rootPath-help"
                />
                <small id="rootPath-help" class="form-text text-muted">Optional path to append to URL (e.g., "/admin")</small>
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
                    aria-describedby="location-help"
                  />
                  <small id="location-help" class="form-text text-muted">Lower numbers appear first</small>
                </div>

                <div class="col-md-4">
                  <label class="form-label d-block">&nbsp;</label>
                  <div style={{ marginBottom: '1rem' }}>
                    <Toggle
                      id="targetBlank"
                      label="Open in new tab"
                      checked={formData.targetBlank}
                      onChange={(checked) => updateField('targetBlank', checked)}
                      disabled={isReadOnly}
                      ariaLabel="Toggle whether application opens in a new browser tab"
                    />
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label d-block">&nbsp;</label>
                  <div style={{ marginBottom: '1rem' }}>
                    <Toggle
                      id="enabled"
                      label="Enabled"
                      checked={formData.enabled}
                      onChange={(checked) => updateField('enabled', checked)}
                      disabled={isReadOnly}
                      ariaLabel="Toggle whether application is visible in the UI"
                    />
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

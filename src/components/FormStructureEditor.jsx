import React, { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronUp, ChevronDown, Save } from 'lucide-react';
import './FormStructureEditor.css';

/**
 * FormStructureEditor - Milestone 3: Edit form structure with immutable updates
 * 
 * Allows users to modify the form structure:
 * - Add/remove/reorder sections
 * - Add/remove/edit fields
 * - Change field properties
 * - All updates are immutable
 */

const FIELD_TYPES = [
  'text', 'email', 'tel', 'date', 'number', 'textarea', 'radio', 'checkbox', 'file', 'signature'
];

const FormStructureEditor = ({ formStructure, onSave, onCancel }) => {
  const [structure, setStructure] = useState(formStructure);
  const [editingField, setEditingField] = useState(null);

  // ============================================================================
  // SECTION OPERATIONS (Immutable)
  // ============================================================================

  const addSection = () => {
    const newSectionId = `sec_${structure.sections.length + 1}`;
    const newSection = {
      id: newSectionId,
      title: 'New Section',
      instructions: '',
      fields: []
    };

    setStructure(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const removeSection = (sectionId) => {
    if (!confirm('Remove this section and all its fields?')) return;

    setStructure(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const updateSection = (sectionId, updates) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, ...updates }
          : section
      )
    }));
  };

  const moveSectionUp = (sectionId) => {
    const index = structure.sections.findIndex(s => s.id === sectionId);
    if (index === 0) return;

    setStructure(prev => {
      const newSections = [...prev.sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      return { ...prev, sections: newSections };
    });
  };

  const moveSectionDown = (sectionId) => {
    const index = structure.sections.findIndex(s => s.id === sectionId);
    if (index === structure.sections.length - 1) return;

    setStructure(prev => {
      const newSections = [...prev.sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      return { ...prev, sections: newSections };
    });
  };

  // ============================================================================
  // FIELD OPERATIONS (Immutable)
  // ============================================================================

  const getNextFieldId = () => {
    let maxId = 0;
    structure.sections.forEach(section => {
      section.fields.forEach(field => {
        const num = parseInt(field.id.replace('f_', ''));
        if (num > maxId) maxId = num;
      });
    });
    return `f_${maxId + 1}`;
  };

  const addField = (sectionId) => {
    const newFieldId = getNextFieldId();
    const newField = {
      id: newFieldId,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      position: 1,
      conditionalOn: null,
      conditionalValue: null,
      helpText: ''
    };

    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    }));
  };

  const removeField = (sectionId, fieldId) => {
    if (!confirm('Remove this field?')) return;

    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      )
    }));
  };

  const updateField = (sectionId, fieldId, updates) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map(field =>
                field.id === fieldId
                  ? { ...field, ...updates }
                  : field
              )
            }
          : section
      )
    }));
  };

  const moveFieldUp = (sectionId, fieldId) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;

        const index = section.fields.findIndex(f => f.id === fieldId);
        if (index === 0) return section;

        const newFields = [...section.fields];
        [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
        return { ...section, fields: newFields };
      })
    }));
  };

  const moveFieldDown = (sectionId, fieldId) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;

        const index = section.fields.findIndex(f => f.id === fieldId);
        if (index === section.fields.length - 1) return section;

        const newFields = [...section.fields];
        [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        return { ...section, fields: newFields };
      })
    }));
  };

  // ============================================================================
  // FIELD EDITOR MODAL
  // ============================================================================

  const openFieldEditor = (sectionId, field) => {
    setEditingField({ sectionId, field: { ...field } });
  };

  const closeFieldEditor = () => {
    setEditingField(null);
  };

  const saveFieldEdit = () => {
    if (!editingField) return;

    updateField(editingField.sectionId, editingField.field.id, editingField.field);
    closeFieldEditor();
  };

  const updateEditingField = (updates) => {
    setEditingField(prev => ({
      ...prev,
      field: { ...prev.field, ...updates }
    }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="form-structure-editor">
      <div className="editor-header">
        <div>
          <h2>Edit Form Structure</h2>
          <input
            type="text"
            value={structure.title}
            onChange={(e) => setStructure(prev => ({ ...prev, title: e.target.value }))}
            className="form-title-input"
            placeholder="Form Title"
          />
        </div>
        <div className="header-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={() => onSave(structure)} className="btn-primary">
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>

      <div className="editor-content">
        {structure.sections.map((section, sectionIdx) => (
          <div key={section.id} className="section-editor">
            <div className="section-header">
              <div className="section-info">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="section-title-input"
                  placeholder="Section Title"
                />
                <span className="section-id">{section.id}</span>
              </div>
              <div className="section-actions">
                <button
                  onClick={() => moveSectionUp(section.id)}
                  disabled={sectionIdx === 0}
                  className="btn-icon"
                  title="Move Up"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={() => moveSectionDown(section.id)}
                  disabled={sectionIdx === structure.sections.length - 1}
                  className="btn-icon"
                  title="Move Down"
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  onClick={() => removeSection(section.id)}
                  className="btn-icon btn-danger"
                  title="Remove Section"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <textarea
              value={section.instructions}
              onChange={(e) => updateSection(section.id, { instructions: e.target.value })}
              className="section-instructions-input"
              placeholder="Section instructions (optional)"
              rows={2}
            />

            <div className="fields-list">
              {section.fields.map((field, fieldIdx) => (
                <div key={field.id} className="field-item">
                  <div className="field-info">
                    <span className="field-id">{field.id}</span>
                    <span className="field-label">{field.label}</span>
                    <span className="field-type">{field.type}</span>
                    {field.required && <span className="field-required">Required</span>}
                  </div>
                  <div className="field-actions">
                    <button
                      onClick={() => moveFieldUp(section.id, field.id)}
                      disabled={fieldIdx === 0}
                      className="btn-icon-small"
                      title="Move Up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveFieldDown(section.id, field.id)}
                      disabled={fieldIdx === section.fields.length - 1}
                      className="btn-icon-small"
                      title="Move Down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => openFieldEditor(section.id, field)}
                      className="btn-icon-small"
                      title="Edit Field"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => removeField(section.id, field.id)}
                      className="btn-icon-small btn-danger"
                      title="Remove Field"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addField(section.id)}
                className="btn-add-field"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>
          </div>
        ))}

        <button onClick={addSection} className="btn-add-section">
          <Plus size={18} />
          Add Section
        </button>
      </div>

      {/* Field Editor Modal */}
      {editingField && (
        <div className="modal-overlay" onClick={closeFieldEditor}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Field</h3>

            <div className="form-group">
              <label>Field ID</label>
              <input
                type="text"
                value={editingField.field.id}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="form-group">
              <label>Label *</label>
              <input
                type="text"
                value={editingField.field.label}
                onChange={(e) => updateEditingField({ label: e.target.value })}
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                value={editingField.field.type}
                onChange={(e) => updateEditingField({ type: e.target.value })}
                className="input"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingField.field.required}
                  onChange={(e) => updateEditingField({ required: e.target.checked })}
                />
                <span>Required</span>
              </label>
            </div>

            <div className="form-group">
              <label>Hint Text (optional)</label>
              <input
                type="text"
                value={editingField.field.placeholder}
                onChange={(e) => updateEditingField({ placeholder: e.target.value })}
                className="input"
                placeholder="e.g., Enter your email address"
              />
              <small style={{ color: '#6c757d', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>Gray text inside the empty field that disappears when typing</small>
            </div>

            <div className="form-group">
              <label>Instructions (optional)</label>
              <textarea
                value={editingField.field.helpText}
                onChange={(e) => updateEditingField({ helpText: e.target.value })}
                className="input"
                rows={2}
                placeholder="e.g., Use your legal name as it appears on your license"
              />
              <small style={{ color: '#6c757d', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>Permanent instructions shown below the field</small>
            </div>

            {(editingField.field.type === 'radio' || editingField.field.type === 'checkbox') && (
              <div className="form-group">
                <label>Options (one per line)</label>
                <textarea
                  value={editingField.field.options?.join('\n') || ''}
                  onChange={(e) => updateEditingField({
                    options: e.target.value.split('\n').filter(o => o.trim())
                  })}
                  className="input"
                  rows={4}
                  placeholder={editingField.field.type === 'radio' ? 'e.g.,\nYes\nNo\nNot Sure' : 'e.g.,\nI agree to the terms\nI agree to privacy policy\nSend me updates'}
                />
                <small style={{ color: '#6c757d', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {editingField.field.type === 'radio' ? 'User can select one option' : 'User can select multiple options'}
                </small>
              </div>
            )}

            {/* Conditional Logic - Simple UI */}
            <div className="form-group" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px' }}>
              <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Conditional Visibility</label>
              
              <label className="checkbox-label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!editingField.field.conditionalOn}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // When checking, initialize with empty values so UI shows
                      updateEditingField({ conditionalOn: '', conditionalValue: '' });
                    } else {
                      // When unchecking, clear the conditional logic
                      updateEditingField({ conditionalOn: null, conditionalValue: null });
                    }
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                />
                <span style={{ userSelect: 'none' }}>Only show this field conditionally</span>
              </label>

              {editingField.field.conditionalOn && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>Show this field only when:</label>
                    <select
                      value={editingField.field.conditionalOn || ''}
                      onChange={(e) => updateEditingField({ conditionalOn: e.target.value || null })}
                      className="input"
                    >
                      <option value="">Select a field...</option>
                      {formStructure.sections.flatMap(s => s.fields)
                        .filter(f => f.id !== editingField.field.id)
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>equals:</label>
                    <input
                      type="text"
                      value={editingField.field.conditionalValue || ''}
                      onChange={(e) => updateEditingField({ conditionalValue: e.target.value })}
                      placeholder="Enter value (e.g., Yes)"
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={closeFieldEditor} className="btn-secondary">
                Cancel
              </button>
              <button onClick={saveFieldEdit} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormStructureEditor;

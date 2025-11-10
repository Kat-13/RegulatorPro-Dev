import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const ELEMENT_TYPES = {
  SECTION_HEADER: 'section_header',
  FIELD: 'field',
  INSTRUCTION_BLOCK: 'instruction_block',
  DOCUMENT_UPLOAD: 'document_upload',
  SIGNATURE_BLOCK: 'signature_block',
  ATTESTATION_BLOCK: 'attestation_block',
  FEE_DISPLAY: 'fee_display'
};

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text (paragraph)' },
  { value: 'select', label: 'Dropdown List' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File Upload' }
];

// Helper function to normalize options to simple string array
const normalizeOptions = (options) => {
  if (!options) return [];
  if (!Array.isArray(options)) return [];
  
  // If options are objects with 'label' or 'value', extract the label
  if (options.length > 0 && typeof options[0] === 'object') {
    return options.map(opt => opt.label || opt.value || String(opt));
  }
  
  // If options are already strings, return as-is
  return options;
};

const EditElementDialog = ({ element, onSave, onClose }) => {
  const [formData, setFormData] = useState({});
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    // Initialize form data based on element type
    // Normalize options to simple string array
    const normalizedElement = {
      ...element,
      options: normalizeOptions(element.options)
    };
    setFormData(normalizedElement);
  }, [element]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    
    const currentOptions = formData.options || [];
    setFormData({
      ...formData,
      options: [...currentOptions, newOption.trim()]
    });
    setNewOption('');
  };

  const removeOption = (index) => {
    const currentOptions = formData.options || [];
    setFormData({
      ...formData,
      options: currentOptions.filter((_, i) => i !== index)
    });
  };

  const moveOption = (index, direction) => {
    const currentOptions = [...(formData.options || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= currentOptions.length) return;
    
    [currentOptions[index], currentOptions[newIndex]] = [currentOptions[newIndex], currentOptions[index]];
    
    setFormData({
      ...formData,
      options: currentOptions
    });
  };

  const renderFieldEditor = () => {
    const needsOptions = ['select', 'checkbox', 'radio'].includes(formData.field_type);
    
    return (
      <div className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={formData.display_name || formData.canonical_name || ''}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What should applicants see?"
          />
          {formData.canonical_name && (
            <p className="text-xs text-gray-500 mt-1">
              Linked to Field Library: <span className="font-mono">{formData.canonical_name}</span>
            </p>
          )}
        </div>

        {/* Field Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Type
          </label>
          <select
            value={formData.field_type || 'text'}
            onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Options Editor (for select, checkbox, radio) */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            
            {/* Existing Options */}
            <div className="space-y-2 mb-3">
              {(formData.options || []).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {option}
                  </span>
                  <button
                    onClick={() => moveOption(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveOption(index, 'down')}
                    disabled={index === (formData.options || []).length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeOption(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {(!formData.options || formData.options.length === 0) && (
                <p className="text-sm text-gray-500 italic">No options defined yet</p>
              )}
            </div>

            {/* Add New Option */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addOption()}
                placeholder="Add new option..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addOption}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        )}

        {/* Required */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.required || false}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">This field is required</span>
          </label>
        </div>

        {/* Help Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Help Text (optional)
          </label>
          <textarea
            value={formData.help_text || ''}
            onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional guidance for applicants..."
          />
        </div>
      </div>
    );
  };

  const renderSectionHeaderEditor = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Section Title
      </label>
      <input
        type="text"
        value={formData.content || ''}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter section title..."
      />
    </div>
  );

  const renderInstructionBlockEditor = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Instructions
      </label>
      <textarea
        value={formData.content || ''}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter instructions for applicants..."
      />
    </div>
  );

  const renderDocumentUploadEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Document Name
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Proof of Education"
        />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.required || false}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">This document is required</span>
        </label>
      </div>
    </div>
  );

  const renderAttestationBlockEditor = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Attestation Text
      </label>
      <textarea
        value={formData.content || ''}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="I hereby certify..."
      />
    </div>
  );

  const renderFeeDisplayEditor = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Base Fee Amount
      </label>
      <input
        type="number"
        step="0.01"
        value={formData.base_amount || '0.00'}
        onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0.00"
      />
    </div>
  );

  const renderEditor = () => {
    switch(element.type) {
      case ELEMENT_TYPES.FIELD:
        return renderFieldEditor();
      case ELEMENT_TYPES.SECTION_HEADER:
        return renderSectionHeaderEditor();
      case ELEMENT_TYPES.INSTRUCTION_BLOCK:
        return renderInstructionBlockEditor();
      case ELEMENT_TYPES.DOCUMENT_UPLOAD:
        return renderDocumentUploadEditor();
      case ELEMENT_TYPES.ATTESTATION_BLOCK:
        return renderAttestationBlockEditor();
      case ELEMENT_TYPES.FEE_DISPLAY:
        return renderFeeDisplayEditor();
      default:
        return <p className="text-gray-500">Unknown element type</p>;
    }
  };

  const getTitle = () => {
    switch(element.type) {
      case ELEMENT_TYPES.FIELD:
        return `Edit Field: "${formData.display_name || formData.canonical_name || 'Untitled'}"`;
      case ELEMENT_TYPES.SECTION_HEADER:
        return 'Edit Section Header';
      case ELEMENT_TYPES.INSTRUCTION_BLOCK:
        return 'Edit Instruction Block';
      case ELEMENT_TYPES.DOCUMENT_UPLOAD:
        return 'Edit Document Upload';
      case ELEMENT_TYPES.SIGNATURE_BLOCK:
        return 'Edit Signature Block';
      case ELEMENT_TYPES.ATTESTATION_BLOCK:
        return 'Edit Attestation Block';
      case ELEMENT_TYPES.FEE_DISPLAY:
        return 'Edit Fee Display';
      default:
        return 'Edit Element';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderEditor()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditElementDialog;


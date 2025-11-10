import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

const ValidationRuleEditor = ({ applicationTypeId, fields, onClose }) => {
  const [validationRules, setValidationRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [selectedField, setSelectedField] = useState('');

  useEffect(() => {
    loadValidationRules();
  }, [applicationTypeId]);

  const loadValidationRules = async () => {
    try {
      const response = await fetch(`/api/application-types/${applicationTypeId}/validation-rules`);
      const data = await response.json();
      
      if (data.validation_rules) {
        setValidationRules(data.validation_rules);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading validation rules:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/application-types/${applicationTypeId}/validation-rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validation_rules: validationRules
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Validation rules saved successfully' });
        setTimeout(() => {
          setSaveStatus(null);
          if (onClose) onClose();
        }, 2000);
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save validation rules' });
      }
    } catch (error) {
      console.error('Error saving validation rules:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save validation rules' });
    } finally {
      setSaving(false);
    }
  };

  const addFieldRule = () => {
    if (!selectedField) return;
    
    setValidationRules(prev => ({
      ...prev,
      [selectedField]: {
        required: false,
        format: '',
        min_length: '',
        max_length: '',
        min_value: '',
        max_value: '',
        regex: '',
        custom_message: ''
      }
    }));
    setSelectedField('');
  };

  const removeFieldRule = (fieldKey) => {
    setValidationRules(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const updateFieldRule = (fieldKey, ruleType, value) => {
    setValidationRules(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        [ruleType]: value
      }
    }));
  };

  const formatOptions = [
    { value: '', label: 'None' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'ssn', label: 'Social Security Number' },
    { value: 'zip_code', label: 'ZIP Code' },
    { value: 'date', label: 'Date (YYYY-MM-DD)' },
    { value: 'url', label: 'URL' },
    { value: 'license_number', label: 'License Number' },
    { value: 'npi', label: 'NPI Number' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Field Validation Rules</h3>
        </div>
      </div>

      {/* Status Message */}
      {saveStatus && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          saveStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Add Field Rule */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Validation Rule for Field
        </label>
        <div className="flex space-x-2">
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a field...</option>
            {fields
              .filter(field => !validationRules[field.id || field.field_key || field.name])
              .map(field => {
                const fieldKey = field.id || field.field_key || field.name;
                return (
                  <option key={fieldKey} value={fieldKey}>
                    {field.label || fieldKey}
                  </option>
                );
              })}
          </select>
          <button
            onClick={addFieldRule}
            disabled={!selectedField}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Validation Rules List */}
      <div className="space-y-4">
        {Object.keys(validationRules).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No validation rules configured. Add a field above to get started.
          </div>
        ) : (
          Object.entries(validationRules).map(([fieldKey, rules]) => {
            const field = fields.find(f => 
              (f.id || f.field_key || f.name) === fieldKey
            );
            const fieldLabel = field?.label || fieldKey;

            return (
              <div key={fieldKey} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Field Header */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{fieldLabel}</h4>
                  <button
                    onClick={() => removeFieldRule(fieldKey)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rule Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Required */}
                  <div className="col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={rules.required || false}
                        onChange={(e) => updateFieldRule(fieldKey, 'required', e.target.checked)}
                        className="text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Required Field</span>
                    </label>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format Validation
                    </label>
                    <select
                      value={rules.format || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'format', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {formatOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min Length */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Length
                    </label>
                    <input
                      type="number"
                      value={rules.min_length || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'min_length', e.target.value)}
                      placeholder="No minimum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Max Length */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={rules.max_length || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'max_length', e.target.value)}
                      placeholder="No maximum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Min Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Value
                    </label>
                    <input
                      type="number"
                      value={rules.min_value || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'min_value', e.target.value)}
                      placeholder="No minimum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Max Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Value
                    </label>
                    <input
                      type="number"
                      value={rules.max_value || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'max_value', e.target.value)}
                      placeholder="No maximum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Custom Regex */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Regex Pattern
                    </label>
                    <input
                      type="text"
                      value={rules.regex || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'regex', e.target.value)}
                      placeholder="e.g., ^[A-Z]{2}[0-9]{6}$"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  {/* Custom Error Message */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Error Message
                    </label>
                    <input
                      type="text"
                      value={rules.custom_message || ''}
                      onChange={(e) => updateFieldRule(fieldKey, 'custom_message', e.target.value)}
                      placeholder="Override default error message"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        {onClose && (
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Validation Rules'}
        </button>
      </div>
    </div>
  );
};

export default ValidationRuleEditor;

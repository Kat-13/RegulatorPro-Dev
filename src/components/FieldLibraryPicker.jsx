import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const FieldLibraryPicker = ({ onSelect, onClose, boardType = 'general' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // Field configuration state
  const [displayName, setDisplayName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await fetch('/api/field-library');
      const data = await response.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFields = fields.filter(field => {
    const searchLower = searchTerm.toLowerCase();
    return (
      field.canonical_name?.toLowerCase().includes(searchLower) ||
      field.field_key?.toLowerCase().includes(searchLower)
    );
  });

  const handleFieldClick = (field) => {
    setSelectedField(field);
    setDisplayName(field.canonical_name || '');
    
    // Auto-detect field type: if field has options, it should be a select/dropdown
    let detectedType = field.field_type || 'text';
    if (field.options) {
      try {
        const parsedOptions = JSON.parse(field.options);
        if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
          detectedType = 'select'; // Default to dropdown if options exist
        }
      } catch (e) {
        console.error('Error parsing options:', e);
      }
    }
    
    setFieldType(detectedType);
    setIsRequired(false);
    setShowConfig(true);
  };

  const handleAddField = () => {
    if (selectedField && onSelect) {
      // Parse options if it's a string, otherwise use as-is
      let parsedOptions = null;
      if (selectedField.options) {
        if (typeof selectedField.options === 'string') {
          try {
            parsedOptions = JSON.parse(selectedField.options);
          } catch (e) {
            console.error('Error parsing options:', e);
            parsedOptions = null;
          }
        } else {
          // Already an object/array
          parsedOptions = selectedField.options;
        }
      }
      
      onSelect({
        field_library_id: selectedField.id,
        field_key: selectedField.field_key,
        field_type: fieldType,
        display_name: displayName,
        canonical_name: selectedField.canonical_name,
        required: isRequired,
        help_text: selectedField.description || '',
        options: parsedOptions
      });
    }
    onClose();
  };

  const handleCancel = () => {
    if (showConfig) {
      setShowConfig(false);
      setSelectedField(null);
    } else {
      onClose();
    }
  };

  // Field type options
  const fieldTypeOptions = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text (paragraph)' },
    { value: 'select', label: 'Dropdown List' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'date', label: 'Date' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone Number' }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading fields...</div>
        </div>
      </div>
    );
  }

  // Field Configuration Dialog
  if (showConfig) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              Add Field: "{selectedField?.canonical_name}"
            </h3>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What should applicants see?
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Field label for applicants"
              />
            </div>

            {/* Field Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What type of field?
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fieldTypeOptions.map(option => (
                  <label key={option.value} className="flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="radio"
                      name="fieldType"
                      value={option.value}
                      checked={fieldType === option.value}
                      onChange={(e) => setFieldType(e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Display Options if they exist */}
            {selectedField?.options && (() => {
              try {
                const parsedOptions = JSON.parse(selectedField.options);
                if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                  return (
                    <div className="pt-2 pb-2 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dropdown Options ({parsedOptions.length} options)
                      </label>
                      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                        <ul className="space-y-1 text-sm text-gray-700">
                          {parsedOptions.map((opt, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {opt.label || opt.value || opt}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        These options are defined in the Field Library
                      </p>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}

            {/* Required Checkbox */}
            <div className="pt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium">This field is required</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAddField}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Field
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Field Library List
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Field from Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Field List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No fields found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => handleFieldClick(field)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg text-left transition-colors"
                >
                  <span className="font-medium text-gray-900">{field.canonical_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{field.field_type}</span>
                    <span className="text-blue-600 text-xl">+</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldLibraryPicker;


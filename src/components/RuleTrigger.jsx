import React from 'react';

/**
 * RuleTrigger Component
 * 
 * Allows admin to configure the trigger condition for a rule
 * WHEN: [field] [condition] [value]
 * 
 * Props:
 * - trigger: Current trigger configuration { field, condition, value }
 * - availableFields: Array of fields that can be used
 * - onChange: Callback when trigger changes
 */
const RuleTrigger = ({ trigger = {}, availableFields = [], onChange }) => {
  const { trigger_field = '', trigger_condition = 'equals', trigger_value = '' } = trigger;

  // Get field object from field name
  const selectedField = availableFields.find(f => 
    (f.name === trigger_field || f.field_key === trigger_field || f.id === trigger_field)
  );

  // Determine available conditions based on field type
  const getConditionsForFieldType = (fieldType) => {
    const baseConditions = [
      { value: 'equals', label: 'equals', requiresValue: true },
      { value: 'not_equals', label: 'does not equal', requiresValue: true },
      { value: 'is_empty', label: 'is empty', requiresValue: false },
      { value: 'is_not_empty', label: 'is not empty', requiresValue: false }
    ];

    if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'email') {
      return [
        ...baseConditions,
        { value: 'contains', label: 'contains', requiresValue: true },
        { value: 'not_contains', label: 'does not contain', requiresValue: true }
      ];
    }

    if (fieldType === 'number' || fieldType === 'date') {
      return [
        ...baseConditions,
        { value: 'greater_than', label: 'is greater than', requiresValue: true },
        { value: 'less_than', label: 'is less than', requiresValue: true },
        { value: 'greater_than_or_equal', label: 'is greater than or equal to', requiresValue: true },
        { value: 'less_than_or_equal', label: 'is less than or equal to', requiresValue: true }
      ];
    }

    if (fieldType === 'select' || fieldType === 'radio') {
      return [
        ...baseConditions,
        { value: 'in_list', label: 'is one of', requiresValue: true },
        { value: 'not_in_list', label: 'is not one of', requiresValue: true }
      ];
    }

    return baseConditions;
  };

  const availableConditions = selectedField 
    ? getConditionsForFieldType(selectedField.type || selectedField.field_type)
    : getConditionsForFieldType('text');

  const currentCondition = availableConditions.find(c => c.value === trigger_condition);
  const requiresValue = currentCondition ? currentCondition.requiresValue : true;

  // Handle field selection change
  const handleFieldChange = (e) => {
    const newField = e.target.value;
    onChange({
      ...trigger,
      trigger_field: newField,
      trigger_value: '' // Reset value when field changes
    });
  };

  // Handle condition change
  const handleConditionChange = (e) => {
    const newCondition = e.target.value;
    const condition = availableConditions.find(c => c.value === newCondition);
    
    onChange({
      ...trigger,
      trigger_condition: newCondition,
      trigger_value: condition && !condition.requiresValue ? '' : trigger_value
    });
  };

  // Handle value change
  const handleValueChange = (e) => {
    onChange({
      ...trigger,
      trigger_value: e.target.value
    });
  };

  // Render value input based on field type
  const renderValueInput = () => {
    if (!requiresValue) {
      return null;
    }

    const fieldType = selectedField?.type || selectedField?.field_type || 'text';

    // For select/radio fields, show dropdown of options
    if ((fieldType === 'select' || fieldType === 'radio') && selectedField?.options) {
      let options = [];
      try {
        options = typeof selectedField.options === 'string' 
          ? JSON.parse(selectedField.options)
          : selectedField.options;
      } catch (e) {
        options = [];
      }

      return (
        <select
          value={trigger_value}
          onChange={handleValueChange}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">Select value...</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      );
    }

    // For number fields
    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={trigger_value}
          onChange={handleValueChange}
          placeholder="Enter number..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    // For date fields
    if (fieldType === 'date') {
      return (
        <input
          type="date"
          value={trigger_value}
          onChange={handleValueChange}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={trigger_value}
        onChange={handleValueChange}
        placeholder="Enter value..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    );
  };

  return (
    <div className="rule-trigger">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        WHEN (Trigger Condition)
      </label>
      
      <div className="flex flex-wrap items-center gap-2">
        {/* Field Selector */}
        <select
          value={trigger_field}
          onChange={handleFieldChange}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">Select field...</option>
          {availableFields.map((field) => {
            const fieldId = field.name || field.field_key || field.id;
            const fieldLabel = field.label || field.canonical_name || field.name;
            return (
              <option key={fieldId} value={fieldId}>
                {fieldLabel}
              </option>
            );
          })}
        </select>

        {/* Condition Selector */}
        <select
          value={trigger_condition}
          onChange={handleConditionChange}
          disabled={!trigger_field}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {availableConditions.map((cond) => (
            <option key={cond.value} value={cond.value}>
              {cond.label}
            </option>
          ))}
        </select>

        {/* Value Input (conditional) */}
        {requiresValue && (
          <>
            {renderValueInput()}
          </>
        )}
      </div>

      {/* Help Text */}
      {!trigger_field && (
        <p className="mt-2 text-xs text-gray-500">
          Select a field to start building your trigger condition
        </p>
      )}
      {trigger_field && !requiresValue && (
        <p className="mt-2 text-xs text-gray-500">
          This condition doesn't require a value
        </p>
      )}
    </div>
  );
};

export default RuleTrigger;


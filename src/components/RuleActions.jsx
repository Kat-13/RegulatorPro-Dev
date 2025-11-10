import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * RuleActions Component
 * 
 * Allows admin to configure actions that occur when trigger is met
 * THEN: [action] [target fields] [parameters]
 * 
 * Props:
 * - actions: Array of action configurations
 * - availableFields: Array of fields that can be targeted
 * - onChange: Callback when actions change
 */
const RuleActions = ({ actions = [], availableFields = [], onChange }) => {
  
  // Available action types
  const actionTypes = [
    { value: 'show', label: 'Show fields', requiresFields: true, requiresParams: false },
    { value: 'hide', label: 'Hide fields', requiresFields: true, requiresParams: false },
    { value: 'enable', label: 'Enable fields', requiresFields: true, requiresParams: false },
    { value: 'disable', label: 'Disable fields', requiresFields: true, requiresParams: false },
    { value: 'set_required', label: 'Set as required', requiresFields: true, requiresParams: false },
    { value: 'set_optional', label: 'Set as optional', requiresFields: true, requiresParams: false },
    { value: 'set_value', label: 'Set value', requiresFields: true, requiresParams: true },
    { value: 'clear_value', label: 'Clear value', requiresFields: true, requiresParams: false },
    { value: 'calculate_fee', label: 'Calculate fee', requiresFields: false, requiresParams: true }
  ];

  // Add new action
  const addAction = () => {
    const newAction = {
      action: 'show',
      target_fields: []
    };
    onChange([...actions, newAction]);
  };

  // Remove action
  const removeAction = (index) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  // Update action type
  const updateActionType = (index, newType) => {
    const updatedActions = [...actions];
    updatedActions[index] = {
      ...updatedActions[index],
      action: newType,
      target_fields: updatedActions[index].target_fields || []
    };
    onChange(updatedActions);
  };

  // Update target fields
  const updateTargetFields = (index, fields) => {
    const updatedActions = [...actions];
    updatedActions[index] = {
      ...updatedActions[index],
      target_fields: fields
    };
    onChange(updatedActions);
  };

  // Update action parameters
  const updateActionParams = (index, params) => {
    const updatedActions = [...actions];
    updatedActions[index] = {
      ...updatedActions[index],
      ...params
    };
    onChange(updatedActions);
  };

  // Toggle field selection
  const toggleField = (actionIndex, fieldId) => {
    const action = actions[actionIndex];
    const currentFields = action.target_fields || [];
    
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter(f => f !== fieldId)
      : [...currentFields, fieldId];
    
    updateTargetFields(actionIndex, newFields);
  };

  // Render action parameters based on type
  const renderActionParams = (action, actionIndex) => {
    const actionType = actionTypes.find(t => t.value === action.action);
    
    if (!actionType || !actionType.requiresParams) {
      return null;
    }

    // Set value parameters
    if (action.action === 'set_value') {
      return (
        <div className="mt-3 pl-4 border-l-2 border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Value to set:
          </label>
          <input
            type="text"
            value={action.value || ''}
            onChange={(e) => updateActionParams(actionIndex, { value: e.target.value })}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      );
    }

    // Calculate fee parameters
    if (action.action === 'calculate_fee') {
      const feeModifier = action.fee_modifier || { type: 'discount', amount: 0, unit: 'percent' };
      
      return (
        <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fee modification type:
            </label>
            <select
              value={feeModifier.type}
              onChange={(e) => updateActionParams(actionIndex, {
                fee_modifier: { ...feeModifier, type: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="discount">Discount</option>
              <option value="surcharge">Surcharge</option>
              <option value="set_amount">Set fixed amount</option>
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount:
              </label>
              <input
                type="number"
                value={feeModifier.amount || 0}
                onChange={(e) => updateActionParams(actionIndex, {
                  fee_modifier: { ...feeModifier, amount: parseFloat(e.target.value) || 0 }
                })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {feeModifier.type !== 'set_amount' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit:
                </label>
                <select
                  value={feeModifier.unit || 'percent'}
                  onChange={(e) => updateActionParams(actionIndex, {
                    fee_modifier: { ...feeModifier, unit: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="dollars">Dollars ($)</option>
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {feeModifier.type === 'discount' && (
              <>
                Will reduce fee by {feeModifier.amount}
                {feeModifier.unit === 'percent' ? '%' : ' dollars'}
              </>
            )}
            {feeModifier.type === 'surcharge' && (
              <>
                Will increase fee by {feeModifier.amount}
                {feeModifier.unit === 'percent' ? '%' : ' dollars'}
              </>
            )}
            {feeModifier.type === 'set_amount' && (
              <>Will set fee to ${feeModifier.amount}</>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rule-actions">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        THEN (Actions)
      </label>

      {/* Actions List */}
      <div className="space-y-4">
        {actions.map((action, index) => {
          const actionType = actionTypes.find(t => t.value === action.action);
          
          return (
            <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                {/* Action Type Selector */}
                <div className="flex-1">
                  <select
                    value={action.action}
                    onChange={(e) => updateActionType(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {actionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {/* Target Fields (if required) */}
                  {actionType && actionType.requiresFields && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Select target fields:
                      </label>
                      <div className="max-h-40 overflow-y-auto space-y-1 bg-white border border-gray-200 rounded-lg p-2">
                        {availableFields.length === 0 ? (
                          <p className="text-xs text-gray-500 p-2">No fields available</p>
                        ) : (
                          availableFields.map((field) => {
                            const fieldId = field.name || field.field_key || field.id;
                            const fieldLabel = field.label || field.canonical_name || field.name;
                            const isSelected = (action.target_fields || []).includes(fieldId);
                            
                            return (
                              <label
                                key={fieldId}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleField(index, fieldId)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-900">{fieldLabel}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {(action.target_fields || []).length > 0 && (
                        <p className="mt-1 text-xs text-gray-600">
                          {action.target_fields.length} field{action.target_fields.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Parameters (if required) */}
                  {renderActionParams(action, index)}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeAction(index)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Remove action"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Action Button */}
      <button
        onClick={addAction}
        className="mt-3 flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Action
      </button>

      {/* Help Text */}
      {actions.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Add at least one action that will occur when the trigger condition is met
        </p>
      )}
    </div>
  );
};

export default RuleActions;


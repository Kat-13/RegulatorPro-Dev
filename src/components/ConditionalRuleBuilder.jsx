import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Info } from 'lucide-react';
import RuleTrigger from './RuleTrigger';
import RuleActions from './RuleActions';

/**
 * ConditionalRuleBuilder Component
 * 
 * Visual rule builder for creating conditional logic in forms
 * Allows admins to create rules without writing code
 * 
 * Props:
 * - applicationTypeId: ID of the application type
 * - availableFields: Array of fields that can be used in rules
 * - onSave: Callback when rules are saved
 */
const ConditionalRuleBuilder = ({ applicationTypeId, availableFields = [], onSave }) => {
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load existing rules when component mounts
  useEffect(() => {
    if (applicationTypeId) {
      loadRules();
    }
  }, [applicationTypeId]);

  // Load rules from API
  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/application-types/${applicationTypeId}/conditional-rules`);
      const data = await response.json();
      
      if (data.success) {
        setRules(data.rules || []);
      } else {
        setError('Failed to load rules');
      }
    } catch (err) {
      setError('Error loading rules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save rules to API
  const saveRules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/application-types/${applicationTypeId}/conditional-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConflicts(data.conflicts || []);
        if (onSave) {
          onSave(rules);
        }
        return true;
      } else {
        setError(data.error || 'Failed to save rules');
        return false;
      }
    } catch (err) {
      setError('Error saving rules: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create new empty rule
  const createNewRule = () => {
    const newRule = {
      id: `rule-${Date.now()}`,
      trigger_field: '',
      trigger_condition: 'equals',
      trigger_value: '',
      created_at: new Date().toISOString(),
      actions: [
        {
          action: 'show',
          target_fields: []
        }
      ]
    };
    
    setEditingRule(newRule);
  };

  // Add rule to list
  const addRule = (rule) => {
    setRules([...rules, rule]);
    setEditingRule(null);
  };

  // Update existing rule
  const updateRule = (ruleId, updatedRule) => {
    setRules(rules.map(r => r.id === ruleId ? updatedRule : r));
    setEditingRule(null);
  };

  // Delete rule
  const deleteRule = (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules(rules.filter(r => r.id !== ruleId));
    }
  };

  // Start editing rule
  const editRule = (rule) => {
    setEditingRule({ ...rule });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRule(null);
  };

  return (
    <div className="conditional-rule-builder p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Conditional Logic Rules
        </h3>
        <p className="text-sm text-gray-600">
          Create rules to show, hide, or modify fields based on user input. 
          Rules are evaluated in real-time as users fill out the form.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 mb-2">
                Rule Conflicts Detected
              </p>
              {conflicts.map((conflict, index) => (
                <div key={index} className="text-sm text-yellow-800 mb-2">
                  <p className="font-medium">{conflict.message}</p>
                  <p className="text-xs mt-1">
                    Affected field: <span className="font-mono">{conflict.field}</span>
                    {conflict.winner && (
                      <span> • Winner: <span className="font-mono">{conflict.winner}</span></span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {rules.length === 0 && !editingRule && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">No rules yet</p>
            <p className="text-sm text-blue-700">
              Click "Add Rule" to create your first conditional logic rule.
            </p>
          </div>
        </div>
      )}

      {/* Rule List */}
      {rules.length > 0 && !editingRule && (
        <div className="space-y-4 mb-6">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Rule: {rule.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editRule(rule)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Rule Summary */}
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700 min-w-[60px]">WHEN:</span>
                  <span className="text-gray-900">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{rule.trigger_field}</span>
                    {' '}{rule.trigger_condition}{' '}
                    {rule.trigger_value && (
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">"{rule.trigger_value}"</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700 min-w-[60px]">THEN:</span>
                  <div className="flex-1 space-y-1">
                    {rule.actions.map((action, idx) => (
                      <div key={idx} className="text-gray-900">
                        • {action.action}
                        {action.target_fields && action.target_fields.length > 0 && (
                          <span>: {action.target_fields.map(f => (
                            <span key={f} className="font-mono bg-gray-100 px-2 py-0.5 rounded ml-1">{f}</span>
                          ))}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Editor */}
      {editingRule && (
        <div className="mb-6 p-6 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            {rules.find(r => r.id === editingRule.id) ? 'Edit Rule' : 'New Rule'}
          </h4>
          
          {/* Rule Trigger */}
          <div className="mb-6">
            <RuleTrigger
              trigger={editingRule}
              availableFields={availableFields}
              onChange={(updatedTrigger) => {
                setEditingRule({ ...editingRule, ...updatedTrigger });
              }}
            />
          </div>

          {/* Rule Actions */}
          <div className="mb-6">
            <RuleActions
              actions={editingRule.actions || []}
              availableFields={availableFields}
              onChange={(updatedActions) => {
                setEditingRule({ ...editingRule, actions: updatedActions });
              }}
            />
          </div>

          {/* Validation Messages */}
          {!editingRule.trigger_field && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ Please select a trigger field
            </div>
          )}
          {editingRule.actions && editingRule.actions.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ Please add at least one action
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Validate before saving
                if (!editingRule.trigger_field) {
                  alert('Please select a trigger field');
                  return;
                }
                if (!editingRule.actions || editingRule.actions.length === 0) {
                  alert('Please add at least one action');
                  return;
                }
                
                // Save rule
                if (rules.find(r => r.id === editingRule.id)) {
                  updateRule(editingRule.id, editingRule);
                } else {
                  addRule(editingRule);
                }
              }}
              disabled={!editingRule.trigger_field || !editingRule.actions || editingRule.actions.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* Add Rule Button */}
      {!editingRule && (
        <button
          onClick={createNewRule}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      )}

      {/* Save Button */}
      {rules.length > 0 && !editingRule && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveRules}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save All Rules'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConditionalRuleBuilder;


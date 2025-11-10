import React, { useState, useEffect } from 'react'
import { Plus, X, ArrowRight, Save } from 'lucide-react'

const API_BASE_URL = '/api'

function ConditionalLogicBuilder({ applicationTypeId, fields }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (applicationTypeId) {
      fetchRules()
    }
  }, [applicationTypeId])

  const fetchRules = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conditional-rules/${applicationTypeId}`)
      const data = await response.json()
      if (data.success) {
        setRules(data.rules || [])
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching rules:', err)
      setLoading(false)
    }
  }

  const addNewRule = () => {
    const newRule = {
      id: Date.now(), // Temporary ID
      rule_name: `Rule ${rules.length + 1}`,
      condition_field: '',
      condition_operator: 'equals',
      condition_value: '',
      action_type: 'hide_fields',
      target_fields: [],
      is_active: true
    }
    setRules([...rules, newRule])
  }

  const updateRule = (index, updates) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], ...updates }
    setRules(newRules)
  }

  const deleteRule = (index) => {
    const newRules = rules.filter((_, i) => i !== index)
    setRules(newRules)
  }

  const saveRules = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/conditional-rules/${applicationTypeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })
      
      if (response.ok) {
        alert('Rules saved successfully!')
        await fetchRules() // Refresh to get server-assigned IDs
      } else {
        alert('Failed to save rules')
      }
    } catch (err) {
      console.error('Error saving rules:', err)
      alert('Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  // Get fields that can be used in conditions (radio, select, checkbox)
  const conditionFields = fields.filter(f => 
    ['radio', 'select', 'checkbox'].includes(f.type)
  )

  // Get all fields that can be targets
  const targetFields = fields.filter(f => f.name)

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading rules...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conditional Logic Rules</h3>
          <p className="text-sm text-gray-600">Create "if this, then that" rules for your form</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={addNewRule}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Rule
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>

      {/* Rules - Trello-style Cards */}
      {rules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No rules yet. Click "Add Rule" to get started.</p>
          <button
            onClick={addNewRule}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id || index}
              rule={rule}
              index={index}
              conditionFields={conditionFields}
              targetFields={targetFields}
              onUpdate={updateRule}
              onDelete={deleteRule}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RuleCard({ rule, index, conditionFields, targetFields, onUpdate, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Get options for the selected condition field
  const selectedField = conditionFields.find(f => f.name === rule.condition_field)
  const fieldOptions = selectedField?.options || []

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <input
            type="text"
            value={rule.rule_name}
            onChange={(e) => onUpdate(index, { rule_name: e.target.value })}
            className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            placeholder="Rule name..."
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rule.is_active}
              onChange={(e) => onUpdate(index, { is_active: e.target.checked })}
              className="rounded"
            />
            <span className={rule.is_active ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </label>
          <button
            onClick={() => onDelete(index)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Card Body - Trello-style columns */}
      {isExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center">
            {/* LEFT: Condition (When this happens...) */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 text-sm">WHEN THIS HAPPENS...</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field</label>
                  <select
                    value={rule.condition_field}
                    onChange={(e) => onUpdate(index, { condition_field: e.target.value, condition_value: '' })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select a field...</option>
                    {conditionFields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Is</label>
                  <select
                    value={rule.condition_operator}
                    onChange={(e) => onUpdate(index, { condition_operator: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  {fieldOptions.length > 0 ? (
                    <select
                      value={rule.condition_value}
                      onChange={(e) => onUpdate(index, { condition_value: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                    >
                      <option value="">Select value...</option>
                      {fieldOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rule.condition_value}
                      onChange={(e) => onUpdate(index, { condition_value: e.target.value })}
                      placeholder="Enter value..."
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* MIDDLE: Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight size={32} className="text-gray-400" />
            </div>

            {/* RIGHT: Action (Do this...) */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3 text-sm">...DO THIS</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={rule.action_type}
                    onChange={(e) => onUpdate(index, { action_type: e.target.value })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white"
                  >
                    <option value="show_fields">Show Fields</option>
                    <option value="hide_fields">Hide Fields</option>
                    <option value="require_fields">Require Fields</option>
                    <option value="skip_to_section">Skip to Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {rule.action_type === 'skip_to_section' ? 'Section' : 'Target Fields'}
                  </label>
                  <select
                    multiple={rule.action_type !== 'skip_to_section'}
                    value={rule.action_type === 'skip_to_section' ? rule.target_fields[0] || '' : rule.target_fields}
                    onChange={(e) => {
                      if (rule.action_type === 'skip_to_section') {
                        onUpdate(index, { target_fields: [e.target.value] })
                      } else {
                        const selected = Array.from(e.target.selectedOptions, opt => opt.value)
                        onUpdate(index, { target_fields: selected })
                      }
                    }}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white"
                    size={rule.action_type === 'skip_to_section' ? 1 : 4}
                  >
                    {rule.action_type === 'skip_to_section' ? (
                      <>
                        <option value="personal">Personal Information</option>
                        <option value="professional">Professional Background</option>
                        <option value="compliance">Compliance</option>
                        <option value="fees">Fee Waivers</option>
                        <option value="other">Application Details</option>
                      </>
                    ) : (
                      targetFields.map(field => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))
                    )}
                  </select>
                  {rule.action_type !== 'skip_to_section' && (
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rule Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Summary:</span>{' '}
              When <span className="text-blue-600 font-medium">{rule.condition_field || '(select field)'}</span>{' '}
              {rule.condition_operator === 'equals' ? 'equals' : rule.condition_operator === 'not_equals' ? 'does not equal' : 'contains'}{' '}
              <span className="text-blue-600 font-medium">"{rule.condition_value || '(value)'}"</span>, then{' '}
              <span className="text-green-600 font-medium">
                {rule.action_type === 'show_fields' ? 'show' : 
                 rule.action_type === 'hide_fields' ? 'hide' :
                 rule.action_type === 'require_fields' ? 'require' : 'skip to'}
              </span>{' '}
              {rule.target_fields.length > 0 ? (
                <span className="text-green-600 font-medium">
                  {rule.action_type === 'skip_to_section' 
                    ? `${rule.target_fields[0]} section`
                    : `${rule.target_fields.length} field(s)`}
                </span>
              ) : (
                <span className="text-gray-400">(select targets)</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConditionalLogicBuilder


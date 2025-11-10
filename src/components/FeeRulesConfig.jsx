import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, AlertCircle, CheckCircle, Percent, Calculator } from 'lucide-react';

export default function FeeRulesConfig({ licenseType, fields, onSave }) {
  const [feeConfig, setFeeConfig] = useState({
    baseFee: {
      type: 'fixed', // 'fixed' or 'percentage' or 'tiered'
      amount: 0,
      percentageField: null, // which field to calculate percentage from
      percentageRate: 0,
      tiers: [] // for tiered pricing
    },
    conditionalFees: [],
    waivers: [],
    penalties: []
  });

  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    // Load existing fee config if available
    if (licenseType?.fee_rules) {
      try {
        const parsed = typeof licenseType.fee_rules === 'string' 
          ? JSON.parse(licenseType.fee_rules) 
          : licenseType.fee_rules;
        setFeeConfig(parsed);
      } catch (e) {
        console.error('Error parsing fee rules:', e);
      }
    }
  }, [licenseType]);

  const addConditionalFee = () => {
    setFeeConfig({
      ...feeConfig,
      conditionalFees: [
        ...feeConfig.conditionalFees,
        {
          id: Date.now(),
          name: 'New Conditional Fee',
          condition: {
            field: '',
            operator: 'equals',
            value: ''
          },
          amount: 0,
          type: 'fixed'
        }
      ]
    });
  };

  const addWaiver = () => {
    setFeeConfig({
      ...feeConfig,
      waivers: [
        ...feeConfig.waivers,
        {
          id: Date.now(),
          name: 'New Waiver',
          condition: {
            field: '',
            operator: 'equals',
            value: ''
          },
          discountType: 'percentage', // 'percentage' or 'fixed' or 'full'
          discountAmount: 100
        }
      ]
    });
  };

  const addPenalty = () => {
    setFeeConfig({
      ...feeConfig,
      penalties: [
        ...feeConfig.penalties,
        {
          id: Date.now(),
          name: 'New Penalty',
          condition: {
            field: '',
            operator: 'after',
            value: ''
          },
          penaltyType: 'percentage',
          penaltyAmount: 15
        }
      ]
    });
  };

  const removeItem = (type, id) => {
    setFeeConfig({
      ...feeConfig,
      [type]: feeConfig[type].filter(item => item.id !== id)
    });
  };

  const updateItem = (type, id, updates) => {
    setFeeConfig({
      ...feeConfig,
      [type]: feeConfig[type].map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const calculatePreview = () => {
    // Simulate fee calculation with sample data
    let total = 0;
    const breakdown = [];

    // Base fee
    if (feeConfig.baseFee.type === 'fixed') {
      total += feeConfig.baseFee.amount;
      breakdown.push({
        label: 'Base Fee',
        amount: feeConfig.baseFee.amount,
        type: 'fee'
      });
    }

    // Conditional fees (example: all conditions met)
    feeConfig.conditionalFees.forEach(fee => {
      total += fee.amount;
      breakdown.push({
        label: fee.name,
        amount: fee.amount,
        type: 'conditional'
      });
    });

    // Penalties (example: one penalty applied)
    if (feeConfig.penalties.length > 0) {
      const penalty = feeConfig.penalties[0];
      const penaltyAmount = penalty.penaltyType === 'percentage'
        ? (total * penalty.penaltyAmount / 100)
        : penalty.penaltyAmount;
      total += penaltyAmount;
      breakdown.push({
        label: penalty.name,
        amount: penaltyAmount,
        type: 'penalty'
      });
    }

    // Waivers (example: first waiver applied)
    if (feeConfig.waivers.length > 0) {
      const waiver = feeConfig.waivers[0];
      let discount = 0;
      if (waiver.discountType === 'full') {
        discount = total;
      } else if (waiver.discountType === 'percentage') {
        discount = total * waiver.discountAmount / 100;
      } else {
        discount = waiver.discountAmount;
      }
      total -= discount;
      breakdown.push({
        label: waiver.name,
        amount: -discount,
        type: 'waiver'
      });
    }

    setPreviewData({
      total: Math.max(0, total),
      breakdown
    });
  };

  const handleSave = () => {
    onSave(feeConfig);
  };

  const getFieldOptions = () => {
    return fields.filter(f => f.type !== 'hidden').map(f => ({
      value: f.name,
      label: f.label
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Fee Rules Configuration</h3>
          <p className="text-sm text-gray-600">Configure fees, penalties, and waivers for {licenseType?.name}</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <DollarSign className="w-4 h-4" />
          <span>Save Fee Rules</span>
        </button>
      </div>

      {/* Base Fee Configuration */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Base Fee
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
            <select
              value={feeConfig.baseFee.type}
              onChange={(e) => setFeeConfig({
                ...feeConfig,
                baseFee: { ...feeConfig.baseFee, type: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage of Field Value</option>
              <option value="tiered">Tiered Pricing</option>
            </select>
          </div>

          {feeConfig.baseFee.type === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                value={feeConfig.baseFee.amount}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  baseFee: { ...feeConfig.baseFee, amount: parseFloat(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="150.00"
              />
            </div>
          )}

          {feeConfig.baseFee.type === 'percentage' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field to Calculate From</label>
                <select
                  value={feeConfig.baseFee.percentageField || ''}
                  onChange={(e) => setFeeConfig({
                    ...feeConfig,
                    baseFee: { ...feeConfig.baseFee, percentageField: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Field</option>
                  {getFieldOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Percentage (%)</label>
                <input
                  type="number"
                  value={feeConfig.baseFee.percentageRate}
                  onChange={(e) => setFeeConfig({
                    ...feeConfig,
                    baseFee: { ...feeConfig.baseFee, percentageRate: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2.5"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conditional Fees */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-bold text-gray-900 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-blue-600" />
            Conditional Fees
          </h4>
          <button
            onClick={addConditionalFee}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee</span>
          </button>
        </div>

        {feeConfig.conditionalFees.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No conditional fees configured</p>
        ) : (
          <div className="space-y-3">
            {feeConfig.conditionalFees.map(fee => (
              <div key={fee.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="text"
                    value={fee.name}
                    onChange={(e) => updateItem('conditionalFees', fee.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border border-blue-300 rounded bg-white text-sm font-medium"
                    placeholder="Fee name"
                  />
                  <button
                    onClick={() => removeItem('conditionalFees', fee.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={fee.condition.field}
                    onChange={(e) => updateItem('conditionalFees', fee.id, {
                      condition: { ...fee.condition, field: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Field</option>
                    {getFieldOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={fee.condition.operator}
                    onChange={(e) => updateItem('conditionalFees', fee.id, {
                      condition: { ...fee.condition, operator: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                  </select>
                  
                  <input
                    type="text"
                    value={fee.condition.value}
                    onChange={(e) => updateItem('conditionalFees', fee.id, {
                      condition: { ...fee.condition, value: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Value"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={fee.amount}
                    onChange={(e) => updateItem('conditionalFees', fee.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Amount"
                  />
                  <select
                    value={fee.type}
                    onChange={(e) => updateItem('conditionalFees', fee.id, { type: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="fixed">Fixed ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waivers */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-bold text-gray-900 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Fee Waivers
          </h4>
          <button
            onClick={addWaiver}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Waiver</span>
          </button>
        </div>

        {feeConfig.waivers.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No waivers configured</p>
        ) : (
          <div className="space-y-3">
            {feeConfig.waivers.map(waiver => (
              <div key={waiver.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="text"
                    value={waiver.name}
                    onChange={(e) => updateItem('waivers', waiver.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border border-green-300 rounded bg-white text-sm font-medium"
                    placeholder="Waiver name (e.g., Military Spouse)"
                  />
                  <button
                    onClick={() => removeItem('waivers', waiver.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={waiver.condition.field}
                    onChange={(e) => updateItem('waivers', waiver.id, {
                      condition: { ...waiver.condition, field: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Field</option>
                    {getFieldOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={waiver.condition.operator}
                    onChange={(e) => updateItem('waivers', waiver.id, {
                      condition: { ...waiver.condition, operator: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="checked">Is Checked</option>
                  </select>
                  
                  <input
                    type="text"
                    value={waiver.condition.value}
                    onChange={(e) => updateItem('waivers', waiver.id, {
                      condition: { ...waiver.condition, value: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Value"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={waiver.discountType}
                    onChange={(e) => updateItem('waivers', waiver.id, { discountType: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="full">Full Waiver (100%)</option>
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount Discount</option>
                  </select>
                  
                  {waiver.discountType !== 'full' && (
                    <input
                      type="number"
                      value={waiver.discountAmount}
                      onChange={(e) => updateItem('waivers', waiver.id, { discountAmount: parseFloat(e.target.value) || 0 })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder={waiver.discountType === 'percentage' ? 'Percentage' : 'Amount'}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Penalties */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-bold text-gray-900 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            Penalties
          </h4>
          <button
            onClick={addPenalty}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Penalty</span>
          </button>
        </div>

        {feeConfig.penalties.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No penalties configured</p>
        ) : (
          <div className="space-y-3">
            {feeConfig.penalties.map(penalty => (
              <div key={penalty.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="text"
                    value={penalty.name}
                    onChange={(e) => updateItem('penalties', penalty.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border border-orange-300 rounded bg-white text-sm font-medium"
                    placeholder="Penalty name (e.g., Late Submission)"
                  />
                  <button
                    onClick={() => removeItem('penalties', penalty.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={penalty.condition.field}
                    onChange={(e) => updateItem('penalties', penalty.id, {
                      condition: { ...penalty.condition, field: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Field</option>
                    <option value="submission_date">Submission Date</option>
                    {getFieldOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={penalty.condition.operator}
                    onChange={(e) => updateItem('penalties', penalty.id, {
                      condition: { ...penalty.condition, operator: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="after">After Date</option>
                    <option value="before">Before Date</option>
                    <option value="equals">Equals</option>
                    <option value="greater_than">Greater Than</option>
                  </select>
                  
                  <input
                    type="text"
                    value={penalty.condition.value}
                    onChange={(e) => updateItem('penalties', penalty.id, {
                      condition: { ...penalty.condition, value: e.target.value }
                    })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Value/Date"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={penalty.penaltyType}
                    onChange={(e) => updateItem('penalties', penalty.id, { penaltyType: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                  
                  <input
                    type="number"
                    value={penalty.penaltyAmount}
                    onChange={(e) => updateItem('penalties', penalty.id, { penaltyAmount: parseFloat(e.target.value) || 0 })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder={penalty.penaltyType === 'percentage' ? 'Percentage' : 'Amount'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-bold text-gray-900 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-purple-600" />
            Fee Calculation Preview
          </h4>
          <button
            onClick={calculatePreview}
            className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Calculate Sample
          </button>
        </div>

        {previewData ? (
          <div className="space-y-2">
            {previewData.breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-purple-200">
                <span className={`text-sm ${
                  item.type === 'waiver' ? 'text-green-700 font-medium' :
                  item.type === 'penalty' ? 'text-orange-700 font-medium' :
                  'text-gray-700'
                }`}>
                  {item.label}
                </span>
                <span className={`text-sm font-bold ${
                  item.amount < 0 ? 'text-green-700' : 'text-gray-900'
                }`}>
                  ${Math.abs(item.amount).toFixed(2)}
                  {item.amount < 0 && ' (discount)'}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center py-3 border-t-2 border-purple-400">
              <span className="text-lg font-bold text-gray-900">Total Fee</span>
              <span className="text-2xl font-bold text-purple-700">
                ${previewData.total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 italic">Click "Calculate Sample" to preview fee calculation</p>
        )}
      </div>
    </div>
  );
}


/**
 * ConditionalLogicEngine
 * 
 * Evaluates conditional rules and determines which actions to apply to form fields.
 * Used in the licensee portal to make fields show/hide, become required, calculate fees, etc.
 * 
 * Usage:
 *   const engine = new ConditionalLogicEngine(rules, formData);
 *   const fieldStates = engine.evaluateAll();
 *   // fieldStates = { fieldName: { visible: true, enabled: true, required: false, ... } }
 */

class ConditionalLogicEngine {
  constructor(rules, formData) {
    this.rules = rules || [];
    this.formData = formData || {};
  }

  /**
   * Evaluate all rules and return field states
   * @returns {Object} Field states keyed by field name
   */
  evaluateAll() {
    const actions = [];

    // Evaluate each rule
    this.rules.forEach((rule, index) => {
      if (this.evaluateRule(rule)) {
        // Rule trigger met, collect actions with rule index for conflict resolution
        rule.actions.forEach(action => {
          actions.push({
            ...action,
            ruleIndex: index,
            ruleId: rule.id
          });
        });
      }
    });

    // Resolve conflicts and build field states
    return this.resolveConflicts(actions);
  }

  /**
   * Evaluate a single rule
   * @param {Object} rule - Rule object with trigger and actions
   * @returns {boolean} True if trigger condition is met
   */
  evaluateRule(rule) {
    if (!rule || !rule.trigger) {
      return false;
    }

    return this.evaluateCondition(rule.trigger);
  }

  /**
   * Evaluate a trigger condition
   * @param {Object} trigger - Trigger object with field, condition, value
   * @returns {boolean} True if condition is met
   */
  evaluateCondition(trigger) {
    const { field, condition, value } = trigger;
    const fieldValue = this.formData[field];

    switch (condition) {
      case 'equals':
        return fieldValue === value;

      case 'not_equals':
        return fieldValue !== value;

      case 'contains':
        return fieldValue && String(fieldValue).includes(value);

      case 'not_contains':
        return !fieldValue || !String(fieldValue).includes(value);

      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(value);

      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(value);

      case 'greater_than_or_equal':
        return parseFloat(fieldValue) >= parseFloat(value);

      case 'less_than_or_equal':
        return parseFloat(fieldValue) <= parseFloat(value);

      case 'is_empty':
        return !fieldValue || fieldValue === '';

      case 'is_not_empty':
        return fieldValue && fieldValue !== '';

      case 'before':
        return new Date(fieldValue) < new Date(value);

      case 'after':
        return new Date(fieldValue) > new Date(value);

      case 'starts_with':
        return fieldValue && String(fieldValue).startsWith(value);

      case 'ends_with':
        return fieldValue && String(fieldValue).endsWith(value);

      default:
        console.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }

  /**
   * Resolve conflicts when multiple rules affect the same field
   * Most recent rule (highest index) wins
   * @param {Array} actions - Array of actions from triggered rules
   * @returns {Object} Field states keyed by field name
   */
  resolveConflicts(actions) {
    const fieldStates = {};

    // Group actions by target field
    const actionsByField = {};
    actions.forEach(action => {
      const targetField = action.target_field || action.field;
      if (!targetField) return;

      if (!actionsByField[targetField]) {
        actionsByField[targetField] = [];
      }
      actionsByField[targetField].push(action);
    });

    // For each field, apply actions from most recent rule
    Object.entries(actionsByField).forEach(([fieldName, fieldActions]) => {
      // Sort by rule index (most recent last)
      fieldActions.sort((a, b) => a.ruleIndex - b.ruleIndex);

      // Initialize field state
      if (!fieldStates[fieldName]) {
        fieldStates[fieldName] = {
          visible: true,
          enabled: true,
          required: false,
          value: undefined,
          fee: undefined,
          message: undefined
        };
      }

      // Apply each action
      fieldActions.forEach(action => {
        switch (action.type) {
          case 'show':
            fieldStates[fieldName].visible = true;
            break;

          case 'hide':
            fieldStates[fieldName].visible = false;
            break;

          case 'enable':
            fieldStates[fieldName].enabled = true;
            break;

          case 'disable':
            fieldStates[fieldName].enabled = false;
            break;

          case 'set_required':
            fieldStates[fieldName].required = true;
            break;

          case 'set_optional':
            fieldStates[fieldName].required = false;
            break;

          case 'set_value':
            fieldStates[fieldName].value = action.value;
            break;

          case 'calculate_fee':
            // Store fee modifier information for proper calculation
            if (action.fee_modifier) {
              if (!fieldStates[fieldName].feeModifiers) {
                fieldStates[fieldName].feeModifiers = [];
              }
              fieldStates[fieldName].feeModifiers.push(action.fee_modifier);
            } else {
              // Legacy: simple value
              if (!fieldStates[fieldName].fee) fieldStates[fieldName].fee = 0;
              fieldStates[fieldName].fee += parseFloat(action.value || 0);
            }
            break;

          case 'show_message':
            fieldStates[fieldName].message = action.value;
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      });
    });

    return fieldStates;
  }

  /**
   * Get total calculated fee from all fee actions
   * @param {number} baseFee - Base fee amount to apply percentage modifiers to
   * @returns {number} Total fee amount
   */
  getTotalFee(baseFee = 0) {
    const fieldStates = this.evaluateAll();
    let dollarModifications = 0;
    let percentageModifications = 0;
    let setAmount = null;

    Object.values(fieldStates).forEach(state => {
      // Handle fee modifiers (new format with percentage support)
      if (state.feeModifiers && state.feeModifiers.length > 0) {
        state.feeModifiers.forEach(modifier => {
          const { type, amount, unit } = modifier;
          
          if (type === 'set_amount') {
            // Set amount overrides everything
            setAmount = amount;
          } else if (unit === 'percent') {
            // Percentage-based modification
            if (type === 'discount') {
              percentageModifications -= amount;
            } else if (type === 'surcharge') {
              percentageModifications += amount;
            }
          } else {
            // Dollar-based modification
            if (type === 'discount') {
              dollarModifications -= amount;
            } else if (type === 'surcharge') {
              dollarModifications += amount;
            }
          }
        });
      }
      
      // Handle legacy fee values (simple numbers)
      if (state.fee !== undefined) {
        dollarModifications += state.fee;
      }
    });

    // If set_amount action exists, return that (ignores everything else)
    if (setAmount !== null) {
      return setAmount;
    }

    // Calculate total: base + percentage modifications + dollar modifications
    const percentageAmount = baseFee * (percentageModifications / 100);
    return baseFee + percentageAmount + dollarModifications;
  }

  /**
   * Get all messages to display
   * @returns {Array} Array of message strings
   */
  getMessages() {
    const fieldStates = this.evaluateAll();
    const messages = [];

    Object.values(fieldStates).forEach(state => {
      if (state.message) {
        messages.push(state.message);
      }
    });

    return messages;
  }

  /**
   * Check if a specific field should be visible
   * @param {string} fieldName - Name of the field
   * @returns {boolean} True if field should be visible
   */
  isFieldVisible(fieldName) {
    const fieldStates = this.evaluateAll();
    return fieldStates[fieldName]?.visible !== false;
  }

  /**
   * Check if a specific field should be enabled
   * @param {string} fieldName - Name of the field
   * @returns {boolean} True if field should be enabled
   */
  isFieldEnabled(fieldName) {
    const fieldStates = this.evaluateAll();
    return fieldStates[fieldName]?.enabled !== false;
  }

  /**
   * Check if a specific field is required
   * @param {string} fieldName - Name of the field
   * @returns {boolean} True if field is required
   */
  isFieldRequired(fieldName) {
    const fieldStates = this.evaluateAll();
    return fieldStates[fieldName]?.required === true;
  }

  /**
   * Get the value that should be set for a field (if any)
   * @param {string} fieldName - Name of the field
   * @returns {any} Value to set, or undefined
   */
  getFieldValue(fieldName) {
    const fieldStates = this.evaluateAll();
    return fieldStates[fieldName]?.value;
  }
}

export default ConditionalLogicEngine;

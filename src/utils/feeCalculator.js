/**
 * Fee Calculator Engine
 * Evaluates fee rules and calculates total fees based on form data
 */

export class FeeCalculator {
  constructor(feeRules) {
    this.feeRules = feeRules;
  }

  /**
   * Calculate total fee based on form data
   * @param {Object} formData - The form field values
   * @returns {Object} - { total, breakdown, waivers, penalties }
   */
  calculate(formData) {
    const breakdown = [];
    let total = 0;

    // 1. Calculate Base Fee
    const baseFee = this.calculateBaseFee(formData);
    if (baseFee > 0) {
      breakdown.push({
        type: 'base',
        label: 'Base Fee',
        amount: baseFee,
        description: 'Standard application fee'
      });
      total += baseFee;
    }

    // 2. Calculate Conditional Fees
    const conditionalFees = this.calculateConditionalFees(formData);
    conditionalFees.forEach(fee => {
      breakdown.push({
        type: 'conditional',
        label: fee.name,
        amount: fee.amount,
        description: `Conditional fee: ${fee.condition.field} ${fee.condition.operator} ${fee.condition.value}`
      });
      total += fee.amount;
    });

    // 3. Calculate Penalties
    const penalties = this.calculatePenalties(formData, total);
    penalties.forEach(penalty => {
      breakdown.push({
        type: 'penalty',
        label: penalty.name,
        amount: penalty.amount,
        description: `Penalty: ${penalty.condition.field} ${penalty.condition.operator} ${penalty.condition.value}`
      });
      total += penalty.amount;
    });

    // 4. Apply Waivers (must be last to get full discount)
    const waivers = this.calculateWaivers(formData, total);
    waivers.forEach(waiver => {
      breakdown.push({
        type: 'waiver',
        label: waiver.name,
        amount: -waiver.amount,
        description: `Waiver: ${waiver.condition.field} ${waiver.condition.operator} ${waiver.condition.value}`
      });
      total -= waiver.amount;
    });

    // Ensure total is not negative
    total = Math.max(0, total);

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      breakdown,
      subtotal: baseFee + conditionalFees.reduce((sum, f) => sum + f.amount, 0),
      totalPenalties: penalties.reduce((sum, p) => sum + p.amount, 0),
      totalWaivers: waivers.reduce((sum, w) => sum + w.amount, 0)
    };
  }

  /**
   * Calculate base fee
   */
  calculateBaseFee(formData) {
    if (!this.feeRules?.baseFee) return 0;

    const { type, amount, percentageField, percentageRate } = this.feeRules.baseFee;

    if (type === 'fixed') {
      return amount || 0;
    }

    if (type === 'percentage' && percentageField) {
      const fieldValue = parseFloat(formData[percentageField]) || 0;
      return fieldValue * (percentageRate / 100);
    }

    if (type === 'tiered') {
      // TODO: Implement tiered pricing based on tiers array
      return amount || 0;
    }

    return 0;
  }

  /**
   * Calculate conditional fees
   */
  calculateConditionalFees(formData) {
    if (!this.feeRules?.conditionalFees) return [];

    return this.feeRules.conditionalFees
      .filter(fee => this.evaluateCondition(fee.condition, formData))
      .map(fee => ({
        name: fee.name,
        amount: fee.type === 'percentage' 
          ? (this.calculateBaseFee(formData) * fee.amount / 100)
          : fee.amount
      }));
  }

  /**
   * Calculate penalties
   */
  calculatePenalties(formData, currentTotal) {
    if (!this.feeRules?.penalties) return [];

    return this.feeRules.penalties
      .filter(penalty => this.evaluateCondition(penalty.condition, formData))
      .map(penalty => ({
        name: penalty.name,
        amount: penalty.penaltyType === 'percentage'
          ? (currentTotal * penalty.penaltyAmount / 100)
          : penalty.penaltyAmount
      }));
  }

  /**
   * Calculate waivers
   */
  calculateWaivers(formData, currentTotal) {
    if (!this.feeRules?.waivers) return [];

    return this.feeRules.waivers
      .filter(waiver => this.evaluateCondition(waiver.condition, formData))
      .map(waiver => {
        let amount = 0;
        if (waiver.discountType === 'full') {
          amount = currentTotal;
        } else if (waiver.discountType === 'percentage') {
          amount = currentTotal * (waiver.discountAmount / 100);
        } else {
          amount = waiver.discountAmount;
        }
        return {
          name: waiver.name,
          amount: Math.min(amount, currentTotal) // Can't discount more than total
        };
      });
  }

  /**
   * Evaluate a condition against form data
   */
  evaluateCondition(condition, formData) {
    if (!condition || !condition.field) return false;

    const fieldValue = formData[condition.field];
    const conditionValue = condition.value;
    const operator = condition.operator;

    switch (operator) {
      case 'equals':
        return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
      
      case 'not_equals':
        return String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(conditionValue);
      
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(conditionValue);
      
      case 'after':
        // Date comparison
        return new Date(fieldValue) > new Date(conditionValue);
      
      case 'before':
        // Date comparison
        return new Date(fieldValue) < new Date(conditionValue);
      
      case 'checked':
        // For checkboxes
        return fieldValue === true || fieldValue === 'true' || fieldValue === 'yes';
      
      default:
        return false;
    }
  }

  /**
   * Get a human-readable description of the fee rules
   */
  getDescription() {
    const parts = [];

    if (this.feeRules?.baseFee) {
      const { type, amount, percentageRate } = this.feeRules.baseFee;
      if (type === 'fixed') {
        parts.push(`Base fee: $${amount}`);
      } else if (type === 'percentage') {
        parts.push(`Base fee: ${percentageRate}% of field value`);
      }
    }

    if (this.feeRules?.conditionalFees?.length > 0) {
      parts.push(`${this.feeRules.conditionalFees.length} conditional fee(s)`);
    }

    if (this.feeRules?.penalties?.length > 0) {
      parts.push(`${this.feeRules.penalties.length} penalty rule(s)`);
    }

    if (this.feeRules?.waivers?.length > 0) {
      parts.push(`${this.feeRules.waivers.length} waiver(s) available`);
    }

    return parts.join(', ') || 'No fee rules configured';
  }
}

/**
 * Helper function to create a fee calculator from license type
 */
export function createFeeCalculator(licenseType) {
  const feeRules = licenseType?.fee_rules || licenseType?.feeRules;
  return new FeeCalculator(feeRules);
}

/**
 * Helper function to format currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}


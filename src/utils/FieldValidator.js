/**
 * FieldValidator
 * 
 * Provides field validation with common patterns and custom rules.
 * Used in the licensee portal to validate form inputs in real-time.
 * 
 * Usage:
 *   const result = FieldValidator.validate(value, rules);
 *   if (!result.valid) {
 *     console.log(result.errors); // Array of error messages
 *   }
 */

class FieldValidator {
  /**
   * Validate a value against a set of rules
   * @param {any} value - Value to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validate(value, rules) {
    if (!rules) {
      return { valid: true, errors: [] };
    }

    const errors = [];

    // Required validation
    if (rules.required && this.isEmpty(value)) {
      errors.push(rules.custom_message || 'This field is required');
      return { valid: false, errors }; // Stop here if required and empty
    }

    // Skip other validations if value is empty and not required
    if (this.isEmpty(value)) {
      return { valid: true, errors: [] };
    }

    // Format validation
    if (rules.format) {
      const formatResult = this.validateFormat(value, rules.format);
      if (!formatResult.valid) {
        errors.push(rules.custom_message || formatResult.error);
      }
    }

    // Min length validation
    if (rules.min_length !== undefined) {
      const strValue = String(value);
      if (strValue.length < rules.min_length) {
        errors.push(rules.custom_message || `Must be at least ${rules.min_length} characters`);
      }
    }

    // Max length validation
    if (rules.max_length !== undefined) {
      const strValue = String(value);
      if (strValue.length > rules.max_length) {
        errors.push(rules.custom_message || `Must be no more than ${rules.max_length} characters`);
      }
    }

    // Min value validation
    if (rules.min_value !== undefined) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < rules.min_value) {
        errors.push(rules.custom_message || `Must be at least ${rules.min_value}`);
      }
    }

    // Max value validation
    if (rules.max_value !== undefined) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue > rules.max_value) {
        errors.push(rules.custom_message || `Must be no more than ${rules.max_value}`);
      }
    }

    // Custom regex validation
    if (rules.regex) {
      try {
        const regex = new RegExp(rules.regex);
        if (!regex.test(value)) {
          errors.push(rules.custom_message || 'Invalid format');
        }
      } catch (e) {
        console.error('Invalid regex pattern:', rules.regex, e);
        errors.push('Invalid validation pattern');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a value is empty
   * @param {any} value - Value to check
   * @returns {boolean} True if empty
   */
  static isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  }

  /**
   * Validate value against a format pattern
   * @param {string} value - Value to validate
   * @param {string} format - Format name (email, phone, ssn, etc.)
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateFormat(value, format) {
    switch (format) {
      case 'email':
        return this.validateEmail(value);
      case 'phone':
        return this.validatePhone(value);
      case 'ssn':
        return this.validateSSN(value);
      case 'zip_code':
        return this.validateZipCode(value);
      case 'date':
        return this.validateDate(value);
      case 'url':
        return this.validateURL(value);
      case 'license_number':
        return this.validateLicenseNumber(value);
      case 'npi':
        return this.validateNPI(value);
      default:
        console.warn(`Unknown format: ${format}`);
        return { valid: true, error: '' };
    }
  }

  /**
   * Validate email address (RFC 5322 compliant)
   * @param {string} value - Email to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateEmail(value) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate US phone number
   * Accepts: (555) 555-5555, 555-555-5555, 5555555555
   * @param {string} value - Phone to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validatePhone(value) {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Must be exactly 10 digits
    if (digits.length !== 10) {
      return { valid: false, error: 'Phone number must be 10 digits' };
    }
    
    // Check common formats
    const formats = [
      /^\(\d{3}\) \d{3}-\d{4}$/,  // (555) 555-5555
      /^\d{3}-\d{3}-\d{4}$/,       // 555-555-5555
      /^\d{10}$/                    // 5555555555
    ];
    
    const isValid = formats.some(regex => regex.test(value)) || digits.length === 10;
    
    if (!isValid) {
      return { valid: false, error: 'Phone must be in format (555) 555-5555' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate Social Security Number
   * Format: ###-##-####
   * @param {string} value - SSN to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateSSN(value) {
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    
    if (!ssnRegex.test(value)) {
      return { valid: false, error: 'SSN must be in format ###-##-####' };
    }
    
    // Check for invalid SSN patterns
    const digits = value.replace(/-/g, '');
    if (digits === '000000000' || digits === '123456789') {
      return { valid: false, error: 'Invalid SSN' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate ZIP code
   * Accepts: ##### or #####-####
   * @param {string} value - ZIP code to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateZipCode(value) {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    
    if (!zipRegex.test(value)) {
      return { valid: false, error: 'ZIP code must be ##### or #####-####' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate date in MM/DD/YYYY format
   * @param {string} value - Date to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateDate(value) {
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    
    if (!dateRegex.test(value)) {
      return { valid: false, error: 'Date must be in format MM/DD/YYYY' };
    }
    
    // Check if date is valid
    const [month, day, year] = value.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { valid: false, error: 'Invalid date' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate URL
   * @param {string} value - URL to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateURL(value) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'URL must start with http:// or https://' };
      }
      return { valid: true, error: '' };
    } catch (e) {
      return { valid: false, error: 'Please enter a valid URL' };
    }
  }

  /**
   * Validate license number (alphanumeric with optional dashes)
   * @param {string} value - License number to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateLicenseNumber(value) {
    const licenseRegex = /^[A-Z0-9-]{5,20}$/i;
    
    if (!licenseRegex.test(value)) {
      return { valid: false, error: 'License number must be 5-20 alphanumeric characters' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate NPI (National Provider Identifier) number
   * Must be exactly 10 digits
   * @param {string} value - NPI to validate
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateNPI(value) {
    const npiRegex = /^\d{10}$/;
    
    if (!npiRegex.test(value)) {
      return { valid: false, error: 'NPI must be exactly 10 digits' };
    }
    
    return { valid: true, error: '' };
  }

  /**
   * Validate against custom regex pattern
   * @param {string} value - Value to validate
   * @param {string} pattern - Regex pattern
   * @returns {Object} { valid: boolean, error: string }
   */
  static validateRegex(value, pattern) {
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        return { valid: false, error: 'Invalid format' };
      }
      return { valid: true, error: '' };
    } catch (e) {
      console.error('Invalid regex pattern:', pattern, e);
      return { valid: false, error: 'Invalid validation pattern' };
    }
  }
}

export default FieldValidator;

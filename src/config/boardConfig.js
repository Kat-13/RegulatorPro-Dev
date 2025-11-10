// 🔧 BOARD CONFIGURATION SYSTEM
// Eliminates toxic hard-coding and enables board-specific customization

export const boardConfigs = {
  default: {
    version: "1.0.0",
    effective_from: "2025-01-01",
    board_info: {
      name: "Default Regulatory Board",
      jurisdiction: "DEFAULT",
      contact: "admin@regulatepro.com"
    },
    
    // Dynamic field definitions (no more hard-coded options)
    fields: [
      {
        id: "licenseType",
        label: "License Type", 
        type: "select",
        options: [
          { value: "professional", label: "Professional License" },
          { value: "business", label: "Business License" },
          { value: "endorsement", label: "Endorsement License" },
          { value: "temporary", label: "Temporary License" }
        ],
        required: true,
        description: "Type of license being applied for"
      },
      {
        id: "days_late",
        label: "Days Late",
        type: "number",
        min: 0,
        max: 365,
        required: true,
        description: "Number of days past the deadline"
      },
      {
        id: "military_spouse",
        label: "Military Spouse",
        type: "boolean",
        required: false,
        description: "Applicant is a military spouse (eligible for fee waivers)"
      },
      {
        id: "criminalHistory",
        label: "Criminal History",
        type: "boolean", 
        required: false,
        description: "Applicant has disclosed criminal history"
      },
      {
        id: "years_experience",
        label: "Years of Experience",
        type: "number",
        min: 0,
        max: 50,
        required: false,
        description: "Years of professional experience"
      }
    ],
    
    // Dynamic fee type definitions (no more hard-coded fee names)
    fee_types: {
      base_fee: {
        label: "Base License Fee",
        category: "licensing",
        default_amount: 500,
        description: "Standard licensing fee"
      },
      processing_fee: {
        label: "Processing Fee",
        category: "administrative", 
        default_amount: 50,
        description: "Administrative processing fee"
      },
      late_fee: {
        label: "Late Submission Fee",
        category: "penalty",
        default_amount: 100,
        description: "Fee for late submission"
      },
      penalty: {
        label: "Penalty Fee",
        category: "penalty",
        default_amount: 0,
        description: "Calculated penalty amount"
      },
      background_check: {
        label: "Background Check Fee",
        category: "administrative",
        default_amount: 75,
        description: "Criminal background check fee"
      }
    },
    
    // Dynamic action types (no more hard-coded action types)
    action_types: [
      { value: "set_fee", label: "Set Fee", description: "Set fee to specific amount" },
      { value: "add_fee", label: "Add Fee", description: "Add additional fee" },
      { value: "waive_fee", label: "Waive Fee", description: "Waive existing fee" },
      { value: "multiply_fee", label: "Multiply Fee", description: "Multiply fee by factor" }
    ],
    
    // Dynamic penalty types (no more hard-coded penalty types)
    penalty_types: [
      { value: "percentage", label: "Percentage", description: "Percentage of base fee" },
      { value: "flat", label: "Flat Amount", description: "Fixed dollar amount" }
    ],
    
    // Dynamic operators (no more hard-coded operators)
    operators: [
      { value: "=", label: "equals", description: "Exactly equal to" },
      { value: "!=", label: "not equals", description: "Not equal to" },
      { value: ">", label: "greater than", description: "Greater than" },
      { value: "<", label: "less than", description: "Less than" },
      { value: ">=", label: "greater than or equal", description: "Greater than or equal to" },
      { value: "<=", label: "less than or equal", description: "Less than or equal to" },
      { value: "contains", label: "contains", description: "Contains text" },
      { value: "in", label: "in list", description: "Value is in list" }
    ],
    
    // Configurable defaults (no more hard-coded defaults)
    defaults: {
      action_type: "set_fee",
      penalty_type: "percentage",
      fee_name: "base_fee",
      board_id: "default",
      operator: "=",
      amount: 0,
      penalty_rate: 0
    },
    
    // Test scenarios for validation (no more hard-coded test data)
    test_scenarios: {
      default: {
        name: "Standard Professional License",
        data: {
          licenseType: "professional",
          days_late: 0,
          military_spouse: false,
          criminalHistory: false,
          years_experience: 5
        },
        expected: {
          total_fee: 500,
          breakdown: { base_fee: 500 }
        }
      },
      late_submission: {
        name: "Late Professional License",
        data: {
          licenseType: "professional",
          days_late: 30,
          military_spouse: false,
          criminalHistory: false,
          years_experience: 5
        },
        expected: {
          total_fee: 625,
          breakdown: { base_fee: 500, penalty: 125 }
        }
      },
      military_spouse: {
        name: "Military Spouse Waiver",
        data: {
          licenseType: "professional",
          days_late: 0,
          military_spouse: true,
          criminalHistory: false,
          years_experience: 3
        },
        expected: {
          total_fee: 0,
          breakdown: { base_fee: 0 }
        }
      }
    },
    
    // Audit and compliance settings
    audit: {
      enabled: true,
      log_all_evaluations: true,
      retain_days: 2555, // 7 years for regulatory compliance
      export_format: "json"
    }
  },
  
  // Example: California Professional Licensing Board
  california: {
    version: "1.0.0",
    effective_from: "2025-01-01",
    board_info: {
      name: "California Professional Licensing Board",
      jurisdiction: "CA",
      contact: "licensing@ca.gov"
    },
    fields: [
      {
        id: "licenseType",
        label: "License Type",
        type: "select", 
        options: [
          { value: "rn", label: "Registered Nurse" },
          { value: "lpn", label: "Licensed Practical Nurse" },
          { value: "cna", label: "Certified Nursing Assistant" }
        ],
        required: true
      },
      {
        id: "days_late",
        label: "Days Past Renewal Date",
        type: "number",
        min: 0,
        required: true
      }
    ],
    fee_types: {
      base_fee: {
        label: "License Renewal Fee",
        category: "licensing",
        default_amount: 350
      },
      late_penalty: {
        label: "Late Renewal Penalty", 
        category: "penalty",
        default_amount: 0
      }
    },
    defaults: {
      action_type: "set_fee",
      penalty_type: "flat",
      fee_name: "base_fee",
      board_id: "california"
    }
  }
};

// Configuration loader with fallback
export function loadBoardConfig(boardId) {
  const config = boardConfigs[boardId] || boardConfigs.default;
  
  // Add audit trail
  console.log(`📋 Loaded config for board: ${boardId}`, {
    version: config.version,
    effective_from: config.effective_from,
    board_name: config.board_info.name
  });
  
  return config;
}

// Get configurable default value
export function getDefault(boardConfig, key, fallback = null) {
  return boardConfig.defaults?.[key] || fallback;
}

// Generate test data from scenarios
export function generateTestData(boardConfig, scenarioName = 'default') {
  const scenario = boardConfig.test_scenarios?.[scenarioName] || boardConfig.test_scenarios?.default;
  
  if (!scenario) {
    console.warn(`⚠️ Test scenario '${scenarioName}' not found for board`);
    return { board_id: boardConfig.defaults.board_id };
  }
  
  return {
    board_id: boardConfig.defaults.board_id,
    ...scenario.data
  };
}

// Validate board configuration
export function validateBoardConfig(config) {
  const errors = [];
  
  if (!config.version) errors.push("Missing version");
  if (!config.board_info?.name) errors.push("Missing board name");
  if (!config.fields?.length) errors.push("No fields defined");
  if (!config.fee_types) errors.push("No fee types defined");
  if (!config.defaults) errors.push("No defaults defined");
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default boardConfigs;

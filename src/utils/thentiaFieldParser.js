/**
 * Thentia Field Parser - Dynamic Version
 * Parses Thentia entity metadata JSON and converts to clean, usable form fields
 * Dynamically generates fields from imported JSON schema
 */

/**
 * Parse Thentia metadata and extract application fields
 * @param {Object} metadata - The Thentia entity metadata JSON
 * @returns {Array} Array of field definitions
 */
export const parseThentiaMetadata = (combinedData) => {
  try {
    // Handle combined JSON structure
    let metadata = combinedData;
    let records = null;
    
    // Check if this is the combined structure
    if (combinedData && combinedData.metadata) {
      // Extract first available metadata source
      const metadataKeys = Object.keys(combinedData.metadata);
      if (metadataKeys.length > 0) {
        metadata = combinedData.metadata[metadataKeys[0]];
      }
      records = combinedData.records;
    }
    
    // If no metadata provided, return curated fallback fields
    if (!metadata || !metadata.data) {
      console.warn('No metadata provided, using fallback fields');
      return getCuratedFields();
    }

    // Extract entities from the metadata
    const entities = metadata.data;
    
    // Find the registration/application entity
    const applicationEntity = findApplicationEntity(entities);
    
    if (!applicationEntity) {
      console.warn('No application entity found in metadata, using fallback fields');
      return getCuratedFields();
    }

    // Extract and parse fields from the entity
    const parsedFields = extractFieldsFromEntity(applicationEntity);
    
    // If we got fields, return them, otherwise fallback
    if (parsedFields && parsedFields.length > 0) {
      console.log(`Successfully parsed ${parsedFields.length} fields from Thentia metadata`);
      return parsedFields;
    } else {
      console.warn('No fields extracted from metadata, using fallback fields');
      return getCuratedFields();
    }
    
  } catch (error) {
    console.error('Error parsing Thentia metadata:', error);
    return getCuratedFields();
  }
};

/**
 * Find the application/registration entity in the metadata
 * @param {Array} entities - Array of entity metadata objects
 * @returns {Object|null} The application entity or null
 */
const findApplicationEntity = (entities) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    return null;
  }

  // Look for entities that match application/registration patterns
  for (const entityWrapper of entities) {
    if (!entityWrapper.view || !entityWrapper.view.hits) continue;
    
    for (const entity of entityWrapper.view.hits) {
      const entityName = entity.entity || '';
      const singularDisplay = entity.singularDisplay || '';
      
      // Check if this is an application or registration entity
      if (
        entityName.includes('application') ||
        entityName.includes('registration') ||
        entityName.includes('reg_profile') ||
        singularDisplay.toLowerCase().includes('application') ||
        singularDisplay.toLowerCase().includes('registration')
      ) {
        return entity;
      }
    }
  }

  // If no specific application entity found, use the first entity with attributes
  for (const entityWrapper of entities) {
    if (!entityWrapper.view || !entityWrapper.view.hits) continue;
    
    for (const entity of entityWrapper.view.hits) {
      if (entity.attributes && Object.keys(entity.attributes).length > 0) {
        console.log(`Using entity: ${entity.singularDisplay || entity.entity}`);
        return entity;
      }
    }
  }

  return null;
};

/**
 * Extract fields from a Thentia entity
 * @param {Object} entity - The entity metadata object
 * @returns {Array} Array of field definitions
 */
const extractFieldsFromEntity = (entity) => {
  if (!entity.attributes) {
    return [];
  }

  const fields = [];
  const attributes = entity.attributes;

  // Process each attribute
  for (const [attrName, attrConfig] of Object.entries(attributes)) {
    // Skip system fields
    if (isSystemField(attrName)) {
      continue;
    }

    // Create field definition
    const field = createFieldDefinition(attrName, attrConfig);
    
    if (field) {
      fields.push(field);
    }
  }

  // Sort fields by category and then by name
  fields.sort((a, b) => {
    if (a.category !== b.category) {
      return getCategoryOrder(a.category) - getCategoryOrder(b.category);
    }
    return a.label.localeCompare(b.label);
  });

  return fields;
};

/**
 * Check if a field is a system field that should be hidden
 * @param {string} fieldName - The field name
 * @returns {boolean} True if system field
 */
const isSystemField = (fieldName) => {
  const systemFields = [
    'tc_ownerid',
    'tc_createdbyid',
    'tc_modifiedbyid',
    'tc_createdon',
    'tc_modifiedon',
    'tc_deletedon',
    'tc_externalkey',
    'tc_summary',
    'tc_groupownerid'
  ];
  
  return systemFields.includes(fieldName);
};

/**
 * Create a field definition from Thentia attribute config
 * @param {string} attrName - The attribute name
 * @param {Object} attrConfig - The attribute configuration
 * @returns {Object|null} Field definition or null
 */
const createFieldDefinition = (attrName, attrConfig) => {
  const labelname = attrConfig.labelname || formatFieldName(attrName);
  const datatype = attrConfig.datatype || 'basic-string';
  const required = attrConfig.required || false;
  const readonly = attrConfig.readonly || false;
  
  // Skip readonly fields
  if (readonly) {
    return null;
  }

  // Map Thentia datatype to HTML input type
  const inputType = mapDataTypeToInputType(datatype);
  
  // Determine category
  const category = determineCategory(attrName, labelname);

  // Create base field definition
  const field = {
    name: attrName,
    label: labelname,
    type: inputType,
    required: required,
    category: category
  };

  // Add additional properties based on datatype
  if (datatype === 'lookup' && attrConfig.connectedspace) {
    field.connectedSpace = attrConfig.connectedspace;
    field.type = 'select';
    field.options = []; // Will be populated from lookup data
  }

  if (attrConfig.maximumlength) {
    field.maxLength = attrConfig.maximumlength;
  }

  if (datatype === 'money') {
    field.prefix = '$';
    field.step = '0.01';
    field.min = '0';
  }

  if (datatype === 'number') {
    field.min = '0';
  }

  return field;
};

/**
 * Format field name to readable label
 * @param {string} fieldName - The field name
 * @returns {string} Formatted label
 */
const formatFieldName = (fieldName) => {
  // Remove prefixes like 'reg_', 'tc_', 'cust_'
  let formatted = fieldName.replace(/^(reg_|tc_|cust_)/, '');
  
  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Capitalize first letter of each word
  formatted = formatted.replace(/\b\w/g, char => char.toUpperCase());
  
  return formatted;
};

/**
 * Determine field category based on field name and label
 * @param {string} fieldName - The field name
 * @param {string} label - The field label
 * @returns {string} Category name
 */
const determineCategory = (fieldName, label) => {
  const lowerName = fieldName.toLowerCase();
  const lowerLabel = label.toLowerCase();

  // Personal Information
  if (lowerName.includes('name') || lowerName.includes('firstname') || 
      lowerName.includes('lastname') || lowerName.includes('middlename') ||
      lowerLabel.includes('name')) {
    return 'Personal Information';
  }

  // Contact Information
  if (lowerName.includes('email') || lowerName.includes('phone') || 
      lowerName.includes('mobile') || lowerName.includes('fax') ||
      lowerLabel.includes('email') || lowerLabel.includes('phone')) {
    return 'Contact Information';
  }

  // Address
  if (lowerName.includes('address') || lowerName.includes('city') || 
      lowerName.includes('state') || lowerName.includes('zip') || 
      lowerName.includes('postal') || lowerName.includes('country') ||
      lowerLabel.includes('address') || lowerLabel.includes('city')) {
    return 'Address';
  }

  // License Information
  if (lowerName.includes('license') || lowerName.includes('registration') || 
      lowerName.includes('class') || lowerName.includes('type') ||
      lowerLabel.includes('license') || lowerLabel.includes('registration')) {
    return 'License Information';
  }

  // Professional Background
  if (lowerName.includes('education') || lowerName.includes('experience') || 
      lowerName.includes('qualification') || lowerName.includes('certification') ||
      lowerLabel.includes('education') || lowerLabel.includes('experience')) {
    return 'Professional Background';
  }

  // Compliance & Insurance
  if (lowerName.includes('insurance') || lowerName.includes('policy') || 
      lowerName.includes('criminal') || lowerName.includes('compliance') ||
      lowerLabel.includes('insurance') || lowerLabel.includes('policy')) {
    return 'Compliance & Insurance';
  }

  // Dates
  if (lowerName.includes('date') || lowerName.includes('expiration') ||
      lowerLabel.includes('date')) {
    return 'Additional Information';
  }

  // Default category
  return 'Additional Information';
};

/**
 * Get category sort order
 * @param {string} category - Category name
 * @returns {number} Sort order
 */
const getCategoryOrder = (category) => {
  const order = {
    'Personal Information': 1,
    'Contact Information': 2,
    'Address': 3,
    'License Information': 4,
    'Professional Background': 5,
    'Compliance & Insurance': 6,
    'Additional Information': 7
  };
  
  return order[category] || 999;
};

/**
 * Map Thentia datatype to HTML input type
 * @param {string} datatype - Thentia datatype
 * @returns {string} HTML input type
 */
const mapDataTypeToInputType = (datatype) => {
  const typeMap = {
    'basic-string': 'text',
    'date': 'date',
    'datetime': 'datetime-local',
    'money': 'number',
    'number': 'number',
    'lookup': 'select',
    'textarea': 'textarea',
    'radio': 'radio',
    'checkbox': 'checkbox',
    'phone': 'tel',
    'email': 'email',
    'url': 'url',
    'boolean': 'checkbox'
  };
  
  return typeMap[datatype] || 'text';
};

/**
 * Curated field set as fallback
 * Used when no metadata is available or parsing fails
 */
const getCuratedFields = () => {
  return [
    // Personal Information
    { 
      name: 'firstName', 
      label: 'First Name', 
      type: 'text', 
      required: true,
      category: 'Personal Information'
    },
    { 
      name: 'lastName', 
      label: 'Last Name', 
      type: 'text', 
      required: true,
      category: 'Personal Information'
    },
    
    // Contact Information
    { 
      name: 'email', 
      label: 'Email Address', 
      type: 'email', 
      required: true,
      category: 'Contact Information'
    },
    { 
      name: 'phone', 
      label: 'Phone Number', 
      type: 'tel', 
      required: true,
      category: 'Contact Information'
    },
    
    // Address
    { 
      name: 'addressLine1', 
      label: 'Address Line 1', 
      type: 'text', 
      required: true,
      category: 'Address'
    },
    { 
      name: 'addressLine2', 
      label: 'Address Line 2', 
      type: 'text', 
      required: false,
      category: 'Address'
    },
    { 
      name: 'city', 
      label: 'City', 
      type: 'text', 
      required: true,
      category: 'Address'
    },
    { 
      name: 'state', 
      label: 'State/Province', 
      type: 'text', 
      required: true,
      category: 'Address'
    },
    { 
      name: 'postalCode', 
      label: 'ZIP/Postal Code', 
      type: 'text', 
      required: true,
      category: 'Address'
    },
    
    // License Information
    { 
      name: 'licenseType', 
      label: 'License Type', 
      type: 'select', 
      required: true,
      category: 'License Information',
      options: [
        'Professional License',
        'Business License',
        'Temporary Permit',
        'License Renewal'
      ]
    },
    { 
      name: 'registrationType', 
      label: 'Registration Type', 
      type: 'select', 
      required: true,
      category: 'License Information',
      options: [
        'New Registration',
        'Renewal',
        'Reinstatement',
        'Transfer'
      ]
    },
    { 
      name: 'businessName', 
      label: 'Business Name', 
      type: 'text', 
      required: false,
      category: 'License Information',
      description: 'If applying for a business license'
    },
    
    // Professional Background
    { 
      name: 'yearsExperience', 
      label: 'Years of Experience', 
      type: 'number', 
      required: true,
      category: 'Professional Background',
      min: '0',
      max: '50'
    },
    { 
      name: 'education', 
      label: 'Education & Qualifications', 
      type: 'textarea', 
      required: true,
      category: 'Professional Background',
      description: 'Describe your relevant education, certifications, and qualifications'
    },
    { 
      name: 'previousLicenses', 
      label: 'Previous Licenses', 
      type: 'textarea', 
      required: false,
      category: 'Professional Background',
      description: 'List any previous professional licenses held'
    },
    
    // Compliance & Insurance
    { 
      name: 'insuranceCompany', 
      label: 'Insurance Company', 
      type: 'text', 
      required: false,
      category: 'Compliance & Insurance',
      description: 'Professional liability insurance provider'
    },
    { 
      name: 'policyNumber', 
      label: 'Policy Number', 
      type: 'text', 
      required: false,
      category: 'Compliance & Insurance'
    },
    { 
      name: 'policyAmount', 
      label: 'Policy Amount', 
      type: 'number', 
      required: false,
      category: 'Compliance & Insurance',
      prefix: '$',
      step: '1000',
      min: '0'
    },
    { 
      name: 'criminalHistory', 
      label: 'Have you ever been convicted of a crime?', 
      type: 'radio', 
      required: true,
      category: 'Compliance & Insurance',
      options: ['Yes', 'No']
    },
    { 
      name: 'criminalDetails', 
      label: 'If yes, please provide details', 
      type: 'textarea', 
      required: false,
      category: 'Compliance & Insurance'
    },
    
    // Additional Information
    { 
      name: 'effectiveDate', 
      label: 'Requested Effective Date', 
      type: 'date', 
      required: false,
      category: 'Additional Information',
      description: 'When would you like this license to become effective?'
    },
    { 
      name: 'additionalComments', 
      label: 'Additional Comments', 
      type: 'textarea', 
      required: false,
      category: 'Additional Information',
      description: 'Any additional information you would like to provide'
    }
  ];
};

/**
 * Group fields by category for better UX
 * @param {Array} fields - Array of field definitions
 * @returns {Object} Fields grouped by category
 */
export const groupFieldsByCategory = (fields) => {
  const categories = {};
  
  fields.forEach(field => {
    const category = field.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(field);
  });
  
  return categories;
};


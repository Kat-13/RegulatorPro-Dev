import React, { useState, useEffect } from 'react';
import { Building2, FileText, Upload, CheckCircle2, AlertCircle, File, X } from 'lucide-react';
import ConditionalLogicEngine from './utils/ConditionalLogicEngine';
import FieldValidator from './utils/FieldValidator';

const API_URL = ''; // Use proxy configured in vite.config.js

const LicenseePortal = ({ user, onBack }) => {
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [selectedApplicationType, setSelectedApplicationType] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [conditionalRules, setConditionalRules] = useState([]);
  const [fieldStates, setFieldStates] = useState({});
  const [validationRules, setValidationRules] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    loadApplicationTypes();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (selectedApplicationType) {
      loadFormFields(selectedApplicationType.id);
      loadConditionalRules(selectedApplicationType.id);
      loadValidationRules(selectedApplicationType.id);
      setCurrentSection(0); // Reset to first section
    }
  }, [selectedApplicationType]);

  // Evaluate conditional rules whenever form data changes
  useEffect(() => {
    if (conditionalRules.length > 0) {
      const engine = new ConditionalLogicEngine(conditionalRules, formData);
      const states = engine.evaluateAll();
      setFieldStates(states);
      
      // Apply set_value actions
      Object.entries(states).forEach(([fieldKey, state]) => {
        if (state.value !== undefined && formData[fieldKey] !== state.value) {
          setFormData(prev => ({
            ...prev,
            [fieldKey]: state.value
          }));
        }
      });
    }
  }, [conditionalRules]); // Only run when rules change, not formData (to avoid infinite loop)

  const loadApplicationTypes = async () => {
    try {
      // Licensees should only see published forms, not drafts or archived
      const response = await fetch(`${API_URL}/api/application-types`);
      const data = await response.json();
      
      // Filter to only show published and active (not deleted) forms
      const publishedTypes = (data.applicationTypes || []).filter(
        type => type.status === 'published' && type.active !== false
      );
      
      if (publishedTypes.length > 0) {
        setApplicationTypes(publishedTypes);
        setSelectedApplicationType(publishedTypes[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading application types:', error);
      setLoading(false);
    }
  };

  const loadFormFields = async (applicationTypeId) => {
    try {
      const response = await fetch(`${API_URL}/api/application-types/${applicationTypeId}`);
      const data = await response.json();
      
      const appType = data.applicationType;
      let fieldsToRender = [];
      
      // Check if this is an AI-extracted form with sections
      if (appType && appType.sections) {
        // Parse sections if it's a string
        const sections = typeof appType.sections === 'string' 
          ? JSON.parse(appType.sections) 
          : appType.sections;
        
        // Store sections for interview-style rendering
        // We'll add section navigation in the render logic
        sections.forEach((section, sectionIndex) => {
          // Add section marker
          fieldsToRender.push({
            type: 'section_header',
            id: `section_${sectionIndex}`,
            label: section.title,
            description: section.description,
            sectionIndex: sectionIndex
          });
          
          // Handle both new elements format and old questions format
          const elements = section.elements || section.questions || [];
          
          elements.forEach((element, elementIndex) => {
            // Handle instruction blocks (new format)
            if (element.element_type === 'instruction_block') {
              fieldsToRender.push({
                type: 'instruction_block',
                id: `instruction_${sectionIndex}_${elementIndex}`,
                content: element.content,
                title: element.title,
                style: element.style || 'info',
                sectionIndex: sectionIndex
              });
              return;
            }
            
            // Handle instruction blocks (old compatibility format)
            if (element.question_type === 'instruction') {
              fieldsToRender.push({
                type: 'instruction_block',
                id: `instruction_${sectionIndex}_${elementIndex}`,
                content: element.question_text,
                title: element.instruction_title,
                style: element.instruction_style || 'info',
                sectionIndex: sectionIndex
              });
              return;
            }
            
            // Add question as a label field
            const questionText = element.text || element.question_text;
            if (questionText) {
              fieldsToRender.push({
                type: 'question_label',
                id: `question_${sectionIndex}_${elementIndex}`,
                label: questionText,
                sectionIndex: sectionIndex
              });
            }
            
            // Add all fields for this question
            (element.fields || []).forEach((field, fieldIndex) => {
              fieldsToRender.push({
                ...field,
                id: field.name || `field_${sectionIndex}_${elementIndex}_${fieldIndex}`,
                field_type: field.type,
                type: field.type,
                label: field.label || field.name,
                required: field.required || false,
                sectionIndex: sectionIndex
              });
            });
          });
        });
      } else if (appType && appType.fields) {
        // Regular form with flat fields - treat as single section
        fieldsToRender = appType.fields.map((field, index) => {
          // Generate a unique ID if missing
          if (!field.id && !field.field_key && !field.name) {
            const generatedId = field.label 
              ? field.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
              : `field_${index}`;
            return { ...field, id: generatedId, sectionIndex: 0 };
          }
          return { ...field, sectionIndex: 0 };
        });
      }
      
      setFormFields(fieldsToRender);
      
      // Initialize form data
      const initialData = {};
      fieldsToRender.forEach(field => {
        const fieldType = field.type || field.field_type;
        if (fieldType !== 'section_header' && fieldType !== 'question_label' && fieldType !== 'instruction_block') {
          const fieldKey = field.id || field.field_key || field.name;
          initialData[fieldKey] = '';
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error loading form fields:', error);
      setFormFields([]);
    }
  };

  const loadConditionalRules = async (applicationTypeId) => {
    try {
      const response = await fetch(`${API_URL}/api/application-types/${applicationTypeId}/conditional-rules`);
      const data = await response.json();
      
      if (data.rules) {
        setConditionalRules(data.rules);
      }
    } catch (error) {
      console.error('Error loading conditional rules:', error);
      setConditionalRules([]);
    }
  };

  const loadValidationRules = async (applicationTypeId) => {
    try {
      const response = await fetch(`${API_URL}/api/application-types/${applicationTypeId}/validation-rules`);
      const data = await response.json();
      
      if (data.validation_rules) {
        setValidationRules(data.validation_rules);
      }
    } catch (error) {
      console.error('Error loading validation rules:', error);
      setValidationRules({});
    }
  };

  const loadUserProfile = async () => {
    // Use the user prop passed from parent component
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleInputChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[fieldKey]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
    }
  };

  const validateField = (fieldKey, value) => {
    // Get validation rules for this field
    const rules = validationRules[fieldKey];
    if (!rules) return true; // No rules, field is valid
    
    // Check if field is required by conditional logic
    const fieldState = fieldStates[fieldKey];
    const isRequired = fieldState?.required || rules.required;
    
    // Validate using FieldValidator
    const error = FieldValidator.validate(value, rules, isRequired);
    
    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldKey]: error
      }));
      return false;
    } else {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
      return true;
    }
  };

  const validateAllFields = () => {
    let isValid = true;
    const errors = {};
    
    // Validate all visible fields that have rules
    formFields.filter(shouldShowField).forEach(field => {
      const fieldKey = field.id || field.field_key || field.name;
      const rules = validationRules[fieldKey];
      
      if (rules) {
        const value = formData[fieldKey];
        const fieldState = fieldStates[fieldKey];
        const isRequired = fieldState?.required || rules.required;
        
        const error = FieldValidator.validate(value, rules, isRequired);
        if (error) {
          errors[fieldKey] = error;
          isValid = false;
        }
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  // Evaluate if a field should be shown based on conditional rules
  const shouldShowField = (field) => {
    const fieldKey = field.id || field.field_key || field.name;
    const state = fieldStates[fieldKey];
    
    // If conditional logic engine has determined visibility, use that
    if (state && state.visible !== undefined) {
      return state.visible;
    }
    
    // Otherwise, check old-style field-level conditional rules (backward compatibility)
    if (!field.conditionalRules || field.conditionalRules.length === 0) {
      return true; // No conditions, always show
    }

    // Check all conditional rules (AND logic)
    return field.conditionalRules.every(rule => {
      const targetValue = formData[rule.fieldId];
      
      switch (rule.operator) {
        case 'equals':
          return targetValue === rule.value || 
                 (typeof targetValue === 'boolean' && targetValue === (rule.value === 'true' || rule.value === true));
        case 'not_equals':
          return targetValue !== rule.value;
        case 'contains':
          return String(targetValue || '').includes(String(rule.value));
        case 'greater_than':
          return Number(targetValue) > Number(rule.value);
        case 'less_than':
          return Number(targetValue) < Number(rule.value);
        case 'is_checked':
          return targetValue === true || targetValue === 'true' || targetValue === 'yes';
        case 'is_not_checked':
          return !targetValue || targetValue === false || targetValue === 'false' || targetValue === 'no';
        default:
          return true;
      }
    });
  };

  const handleFileChange = (fieldKey, files) => {
    if (files && files.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [fieldKey]: files[0]
      }));
    }
  };

  const removeFile = (fieldKey) => {
    setUploadedFiles(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('userId', currentUser.id);
      formDataToSend.append('applicationTypeId', selectedApplicationType.id);
      formDataToSend.append('formData', JSON.stringify(formData));
      
      if (currentSubmission) {
        formDataToSend.append('submissionId', currentSubmission.id);
      }
      
      // Append files
      Object.keys(uploadedFiles).forEach(fieldKey => {
        formDataToSend.append(fieldKey, uploadedFiles[fieldKey]);
      });
      
      const response = await fetch(`${API_URL}/api/application-submissions`, {
        method: 'POST',
        body: formDataToSend
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentSubmission(result.submission);
        setSubmitStatus({ type: 'success', message: 'Draft saved successfully' });
        setTimeout(() => setSubmitStatus(null), 3000);
      } else {
        setSubmitStatus({ type: 'error', message: result.error || 'Failed to save draft' });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to save draft' });
    } finally {
      setSubmitting(false);
    }
  };

  const createPaymentAndRedirect = async (applicationId) => {
    try {
      // Create payment record
      const paymentResponse = await fetch('https://5000-i4u5q4wzga20dqo40gx3x-50251577.manusvm.computer/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_id: applicationId,
          user_id: currentUser.id,
          base_fee: selectedApplicationType.base_fee || 0,
          late_fee: 0 // Calculate late fee if needed
        })
      });
      
      const paymentResult = await paymentResponse.json();
      
      if (paymentResponse.ok && paymentResult.payment?.tilled_checkout_url) {
        // Redirect to Tilled checkout
        window.location.href = paymentResult.payment.tilled_checkout_url;
      } else {
        setSubmitStatus({ type: 'error', message: 'Failed to create payment' });
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to create payment' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields before submission
    if (!validateAllFields()) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Please fix validation errors before submitting' 
      });
      setTimeout(() => setSubmitStatus(null), 5000);
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Submit to new license applications API
      const response = await fetch('https://5000-i4u5q4wzga20dqo40gx3x-50251577.manusvm.computer/api/license-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          application_type_id: selectedApplicationType.id,
          form_data: formData,
          is_renewal: false
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const applicationId = result.application?.id || result.id;
        
        // Check if the application type has a fee configured
        if (selectedApplicationType.base_fee && selectedApplicationType.base_fee > 0) {
          // Create payment and redirect to Tilled checkout
          await createPaymentAndRedirect(applicationId);
        } else {
          // No payment required, show success and redirect to dashboard
          setSubmitStatus({ type: 'success', message: 'Application submitted successfully!' });
          
          // Wait a moment to show success message, then redirect to dashboard
          setTimeout(() => {
            if (onBack) {
              onBack();
            }
          }, 1500);
        }
      } else {
        setSubmitStatus({ type: 'error', message: result.error || 'Failed to submit application' });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit application' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const fieldKey = field.id || field.field_key || field.name;
    const value = formData[fieldKey] || '';
    const fieldType = field.type || field.field_type;
    const state = fieldStates[fieldKey] || {};
    
    // Apply conditional logic states
    const isEnabled = state.enabled !== false; // Default to enabled
    const isRequired = state.required !== undefined ? state.required : field.required; // Use rule state if set, otherwise field default
    
    // Check if field has validation error
    const hasError = validationErrors[fieldKey];
    const baseInputClasses = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
      hasError 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-gray-300 focus:ring-blue-500'
    } ${!isEnabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;
    
    switch (fieldType) {
      case 'section_header':
        return (
          <div className="-mx-6 -mt-6 mb-6 px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            <h2 className="text-xl font-bold text-gray-900">{field.label}</h2>
            {field.description && (
              <p className="text-sm text-gray-600 mt-1">{field.description}</p>
            )}
          </div>
        );
      
      case 'question_label':
        return (
          <div className="mb-4">
            <p className="text-base font-semibold text-gray-800">{field.label}</p>
          </div>
        );
      
      case 'instruction_block':
        const styleClasses = {
          info: 'bg-blue-50 border-l-4 border-blue-400 text-blue-900',
          warning: 'bg-orange-50 border-l-4 border-orange-400 text-orange-900',
          alert: 'bg-red-50 border-l-4 border-red-400 text-red-900'
        };
        const instructionStyle = field.style || 'info';
        return (
          <div className={`mb-6 p-4 rounded ${styleClasses[instructionStyle] || styleClasses.info}`}>
            {field.title && (
              <div className="font-semibold mb-2">{field.title}</div>
            )}
            <div className="text-sm whitespace-pre-wrap">{field.content}</div>
          </div>
        );
      
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
        return (
          <input
            type={fieldType}
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            onBlur={(e) => validateField(fieldKey, e.target.value)}
            placeholder={field.placeholder || field.label}
            required={isRequired}
            disabled={!isEnabled}
            className={baseInputClasses}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            onBlur={(e) => validateField(fieldKey, e.target.value)}
            placeholder={field.placeholder || field.label}
            required={isRequired}
            disabled={!isEnabled}
            rows={4}
            className={baseInputClasses}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            required={isRequired}
            disabled={!isEnabled}
            className={baseInputClasses}
          >
            <option value="">Select {field.label}</option>
            {field.options && field.options.map((option, idx) => {
              // Handle both string options and object options {label, value}
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <option key={idx} value={optionValue}>{optionLabel}</option>
              );
            })}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options && field.options.map((option, idx) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <label key={idx} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={fieldKey}
                    value={optionValue}
                    checked={value === optionValue}
                    onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                    required={isRequired}
                    disabled={!isEnabled}
                    className="text-blue-600"
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );
      
      case 'checkbox':
        // Single checkbox (yes/no)
        if (!field.options || field.options.length === 0) {
          return (
            <input
              type="checkbox"
              checked={value === true || value === 'true' || value === 'yes'}
              onChange={(e) => handleInputChange(fieldKey, e.target.checked)}
              className="text-blue-600 h-5 w-5"
            />
          );
        }
        // Multiple checkboxes
        return (
          <div className="space-y-2">
            {field.options.map((option, idx) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <label key={idx} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={(value || '').split(',').includes(optionValue)}
                    onChange={(e) => {
                      const currentValues = (value || '').split(',').filter(v => v);
                      if (e.target.checked) {
                        currentValues.push(optionValue);
                      } else {
                        const index = currentValues.indexOf(optionValue);
                        if (index > -1) currentValues.splice(index, 1);
                      }
                      handleInputChange(fieldKey, currentValues.join(','));
                    }}
                    className="text-blue-600"
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={(e) => handleFileChange(fieldKey, e.target.files)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {uploadedFiles[fieldKey] && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <File className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">{uploadedFiles[fieldKey].name}</span>
                  <span className="text-xs text-gray-500">
                    ({(uploadedFiles[fieldKey].size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(fieldKey)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {field.help_text && (
              <p className="text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );
      
      case 'section_header':
        return (
          <div className="border-b-2 border-gray-300 pb-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{field.title || field.content || 'Section'}</h3>
            {field.description && (
              <p className="text-sm text-gray-600 mt-1">{field.description}</p>
            )}
          </div>
        );
      
      case 'instruction_block':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                {field.title && (
                  <h4 className="font-semibold text-blue-900 mb-1">{field.title}</h4>
                )}
                <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: field.content || field.text || 'Instructions will appear here.' }} />
              </div>
            </div>
          </div>
        );
      
      case 'attestation_block':
        return (
          <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value === true || value === 'true' || value === 'yes'}
                onChange={(e) => handleInputChange(fieldKey, e.target.checked)}
                required={isRequired}
                className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0"
              />
              <div className="text-sm text-gray-800">
                <div dangerouslySetInnerHTML={{ __html: field.content || field.text || 'I attest that the information provided is true and accurate.' }} />
              </div>
            </label>
          </div>
        );
      
      case 'signature_block':
        return (
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label || 'Signature'}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              placeholder="Type your full legal name"
              required={isRequired}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-serif text-lg italic"
            />
            <p className="text-xs text-gray-500 mt-2">
              By typing your name, you are providing a legal electronic signature.
            </p>
          </div>
        );
      
      case 'document_upload':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{field.name || field.label || 'Document Upload'}</span>
              {field.required && <span className="text-xs text-red-600">Required</span>}
            </div>
            <input
              type="file"
              onChange={(e) => handleFileChange(fieldKey, e.target.files)}
              accept={field.acceptedFileTypes || ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required={field.required}
            />
            {uploadedFiles[fieldKey] && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">{uploadedFiles[fieldKey].name}</span>
                  <span className="text-xs text-gray-500">
                    ({(uploadedFiles[fieldKey].size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(fieldKey)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {field.description && (
              <p className="text-xs text-gray-600">{field.description}</p>
            )}
            {field.maxFileSize && (
              <p className="text-xs text-gray-500">Max file size: {field.maxFileSize}</p>
            )}
          </div>
        );
      
      case 'fee_display':
        const baseFee = selectedApplicationType?.baseFee || 0;
        const calculatedFee = baseFee; // TODO: Add fee calculation logic based on form data
        return (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Application Fee</h4>
                <p className="text-3xl font-bold text-gray-900 mt-1">${calculatedFee.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Base Fee: ${baseFee.toFixed(2)}</p>
                {/* TODO: Show fee breakdown if there are additional fees */}
              </div>
            </div>
            {field.description && (
              <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200">{field.description}</p>
            )}
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            placeholder={field.placeholder || field.label}
            required={field.required}
            className={baseInputClasses}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">License Application Portal</h1>
                <p className="text-gray-600">Complete your application below</p>
              </div>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back to Dashboard
              </button>
            )}
          </div>
          
          {/* Application Type Selector */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Application Type
            </label>
            <select
              value={selectedApplicationType?.id || ''}
              onChange={(e) => {
                const selected = applicationTypes.find(t => t.id === parseInt(e.target.value));
                setSelectedApplicationType(selected);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {applicationTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.fields?.length || 0} fields)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            submitStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {submitStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{submitStatus.message}</span>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
          {/* Progress Bar for Multi-Section Forms */}
          {(() => {
            const totalSections = Math.max(...formFields.map(f => f.sectionIndex || 0)) + 1;
            if (totalSections > 1) {
              const progress = ((currentSection + 1) / totalSections) * 100;
              return (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Section {currentSection + 1} of {totalSections}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(progress)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="space-y-6">
            {formFields.filter(field => {
              // Filter by current section and conditional visibility
              return (field.sectionIndex === currentSection || field.sectionIndex === undefined) && shouldShowField(field);
            }).map((field, index) => {
              const fieldKey = field.id || field.field_key || field.name;
              const fieldState = fieldStates[fieldKey];
              const isRequired = fieldState?.required !== undefined ? fieldState.required : field.required;
              
              // Determine if this element needs a label wrapper
              const fieldType = field.type || field.field_type;
              const nonFieldTypes = ['section_header', 'instruction_block', 'attestation_block', 'signature_block', 'document_upload', 'fee_display'];
              const needsLabel = !nonFieldTypes.includes(fieldType);
              
              return (
                <div key={field.id || field.field_key || index}>
                  {needsLabel && field.label && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  )}
                  {renderField(field)}
                  {validationErrors[fieldKey] && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors[fieldKey]}</span>
                    </p>
                  )}
                  {needsLabel && field.helpText && !validationErrors[fieldKey] && (
                    <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conditional Messages */}
          {conditionalRules.length > 0 && (() => {
            const engine = new ConditionalLogicEngine(conditionalRules, formData);
            const messages = engine.getMessages();
            if (messages.length > 0) {
              return (
                <div className="mt-6 space-y-2">
                  {messages.map((message, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                      {message}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })()}

          {/* Fee Calculation */}
          {conditionalRules.length > 0 && (() => {
            const engine = new ConditionalLogicEngine(conditionalRules, formData);
            const totalFee = engine.getTotalFee();
            const baseFee = selectedApplicationType?.base_fee || 0;
            const finalFee = baseFee + totalFee;
            
            if (finalFee > 0) {
              return (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Fee Summary</h3>
                  <div className="space-y-1 text-sm">
                    {baseFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fee:</span>
                        <span className="text-gray-900">${baseFee.toFixed(2)}</span>
                      </div>
                    )}
                    {totalFee !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Additional Fees:</span>
                        <span className="text-gray-900">${totalFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300 font-semibold">
                      <span className="text-gray-700">Total:</span>
                      <span className="text-gray-900">${finalFee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Section Navigation & Action Buttons */}
          <div className="mt-8">
            {(() => {
              const totalSections = Math.max(...formFields.map(f => f.sectionIndex || 0)) + 1;
              const isLastSection = currentSection === totalSections - 1;
              const isFirstSection = currentSection === 0;
              
              return (
                <div className="flex items-center justify-between gap-4">
                  {/* Previous Button */}
                  {totalSections > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                      disabled={isFirstSection}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                  )}
                  
                  {/* Save Draft Button */}
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Saving...' : 'Save Draft'}
                  </button>
                  
                  {/* Next or Submit Button */}
                  {isLastSection ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                    </button>
                  ) : totalSections > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentSection(prev => Math.min(totalSections - 1, prev + 1))}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LicenseePortal;


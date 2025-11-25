import React, { useState } from 'react';
import './FormRenderer.css';

/**
 * FormRenderer - Milestone 2: Render parsed form structure in fill mode
 * 
 * Takes the JSON schema from SmartFormParserV2 and renders it as an
 * interactive, fillable form with proper field types and validation.
 */
const FormRenderer = ({ formStructure, onSubmit, onCancel }) => {
  // Form state: stores all field values
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Handle field value changes
  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Handle field blur (for validation)
  const handleFieldBlur = (fieldId) => {
    setTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));
  };

  // Validate a single field
  const validateField = (field) => {
    const value = formData[field.id];
    
    // Required field validation
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }
    
    // Phone validation
    if (field.type === 'tel' && value) {
      const phoneRegex = /^[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }
    
    return null;
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    
    formStructure.sections.forEach(section => {
      section.fields.forEach(field => {
        // Check conditional logic
        if (field.conditionalOn) {
          const conditionalValue = formData[field.conditionalOn];
          if (conditionalValue !== field.conditionalValue) {
            return; // Skip validation for hidden fields
          }
        }
        
        const error = validateField(field);
        if (error) {
          newErrors[field.id] = error;
        }
      });
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    } else {
      // Mark all fields as touched to show errors
      const allTouched = {};
      formStructure.sections.forEach(section => {
        section.fields.forEach(field => {
          allTouched[field.id] = true;
        });
      });
      setTouched(allTouched);
    }
  };

  // Check if a field should be visible based on conditional logic
  const isFieldVisible = (field) => {
    if (!field.conditionalOn) return true;
    return formData[field.conditionalOn] === field.conditionalValue;
  };

  // Render individual field based on type
  const renderField = (field) => {
    if (!isFieldVisible(field)) return null;
    
    const value = formData[field.id] || '';
    const error = touched[field.id] ? errors[field.id] : null;
    const hasError = !!error;

    const commonProps = {
      id: field.id,
      name: field.id,
      value: value,
      onChange: (e) => handleFieldChange(field.id, e.target.value),
      onBlur: () => handleFieldBlur(field.id),
      placeholder: field.placeholder || '',
      required: field.required,
      className: `form-input ${hasError ? 'error' : ''}`
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'date':
      case 'number':
        return (
          <input
            type={field.type}
            {...commonProps}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );
      
      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map((option, idx) => (
              <label key={idx} className="radio-label">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  onBlur={() => handleFieldBlur(field.id)}
                  required={field.required}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              name={field.id}
              checked={value === true}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              onBlur={() => handleFieldBlur(field.id)}
              required={field.required}
            />
            <span>{field.label}</span>
          </label>
        );
      
      case 'file':
        return (
          <input
            type="file"
            id={field.id}
            name={field.id}
            onChange={(e) => handleFieldChange(field.id, e.target.files[0])}
            onBlur={() => handleFieldBlur(field.id)}
            required={field.required}
            className={`form-input file-input ${hasError ? 'error' : ''}`}
          />
        );
      
      default:
        return (
          <input
            type="text"
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="form-renderer">
      <div className="form-header">
        <h2>{formStructure.title}</h2>
        <button 
          type="button" 
          className="close-button"
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rendered-form">
        {formStructure.sections.map((section, sectionIdx) => (
          <div key={section.id} className="form-section">
            <h3 className="section-title">{section.title}</h3>
            
            {section.instructions && (
              <div className="section-instructions">
                {section.instructions}
              </div>
            )}

            <div className="section-fields">
              {section.fields.map((field) => (
                <div 
                  key={field.id} 
                  className={`field-group ${field.type === 'checkbox' ? 'checkbox-field' : ''}`}
                >
                  {field.type !== 'checkbox' && (
                    <label htmlFor={field.id} className="field-label">
                      {field.label}
                      {field.required && <span className="required-mark">*</span>}
                    </label>
                  )}
                  
                  {renderField(field)}
                  
                  {field.helpText && (
                    <div className="field-help-text">{field.helpText}</div>
                  )}
                  
                  {touched[field.id] && errors[field.id] && (
                    <div className="field-error">{errors[field.id]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Submit Application
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormRenderer;

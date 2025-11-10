import React, { useState, useEffect } from 'react';
import StepNavigation from './StepNavigation';

/**
 * MultiStepWizard Component
 * Manages multi-step form flow with automatic draft saving
 */
const MultiStepWizard = ({ 
  applicationTypeId,
  steps,
  fields,
  formData,
  onSave,
  onSubmit,
  renderField
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [localFormData, setLocalFormData] = useState(formData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Get current step configuration
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  
  // Get fields for current step
  const currentStepFields = fields.filter(field => 
    currentStep.field_keys.includes(field.field_key || field.id || field.name)
  );
  
  // Update local form data when prop changes
  useEffect(() => {
    setLocalFormData(formData || {});
  }, [formData]);
  
  // Handle field value change
  const handleFieldChange = (fieldKey, value) => {
    setLocalFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    // Clear error for this field
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };
  
  // Validate current step
  const validateStep = () => {
    const stepErrors = {};
    
    currentStepFields.forEach(field => {
      const fieldKey = field.field_key || field.id || field.name;
      const value = localFormData[fieldKey];
      
      // Check required fields
      if (field.required && (!value || value === '')) {
        stepErrors[fieldKey] = `${field.label || field.name} is required`;
      }
      
      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          stepErrors[fieldKey] = 'Please enter a valid email address';
        }
      }
      
      // Phone validation
      if (field.type === 'tel' && value) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
          stepErrors[fieldKey] = 'Please enter a valid phone number';
        }
      }
    });
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };
  
  // Save draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await onSave({
        formData: localFormData,
        currentStep: currentStepIndex + 1,
        isDraft: true
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Navigate to previous step
  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Navigate to next step
  const handleNext = async () => {
    // Validate current step
    if (!validateStep()) {
      alert('Please fix the errors before continuing.');
      return;
    }
    
    // Save draft before moving to next step
    setIsSaving(true);
    try {
      await onSave({
        formData: localFormData,
        currentStep: currentStepIndex + 2, // Next step number
        isDraft: true
      });
      
      // Move to next step or submit
      if (isLastStep) {
        // On last step, go to review/submit
        await onSubmit(localFormData);
      } else {
        setCurrentStepIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Step Navigation Header */}
      <StepNavigation
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        stepName={currentStep.name}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSaving={isSaving}
      />
      
      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step Description */}
        {currentStep.description && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-blue-800">{currentStep.description}</p>
          </div>
        )}
        
        {/* Form Fields */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {currentStepFields.length > 0 ? (
              currentStepFields.map((field, index) => {
                const fieldKey = field.field_key || field.id || field.name;
                const value = localFormData[fieldKey] || '';
                const error = errors[fieldKey];
                
                return (
                  <div key={index}>
                    {renderField ? (
                      renderField(field, value, (newValue) => handleFieldChange(fieldKey, newValue), error)
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label || field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type || 'text'}
                          value={value}
                          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            error ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder={field.placeholder || ''}
                        />
                        {error && (
                          <p className="mt-1 text-sm text-red-600">{error}</p>
                        )}
                        {field.help_text && (
                          <p className="mt-1 text-sm text-gray-500">{field.help_text}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {isLastStep 
                    ? 'Review your application and click "Review & Submit" to continue.'
                    : 'No fields configured for this step.'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your progress is automatically saved as you move through the steps.</p>
        </div>
      </div>
    </div>
  );
};

export default MultiStepWizard;

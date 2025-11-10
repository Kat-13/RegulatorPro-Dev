import React from 'react';

/**
 * StepNavigation Component
 * Simple navigation header showing current step and navigation buttons
 */
const StepNavigation = ({ 
  currentStep, 
  totalSteps, 
  stepName,
  onPrevious, 
  onNext,
  onSaveDraft,
  isFirstStep,
  isLastStep,
  isSaving
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Step Counter */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              {stepName}
            </h2>
          </div>
          
          {/* Save Draft Button */}
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={isFirstStep || isSaving}
            className={`px-6 py-2 rounded-md font-medium ${
              isFirstStep || isSaving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← Previous
          </button>
          
          <button
            onClick={onNext}
            disabled={isSaving}
            className={`px-6 py-2 rounded-md font-medium ${
              isLastStep
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLastStep ? 'Review & Submit →' : 'Save & Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepNavigation;

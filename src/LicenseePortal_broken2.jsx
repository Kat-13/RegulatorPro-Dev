import React, { useState, useEffect } from 'react';
import { Building2, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = ''; // Use proxy configured in vite.config.js

const LicenseePortal = () => {
  const [formData, setFormData] = useState({});
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [selectedApplicationType, setSelectedApplicationType] = useState(null);
  const [fieldMetadata, setFieldMetadata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadApplicationTypes();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (selectedApplicationType) {
      loadFieldMetadata(selectedApplicationType.id);
    }
  }, [selectedApplicationType]);

  const loadApplicationTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/application-types`);
      const data = await response.json();
      
      if (data.applicationTypes && data.applicationTypes.length > 0) {
        setApplicationTypes(data.applicationTypes);
        // Auto-select first application type
        setSelectedApplicationType(data.applicationTypes[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading application types:', error);
      setLoading(false);
    }
  };

  const loadFieldMetadata = async (applicationTypeId) => {
    try {
      const response = await fetch(`${API_URL}/api/application-types/${applicationTypeId}`);
      const data = await response.json();
      
      if (data.applicationType && data.applicationType.fields) {
        setFieldMetadata(data.applicationType.fields);
      }
    } catch (error) {
      console.error('Error loading field metadata:', error);
      setFieldMetadata([]);
    }
  };

  const loadUserProfile = async () => {
    // Simulate logged-in user
    setCurrentUser({
      id: 5,
      email: 'applicant@example.com',
      firstName: 'Jane',
      lastName: 'Applicant'
    });
  };

  const extractApplicationFields = (metadata) => {
    // Extract relevant application fields from Thentia metadata
    // Focus on common application fields
    const commonFields = [
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { name: 'address', label: 'Street Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'state', label: 'State', type: 'text', required: true },
      { name: 'zipCode', label: 'ZIP Code', type: 'text', required: true },
      { name: 'licenseType', label: 'License Type', type: 'select', required: true, options: [
        'Professional License',
        'Business License',
        'Temporary Permit',
        'Renewal Application'
      ]},
      { name: 'businessName', label: 'Business Name (if applicable)', type: 'text', required: false },
      { name: 'yearsExperience', label: 'Years of Experience', type: 'number', required: true },
      { name: 'education', label: 'Education/Qualifications', type: 'textarea', required: true },
      { name: 'criminalHistory', label: 'Criminal History Disclosure', type: 'radio', required: true, options: ['Yes', 'No'] },
      { name: 'criminalDetails', label: 'If yes, please explain', type: 'textarea', required: false },
    ];

    return commonFields;
  };

  const getBasicApplicationFields = () => {
    return [
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { name: 'licenseType', label: 'License Type', type: 'select', required: true, options: [
        'Professional License',
        'Business License',
        'Temporary Permit'
      ]},
    ];
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      // Step 1: Create or get user
      let userId = currentUser?.id;
      if (!userId) {
        const userResponse = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password_hash: 'temp_hash',
            first_name: formData.firstName,
            last_name: formData.lastName
          })
        });
        const userData = await userResponse.json();
        userId = userData.id;
      }

      // Step 2: Create profile
      const profileResponse = await fetch(`${API_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          data: formData // Store all form data in the flexible data field
        })
      });
      const profileData = await profileResponse.json();

      // Step 3: Create application
      const applicationResponse = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileData.id,
          status: 'Under Review',
          data: formData // Store all form data
        })
      });

      if (applicationResponse.ok) {
        setSubmitStatus('success');
        setFormData({});
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.label}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.label}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option, idx) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <option key={`${field.name}-${optionValue}-${idx}`} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        );

      case 'radio':
        return (
          <div className="flex gap-4">
            {field.options?.map((option, idx) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <label key={`${field.name}-${optionValue}-${idx}`} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={optionValue}
                    checked={value === optionValue}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">License Application Portal</h1>
              <p className="text-gray-600">Submit your professional license application</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {submitStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Application Submitted Successfully!</h3>
              <p className="text-green-700">Your application has been received and is under review. You will be notified of any updates.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Submission Failed</h3>
              <p className="text-red-700">There was an error submitting your application. Please try again.</p>
            </div>
          </div>
        )}

        {/* Application Type Selector */}
        {applicationTypes.length > 1 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select License Type
            </label>
            <select
              value={selectedApplicationType?.id || ''}
              onChange={(e) => {
                const selected = applicationTypes.find(at => at.id === parseInt(e.target.value));
                setSelectedApplicationType(selected);
                setFormData({}); // Reset form data when changing license type
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            >
              {applicationTypes.map(appType => (
                <option key={appType.id} value={appType.id}>
                  {appType.name}
                </option>
              ))}
            </select>
            {selectedApplicationType?.description && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedApplicationType.description}
              </p>
            )}
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {selectedApplicationType?.name || 'Application Information'}
          </h2>

          <div className="space-y-6">
            {fieldMetadata.map((field, index) => (
              <div key={field.name || field.id || `field-${index}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Document Upload Section */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Supporting Documents</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload required documents (ID, certificates, proof of education, etc.)
            </p>
            <input
              type="file"
              multiple
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({})}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Form
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 text-sm">
            If you have questions about your application, please contact our support team at{' '}
            <a href="mailto:support@regulatepro.com" className="underline">support@regulatepro.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseePortal;


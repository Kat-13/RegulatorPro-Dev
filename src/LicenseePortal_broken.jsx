import React, { useState, useEffect } from 'react';
import { Building2, FileText, Upload, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { parseThentiaMetadata, groupFieldsByCategory } from './utils/thentiaFieldParser';

const API_URL = 'https://5000-i4u5q4wzga20dqo40gx3x-50251577.manusvm.computer';

const LicenseePortal = () => {
  const [formData, setFormData] = useState({});
  const [fieldMetadata, setFieldMetadata] = useState([]);
  const [fieldCategories, setFieldCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [selectedApplicationType, setSelectedApplicationType] = useState('');

  useEffect(() => {
    console.log("FormData updated:", formData);
  }, [formData]);

  useEffect(() => {
    loadFieldMetadata();
    loadUserProfile();
  }, []);

  const loadFieldMetadata = async () => {
    try {
      setLoading(true);
      // Load application types from API (database-backed)
      const response = await fetch(`${API_URL}/api/application-types`);
      const data = await response.json();
      
      // Set available application types from API response
      setApplicationTypes(data.applicationTypes || []);
      
      // If we have application types, show selector
      // Otherwise load default fields
      if (data.applicationTypes && data.applicationTypes.length > 0) {
        setLoading(false);
      } else {
        // Fallback to default fields
        const defaultFields = parseThentiaMetadata(null);
        setFieldMetadata(defaultFields);
        const categories = groupFieldsByCategory(defaultFields);
        setFieldCategories(categories);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading field metadata:', error);
      // Parser will return default fields automatically
      const defaultFields = parseThentiaMetadata(null);
      setFieldMetadata(defaultFields);
      const categories = groupFieldsByCategory(defaultFields);
      setFieldCategories(categories);
      setLoading(false);
    }
  };

  const handleApplicationTypeChange = (appType) => {
    setSelectedApplicationType(appType);
    
    // Find the selected application type data
    const selectedApp = applicationTypes.find(app => app.name === appType);
    if (selectedApp) {
      setFieldMetadata(selectedApp.fields);
      const categories = groupFieldsByCategory(selectedApp.fields);
      setFieldCategories(categories);
      // Reset form data
      setFormData({});
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

  const handleInputChange = (fieldName, value) => {
    console.log("handleInputChange:", fieldName, value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const validateForm = () => {
    const errors = [];
    
    fieldMetadata.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors.push(`${field.label} is required`);
      }
    });

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill out all required fields',
        details: errors
      });
      setSubmitting(false);
      return;
    }

    try {
      // Step 1: Create or get user
      const userResponse = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email || currentUser.email,
          name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
          role: 'licensee'
        })
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user');
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      // Step 2: Create profile
      const profileResponse = await fetch(`${API_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          license_type: formData.licenseType || 'Professional License',
          status: 'active',
          data: formData // Store all form data in the flexible data field
        })
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to create profile');
      }

      const profileData = await profileResponse.json();
      const profileId = profileData.id;

      // Step 3: Create application
      const applicationResponse = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          application_type: formData.licenseType || 'Professional License',
          status: 'submitted',
          data: formData, // Store all form data
          submitted_date: new Date().toISOString()
        })
      });

      if (!applicationResponse.ok) {
        throw new Error('Failed to submit application');
      }

      const applicationData = await applicationResponse.json();

      setSubmitStatus({
        type: 'success',
        message: 'Application submitted successfully!',
        applicationId: applicationData.id
      });

      // Clear form
      setFormData({});
      setDocuments([]);

    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Failed to submit application. Please try again.',
        details: [error.message]
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setFormData({});
    setDocuments([]);
    setSubmitStatus(null);
  };

  const renderField = (field) => {
    const value = formData[field.name] !== undefined ? formData[field.name] : '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={formData[field.name] || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
            required={field.required}
            maxLength={field.maxLength}
            disabled={field.readonly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] disabled:bg-gray-100"
          />
        );

      case 'select':
        return (
          <select
            value={formData[field.name] || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            disabled={field.readonly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select {field.label}</option>
            {field.options && field.options.map((option, idx) => {
              // Handle both object {value, label} and string options
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
          <div className="flex gap-4">
            {field.options && field.options.map((option, idx) => {
              // Handle both object {value, label} and string options
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              return (
                <label key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={optionValue}
                    checked={value === optionValue}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    disabled={field.readonly}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              required={field.required}
              disabled={field.readonly}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span>{field.label}</span>
          </label>
        );

      default:
        return (
          <input
            type={field.type}
            value={formData[field.name] || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
            required={field.required}
            maxLength={field.maxLength}
            step={field.step}
            min={field.min}
            disabled={field.readonly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">License Application Portal</h1>
              <p className="text-gray-600">Submit your professional license application</p>
            </div>
          </div>
        </div>

        {/* Application Type Selector */}
        {applicationTypes.length > 0 && !selectedApplicationType && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Application Type</h2>
            <p className="text-gray-600 mb-6">Choose the type of license you want to apply for:</p>
            <div className="grid gap-4">
              {applicationTypes.map((appType, index) => (
                <button
                  key={index}
                  onClick={() => handleApplicationTypeChange(appType.name)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                        {appType.name.split('\n')[0]}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {appType.renewalPeriod ? appType.renewalPeriod.substring(0, 100) : 'No description'}...
                      </p>
                      <p className="text-sm text-blue-600 mt-2 font-medium">
                        {appType.fields.length} fields required
                      </p>
                    </div>
                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show selected application type */}
        {selectedApplicationType && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Selected Application Type:</p>
                <p className="text-lg font-semibold text-blue-900">{selectedApplicationType.split('\n')[0]}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedApplicationType('');
                  setFieldMetadata([]);
                  setFieldCategories({});
                  setFormData({});
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Change Application Type
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {submitStatus && (
          <div className={`mb-6 p-4 rounded-lg ${
            submitStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {submitStatus.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-semibold ${submitStatus.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                  {submitStatus.message}
                </p>
                {submitStatus.applicationId && (
                  <p className="text-sm text-green-700 mt-1">
                    Application ID: APP-{String(submitStatus.applicationId).padStart(4, '0')}
                  </p>
                )}
                {submitStatus.details && submitStatus.details.length > 0 && (
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {submitStatus.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Application Information</h2>
          </div>

          {/* Render fields by category */}
          {Object.entries(fieldCategories).map(([category, fields]) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.filter(field => field.visible !== false).map(field => (
                  <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.pii && <span className="text-xs text-gray-500 ml-2">(PII)</span>}
                    </label>
                    {renderField(field)}
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Document Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Supporting Documents</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload required documents (ID, certificates, proof of education, etc.)
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {documents.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Selected files:</p>
                <ul className="text-sm text-gray-600 mt-1">
                  {documents.map((doc, idx) => (
                    <li key={idx}>• {doc.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              disabled={submitting}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Form
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800">
            If you have questions about your application, please contact our support team at{' '}
            <a href="mailto:support@regulatepro.com" className="underline font-medium">
              support@regulatepro.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseePortal;


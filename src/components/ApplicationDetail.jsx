import React from 'react';

const ApplicationDetail = ({ application, onClose, onEdit, onMessage, onDelete }) => {
  if (!application) return null;

  // Extract form data from the application
  const formData = application.rawData?.form_data || {};
  const user = application.rawData?.user || {};
  
  // Calculate progress based on filled fields
  const totalFields = Object.keys(formData).length;
  const filledFields = Object.values(formData).filter(v => v && v !== '').length;
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Calculate due date (30 days from submission)
  const getDueDate = () => {
    if (!application.rawData?.submitted_at) return 'N/A';
    const submitted = new Date(application.rawData.submitted_at);
    const due = new Date(submitted);
    due.setDate(due.getDate() + 30);
    return due.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Applicant Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Name</label>
                <p className="text-gray-900">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : formData.firstName && formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`
                    : 'Unknown User'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{user.email || formData.email || 'No email'}</p>
              </div>
              {formData.yearsExperience && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">Years of Experience</label>
                  <p className="text-gray-900">{formData.yearsExperience}</p>
                </div>
              )}
              {formData.licenseType && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">License Type</label>
                  <p className="text-gray-900 capitalize">{formData.licenseType}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Application Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Application ID</label>
                <p className="text-gray-900">{application.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Type</label>
                <p className="text-gray-900">{application.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Status</label>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  application.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                  application.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  application.status === 'Pending Documents' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {application.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Progress</label>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{progress}% Complete</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Submitted Date</label>
                <p className="text-gray-900">{formatDate(application.rawData?.submitted_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Due Date</label>
                <p className="text-gray-900">{getDueDate()}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Submitted Form Data</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <p className="text-gray-900">{value || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button 
            onClick={() => onEdit && onEdit(application)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Application
          </button>
          <button 
            onClick={() => onMessage && onMessage(application)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Send Message
          </button>
          <button 
            onClick={() => onDelete && onDelete(application)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;


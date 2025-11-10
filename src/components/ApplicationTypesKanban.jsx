import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ApplicationTypeCard from './ApplicationTypeCard';
import ApplicationTypeModal from './ApplicationTypeModal';
import AIInterviewEditor from './AIInterviewEditor';

const ApplicationTypesKanban = ({ 
  applicationTypes, 
  onUpdateApplicationType,
  onDeleteApplicationType,
  onCreateNew,
  selectedAppTypeId,
  onSelectAppType,
  onAddFieldToAppType
}) => {
  
  const [selectedAppType, setSelectedAppType] = useState(null);

  const handleUpdateFields = (appType, newFields) => {
    const updatedAppType = {
      ...appType,
      sections: [{
        ...appType.sections[0],
        fields: newFields
      }]
    };
    onUpdateApplicationType && onUpdateApplicationType(updatedAppType);
  };

  const handleUpdateDescription = (appType, description) => {
    const updatedAppType = {
      ...appType,
      description
    };
    onUpdateApplicationType && onUpdateApplicationType(updatedAppType);
  };

  const handleUpdateFees = (appType, fees) => {
    const updatedAppType = {
      ...appType,
      baseFee: fees.baseFee,
      lateFeePercentage: fees.lateFeePercentage,
      renewalWindowDays: fees.renewalWindowDays,
      expirationMonths: fees.expirationMonths
    };
    onUpdateApplicationType && onUpdateApplicationType(updatedAppType);
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 p-4 h-full">
        {/* Application Type Cards */}
        {applicationTypes.map(appType => (
          <ApplicationTypeCard
            key={appType.id}
            applicationType={appType}
            onClick={() => setSelectedAppType(appType)}
            onDelete={() => onDeleteApplicationType && onDeleteApplicationType(appType)}
          />
        ))}

        {/* Add New Application Type Card */}
        <div className="w-80 flex-shrink-0">
          <button
            onClick={() => onCreateNew && onCreateNew()}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">New License Type</span>
          </button>
        </div>
      </div>
      
      {/* Modal - Route to AIInterviewEditor for PDF/CSV extracted types */}
      {selectedAppType && (() => {
        const parserVersion = selectedAppType.parserVersion || selectedAppType.parser_version;
        const isAIExtracted = parserVersion === 'AI_PDF_Extractor_v1' || parserVersion === 'CSV_Import_v1';
        return isAIExtracted ? (
          <AIInterviewEditor
            applicationType={selectedAppType}
            interviewData={{
              interview_name: selectedAppType.name,
              description: selectedAppType.description,
              sections: typeof selectedAppType.sections === 'string' 
                ? JSON.parse(selectedAppType.sections || '[]')
                : (selectedAppType.sections || []),
              estimated_time_minutes: selectedAppType.estimated_time_minutes || 30
            }}
            onSave={(updatedInterview) => {
              const updatedAppType = {
                ...selectedAppType,
                name: updatedInterview.interview_name,
                description: updatedInterview.description,
                sections: JSON.stringify(updatedInterview.sections),
                estimated_time_minutes: updatedInterview.estimated_time_minutes
              };
              onUpdateApplicationType && onUpdateApplicationType(updatedAppType);
              setSelectedAppType(null);
            }}
            onClose={() => setSelectedAppType(null)}
          />
        ) : (
          <ApplicationTypeModal
            applicationType={selectedAppType}
            onClose={() => setSelectedAppType(null)}
            onSave={(updatedAppType) => {
              onUpdateApplicationType && onUpdateApplicationType(updatedAppType);
              setSelectedAppType(null);
            }}
          />
        );
      })()}
    </div>
  );
};

export default ApplicationTypesKanban;


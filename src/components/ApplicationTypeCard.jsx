import React from 'react';
import { Trash2 } from 'lucide-react';

const ApplicationTypeCard = ({ 
  applicationType, 
  onDelete,
  onClick
}) => {
  return (
    <div 
      className="bg-white rounded-lg w-80 flex-shrink-0 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick && onClick(applicationType)}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5"></div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {applicationType.name}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                {applicationType.status || 'Draft'}
              </div>
            </div>
          </div>
          <button
            className="text-gray-400 hover:text-red-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when deleting
              onDelete && onDelete(applicationType);
            }}
            title="Delete application type"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTypeCard;


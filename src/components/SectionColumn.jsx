import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import FieldCard from './FieldCard';

const SectionColumn = ({ section, onEditSection, onDeleteSection, onEditField, onDeleteField, onAddField }) => {
  const { setNodeRef } = useDroppable({
    id: section.id,
    data: { type: 'section', section }
  });

  const fieldIds = section.fields?.map(f => f.id) || [];

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
          {section.name}
        </h3>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditSection(section)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit section"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDeleteSection(section)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete section"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Field Count */}
      <div className="text-xs text-gray-500 mb-3">
        {section.fields?.length || 0} {section.fields?.length === 1 ? 'field' : 'fields'}
      </div>

      {/* Droppable Field Area */}
      <div
        ref={setNodeRef}
        className="min-h-[200px] space-y-2"
      >
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          {section.fields?.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              onEdit={onEditField}
              onDelete={onDeleteField}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {(!section.fields || section.fields.length === 0) && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">
            Drag fields here
          </div>
        )}
      </div>

      {/* Add Field Button */}
      <button
        onClick={() => onAddField(section)}
        className="w-full mt-3 py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-300 rounded-lg transition-colors"
      >
        + Add Field
      </button>
    </div>
  );
};

export default SectionColumn;


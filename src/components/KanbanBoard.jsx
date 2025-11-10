import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import SectionColumn from './SectionColumn';
import FieldCard from './FieldCard';

const KanbanBoard = ({ 
  sections, 
  onSectionsChange,
  onEditSection,
  onDeleteSection,
  onEditField,
  onDeleteField,
  onAddField,
  onAddSection
}) => {
  const [activeField, setActiveField] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    
    // Find the field being dragged
    for (const section of sections) {
      const field = section.fields?.find(f => f.id === active.id);
      if (field) {
        setActiveField(field);
        break;
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveField(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find source section and field
    let sourceSectionIndex = -1;
    let sourceFieldIndex = -1;
    let field = null;

    for (let i = 0; i < sections.length; i++) {
      const fieldIndex = sections[i].fields?.findIndex(f => f.id === activeId);
      if (fieldIndex !== -1 && fieldIndex !== undefined) {
        sourceSectionIndex = i;
        sourceFieldIndex = fieldIndex;
        field = sections[i].fields[fieldIndex];
        break;
      }
    }

    if (!field) return;

    // Find target section
    let targetSectionIndex = -1;
    let targetFieldIndex = -1;

    // Check if dropped on a section
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === overId) {
        targetSectionIndex = i;
        targetFieldIndex = sections[i].fields?.length || 0;
        break;
      }
      
      // Check if dropped on a field in this section
      const fieldIndex = sections[i].fields?.findIndex(f => f.id === overId);
      if (fieldIndex !== -1 && fieldIndex !== undefined) {
        targetSectionIndex = i;
        targetFieldIndex = fieldIndex;
        break;
      }
    }

    if (targetSectionIndex === -1) return;

    // Create new sections array
    const newSections = sections.map(s => ({
      ...s,
      fields: [...(s.fields || [])]
    }));

    // Remove field from source section
    newSections[sourceSectionIndex].fields.splice(sourceFieldIndex, 1);

    // If moving within the same section, adjust target index
    if (sourceSectionIndex === targetSectionIndex && sourceFieldIndex < targetFieldIndex) {
      targetFieldIndex--;
    }

    // Add field to target section
    newSections[targetSectionIndex].fields.splice(targetFieldIndex, 0, field);

    onSectionsChange(newSections);
  };

  const handleDragCancel = () => {
    setActiveField(null);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 p-4 min-h-[600px]">
          {sections.map((section) => (
            <SectionColumn
              key={section.id}
              section={section}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
              onAddField={onAddField}
            />
          ))}

          {/* Add Section Button */}
          <div className="flex-shrink-0 w-80">
            <button
              onClick={onAddSection}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors flex items-center justify-center"
            >
              <span className="text-lg">+ Add Section</span>
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeField ? (
            <div className="w-80 opacity-90">
              <FieldCard
                field={activeField}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;


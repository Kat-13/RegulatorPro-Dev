import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Info, AlertTriangle, AlertCircle } from 'lucide-react';

const API_BASE_URL = '/api';

// Helper function to convert field names to human-readable labels
const toReadableLabel = (fieldName) => {
  if (!fieldName) return '';
  // Remove field_ prefix and random numbers
  let label = fieldName.replace(/^field_\d+/, '');
  // Convert snake_case or camelCase to Title Case
  label = label
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return label || 'Field Label';
};

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'file', label: 'File Upload' }
];

const INSTRUCTION_STYLES = [
  { value: 'info', label: 'Info', icon: Info, color: 'blue' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'orange' },
  { value: 'alert', label: 'Alert', icon: AlertCircle, color: 'red' }
];

function AIInterviewEditor({ interviewData: initialData, applicationType, onClose, onSave }) {
  const [interviewData, setInterviewData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setInterviewData({
        id: applicationType?.id,
        name: initialData.interview_name || '',
        description: initialData.description || '',
        sections: normalizeToElements(initialData.sections || [])
      });
    } else if (applicationType) {
      loadInterviewData();
    }
  }, [initialData, applicationType]);

  // Normalize sections to use elements array (convert old questions format if needed)
  const normalizeToElements = (sections) => {
    return sections.map(section => {
      if (section.elements) {
        return section; // Already in new format
      }
      // Convert old questions format to new elements format
      if (section.questions) {
        return {
          ...section,
          elements: section.questions.map(q => ({
            element_type: 'question',
            ...q
          }))
        };
      }
      return { ...section, elements: [] };
    });
  };

  const loadInterviewData = () => {
    try {
      // Parse sections if it's a string
      let sections = applicationType.sections;
      if (typeof sections === 'string') {
        sections = JSON.parse(sections);
      }

      setInterviewData({
        id: applicationType.id,
        name: applicationType.name || '',
        description: applicationType.description || '',
        sections: normalizeToElements(sections || [])
      });

      // Expand first section by default
      if (sections && sections.length > 0) {
        setExpandedSections({ 0: true });
      }
    } catch (error) {
      console.error('Error loading interview data:', error);
      alert('Failed to load interview data');
    }
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const updateInterviewName = (name) => {
    setInterviewData(prev => ({ ...prev, name }));
    setHasChanges(true);
  };

  const updateInterviewDescription = (description) => {
    setInterviewData(prev => ({ ...prev, description }));
    setHasChanges(true);
  };

  const updateSectionTitle = (sectionIndex, title) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        title
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateSectionDescription = (sectionIndex, description) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        description
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteSection = (sectionIndex) => {
    if (!confirm('Delete this entire section?')) return;
    setInterviewData(prev => {
      const newSections = prev.sections.filter((_, i) => i !== sectionIndex);
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateQuestionText = (sectionIndex, elementIndex, text) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const element = newSections[sectionIndex].elements[elementIndex];
      if ('question_text' in element) {
        element.question_text = text;
      } else {
        element.question = text;
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteElement = (sectionIndex, elementIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements = newSections[sectionIndex].elements.filter((_, i) => i !== elementIndex);
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addQuestion = (sectionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements.push({
        element_type: 'question',
        question_text: 'New Question',
        question_type: 'fields',
        fields: []
      });
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addInstructionBlock = (sectionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements.push({
        element_type: 'instruction_block',
        title: 'Important Note',
        content: 'Enter instruction text here...',
        style: 'info'
      });
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateInstructionContent = (sectionIndex, elementIndex, content) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].content = content;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateInstructionTitle = (sectionIndex, elementIndex, title) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].title = title;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateInstructionStyle = (sectionIndex, elementIndex, style) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].style = style;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldLabel = (sectionIndex, elementIndex, fieldIndex, label) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].fields[fieldIndex] = {
        ...newSections[sectionIndex].elements[elementIndex].fields[fieldIndex],
        label
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldType = (sectionIndex, elementIndex, fieldIndex, fieldType) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const field = newSections[sectionIndex].elements[elementIndex].fields[fieldIndex];
      if ('field_type' in field) {
        field.field_type = fieldType;
      } else {
        field.type = fieldType;
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldRequired = (sectionIndex, elementIndex, fieldIndex, required) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].fields[fieldIndex] = {
        ...newSections[sectionIndex].elements[elementIndex].fields[fieldIndex],
        required
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteField = (sectionIndex, elementIndex, fieldIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].fields = 
        newSections[sectionIndex].elements[elementIndex].fields.filter((_, i) => i !== fieldIndex);
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addField = (sectionIndex, elementIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].elements[elementIndex].fields.push({
        name: `field_${Date.now()}`,
        label: 'New Field',
        field_type: 'text',
        required: false
      });
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        name: interviewData.name,
        description: interviewData.description,
        sections: JSON.stringify(interviewData.sections)
      };

      const response = await fetch(`${API_BASE_URL}/application-types/${interviewData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save interview');
      }

      setHasChanges(false);
      if (onSave) {
        onSave();
      }
      alert('Interview saved successfully!');
    } catch (error) {
      console.error('Error saving interview:', error);
      alert('Failed to save interview. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!interviewData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading interview data...</p>
        </div>
      </div>
    );
  }

  const totalQuestions = interviewData.sections.reduce((sum, section) => {
    return sum + (section.elements || []).filter(e => e.element_type === 'question').length;
  }, 0);
  const estimatedMinutes = Math.ceil(totalQuestions * 1.5);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <input
              type="text"
              value={interviewData.name}
              onChange={(e) => updateInterviewName(e.target.value)}
              className="text-2xl font-bold text-gray-900 border-none outline-none w-full bg-gray-50 px-3 py-2 rounded"
              placeholder="Interview Name"
            />
            <textarea
              value={interviewData.description}
              onChange={(e) => updateInterviewDescription(e.target.value)}
              className="mt-2 text-sm text-gray-600 border-none outline-none w-full bg-gray-50 px-3 py-2 rounded resize-none"
              rows="2"
              placeholder="Interview description..."
            />
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 bg-gray-50 border-b flex gap-6 text-sm">
          <div>
            <span className="font-semibold">{interviewData.sections.length}</span> sections
          </div>
          <div>
            <span className="font-semibold">{totalQuestions}</span> questions
          </div>
          <div>
            <span className="font-semibold">{estimatedMinutes}</span> min estimated
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {interviewData.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border border-gray-300 rounded-lg overflow-hidden">
                {/* Section Header */}
                <div className="bg-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSection(sectionIndex)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {expandedSections[sectionIndex] ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={section.title || ''}
                        onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                        className="font-semibold text-gray-900 border-none outline-none bg-white px-3 py-1 rounded w-full"
                        placeholder="Section title..."
                      />
                      <input
                        type="text"
                        value={section.description || ''}
                        onChange={(e) => updateSectionDescription(sectionIndex, e.target.value)}
                        className="mt-1 text-sm text-gray-600 border-none outline-none bg-white px-3 py-1 rounded w-full"
                        placeholder="Section description..."
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {(section.elements || []).filter(e => e.element_type === 'question').length} questions
                    </span>
                    <button
                      onClick={() => deleteSection(sectionIndex)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Elements */}
                {expandedSections[sectionIndex] && (
                  <div className="p-4 space-y-4">
                    {(section.elements || []).map((element, elementIndex) => {
                      // Render instruction block
                      if (element.element_type === 'instruction_block') {
                        const styleConfig = INSTRUCTION_STYLES.find(s => s.value === element.style) || INSTRUCTION_STYLES[0];
                        const styleClasses = {
                          info: 'bg-blue-50 border-blue-300 text-blue-900',
                          warning: 'bg-orange-50 border-orange-300 text-orange-900',
                          alert: 'bg-red-50 border-red-300 text-red-900'
                        };
                        
                        return (
                          <div key={elementIndex} className={`border-l-4 rounded p-4 ${styleClasses[element.style] || styleClasses.info}`}>
                            <div className="flex items-start gap-3 mb-2">
                              <select
                                value={element.style || 'info'}
                                onChange={(e) => updateInstructionStyle(sectionIndex, elementIndex, e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                              >
                                {INSTRUCTION_STYLES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={element.title || ''}
                                onChange={(e) => updateInstructionTitle(sectionIndex, elementIndex, e.target.value)}
                                className="flex-1 font-semibold border-none outline-none bg-white px-3 py-1 rounded"
                                placeholder="Instruction title (optional)..."
                              />
                              <button
                                onClick={() => deleteElement(sectionIndex, elementIndex)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete instruction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={element.content || ''}
                              onChange={(e) => updateInstructionContent(sectionIndex, elementIndex, e.target.value)}
                              className="w-full text-sm border-none outline-none bg-white px-3 py-2 rounded resize-none"
                              rows="3"
                              placeholder="Instruction content..."
                            />
                          </div>
                        );
                      }

                      // Render question
                      const questionText = element.question_text || element.question || '';
                      return (
                        <div key={elementIndex} className="bg-white border border-gray-200 rounded-lg p-4">
                          {/* Question Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-sm font-semibold text-gray-500 mt-2">
                              Q{(section.elements || []).slice(0, elementIndex).filter(e => e.element_type === 'question').length + 1}
                            </span>
                            <input
                              type="text"
                              value={questionText}
                              onChange={(e) => updateQuestionText(sectionIndex, elementIndex, e.target.value)}
                              className="flex-1 text-gray-900 font-medium border-none outline-none bg-gray-50 px-3 py-2 rounded"
                              placeholder="Question text..."
                            />
                            <button
                              onClick={() => deleteElement(sectionIndex, elementIndex)}
                              className="text-red-600 hover:text-red-800 mt-2"
                              title="Delete question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Fields */}
                          <div className="ml-8 space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Fields to Collect:</div>
                            {element.fields && element.fields.map((field, fieldIndex) => {
                              const fieldType = field.field_type || field.type || 'text';
                              return (
                                <div key={fieldIndex} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={field.label || toReadableLabel(field.name)}
                                    onChange={(e) => updateFieldLabel(sectionIndex, elementIndex, fieldIndex, e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Field label"
                                  />
                                  <select
                                    value={fieldType}
                                    onChange={(e) => updateFieldType(sectionIndex, elementIndex, fieldIndex, e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    {FIELD_TYPES.map(ft => (
                                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                                    ))}
                                  </select>
                                  <label className="flex items-center gap-1 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={field.required || false}
                                      onChange={(e) => updateFieldRequired(sectionIndex, elementIndex, fieldIndex, e.target.checked)}
                                      className="rounded border-gray-300"
                                    />
                                    <span className="text-gray-600">Required</span>
                                  </label>
                                  <button
                                    onClick={() => deleteField(sectionIndex, elementIndex, fieldIndex)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete field"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => addField(sectionIndex, elementIndex)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Field
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add Element Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => addQuestion(sectionIndex)}
                        className="flex-1 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-300 rounded-lg hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Question
                      </button>
                      <button
                        onClick={() => addInstructionBlock(sectionIndex)}
                        className="flex-1 flex items-center justify-center gap-2 text-green-600 hover:text-green-800 px-4 py-2 border border-green-300 rounded-lg hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Instruction Block
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {hasChanges && 'Unsaved changes'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIInterviewEditor;

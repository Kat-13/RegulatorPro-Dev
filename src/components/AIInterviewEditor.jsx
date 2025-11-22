import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

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

function AIInterviewEditor({ interviewData: initialData, applicationType, onClose, onSave }) {
  const [interviewData, setInterviewData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedElement, setDraggedElement] = useState(null);
  const [draggedSection, setDraggedSection] = useState(null);

  useEffect(() => {
    if (initialData) {
      setInterviewData({
        id: applicationType?.id,
        name: initialData.interview_name || '',
        description: initialData.description || '',
        sections: initialData.sections || []
      });
    } else if (applicationType) {
      loadInterviewData();
    }
  }, [initialData, applicationType]);

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
        sections: sections || []
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
    if (!confirm('Are you sure you want to delete this section?')) return;
    
    setInterviewData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== sectionIndex)
    }));
    setHasChanges(true);
  };

  const addSection = () => {
    setInterviewData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: 'New Section',
          description: '',
          questions: []
        }
      ]
    }));
    setHasChanges(true);
  };

  const updateQuestionText = (sectionIndex, questionIndex, text) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const question = elements[questionIndex];
      // Handle both question_text and question field names
      if ('question_text' in question) {
        question.question_text = text;
      } else {
        question.question = text;
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteQuestion = (sectionIndex, questionIndex) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      if (newSections[sectionIndex].elements) {
        newSections[sectionIndex].elements = newSections[sectionIndex].elements.filter((_, i) => i !== questionIndex);
      } else if (newSections[sectionIndex].questions) {
        newSections[sectionIndex].questions = newSections[sectionIndex].questions.filter((_, i) => i !== questionIndex);
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addQuestion = (sectionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const newQuestion = {
        element_type: 'question',
        question_text: 'New Question',
        fields: []
      };
      
      if (newSections[sectionIndex].elements) {
        newSections[sectionIndex].elements.push(newQuestion);
      } else {
        if (!newSections[sectionIndex].questions) {
          newSections[sectionIndex].questions = [];
        }
        newSections[sectionIndex].questions.push(newQuestion);
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addInstructionBlock = (sectionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const newInstruction = {
        element_type: 'instruction_block',
        title: 'New Instruction',
        content: 'Enter instruction content here...',
        style: 'info'
      };
      
      if (newSections[sectionIndex].elements) {
        newSections[sectionIndex].elements.push(newInstruction);
      } else {
        // Convert to elements array
        newSections[sectionIndex].elements = [
          ...(newSections[sectionIndex].questions || []).map(q => ({...q, element_type: 'question'})),
          newInstruction
        ];
        delete newSections[sectionIndex].questions;
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateElementTitle = (sectionIndex, elementIndex, title) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[elementIndex].title = title;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateElementContent = (sectionIndex, elementIndex, content) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[elementIndex].content = content;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateElementStyle = (sectionIndex, elementIndex, style) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[elementIndex].style = style;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteElement = (sectionIndex, elementIndex) => {
    if (!confirm('Are you sure you want to delete this element?')) return;
    
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      if (newSections[sectionIndex].elements) {
        newSections[sectionIndex].elements = newSections[sectionIndex].elements.filter((_, i) => i !== elementIndex);
      } else if (newSections[sectionIndex].questions) {
        newSections[sectionIndex].questions = newSections[sectionIndex].questions.filter((_, i) => i !== elementIndex);
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldLabel = (sectionIndex, questionIndex, fieldIndex, label) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[questionIndex].fields[fieldIndex] = {
        ...elements[questionIndex].fields[fieldIndex],
        label
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldType = (sectionIndex, questionIndex, fieldIndex, type) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const field = elements[questionIndex].fields[fieldIndex];
      // Handle both field_type and type field names
      if ('field_type' in field) {
        field.field_type = type;
      } else {
        field.type = type;
      }
      // Initialize options array for types that need it
      if (['select', 'dropdown', 'radio', 'checkbox'].includes(type)) {
        if (!field.options || field.options.length === 0) {
          field.options = ['Option 1', 'Option 2'];
        }
      }
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldRequired = (sectionIndex, questionIndex, fieldIndex, required) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[questionIndex].fields[fieldIndex] = {
        ...elements[questionIndex].fields[fieldIndex],
        required
      };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addFieldOption = (sectionIndex, questionIndex, fieldIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const field = elements[questionIndex].fields[fieldIndex];
      field.options = field.options || [];
      field.options.push('');
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const updateFieldOption = (sectionIndex, questionIndex, fieldIndex, optionIndex, value) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const field = elements[questionIndex].fields[fieldIndex];
      field.options[optionIndex] = value;
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteFieldOption = (sectionIndex, questionIndex, fieldIndex, optionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      const field = elements[questionIndex].fields[fieldIndex];
      field.options = field.options.filter((_, i) => i !== optionIndex);
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const deleteField = (sectionIndex, questionIndex, fieldIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[questionIndex].fields = 
        elements[questionIndex].fields.filter((_, i) => i !== fieldIndex);
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const addField = (sectionIndex, questionIndex) => {
    setInterviewData(prev => {
      const newSections = [...prev.sections];
      const elements = newSections[sectionIndex].elements || newSections[sectionIndex].questions || [];
      elements[questionIndex].fields.push({
        name: `field_${Date.now()}`,
        label: 'New Field',
        field_type: 'text',
        required: false
      });
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  const handleDragStart = (sectionIndex, elementIndex) => {
    setDraggedElement({ sectionIndex, elementIndex });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (sectionIndex, targetElementIndex) => {
    if (!draggedElement || draggedElement.sectionIndex !== sectionIndex) {
      return;
    }

    const newSections = [...interviewData.sections];
    const section = newSections[sectionIndex];
    const elements = section.elements || section.questions || [];
    
    const [movedElement] = elements.splice(draggedElement.elementIndex, 1);
    elements.splice(targetElementIndex, 0, movedElement);
    
    if (section.elements) {
      section.elements = elements;
    } else {
      section.questions = elements;
    }
    
    setInterviewData({ ...interviewData, sections: newSections });
    setHasChanges(true);
    setDraggedElement(null);
  };

  const handleSectionDragStart = (sectionIndex) => {
    setDraggedSection(sectionIndex);
  };

  const handleSectionDragOver = (e) => {
    e.preventDefault();
  };

  const handleSectionDrop = (targetSectionIndex) => {
    if (draggedSection === null || draggedSection === targetSectionIndex) {
      return;
    }

    const newSections = [...interviewData.sections];
    const [movedSection] = newSections.splice(draggedSection, 1);
    newSections.splice(targetSectionIndex, 0, movedSection);
    
    setInterviewData({ ...interviewData, sections: newSections });
    setHasChanges(true);
    setDraggedSection(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/application-types/${interviewData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: interviewData.name,
          description: interviewData.description,
          sections: JSON.stringify(interviewData.sections)
        })
      });

      if (response.ok) {
        setHasChanges(false);
        alert('✓ Interview saved successfully! You can continue editing or close this window.');
        // Don't call onSave here - that closes the modal
        // User can close manually when done editing
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save interview');
    } finally {
      setSaving(false);
    }
  };

  if (!interviewData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  const totalQuestions = (interviewData.sections || []).reduce((sum, section) => {
    const elements = section.elements || section.questions || [];
    const questionCount = elements.filter(el => !el.element_type || el.element_type === 'question').length;
    return sum + questionCount;
  }, 0);
  const estimatedMinutes = Math.ceil(totalQuestions * 1.5);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex-1">
            <input
              type="text"
              value={interviewData.name}
              onChange={(e) => updateInterviewName(e.target.value)}
              className="text-2xl font-bold text-white bg-transparent border-none outline-none w-full placeholder-blue-200"
              placeholder="Interview Name"
            />
            <textarea
              value={interviewData.description}
              onChange={(e) => updateInterviewDescription(e.target.value)}
              className="text-sm text-blue-100 bg-transparent border-none outline-none w-full mt-2 resize-none placeholder-blue-300"
              placeholder="Interview description..."
              rows={2}
            />
          </div>
          <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 text-sm text-gray-600">
          <span>{interviewData.sections.length} sections</span>
          <span>{totalQuestions} questions</span>
          <span>{estimatedMinutes} min estimated</span>
          {hasChanges && <span className="text-orange-600 font-medium">● Unsaved changes</span>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {interviewData.sections.map((section, sectionIndex) => (
            <div 
              key={sectionIndex} 
              className="mb-6 border border-gray-200 rounded-lg overflow-hidden"
              onDragOver={handleSectionDragOver}
              onDrop={() => handleSectionDrop(sectionIndex)}
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 flex items-center justify-between">
                <div className="flex-1 flex items-center gap-3">
                  <div 
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleSectionDragStart(sectionIndex);
                    }}
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {expandedSections[sectionIndex] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
                      placeholder="Section Title"
                    />
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) => updateSectionDescription(sectionIndex, e.target.value)}
                      className="text-sm text-gray-600 bg-transparent border-none outline-none w-full mt-1"
                      placeholder="Section description..."
                    />
                  </div>
                  <span className="text-sm text-gray-500">{(section.elements || section.questions || []).length} items</span>
                </div>
                <button
                  onClick={() => deleteSection(sectionIndex)}
                  className="ml-4 text-red-600 hover:text-red-800"
                  title="Delete section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Questions and Instruction Blocks */}
              {expandedSections[sectionIndex] && (
                <div className="p-4 space-y-4">
                  {(section.elements || section.questions || []).map((element, elementIndex) => {
                    const isInstructionBlock = element.element_type === 'instruction_block';
                    
                    if (isInstructionBlock) {
                      return (
                        <div 
                          key={elementIndex} 
                          className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 cursor-move"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(sectionIndex, elementIndex);
                          }}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(sectionIndex, elementIndex)}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-sm font-semibold text-blue-600 mt-2">INFO</span>
                            <input
                              type="text"
                              value={element.title || ''}
                              onChange={(e) => updateElementTitle(sectionIndex, elementIndex, e.target.value)}
                              className="flex-1 text-blue-900 font-medium border-none outline-none bg-blue-100 px-3 py-2 rounded"
                              placeholder="Instruction title..."
                            />
                            <button
                              onClick={() => deleteElement(sectionIndex, elementIndex)}
                              className="text-red-600 hover:text-red-800 mt-2"
                              title="Delete instruction block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="ml-8">
                            <textarea
                              value={element.content || ''}
                              onChange={(e) => updateElementContent(sectionIndex, elementIndex, e.target.value)}
                              className="w-full text-gray-700 border border-blue-300 outline-none bg-white px-3 py-2 rounded min-h-[80px]"
                              placeholder="Instruction content..."
                              rows={4}
                            />
                            <div className="mt-2">
                              <label className="text-xs font-semibold text-gray-600 uppercase">Style:</label>
                              <select
                                value={element.style || 'info'}
                                onChange={(e) => updateElementStyle(sectionIndex, elementIndex, e.target.value)}
                                className="ml-2 px-2 py-1 border border-blue-300 rounded text-sm"
                              >
                                <option value="info">Info (Blue)</option>
                                <option value="warning">Warning (Red)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Render question
                    const question = element;
                    const questionIndex = elementIndex;
                    const questionText = question.question_text || question.question || '';
                    return (
                      <div 
                        key={questionIndex} 
                        className="bg-white border border-gray-200 rounded-lg p-4 cursor-move"
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(sectionIndex, questionIndex);
                        }}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(sectionIndex, questionIndex)}
                      >
                        {/* Question Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-sm font-semibold text-gray-500 mt-2">Q{questionIndex + 1}</span>
                          <input
                            type="text"
                            value={questionText}
                            onChange={(e) => updateQuestionText(sectionIndex, questionIndex, e.target.value)}
                            className="flex-1 text-gray-900 font-medium border-none outline-none bg-gray-50 px-3 py-2 rounded"
                            placeholder="Question text..."
                          />
                          <button
                            onClick={() => deleteQuestion(sectionIndex, questionIndex)}
                            className="text-red-600 hover:text-red-800 mt-2"
                            title="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fields */}
                        <div className="ml-8 space-y-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Fields to Collect:</div>
                          {question.fields && question.fields.map((field, fieldIndex) => {
                            const fieldType = field.field_type || field.type || 'text';
                            const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(fieldType);
                            return (
                              <div key={fieldIndex} className="bg-gray-50 p-2 rounded space-y-2">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={field.label || ''}
                                  onChange={(e) => updateFieldLabel(sectionIndex, questionIndex, fieldIndex, e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder={toReadableLabel(field.name) || 'Field label'}
                                />
                                <select
                                  value={fieldType}
                                  onChange={(e) => updateFieldType(sectionIndex, questionIndex, fieldIndex, e.target.value)}
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
                                    onChange={(e) => updateFieldRequired(sectionIndex, questionIndex, fieldIndex, e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-gray-600">Required</span>
                                </label>
                                <button
                                  onClick={() => deleteField(sectionIndex, questionIndex, fieldIndex)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete field"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {/* Options configuration for dropdown/radio/checkbox */}
                              {needsOptions && (
                                <div className="ml-6 pl-4 border-l-2 border-gray-300 space-y-2">
                                  <div className="text-xs font-semibold text-gray-600">Options:</div>
                                  {(field.options || []).map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateFieldOption(sectionIndex, questionIndex, fieldIndex, optIndex, e.target.value)}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                        placeholder={`Option ${optIndex + 1}`}
                                      />
                                      <button
                                        onClick={() => deleteFieldOption(sectionIndex, questionIndex, fieldIndex, optIndex)}
                                        className="text-red-600 hover:text-red-800"
                                        title="Delete option"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addFieldOption(sectionIndex, questionIndex, fieldIndex)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Option
                                  </button>
                                </div>
                              )}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => addField(sectionIndex, questionIndex)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Field
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => addQuestion(sectionIndex)}
                      className="flex-1 flex items-center gap-2 text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Add Question
                    </button>
                    <button
                      onClick={() => addInstructionBlock(sectionIndex)}
                      className="flex-1 flex items-center gap-2 text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Add Instruction Block
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addSection}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 w-full justify-center font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Section
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !interviewData?.sections?.length}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Interview'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIInterviewEditor;

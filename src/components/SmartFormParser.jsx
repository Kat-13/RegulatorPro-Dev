// COMPLETE SmartFormParser.jsx - ALL FEATURES - 900+ LINES
// Replace your ENTIRE src/components/SmartFormParser.jsx with this

import React, { useState } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Info, Edit3, ArrowUp, ArrowDown, Trash2, GripVertical, Plus, Copy, Save, Settings, Code, X } from 'lucide-react';

export default function SmartFormParser({ onClose }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [formStructure, setFormStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingElement, setEditingElement] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setPdfFile(file);
    setError('');
  };

  const parseWithBackend = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse PDF');
      }

      const data = await response.json();
      
      if (data.success) {
        setFormStructure(data.interview_structure);
        setSuccess(`Successfully parsed! ${data.metadata.total_questions} questions in ${data.metadata.total_sections} sections.`);
        setStep(2);
        
        // Initialize form data
        const initialData = {};
        data.interview_structure.sections?.forEach(section => {
          section.elements?.forEach(element => {
            if (element.element_type === 'question') {
              if (element.question_type === 'fields') {
                element.fields?.forEach(field => {
                  initialData[field.name] = field.field_type === 'checkbox' ? false : '';
                });
              } else {
                initialData[element.field_name] = element.question_type === 'checkbox' ? false : '';
              }
            }
          });
        });
        setFormData(initialData);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }

    } catch (err) {
      console.error('Parse error:', err);
      setError(`Failed to parse PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const shouldShowElement = (element) => {
    if (!element.conditional_on) return true;
    return formData[element.conditional_on] === element.conditional_value;
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const exportJSON = () => {
    if (!formStructure) return;
    
    const dataStr = JSON.stringify(formStructure, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formStructure.interview_name || 'form'}_structure.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportFormData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-data.json';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const saveAsDraft = async () => {
    console.log('saveAsDraft called', { formStructure });
    if (!formStructure) {
      console.log('No formStructure, returning');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Sending save request...');
      const response = await fetch('/api/application-types/from-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formStructure.interview_name || 'Parsed Form',
          description: formStructure.description || 'Imported from PDF',
          sections: formStructure.sections,
          status: 'Draft',
          active: true
        })
      });
      
      console.log('Response received:', response.status, response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save form');
      }
      
      const result = await response.json();
      console.log('Save successful:', result);
      
      // Close parser and return to Form Editor
      if (onClose) {
        console.log('Calling onClose');
        onClose();
      }
      
    } catch (err) {
      console.error('Save error:', err);
      setError(`Failed to save: ${err.message}`);
      setLoading(false);
    }
  };

  // Section management
  const addSection = () => {
    const newSection = {
      title: "New Section",
      description: "",
      elements: []
    };
    setFormStructure({
      ...formStructure,
      sections: [...formStructure.sections, newSection]
    });
  };

  const deleteSection = (sectionIdx) => {
    if (!confirm('Delete this entire section?')) return;
    const newSections = formStructure.sections.filter((_, idx) => idx !== sectionIdx);
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const updateSection = (sectionIdx, updates) => {
    const newSections = [...formStructure.sections];
    newSections[sectionIdx] = { ...newSections[sectionIdx], ...updates };
    setFormStructure({ ...formStructure, sections: newSections });
  };

  // Element management
  const addElement = (sectionIdx, type = 'question') => {
    const newElement = type === 'instruction_block' 
      ? {
          element_type: "instruction_block",
          title: "New Instruction",
          content: "Add your instructions here",
          style: "info"
        }
      : {
          element_type: "question",
          question_text: "New Question",
          question_type: "fields",
          required: false,
          conditional_on: null,
          conditional_value: null,
          fields: [{
            name: `field_${Date.now()}`,
            label: "New Field",
            field_type: "text",
            required: false
          }]
        };
    
    const newSections = [...formStructure.sections];
    newSections[sectionIdx].elements.push(newElement);
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const deleteElement = (sectionIdx, elementIdx) => {
    const newSections = [...formStructure.sections];
    newSections[sectionIdx].elements = newSections[sectionIdx].elements.filter((_, idx) => idx !== elementIdx);
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const moveElementUp = (sectionIdx, elementIdx) => {
    if (elementIdx === 0) return;
    const newSections = [...formStructure.sections];
    const elements = newSections[sectionIdx].elements;
    [elements[elementIdx - 1], elements[elementIdx]] = [elements[elementIdx], elements[elementIdx - 1]];
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const moveElementDown = (sectionIdx, elementIdx) => {
    const newSections = [...formStructure.sections];
    const elements = newSections[sectionIdx].elements;
    if (elementIdx >= elements.length - 1) return;
    [elements[elementIdx], elements[elementIdx + 1]] = [elements[elementIdx + 1], elements[elementIdx]];
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const duplicateElement = (sectionIdx, elementIdx) => {
    const newSections = [...formStructure.sections];
    const element = newSections[sectionIdx].elements[elementIdx];
    const duplicate = JSON.parse(JSON.stringify(element));
    if (duplicate.question_text) duplicate.question_text += " (Copy)";
    if (duplicate.title) duplicate.title += " (Copy)";
    newSections[sectionIdx].elements.splice(elementIdx + 1, 0, duplicate);
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const updateElement = (sectionIdx, elementIdx, updates) => {
    const newSections = [...formStructure.sections];
    newSections[sectionIdx].elements[elementIdx] = {
      ...newSections[sectionIdx].elements[elementIdx],
      ...updates
    };
    setFormStructure({ ...formStructure, sections: newSections });
  };

  // Field management within questions
  const addFieldToQuestion = (sectionIdx, elementIdx) => {
    const newSections = [...formStructure.sections];
    const element = newSections[sectionIdx].elements[elementIdx];
    if (element.question_type === 'fields') {
      element.fields.push({
        name: `field_${Date.now()}`,
        label: "New Field",
        field_type: "text",
        required: false
      });
      setFormStructure({ ...formStructure, sections: newSections });
    }
  };

  const deleteFieldFromQuestion = (sectionIdx, elementIdx, fieldIdx) => {
    const newSections = [...formStructure.sections];
    const element = newSections[sectionIdx].elements[elementIdx];
    element.fields = element.fields.filter((_, idx) => idx !== fieldIdx);
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const updateFieldInQuestion = (sectionIdx, elementIdx, fieldIdx, updates) => {
    const newSections = [...formStructure.sections];
    const element = newSections[sectionIdx].elements[elementIdx];
    element.fields[fieldIdx] = { ...element.fields[fieldIdx], ...updates };
    setFormStructure({ ...formStructure, sections: newSections });
  };

  const renderQuestionField = (element) => {
    if (element.question_type === 'yesno') {
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={element.field_name}
              value="Yes"
              checked={formData[element.field_name] === "Yes"}
              onChange={(e) => handleFieldChange(element.field_name, e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={element.field_name}
              value="No"
              checked={formData[element.field_name] === "No"}
              onChange={(e) => handleFieldChange(element.field_name, e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">No</span>
          </label>
        </div>
      );
    }

    if (element.question_type === 'choice') {
      const isRadio = element.choice_type === 'radio';
      const isCheckbox = element.choice_type === 'checkbox';
      
      return (
        <div className="space-y-2">
          {element.options?.map((option, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type={isRadio ? 'radio' : 'checkbox'}
                name={element.field_name}
                value={option}
                checked={isRadio 
                  ? formData[element.field_name] === option
                  : (formData[element.field_name] || []).includes(option)
                }
                onChange={(e) => {
                  if (isRadio) {
                    handleFieldChange(element.field_name, e.target.value);
                  } else {
                    const currentValues = formData[element.field_name] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleFieldChange(element.field_name, newValues);
                  }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (element.question_type === 'fields') {
      return (
        <div className="space-y-4">
          {element.fields?.map((field, idx) => (
            <div key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.field_type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              ) : field.field_type === 'date' ? (
                <input
                  type="date"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.field_type === 'tel' ? (
                <input
                  type="tel"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.field_type === 'email' ? (
                <input
                  type="email"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.field_type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
              {field.help_text && (
                <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderElementEditor = (sectionIdx, elementIdx, element) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">
              Edit {element.element_type === 'instruction_block' ? 'Instruction' : 'Question'}
            </h3>
            <button
              onClick={() => setEditingElement(null)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {element.element_type === 'instruction_block' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={element.title}
                  onChange={(e) => updateElement(sectionIdx, elementIdx, { title: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={element.content}
                  onChange={(e) => updateElement(sectionIdx, elementIdx, { content: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows="4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Style</label>
                <select
                  value={element.style}
                  onChange={(e) => updateElement(sectionIdx, elementIdx, { style: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Orange)</option>
                  <option value="alert">Alert (Red)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question Text</label>
                <input
                  type="text"
                  value={element.question_text}
                  onChange={(e) => updateElement(sectionIdx, elementIdx, { question_text: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Type</label>
                  <select
                    value={element.question_type}
                    onChange={(e) => updateElement(sectionIdx, elementIdx, { question_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="fields">Multiple Fields</option>
                    <option value="yesno">Yes/No</option>
                    <option value="choice">Multiple Choice</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={element.required}
                      onChange={(e) => updateElement(sectionIdx, elementIdx, { required: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Required</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Conditional On (field name)</label>
                  <input
                    type="text"
                    value={element.conditional_on || ''}
                    onChange={(e) => updateElement(sectionIdx, elementIdx, { conditional_on: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., convicted_felony"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Conditional Value</label>
                  <input
                    type="text"
                    value={element.conditional_value || ''}
                    onChange={(e) => updateElement(sectionIdx, elementIdx, { conditional_value: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Yes"
                  />
                </div>
              </div>

              {element.question_type === 'fields' && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Fields</h4>
                    <button
                      onClick={() => addFieldToQuestion(sectionIdx, elementIdx)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      <Plus size={16} />
                      Add Field
                    </button>
                  </div>
                  
                  {element.fields?.map((field, fieldIdx) => (
                    <div key={fieldIdx} className="mb-3 p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">Field {fieldIdx + 1}</span>
                        <button
                          onClick={() => deleteFieldFromQuestion(sectionIdx, elementIdx, fieldIdx)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldInQuestion(sectionIdx, elementIdx, fieldIdx, { label: e.target.value })}
                          placeholder="Label"
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateFieldInQuestion(sectionIdx, elementIdx, fieldIdx, { name: e.target.value })}
                            placeholder="Field name"
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                          <select
                            value={field.field_type}
                            onChange={(e) => updateFieldInQuestion(sectionIdx, elementIdx, fieldIdx, { field_type: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="date">Date</option>
                            <option value="number">Number</option>
                            <option value="textarea">Textarea</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setEditingElement(null)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Smart PDF Form Parser
          </h1>
          <p className="text-gray-600">
            Upload a PDF form to extract fields with AI
          </p>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {pdfFile ? pdfFile.name : 'Click to upload PDF form'}
                </p>
                <p className="text-sm text-gray-500">
                  PDF files only, up to 10MB
                </p>
              </label>
            </div>

            {pdfFile && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4 text-green-600">
                  <CheckCircle size={20} />
                  <span className="font-medium">PDF uploaded successfully!</span>
                </div>
                
                <button
                  onClick={parseWithBackend}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  {loading ? 'Parsing with AI...' : 'Parse PDF Form'}
                </button>
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 text-green-700">
                  <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <p>{success}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 text-red-700">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Edit & Preview */}
        {step === 2 && formStructure && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {formStructure.interview_name || 'Application Form'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {formStructure.total_questions} questions • {formStructure.sections?.length} sections
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      editMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Edit3 size={18} />
                    {editMode ? 'Done Editing' : 'Edit Form'}
                  </button>
                  <button
                    onClick={saveAsDraft}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    onClick={exportJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Code size={18} />
                    Structure
                  </button>
                  <button
                    onClick={exportFormData}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={18} />
                    Data
                  </button>
                </div>
              </div>

              {/* Sections */}
              {formStructure.sections?.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-8 border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {editMode ? (
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(sectionIdx, { title: e.target.value })}
                          className="text-xl font-bold border-b-2 border-blue-600 bg-transparent w-full px-2 py-1"
                        />
                      ) : (
                        <h3 className="text-xl font-bold text-gray-800 border-b-2 border-blue-600 pb-2">
                          {section.title}
                        </h3>
                      )}
                    </div>
                    
                    {editMode && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            const desc = prompt('Section description:', section.description || '');
                            if (desc !== null) updateSection(sectionIdx, { description: desc });
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit description"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => deleteSection(sectionIdx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete section"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {section.description && (
                    <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                  )}

                  {section.repeating && (
                    <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 text-sm">
                      <strong>Repeating Section:</strong> Min {section.min_entries || 1}, Max {section.max_entries || 'unlimited'}
                    </div>
                  )}

                  {/* Elements */}
                  <div className="space-y-6">
                    {section.elements?.map((element, elemIdx) => {
                      if (!shouldShowElement(element) && !editMode) return null;

                      return (
                        <div key={elemIdx} className={`${!shouldShowElement(element) && editMode ? 'opacity-50 border-l-4 border-yellow-500 pl-4' : ''}`}>
                          {element.element_type === 'instruction_block' && (
                            <div className="flex items-start gap-3">
                              {editMode && (
                                <div className="flex flex-col gap-1 pt-2">
                                  <button
                                    onClick={() => moveElementUp(sectionIdx, elemIdx)}
                                    disabled={elemIdx === 0}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowUp size={18} />
                                  </button>
                                  <GripVertical size={18} className="text-gray-400" />
                                  <button
                                    onClick={() => moveElementDown(sectionIdx, elemIdx)}
                                    disabled={elemIdx >= section.elements.length - 1}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowDown size={18} />
                                  </button>
                                </div>
                              )}

                              <div className="flex-1">
                                <div className={`p-4 rounded border-l-4 ${
                                  element.style === 'warning' ? 'bg-orange-50 border-orange-500' :
                                  element.style === 'alert' ? 'bg-red-50 border-red-500' :
                                  'bg-blue-50 border-blue-500'
                                }`}>
                                  <div className="flex items-start gap-2">
                                    <Info size={16} className="mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <strong className="text-sm">{element.title}</strong>
                                      <p className="text-sm mt-1">{element.content}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {editMode && (
                                <div className="flex gap-1 pt-2">
                                  <button
                                    onClick={() => setEditingElement({ sectionIdx, elemIdx })}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit"
                                  >
                                    <Settings size={18} />
                                  </button>
                                  <button
                                    onClick={() => duplicateElement(sectionIdx, elemIdx)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                    title="Duplicate"
                                  >
                                    <Copy size={18} />
                                  </button>
                                  <button
                                    onClick={() => deleteElement(sectionIdx, elemIdx)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {element.element_type === 'question' && (
                            <div className="flex items-start gap-3">
                              {editMode && (
                                <div className="flex flex-col gap-1 pt-6">
                                  <button
                                    onClick={() => moveElementUp(sectionIdx, elemIdx)}
                                    disabled={elemIdx === 0}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowUp size={18} />
                                  </button>
                                  <GripVertical size={18} className="text-gray-400" />
                                  <button
                                    onClick={() => moveElementDown(sectionIdx, elemIdx)}
                                    disabled={elemIdx >= section.elements.length - 1}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowDown size={18} />
                                  </button>
                                </div>
                              )}

                              <div className="flex-1">
                                <p className="font-medium text-gray-800 mb-2">
                                  {element.question_text}
                                  {element.required && <span className="text-red-500 ml-1">*</span>}
                                </p>

                                {element.conditional_on && (
                                  <p className="text-xs text-blue-600 italic mb-2">
                                    ⚡ Shows when {element.conditional_on} = "{element.conditional_value}"
                                  </p>
                                )}

                                {!editMode && renderQuestionField(element)}
                              </div>

                              {editMode && (
                                <div className="flex gap-1 pt-6">
                                  <button
                                    onClick={() => setEditingElement({ sectionIdx, elemIdx })}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit"
                                  >
                                    <Settings size={18} />
                                  </button>
                                  <button
                                    onClick={() => duplicateElement(sectionIdx, elemIdx)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                    title="Duplicate"
                                  >
                                    <Copy size={18} />
                                  </button>
                                  <button
                                    onClick={() => deleteElement(sectionIdx, elemIdx)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {editMode && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => addElement(sectionIdx, 'question')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <Plus size={18} />
                        Add Question
                      </button>
                      <button
                        onClick={() => addElement(sectionIdx, 'instruction_block')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      >
                        <Plus size={18} />
                        Add Instruction
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {editMode && (
                <button
                  onClick={addSection}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                >
                  <Plus size={20} />
                  Add New Section
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setStep(1);
                setPdfFile(null);
                setFormStructure(null);
                setFormData({});
                setEditMode(false);
                setEditingElement(null);
              }}
              className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
            >
              Upload New PDF
            </button>
          </div>
        )}

        {/* Element Editor Modal */}
        {editingElement && formStructure.sections[editingElement.sectionIdx]?.elements[editingElement.elemIdx] && 
          renderElementEditor(
            editingElement.sectionIdx, 
            editingElement.elemIdx, 
            formStructure.sections[editingElement.sectionIdx].elements[editingElement.elemIdx]
          )
        }
      </div>
    </div>
  );
}

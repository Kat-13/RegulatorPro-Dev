import React, { useState } from 'react';
import { Upload, FileText, Edit3, Download, AlertCircle, CheckCircle, ArrowUp, ArrowDown, Trash2, GripVertical, Plus, Info, Copy, Save, Settings, Code } from 'lucide-react';

export default function SmartPDFFormParser() {
  const [pdfFile, setPdfFile] = useState(null);
  const [formStructure, setFormStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setPdfFile(file);
    setError('');
  };

  const parseFormWithAI = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('enable_smart_features', 'true');

      // Call backend API
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse PDF');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Convert backend format to frontend format
      const interview = data.interview_structure;
      const parsedForm = {
        title: interview.interview_name || 'Application Form',
        sections: (interview.sections || []).map((section, sIdx) => ({
          id: `sec_${sIdx + 1}`,
          title: section.title,
          instructions: section.description || '',
          fields: (section.elements || []).flatMap((element, eIdx) => {
            if (element.element_type === 'question' && element.question_type === 'fields') {
              return (element.fields || []).map((field, fIdx) => ({
                id: field.name || `f_${sIdx}_${eIdx}_${fIdx}`,
                label: field.label,
                type: field.field_type || 'text',
                required: field.required || false,
                placeholder: field.placeholder || '',
                options: field.options || [],
                position: eIdx * 10 + fIdx,
                conditionalOn: element.conditional_on || null,
                conditionalValue: element.conditional_value || null,
                helpText: field.help_text || ''
              }));
            }
            return [];
          })
        }))
      };
      
      if (!parsedForm.sections || parsedForm.sections.length === 0) {
        throw new Error('No sections detected in form');
      }
      
      setFormStructure(parsedForm);
      setStep(2);
      
      const initialData = {};
      parsedForm.sections.forEach(section => {
        section.fields.forEach(field => {
          initialData[field.id] = field.type === 'checkbox' ? false : '';
        });
      });
      setFormData(initialData);

    } catch (err) {
      console.error('Full error:', err);
      setError(`Failed to parse PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const shouldShowField = (field) => {
    if (!field.conditionalOn) return true;
    return formData[field.conditionalOn] === field.conditionalValue;
  };

  const addSection = () => {
    const newSection = {
      id: `sec_${Date.now()}`,
      title: "New Section",
      instructions: "",
      fields: []
    };
    setFormStructure({
      ...formStructure,
      sections: [...formStructure.sections, newSection]
    });
  };

  const deleteSection = (sectionId) => {
    if (!confirm('Delete this entire section?')) return;
    setFormStructure({
      ...formStructure,
      sections: formStructure.sections.filter(s => s.id !== sectionId)
    });
  };

  const updateSection = (sectionId, updates) => {
    setFormStructure({
      ...formStructure,
      sections: formStructure.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
    });
  };

  const addFieldToSection = (sectionId) => {
    const section = formStructure.sections.find(s => s.id === sectionId);
    const newField = {
      id: `f_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
      position: section.fields.length + 1,
      conditionalOn: null,
      conditionalValue: null,
      helpText: ""
    };
    
    section.fields.push(newField);
    setFormStructure({...formStructure});
    setFormData({...formData, [newField.id]: ''});
  };

  const deleteField = (sectionId, fieldId) => {
    const section = formStructure.sections.find(s => s.id === sectionId);
    section.fields = section.fields.filter(f => f.id !== fieldId);
    setFormStructure({...formStructure});
    
    const newFormData = {...formData};
    delete newFormData[fieldId];
    setFormData(newFormData);
  };

  const updateField = (sectionId, fieldId, updates) => {
    const section = formStructure.sections.find(s => s.id === sectionId);
    section.fields = section.fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    );
    setFormStructure({...formStructure});
  };

  const moveFieldUp = (sectionId, fieldIndex) => {
    if (fieldIndex === 0) return;
    const section = formStructure.sections.find(s => s.id === sectionId);
    const fields = section.fields;
    [fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]];
    setFormStructure({...formStructure});
  };

  const moveFieldDown = (sectionId, fieldIndex) => {
    const section = formStructure.sections.find(s => s.id === sectionId);
    if (fieldIndex >= section.fields.length - 1) return;
    const fields = section.fields;
    [fields[fieldIndex], fields[fieldIndex + 1]] = [fields[fieldIndex + 1], fields[fieldIndex]];
    setFormStructure({...formStructure});
  };

  const duplicateField = (sectionId, fieldId) => {
    const section = formStructure.sections.find(s => s.id === sectionId);
    const field = section.fields.find(f => f.id === fieldId);
    const newField = {
      ...field,
      id: `f_${Date.now()}`,
      label: `${field.label} (Copy)`,
      position: section.fields.length + 1
    };
    section.fields.push(newField);
    setFormStructure({...formStructure});
    setFormData({...formData, [newField.id]: ''});
  };

  const exportFormData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'form-data.json');
    linkElement.click();
  };

  const exportFormStructure = () => {
    const dataStr = JSON.stringify(formStructure, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'form-structure.json');
    linkElement.click();
  };

  const saveFormAsApplicationType = async () => {
    if (!formStructure) {
      setError('No form structure to save');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert form structure to backend format
      const sections = formStructure.sections.map((section, idx) => ({
        section_id: idx + 1,
        title: section.title,
        description: section.instructions || '',
        questions: section.fields.map((field, qIdx) => ({
          question_id: qIdx + 1,
          question_text: field.label,
          question_type: 'fields',
          field_name: field.id,
          required: field.required,
          fields: [{
            name: field.id,
            label: field.label,
            field_type: field.type,
            required: field.required,
            placeholder: field.placeholder || '',
            help_text: field.helpText || ''
          }]
        }))
      }));

      const applicationTypeData = {
        name: formStructure.title,
        description: `Imported from PDF: ${formStructure.title}`,
        interview_structure: {
          interview_name: formStructure.title,
          sections: sections
        },
        status: 'draft'
      };

      const response = await fetch('/api/application-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationTypeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save application type');
      }

      const result = await response.json();
      alert(`Application type "${formStructure.title}" saved successfully!`);
      
      // Reload the page to show the new application type on the Kanban board
      window.location.reload();

    } catch (err) {
      console.error('Save error:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importFormStructure = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setFormStructure(imported);
        setStep(2);
        
        const initialData = {};
        imported.sections.forEach(section => {
          section.fields.forEach(field => {
            initialData[field.id] = field.type === 'checkbox' ? false : '';
          });
        });
        setFormData(initialData);
      } catch (err) {
        setError('Failed to import form structure. Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const renderField = (field) => {
    if (!shouldShowField(field)) return null;

    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required && shouldShowField(field)}
            className={`${baseClasses} h-32 resize-y`}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
      
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => handleFieldChange(field.id, e.target.files[0]?.name || '')}
            required={field.required}
            className={baseClasses}
          />
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={formData[field.id] || false}
            onChange={(e) => handleFieldChange(field.id, e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={formData[field.id] === opt}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      
      default:
        return (
          <input
            type={field.type}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Smart PDF Form Parser
          </h1>
          <p className="text-gray-600">
            Upload a PDF form to create an intelligent, conditional digital form
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="font-medium">Upload PDF</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="font-medium">Fill Form</span>
            </div>
          </div>
        </div>

        {/* Step 1: Upload PDF */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
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
                  onClick={parseFormWithAI}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  {loading ? 'Parsing Form...' : 'Parse Smart Form'}
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Or import a saved form structure:</p>
              <input
                type="file"
                accept="application/json"
                onChange={importFormStructure}
                className="hidden"
                id="import-structure"
              />
              <label htmlFor="import-structure" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Code size={18} />
                Import Form Structure (JSON)
              </label>
            </div>

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

        {/* Step 2: Smart Form */}
        {step === 2 && formStructure && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {formStructure.title || 'Application Form'}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={saveFormAsApplicationType}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save to Kanban'}
                  </button>
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
                    onClick={exportFormStructure}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Code size={18} />
                    Export Structure
                  </button>
                  <button
                    onClick={exportFormData}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={18} />
                    Export Data
                  </button>
                </div>
              </div>

              {/* Render Sections */}
              {formStructure.sections.map((section, sectionIndex) => (
                <div key={section.id} className="mb-8 last:mb-0 border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {editMode ? (
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="text-xl font-bold text-gray-800 border-b-2 border-blue-600 bg-transparent w-full"
                        />
                      ) : (
                        section.title && (
                          <h3 className="text-xl font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-600">
                            {section.title}
                          </h3>
                        )
                      )}
                    </div>
                    
                    {editMode && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            const inst = prompt('Edit section instructions:', section.instructions);
                            if (inst !== null) updateSection(section.id, { instructions: inst });
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit instructions"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete section"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {section.instructions && (
                    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                      <div className="flex items-start gap-2">
                        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        {editMode ? (
                          <textarea
                            value={section.instructions}
                            onChange={(e) => updateSection(section.id, { instructions: e.target.value })}
                            className="text-sm text-gray-700 w-full bg-white p-2 rounded border"
                            rows="3"
                          />
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {section.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Render Fields */}
                  <div className="space-y-6">
                    {section.fields.map((field, fieldIndex) => {
                      if (!shouldShowField(field) && !editMode) return null;
                      
                      return (
                        <div key={field.id} className={`space-y-2 ${!shouldShowField(field) && editMode ? 'opacity-50 border-l-4 border-yellow-500 pl-4' : ''}`}>
                          {editMode && editingField === field.id ? (
                            // Field Editor
                            <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-500">
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Label</label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                      value={field.type}
                                      onChange={(e) => updateField(section.id, field.id, { type: e.target.value })}
                                      className="w-full px-3 py-2 border rounded"
                                    >
                                      <option value="text">Text</option>
                                      <option value="email">Email</option>
                                      <option value="tel">Phone</option>
                                      <option value="date">Date</option>
                                      <option value="number">Number</option>
                                      <option value="textarea">Textarea</option>
                                      <option value="radio">Radio</option>
                                      <option value="checkbox">Checkbox</option>
                                      <option value="file">File</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">Required</span>
                                    </label>
                                  </div>
                                </div>
                                {(field.type === 'radio' || field.type === 'select') && (
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Options (comma separated)</label>
                                    <input
                                      type="text"
                                      value={field.options?.join(', ') || ''}
                                      onChange={(e) => updateField(section.id, field.id, { 
                                        options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                      })}
                                      className="w-full px-3 py-2 border rounded"
                                      placeholder="Option 1, Option 2, Option 3"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Help Text</label>
                                  <input
                                    type="text"
                                    value={field.helpText || ''}
                                    onChange={(e) => updateField(section.id, field.id, { helpText: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Conditional On Field ID</label>
                                    <input
                                      type="text"
                                      value={field.conditionalOn || ''}
                                      onChange={(e) => updateField(section.id, field.id, { conditionalOn: e.target.value || null })}
                                      className="w-full px-3 py-2 border rounded"
                                      placeholder="f_10"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Conditional Value</label>
                                    <input
                                      type="text"
                                      value={field.conditionalValue || ''}
                                      onChange={(e) => updateField(section.id, field.id, { conditionalValue: e.target.value || null })}
                                      className="w-full px-3 py-2 border rounded"
                                      placeholder="Yes"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => setEditingField(null)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  <Save size={16} />
                                  Done Editing
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Field Display/Input
                            <div className="flex items-start gap-3">
                              {editMode && (
                                <div className="flex flex-col gap-1 pt-6">
                                  <button
                                    onClick={() => moveFieldUp(section.id, fieldIndex)}
                                    disabled={fieldIndex === 0}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowUp size={18} />
                                  </button>
                                  <GripVertical size={18} className="text-gray-400" />
                                  <button
                                    onClick={() => moveFieldDown(section.id, fieldIndex)}
                                    disabled={fieldIndex >= section.fields.length - 1}
                                    className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                                  >
                                    <ArrowDown size={18} />
                                  </button>
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <label className="block">
                                  <span className="text-gray-700 font-medium">
                                    {editMode && <span className="text-gray-400 text-xs mr-2">ID: {field.id}</span>}
                                    {field.label}
                                    {field.required && shouldShowField(field) && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </span>
                                  {field.helpText && (
                                    <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>
                                  )}
                                </label>
                                {!editMode && renderField(field)}
                                {field.conditionalOn && (
                                  <p className="text-xs text-blue-600 italic mt-1">
                                    Shows when {field.conditionalOn} = "{field.conditionalValue}"
                                  </p>
                                )}
                              </div>

                              {editMode && (
                                <div className="flex gap-1 pt-6">
                                  <button
                                    onClick={() => setEditingField(field.id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit field"
                                  >
                                    <Settings size={18} />
                                  </button>
                                  <button
                                    onClick={() => duplicateField(section.id, field.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                    title="Duplicate"
                                  >
                                    <Copy size={18} />
                                  </button>
                                  <button
                                    onClick={() => deleteField(section.id, field.id)}
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
                    <button
                      onClick={() => addFieldToSection(section.id)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors w-full justify-center"
                    >
                      <Plus size={18} />
                      Add Field to This Section
                    </button>
                  )}
                </div>
              ))}

              {editMode && (
                <button
                  onClick={addSection}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors w-full justify-center font-medium"
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
                setEditingField(null);
              }}
              className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Upload New PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
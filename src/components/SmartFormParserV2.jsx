import React, { useState } from 'react';
import { Upload, Download, Edit3, Eye, FileText, X, Save } from 'lucide-react';
import FormRenderer from './FormRenderer';
import FormStructureEditor from './FormStructureEditor';

/**
 * SmartFormParserV2
 * 
 * A clean-slate PDF form parser with strict architectural invariants.
 * 
 * CORE OBJECTS:
 * - FormStructure: { title, sections }
 * - Section: { id, title, instructions, fields }
 * - Field: { id, label, type, required, options, conditionalOn, conditionalValue, ... }
 * - FormData: { [fieldId]: value }
 * 
 * INVARIANTS:
 * - IDs are predictable: "sec_1", "f_1", etc.
 * - All state updates are immutable
 * - Conditional logic: show field only if formData[conditionalOn] === conditionalValue
 * - No backend integration in v1
 * - No repeating groups, instruction blocks, or composite fields in v1
 */

const FIELD_TYPES = [
  'text', 'email', 'tel', 'date', 'number', 'textarea', 'radio', 'checkbox', 'file'
];

function SmartFormParserV2({ onClose }) {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [step, setStep] = useState(1); // 1 = upload/import, 2 = form view
  const [mode, setMode] = useState('fill'); // 'fill' or 'edit'
  const [pdfFile, setPdfFile] = useState(null);
  const [formStructure, setFormStructure] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  const validateFormStructure = (structure) => {
    if (!structure || typeof structure !== 'object') {
      throw new Error('Invalid structure: must be an object');
    }
    
    if (!structure.title || typeof structure.title !== 'string') {
      throw new Error('Invalid structure: missing or invalid title');
    }
    
    if (!Array.isArray(structure.sections) || structure.sections.length === 0) {
      throw new Error('Invalid structure: must have at least one section');
    }
    
    // Validate each section
    structure.sections.forEach((section, sIdx) => {
      if (!section.id || !section.id.startsWith('sec_')) {
        throw new Error(`Section ${sIdx}: invalid or missing id`);
      }
      
      if (!section.title || typeof section.title !== 'string') {
        throw new Error(`Section ${section.id}: missing or invalid title`);
      }
      
      if (!Array.isArray(section.fields)) {
        throw new Error(`Section ${section.id}: fields must be an array`);
      }
      
      // Validate each field
      section.fields.forEach((field, fIdx) => {
        if (!field.id || !field.id.startsWith('f_')) {
          throw new Error(`Section ${section.id}, field ${fIdx}: invalid or missing id`);
        }
        
        if (!field.label || typeof field.label !== 'string') {
          throw new Error(`Field ${field.id}: missing or invalid label`);
        }
        
        if (!FIELD_TYPES.includes(field.type)) {
          throw new Error(`Field ${field.id}: invalid type "${field.type}"`);
        }
        
        if (field.type === 'radio' && (!Array.isArray(field.options) || field.options.length === 0)) {
          throw new Error(`Field ${field.id}: radio type requires options array`);
        }
        
        if (field.conditionalOn && typeof field.conditionalOn !== 'string') {
          throw new Error(`Field ${field.id}: conditionalOn must be a string field id`);
        }
      });
    });
    
    return true;
  };

  // ============================================================================
  // PDF PARSING
  // ============================================================================

  const cleanAIResponse = (rawText) => {
    // Strip markdown code fences
    let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Strip "Show more" artifacts
    cleaned = cleaned.replace(/Show more.*$/gm, '');
    
    // Find the main JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response');
    }
    
    cleaned = jsonMatch[0];
    
    // Normalize quotes and remove comments
    cleaned = cleaned.replace(/\/\/.*$/gm, ''); // Remove line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
    return cleaned;
  };

  const parseFormWithAI = async () => {
    if (!pdfFile) {
      setError('No PDF file selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send PDF to backend for parsing
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await fetch('/api/parse-pdf-v2', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse PDF');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      const parsedForm = data.form_structure;

      // Validate
      validateFormStructure(parsedForm);

      // Initialize form data
      const initialData = {};
      parsedForm.sections.forEach(section => {
        section.fields.forEach(field => {
          initialData[field.id] = field.type === 'checkbox' ? false : '';
        });
      });

      // Success!
      setFormStructure(parsedForm);
      setFormData(initialData);
      setStep(2);

    } catch (err) {
      console.error('Parse error:', err);
      setError(err.message || 'Failed to parse PDF');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FILE HANDLERS
  // ============================================================================

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setPdfFile(file);
    setError(null);
  };

  const handleImportStructure = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        validateFormStructure(imported);

        // Initialize form data
        const initialData = {};
        imported.sections.forEach(section => {
          section.fields.forEach(field => {
            initialData[field.id] = field.type === 'checkbox' ? false : '';
          });
        });

        setFormStructure(imported);
        setFormData(initialData);
        setStep(2);
        setError(null);
      } catch (err) {
        setError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const exportStructure = () => {
    if (!formStructure) return;

    const blob = new Blob([JSON.stringify(formStructure, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-structure.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER: STEP 1 (Upload/Import)
  // ============================================================================

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Smart Form Parser V2</h2>
                <p className="text-blue-100 mt-1">Upload PDF or import existing schema</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-800 rounded p-2"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            {/* PDF Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold mb-2">Upload PDF Form</h3>
              <p className="text-gray-600 mb-4">
                Upload a licensing board PDF form to parse with AI
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700"
              >
                Choose PDF File
              </label>
              {pdfFile && (
                <p className="mt-4 text-sm text-gray-600">
                  Selected: <span className="font-medium">{pdfFile.name}</span>
                </p>
              )}
            </div>

            {/* Parse Button */}
            {pdfFile && (
              <button
                onClick={parseFormWithAI}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Parsing with AI...' : 'Parse PDF with AI'}
              </button>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* Import Structure */}
            <div className="border border-gray-300 rounded-lg p-6 text-center">
              <FileText className="mx-auto text-gray-400 mb-3" size={40} />
              <h3 className="text-lg font-semibold mb-2">Import Existing Schema</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Load a previously exported form structure JSON file
              </p>
              <input
                type="file"
                accept="application/json"
                onChange={handleImportStructure}
                className="hidden"
                id="json-import"
              />
              <label
                htmlFor="json-import"
                className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-gray-700"
              >
                Import JSON
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STEP 2 (Form View) - PLACEHOLDER FOR MILESTONE 2
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{formStructure?.title || 'Form'}</h2>
              <p className="text-blue-100 mt-1">
                {formStructure?.sections?.length || 0} sections
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-blue-800 rounded p-2">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Milestone 3 Complete ✓</p>
            <p className="text-green-700 text-sm mt-1">
              PDF parsing, validation, form rendering, and structure editing all working!
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setMode('fill')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  mode === 'fill'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye size={18} />
                Preview
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  mode === 'edit'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 size={18} />
                Edit Mode
              </button>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={() => alert('Save functionality coming in Milestone 4!')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Save size={18} />
              Save
            </button>
            
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Upload
            </button>
          </div>

          {/* Conditional Rendering Based on Mode */}
          {mode === 'fill' ? (
            <FormRenderer
              formStructure={formStructure}
              onSubmit={(data) => {
                console.log('Form submitted:', data);
                alert('Form submitted successfully! Check console for data.');
                exportData();
              }}
              onCancel={() => setStep(1)}
            />
          ) : (
            <FormStructureEditor
              formStructure={formStructure}
              onSave={(updatedStructure) => {
                setFormStructure(updatedStructure);
                alert('Structure updated! Switch to Preview to see changes.');
              }}
              onCancel={() => setMode('fill')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SmartFormParserV2;

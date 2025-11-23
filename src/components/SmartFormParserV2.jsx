import React, { useState } from 'react';
import { Upload, Download, Edit3, Eye, FileText, X } from 'lucide-react';

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
  const [pdfFile, setPdfFile] = useState(null);
  const [formStructure, setFormStructure] = useState(null);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState(null);
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
      // Convert PDF to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 16000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              },
              {
                type: 'text',
                text: `Parse this licensing board PDF form into a structured JSON schema.

STRICT RULES:
1. Return ONLY valid JSON, no markdown, no extra text
2. Use this exact structure:
{
  "title": "Form Title",
  "sections": [
    {
      "id": "sec_1",
      "title": "Section Title",
      "instructions": "Any instructional text for this section",
      "fields": [
        {
          "id": "f_1",
          "label": "Field Label",
          "type": "text|email|tel|date|number|textarea|radio|checkbox|file",
          "required": true|false,
          "placeholder": "optional placeholder",
          "options": ["Option 1", "Option 2"],
          "position": 1,
          "conditionalOn": null,
          "conditionalValue": null,
          "helpText": "optional help text"
        }
      ]
    }
  ]
}

3. Section IDs: "sec_1", "sec_2", etc.
4. Field IDs: "f_1", "f_2", etc. (globally unique across all sections)
5. Field types: ONLY use: text, email, tel, date, number, textarea, radio, checkbox, file
6. Radio fields MUST have options array
7. Checkbox fields are boolean (no options)
8. Instructions go in section.instructions, NOT as a field
9. Multi-part questions (e.g., first/middle/last name) = separate fields
10. Preserve exact order of fields as they appear in PDF
11. If a field shows/hides based on another field, set conditionalOn to that field's id and conditionalValue to the trigger value

Return ONLY the JSON object.`
              }
            ]
          })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Check for truncation
      if (data.choices[0].finish_reason === 'length') {
        throw new Error('Response was truncated - form too complex. Try a simpler form or split into sections.');
      }

      // Extract text content
      const textContent = data.choices[0].message.content;
      if (!textContent) {
        throw new Error('No text content in AI response');
      }

      // Clean and parse
      const cleanedJSON = cleanAIResponse(textContent);
      const parsedForm = JSON.parse(cleanedJSON);

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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-medium">Milestone 1 Complete ✓</p>
            <p className="text-yellow-700 text-sm mt-1">
              PDF parsing and validation working. Form rendering (Milestone 2) coming next.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={exportStructure}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download size={18} />
              Export Structure
            </button>
            
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Upload
            </button>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="font-semibold mb-2">Parsed Structure Preview:</p>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(formStructure, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmartFormParserV2;

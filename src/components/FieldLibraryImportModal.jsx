import React, { useState, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader, Sparkles, Plus, RefreshCw } from 'lucide-react'

const API_BASE_URL = '/api'

function FieldLibraryImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Decision, 3: Results
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [selectedStrategy, setSelectedStrategy] = useState('merge')
  const [error, setError] = useState(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setFile(null)
      setAnalysis(null)
      setImportResult(null)
      setSelectedStrategy('merge')
      setError(null)
    }
  }, [isOpen])

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setError(null)
    
    // Automatically analyze the file
    await analyzeFile(selectedFile)
  }

  const analyzeFile = async (fileToAnalyze) => {
    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', fileToAnalyze)

      const response = await fetch(`${API_BASE_URL}/field-library/import/analyze`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze file')
      }

      if (data.error) {
        setError(data.error)
        return
      }

      setAnalysis(data)
      setStep(2)
      
      // Set default strategy based on whether field exists
      if (data.field_exists && data.existing_field?.new_options_count > 0) {
        setSelectedStrategy('merge')
      } else if (data.field_exists) {
        setSelectedStrategy('replace')
      } else {
        setSelectedStrategy('create')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const executeImport = async () => {
    setImporting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('merge_strategy', selectedStrategy)
      formData.append('field_key', analysis.suggested_field_key)
      formData.append('field_name', analysis.field_name)
      formData.append('board_name', 'Admin')

      const response = await fetch(`${API_BASE_URL}/field-library/import/execute`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('Import response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import data')
      }

      if (!data.success) {
        throw new Error(data.error || 'Import failed')
      }

      console.log('Setting import result and moving to step 3')
      setImportResult(data)
      setStep(3)
      
      // Don't notify parent yet - let user see success screen first
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    // If we completed an import, notify parent
    if (importResult && onImportComplete) {
      onImportComplete(importResult)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Field Library Import</h2>
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">AI-Powered</span>
          </div>
          <button onClick={handleClose} className="text-white hover:bg-white/20 rounded p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Upload File</span>
            </div>
            
            <div className="flex-1 h-1 bg-gray-300 mx-4">
              <div className={`h-full transition-all ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`} 
                   style={{ width: step >= 2 ? '100%' : '0%' }} />
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Choose Action</span>
            </div>
            
            <div className="flex-1 h-1 bg-gray-300 mx-4">
              <div className={`h-full transition-all ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`} 
                   style={{ width: step >= 3 ? '100%' : '0%' }} />
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step >= 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-medium">Results</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Upload Reference Data</h3>
                <p className="text-gray-600">
                  Import dropdown options and field definitions into the Field Library
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {file ? file.name : 'Click to upload CSV file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Single-column CSV for dropdown options
                  </p>
                </label>
              </div>

              {loading && (
                <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Analyzing file...</span>
                </div>
              )}

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Decision */}
          {step === 2 && analysis && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Field Detected: {analysis.field_name}</h3>
                <p className="text-gray-600">
                  Found {analysis.options_count} options in your CSV file
                </p>
              </div>

              {/* Show existing field info if it exists */}
              {analysis.field_exists && analysis.existing_field && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 mb-2">
                        This field already exists in the Field Library
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-blue-700 font-medium">Current Options:</p>
                          <p className="text-blue-900">{analysis.existing_field.current_options_count} options</p>
                        </div>
                        <div>
                          <p className="text-blue-700 font-medium">New Options Found:</p>
                          <p className="text-blue-900">{analysis.existing_field.new_options_count} new options</p>
                        </div>
                      </div>
                      
                      {analysis.existing_field.new_options_count > 0 && (
                        <div className="mt-3">
                          <p className="text-blue-700 font-medium text-sm mb-1">New options to add:</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.existing_field.new_options.map((opt, idx) => (
                              <span key={idx} className="bg-white text-blue-900 px-2 py-1 rounded text-xs border border-blue-300">
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Strategy Selection */}
              <div className="space-y-3 mb-6">
                <p className="font-medium text-gray-700">Choose how to import this data:</p>
                
                {/* Merge Option (only if field exists and has new options) */}
                {analysis.field_exists && analysis.existing_field?.new_options_count > 0 && (
                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         style={{ borderColor: selectedStrategy === 'merge' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={selectedStrategy === 'merge'}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Plus className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Keep & Merge</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Recommended</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Add {analysis.existing_field.new_options_count} new options to the existing {analysis.existing_field.current_options_count} options
                      </p>
                    </div>
                  </label>
                )}

                {/* Replace Option (only if field exists) */}
                {analysis.field_exists && (
                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         style={{ borderColor: selectedStrategy === 'replace' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={selectedStrategy === 'replace'}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RefreshCw className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">Replace All</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Replace all existing options with the {analysis.options_count} options from this CSV
                      </p>
                    </div>
                  </label>
                )}

                {/* Create New Option */}
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                       style={{ borderColor: selectedStrategy === 'create_new' ? '#3b82f6' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="create_new"
                    checked={selectedStrategy === 'create_new'}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Create New Field</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a separate field with these {analysis.options_count} options
                    </p>
                  </div>
                </label>
              </div>

              {/* Options Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-700 mb-2">Options Preview:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.options_preview.map((opt, idx) => (
                    <span key={idx} className="bg-white text-gray-700 px-3 py-1 rounded text-sm border">
                      {opt}
                    </span>
                  ))}
                  {analysis.options_count > 10 && (
                    <span className="text-gray-500 text-sm px-3 py-1">
                      +{analysis.options_count - 10} more...
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && importResult && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Action:</span>
                    <span className="font-medium capitalize">{importResult.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Field Name:</span>
                    <span className="font-medium">{importResult.field_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Field Key:</span>
                    <span className="font-mono text-sm">{importResult.field_key}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Options:</span>
                    <span className="font-medium">{importResult.total_options}</span>
                  </div>
                  {importResult.new_options_added > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">New Options Added:</span>
                      <span className="font-medium text-green-600">{importResult.new_options_added}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mt-4">
                This field is now available in the Field Library for use in forms
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            {step === 3 ? 'Close' : 'Cancel'}
          </button>
          
          {step === 2 && (
            <button
              onClick={executeImport}
              disabled={importing}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {importing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import to Field Library
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FieldLibraryImportModal


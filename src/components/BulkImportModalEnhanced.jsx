import React, { useState, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader, Plus, Search, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

const API_BASE_URL = '/api'

function BulkImportModalEnhanced({ isOpen, onClose, onImportComplete }) {
  const [importMode, setImportMode] = useState('manual') // Always use manual for smart matching
  const [step, setStep] = useState(1) // 1: Upload, 2: Map Columns, 3: Preview, 4: Import
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [columnMapping, setColumnMapping] = useState({})
  const [smartMatches, setSmartMatches] = useState({}) // AI-suggested matches
  const [allFields, setAllFields] = useState([]) // All available fields
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])
  
  // New field creation modal
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false)
  const [newFieldData, setNewFieldData] = useState({
    field_key: '',
    canonical_name: '',
    field_type: 'text',
    description: '',
    category: 'custom'
  })
  const [creatingField, setCreatingField] = useState(false)

  // Fetch all available fields on mount
  useEffect(() => {
    if (isOpen && step === 2) {
      fetchAllFields()
    }
  }, [isOpen, step])

  const fetchAllFields = async () => {
    try {
      // Fetch both User table fields and Field Library fields
      const [userResponse, libraryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/fields/user-schema`),
        fetch(`${API_BASE_URL}/fields/library`)
      ])

      const userData = await userResponse.json()
      const libraryData = await libraryResponse.json()

      // Combine both sources
      const combined = [
        ...userData.fields.map(f => ({ ...f, source: 'user_table' })),
        ...libraryData.fields.map(f => ({ ...f, source: 'field_library' }))
      ]

      setAllFields(combined)
    } catch (error) {
      console.error('Failed to fetch fields:', error)
    }
  }

  const fetchSmartMatches = async (columns) => {
    try {
      const response = await fetch(`${API_BASE_URL}/fields/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns })
      })

      const data = await response.json()
      setSmartMatches(data.matches)

      // Auto-apply matches with confidence >= 70%
      const autoMapping = {}
      columns.forEach(column => {
        const matches = data.matches[column]
        if (matches && matches.length > 0) {
          // Apply top match if confidence >= 70%, otherwise skip
          autoMapping[column] = matches[0].confidence >= 0.7 ? matches[0].field.field_key : 'skip'
        } else {
          autoMapping[column] = 'skip'
        }
      })
      setColumnMapping(autoMapping)
    } catch (error) {
      console.error('Failed to fetch smart matches:', error)
    }
  }

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    setFile(uploadedFile)

    // Parse CSV file
    const text = await uploadedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || ''
        return obj
      }, {})
    })

    setParsedData({ headers, rows: rows.slice(0, 100) }) // Preview first 100 rows

    // Fetch smart matches for all columns
    await fetchSmartMatches(headers)
    
    setStep(2)
  }

  const handleCreateNewField = async () => {
    setCreatingField(true)
    try {
      const response = await fetch(`${API_BASE_URL}/fields/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFieldData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Refresh field list
        await fetchAllFields()
        
        // Close modal and reset
        setShowCreateFieldModal(false)
        setNewFieldData({
          field_key: '',
          canonical_name: '',
          field_type: 'text',
          description: '',
          category: 'custom'
        })
        
        alert('Field created successfully!')
      } else {
        const error = await response.json()
        alert('Failed to create field: ' + error.error)
      }
    } catch (error) {
      console.error('Error creating field:', error)
      alert('Failed to create field: ' + error.message)
    } finally {
      setCreatingField(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setProgress(0)
    setErrors([])

    try {
      // Transform data based on column mapping
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const allRows = lines.slice(1)

      const transformedData = allRows.map((line, index) => {
        const values = line.split(',').map(v => v.trim())
        const row = {}
        headers.forEach((header, i) => {
          const mappedField = columnMapping[header]
          if (mappedField && mappedField !== 'skip') {
            row[mappedField] = values[i] || ''
          }
        })
        return row
      }).filter(row => {
        // Check for email and name fields (support both camelCase and snake_case)
        const hasEmail = row.email || row.emailAddress
        const hasFirstName = row.firstName || row.first_name
        const hasLastName = row.lastName || row.last_name
        return hasEmail && hasFirstName && hasLastName
      })

      // Send to backend in batches
      const batchSize = 1000
      let imported = 0
      let failed = 0
      const errorList = []

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize)
        
        try {
          const response = await fetch(`${API_BASE_URL}/users/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ users: batch })
          })

          if (response.ok) {
            const result = await response.json()
            imported += result.imported || batch.length
            if (result.errors) {
              errorList.push(...result.errors)
              failed += result.errors.length
            }
          } else {
            failed += batch.length
            errorList.push({ batch: i / batchSize + 1, error: 'Batch import failed' })
          }
        } catch (err) {
          failed += batch.length
          errorList.push({ batch: i / batchSize + 1, error: err.message })
        }

        setProgress(Math.round(((i + batch.length) / transformedData.length) * 100))
      }

      setResults({
        total: transformedData.length,
        imported,
        failed
      })
      setErrors(errorList)
      setStep(4)

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Failed to import: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const resetModal = () => {
    setImportMode('manual')
    setStep(1)
    setFile(null)
    setParsedData(null)
    setColumnMapping({})
    setSmartMatches({})
    setProgress(0)
    setResults(null)
    setErrors([])
    setWarnings([])
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} style={{ zIndex: 9998 }}></div>

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl relative" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center space-x-3">
              <Upload className="w-6 h-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Smart Bulk Import</h3>
              <span className="px-2 py-1 text-xs bg-yellow-400 text-yellow-900 rounded-full font-semibold">AI-Powered</span>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {['Upload File', 'Smart Mapping', 'Preview & Import', 'Results'].map((label, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step > index + 1 ? 'bg-green-500 text-white' :
                    step === index + 1 ? 'bg-blue-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {step > index + 1 ? <CheckCircle className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                  }`}>{label}</span>
                  {index < 3 && <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6" style={{ minHeight: '400px', maxHeight: '600px', overflowY: 'auto' }}>
            {/* Step 1: Upload File */}
            {step === 1 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-blue-600 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h4>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                  Upload a CSV file containing licensee data. Our AI will intelligently match columns to fields.
                </p>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Choose CSV File</span>
                  </div>
                </label>
                {file && (
                  <div className="mt-6 text-sm text-gray-600 text-center">
                    Selected: <span className="font-medium">{file.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Smart Map Columns - ENHANCED VERSION */}
            {step === 2 && parsedData && (
              <SmartMappingStep
                parsedData={parsedData}
                columnMapping={columnMapping}
                setColumnMapping={setColumnMapping}
                smartMatches={smartMatches}
                allFields={allFields}
                onCreateNewField={() => setShowCreateFieldModal(true)}
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
              />
            )}

            {/* Step 3: Preview & Import */}
            {step === 3 && parsedData && (
              <PreviewStep
                parsedData={parsedData}
                columnMapping={columnMapping}
                allFields={allFields}
                importing={importing}
                progress={progress}
                onBack={() => setStep(2)}
                onImport={handleImport}
              />
            )}

            {/* Step 4: Results */}
            {step === 4 && results && (
              <ResultsStep
                results={results}
                errors={errors}
                warnings={warnings}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create New Field Modal */}
      {showCreateFieldModal && (
        <CreateFieldModal
          newFieldData={newFieldData}
          setNewFieldData={setNewFieldData}
          creating={creatingField}
          onClose={() => setShowCreateFieldModal(false)}
          onCreate={handleCreateNewField}
        />
      )}
    </div>
  )
}

// Smart Mapping Step Component
function SmartMappingStep({ parsedData, columnMapping, setColumnMapping, smartMatches, allFields, onCreateNewField, onBack, onContinue }) {
  const [expandedSections, setExpandedSections] = useState({})
  const [searchTerm, setSearchTerm] = useState({})

  const toggleSection = (column) => {
    setExpandedSections(prev => ({ ...prev, [column]: !prev[column] }))
  }

  const getFieldLabel = (fieldKey) => {
    const field = allFields.find(f => f.field_key === fieldKey)
    return field ? field.label : fieldKey
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Smart Field Mapping</h4>
          <p className="text-sm text-gray-600 mt-1">
            AI-suggested matches are shown first. Review and adjust as needed.
          </p>
        </div>
        <button
          onClick={onCreateNewField}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Field</span>
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {parsedData.headers.map((csvColumn, index) => {
          const matches = smartMatches[csvColumn] || []
          const topMatch = matches[0]
          const hasHighConfidence = topMatch && topMatch.confidence >= 0.9

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-semibold text-gray-900">{csvColumn}</label>
                    {hasHighConfidence && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        <span>{Math.round(topMatch.confidence * 100)}% match</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Sample: {parsedData.rows[0]?.[csvColumn] || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Smart Suggestions */}
              {matches.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Suggested Matches:</span>
                  </div>
                  <div className="space-y-2">
                    {matches.slice(0, 3).map((match, idx) => (
                      <button
                        key={idx}
                        onClick={() => setColumnMapping(prev => ({ ...prev, [csvColumn]: match.field.field_key }))}
                        className={`w-full text-left px-3 py-2 rounded border transition-all ${
                          columnMapping[csvColumn] === match.field.field_key
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{match.field.label}</div>
                            <div className={`text-xs ${columnMapping[csvColumn] === match.field.field_key ? 'text-blue-100' : 'text-gray-500'}`}>
                              {match.field.source === 'field_library' ? 'Custom Field' : 'Standard Field'}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${columnMapping[csvColumn] === match.field.field_key ? 'text-white' : 'text-blue-600'}`}>
                            {Math.round(match.confidence * 100)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Selection Dropdown */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Or select manually:</label>
                <select
                  value={columnMapping[csvColumn] || 'skip'}
                  onChange={(e) => setColumnMapping(prev => ({ ...prev, [csvColumn]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="skip">-- Skip this column --</option>
                  <optgroup label="Standard Fields">
                    {allFields.filter(f => f.source === 'user_table').map(field => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Fields">
                    {allFields.filter(f => f.source === 'field_library').slice(0, 50).map(field => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label} {field.usage_count ? `(used ${field.usage_count}x)` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Preview
        </button>
      </div>
    </div>
  )
}

// Preview Step Component
function PreviewStep({ parsedData, columnMapping, allFields, importing, progress, onBack, onImport }) {
  const getFieldLabel = (fieldKey) => {
    const field = allFields.find(f => f.field_key === fieldKey)
    return field ? field.label : fieldKey
  }

  const mappedColumns = Object.keys(columnMapping).filter(k => columnMapping[k] !== 'skip')

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview Data</h4>
      <p className="text-sm text-gray-600 mb-4">
        Showing first 10 rows. Total rows to import: <span className="font-semibold">{parsedData.rows.length}</span>
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {mappedColumns.map((header, index) => (
                <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getFieldLabel(columnMapping[header])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedData.rows.slice(0, 10).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {mappedColumns.map((header, colIndex) => (
                  <td key={colIndex} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Importing...</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={importing}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Mapping
        </button>
        <button
          onClick={onImport}
          disabled={importing}
          className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Start Import</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Results Step Component
function ResultsStep({ results, errors, warnings, onClose }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        {results.failed === 0 ? (
          <CheckCircle className="w-16 h-16 text-green-500" />
        ) : (
          <AlertCircle className="w-16 h-16 text-yellow-500" />
        )}
      </div>
      <h4 className="text-2xl font-semibold text-gray-900 mb-2">Import Complete</h4>
      <div className="grid grid-cols-3 gap-4 my-6 max-w-2xl mx-auto">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{results.total}</div>
          <div className="text-sm text-gray-600">Total Rows</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{results.imported}</div>
          <div className="text-sm text-gray-600">Imported</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="text-3xl font-bold text-red-600">{results.failed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-2xl mx-auto">
          <h5 className="font-semibold text-red-900 mb-2">Errors:</h5>
          <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>• {JSON.stringify(error)}</li>
            ))}
            {errors.length > 10 && <li className="font-medium">... and {errors.length - 10} more</li>}
          </ul>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Close
      </button>
    </div>
  )
}

// Create Field Modal Component
function CreateFieldModal({ newFieldData, setNewFieldData, creating, onClose, onCreate }) {
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Field</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Key*</label>
              <input
                type="text"
                value={newFieldData.field_key}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="e.g., enrollment_date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, underscores only)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name*</label>
              <input
                type="text"
                value={newFieldData.canonical_name}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, canonical_name: e.target.value }))}
                placeholder="e.g., Enrollment Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Type*</label>
              <select
                value={newFieldData.field_type}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, field_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
                <option value="select">Select/Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="textarea">Text Area</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newFieldData.description}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newFieldData.category}
                onChange={(e) => setNewFieldData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="custom">Custom</option>
                <option value="personal">Personal Information</option>
                <option value="license">License Information</option>
                <option value="education">Education</option>
                <option value="employment">Employment</option>
                <option value="contact">Contact Information</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={creating || !newFieldData.field_key || !newFieldData.canonical_name}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Field</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkImportModalEnhanced


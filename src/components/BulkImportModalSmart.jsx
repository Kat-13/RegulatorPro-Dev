import React, { useState, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader, Plus, Sparkles } from 'lucide-react'

const API_BASE_URL = '/api'

// Metadata fields to auto-exclude
const METADATA_FIELDS = ['id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 
                         'created', 'modified', 'timestamp', 'internal_ref', 'row_id']

function BulkImportModalSmart({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Smart Mapping, 3: Preview, 4: Results
  const [file, setFile] = useState(null)
  const [csvColumns, setCsvColumns] = useState([])
  const [sampleData, setSampleData] = useState({})
  const [columnMapping, setColumnMapping] = useState({})
  const [autoMappedColumns, setAutoMappedColumns] = useState([])
  const [unmatchedColumns, setUnmatchedColumns] = useState([])
  const [availableFields, setAvailableFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [errors, setErrors] = useState([])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setFile(null)
      setCsvColumns([])
      setSampleData({})
      setColumnMapping({})
      setAutoMappedColumns([])
      setUnmatchedColumns([])
      setErrors([])
    }
  }, [isOpen])

  // Fetch available fields from backend
  const fetchAvailableFields = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/field-library`)
      const data = await response.json()
      // API returns array directly, not {fields: []}
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching fields:', error)
      return []
    }
  }

  // Normalize field names to snake_case for database compatibility
  const normalizeFieldName = (name) => {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9_]/g, '_')
  }

  // Simple fuzzy matching function
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[_\s-]/g, '')
    const s2 = str2.toLowerCase().replace(/[_\s-]/g, '')
    
    if (s1 === s2) return 1.0
    if (s1.includes(s2) || s2.includes(s1)) return 0.8
    
    // Levenshtein distance
    const matrix = []
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    const distance = matrix[s2.length][s1.length]
    return 1 - distance / Math.max(s1.length, s2.length)
  }

  // Smart field matching
  const performSmartMatching = async (columns, sample) => {
    setLoading(true)
    try {
      // Fetch available fields
      const fields = await fetchAvailableFields()
      setAvailableFields(fields)

      const mapping = {}
      const autoMapped = []
      const unmatched = []

      columns.forEach(col => {
        // Skip metadata fields
        if (METADATA_FIELDS.some(meta => col.toLowerCase().includes(meta.toLowerCase()))) {
          return
        }

        // Try to find best match
        let bestMatch = null
        let bestScore = 0

        fields.forEach(field => {
          const score = calculateSimilarity(col, field.field_key)
          if (score > bestScore) {
            bestScore = score
            bestMatch = field
          }
        })

        // Auto-map if confidence >= 60%
        if (bestScore >= 0.6 && bestMatch) {
          mapping[col] = bestMatch.field_key
          autoMapped.push({ column: col, field: bestMatch, confidence: bestScore })
        } else {
          unmatched.push(col)
        }
      })

      setColumnMapping(mapping)
      setAutoMappedColumns(autoMapped)
      setUnmatchedColumns(unmatched)
      setStep(2)
    } catch (error) {
      console.error('Error in smart matching:', error)
      alert('Error performing smart matching: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setLoading(true)

    try {
      const text = await uploadedFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Get sample data from first row
      if (lines.length > 1) {
        const firstRow = lines[1].split(',').map(v => v.trim())
        const sample = {}
        headers.forEach((header, i) => {
          sample[header] = firstRow[i] || ''
        })
        setSampleData(sample)
      }

      setCsvColumns(headers)
      
      // Perform smart matching
      await performSmartMatching(headers, sampleData)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('Error parsing CSV file: ' + error.message)
      setLoading(false)
    }
  }

  // Create new field
  const handleCreateField = async (columnName) => {
    console.log('Creating field for column:', columnName)
    setLoading(true)
    try {
      const fieldKey = columnName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      console.log('Field key:', fieldKey)
      
      const response = await fetch(`${API_BASE_URL}/field-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_key: fieldKey,
          canonical_name: columnName,
          field_type: 'text',
          category: 'Custom Fields',
          is_required: false,
          common_aliases: JSON.stringify([columnName])
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create field')
      }

      const newField = await response.json()
      
      // Add to mapping (API returns field directly, not wrapped)
      setColumnMapping(prev => ({
        ...prev,
        [columnName]: newField.field_key || fieldKey
      }))

      // Remove from unmatched
      setUnmatchedColumns(prev => prev.filter(col => col !== columnName))

      // Add to available fields
      setAvailableFields(prev => [...prev, newField])
      
      // Update auto-mapped counter
      setAutoMappedColumns(prev => [...prev, {
        column: columnName,
        field: newField,
        confidence: 1.0
      }])
    } catch (error) {
      console.error('Error creating field:', error)
      alert('Failed to create field: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Manual field selection
  const handleManualMapping = (columnName, fieldKey) => {
    if (fieldKey === '__SKIP__') {
      // Remove from mapping if skipped
      setColumnMapping(prev => {
        const newMapping = { ...prev }
        delete newMapping[columnName]
        return newMapping
      })
    } else if (fieldKey) {
      setColumnMapping(prev => ({
        ...prev,
        [columnName]: fieldKey
      }))
    }
    setUnmatchedColumns(prev => prev.filter(col => col !== columnName))
  }

  // Proceed to preview
  const handleContinueToPreview = () => {
    setStep(3)
  }

  // Perform import
  const handleImport = async () => {
    console.log('handleImport called')
    console.log('File:', file)
    console.log('Column mapping:', columnMapping)
    
    setImporting(true)
    setErrors([])

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Field name normalization map (frontend field names → backend database columns)
      const fieldNormalization = {
        'emailAddress': 'email',
        'email_address': 'email',
        'firstName': 'first_name',
        'first_name': 'first_name',
        'lastName': 'last_name',
        'last_name': 'last_name',
        'phoneNumber': 'phone',
        'phone_number': 'phone',
        'streetAddress': 'address',
        'street_address': 'address',
        'zipCode': 'zipCode',
        'zip_code': 'zipCode',
        'postalCode': 'zipCode',
        'postal_code': 'zipCode'
      }

      const transformedData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row = {}
        headers.forEach((header, i) => {
          const mappedField = columnMapping[header]
          if (mappedField) {
            // Normalize field name for backend
            const normalizedField = fieldNormalization[mappedField] || mappedField
            row[normalizedField] = values[i] || ''
          }
        })
        return row
      }).filter(row => {
        // Only filter out completely empty rows
        return Object.values(row).some(val => val && val.trim())
      })

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/users/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: transformedData })
      })

      const result = await response.json()
      
      setImportResults({
        total: transformedData.length,
        imported: result.imported || 0,
        failed: (result.errors && result.errors.length) || 0
      })
      
      // Log errors for debugging
      if (result.errors && result.errors.length > 0) {
        console.log('Import errors:', result.errors)
      }
      
      setStep(4)
      
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error) {
      console.error('Error importing:', error)
      setErrors([error.message])
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Smart Bulk Import</h2>
            <span className="bg-yellow-500 text-xs px-2 py-1 rounded-full font-semibold">AI-Powered</span>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">1</div>}
            <span className="font-medium">Upload File</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            {step > 2 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className={`w-8 h-8 rounded-full ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'} flex items-center justify-center font-semibold`}>2</div>}
            <span className="font-medium">Smart Mapping</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            {step > 3 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className={`w-8 h-8 rounded-full ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'} flex items-center justify-center font-semibold`}>3</div>}
            <span className="font-medium">Preview</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4" />
          <div className={`flex items-center gap-2 ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full ${step === 4 ? 'bg-green-600 text-white' : 'bg-gray-300'} flex items-center justify-center font-semibold`}>4</div>
            <span className="font-medium">Results</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload CSV File</h3>
              <p className="text-gray-600 mb-6">Select a CSV file containing licensee data</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                Choose File
              </label>
              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Analyzing file...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Smart Mapping */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Smart Field Mapping</h3>
                <p className="text-gray-600">
                  {autoMappedColumns.length} fields auto-mapped • {unmatchedColumns.length} need your attention
                </p>
              </div>

              {/* Auto-mapped fields (collapsed) */}
              {autoMappedColumns.length > 0 && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">{autoMappedColumns.length} fields automatically mapped</span>
                  </div>
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">View auto-mapped fields</summary>
                    <div className="mt-2 space-y-1">
                      {autoMappedColumns.map(({ column, field, confidence }) => (
                        <div key={column} className="flex items-center justify-between py-1">
                          <span>{column}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium">{field.canonical_name}</span>
                          <span className="text-xs text-green-600">({Math.round(confidence * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Unmatched fields */}
              {unmatchedColumns.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Fields needing attention:</h4>
                  {unmatchedColumns.map(column => {
                    // Calculate smart suggestions for this column
                    const suggestions = availableFields
                      .map(field => ({
                        field,
                        score: calculateSimilarity(column, field.field_key)
                      }))
                      .filter(s => s.score > 0.4 && s.score < 0.6) // Show suggestions between 40-60%
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 3)

                    // Sort available fields alphabetically by category then name
                    const sortedFields = [...availableFields].sort((a, b) => {
                      if (a.category !== b.category) {
                        return (a.category || '').localeCompare(b.category || '')
                      }
                      return a.canonical_name.localeCompare(b.canonical_name)
                    })

                    return (
                      <div key={column} className="border rounded-lg p-4 bg-gray-50">
                        <div className="mb-2">
                          <span className="font-medium">{column}</span>
                          {sampleData[column] && (
                            <span className="text-sm text-gray-500 ml-2">Sample: {sampleData[column]}</span>
                          )}
                        </div>
                        
                        {/* Smart Suggestions */}
                        {suggestions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-600 mb-2">💡 Did you mean:</p>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.map(({ field, score }) => (
                                <button
                                  key={field.field_key}
                                  onClick={() => handleManualMapping(column, field.field_key)}
                                  className="px-3 py-1 bg-white border border-blue-300 rounded-full text-sm hover:bg-blue-50 hover:border-blue-500 transition-colors"
                                >
                                  {field.canonical_name} <span className="text-xs text-gray-500">({Math.round(score * 100)}%)</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateField(column)}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            Create New Field
                          </button>
                          <select
                            onChange={(e) => handleManualMapping(column, e.target.value)}
                            className="flex-1 border rounded px-3 py-2"
                            defaultValue=""
                          >
                            <option value="">Or select existing field...</option>
                            <option value="__SKIP__">-- Skip this column --</option>
                            {sortedFields.map((field, idx) => {
                              const prevField = sortedFields[idx - 1]
                              const showCategory = !prevField || prevField.category !== field.category
                              return (
                                <React.Fragment key={field.field_key}>
                                  {showCategory && field.category && (
                                    <option disabled className="font-bold">── {field.category} ──</option>
                                  )}
                                  <option value={field.field_key}>
                                    {field.canonical_name}
                                  </option>
                                </React.Fragment>
                              )
                            })}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="font-semibold">All fields mapped successfully!</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleContinueToPreview}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Continue to Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Preview Import</h3>
              
              {/* Field Mapping Summary */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">{Object.keys(columnMapping).length} Fields Mapped:</h4>
                <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">CSV Column</th>
                        <th className="text-center py-2 px-2">→</th>
                        <th className="text-left py-2 px-2">Database Field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(columnMapping).map(([csvCol, fieldKey]) => {
                        const field = availableFields.find(f => f.field_key === fieldKey)
                        return (
                          <tr key={csvCol} className="border-b last:border-0">
                            <td className="py-2 px-2 font-mono text-xs">{csvCol}</td>
                            <td className="py-2 px-2 text-center text-gray-400">→</td>
                            <td className="py-2 px-2">{field?.canonical_name || fieldKey}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preview - First 5 rows from actual CSV */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Data Preview (first 5 rows from your file):</h4>
                <div className="bg-gray-50 border rounded-lg p-4 overflow-x-auto">
                  <PreviewDataTable 
                    file={file} 
                    columnMapping={columnMapping} 
                    availableFields={availableFields}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Start Import
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResults && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-6">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600">{importResults.total}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">{importResults.imported}</div>
                  <div className="text-sm text-gray-600">Imported</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Preview Data Table Component - Shows actual CSV data
function PreviewDataTable({ file, columnMapping, availableFields }) {
  const [previewData, setPreviewData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPreview = async () => {
      if (!file) return
      
      try {
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        
        // Get first 5 data rows
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim())
          const row = {}
          headers.forEach((header, i) => {
            row[header] = values[i] || ''
          })
          return row
        })
        
        setPreviewData(rows)
      } catch (error) {
        console.error('Error loading preview:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadPreview()
  }, [file])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading preview...</div>
  }

  if (previewData.length === 0) {
    return <div className="text-sm text-gray-500">No data to preview</div>
  }

  // Get mapped columns only
  const mappedColumns = Object.keys(columnMapping)

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-gray-100">
          {mappedColumns.map(csvCol => {
            const fieldKey = columnMapping[csvCol]
            const field = availableFields.find(f => f.field_key === fieldKey)
            return (
              <th key={csvCol} className="border px-2 py-2 text-left">
                <div className="font-semibold">{field?.canonical_name || fieldKey}</div>
                <div className="text-gray-500 font-normal font-mono">{csvCol}</div>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {previewData.map((row, idx) => (
          <tr key={idx} className="border-b">
            {mappedColumns.map(csvCol => (
              <td key={csvCol} className="border px-2 py-2">
                {row[csvCol] || <span className="text-gray-400">-</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default BulkImportModalSmart


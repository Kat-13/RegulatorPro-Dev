import { useState } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader } from 'lucide-react'

const API_BASE_URL = '/api'

function BulkImportModal({ isOpen, onClose, onImportComplete }) {
  const [importMode, setImportMode] = useState('quick') // 'quick' or 'manual'
  const [step, setStep] = useState(1) // 1: Upload, 2: Map Columns, 3: Preview, 4: Import
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [columnMapping, setColumnMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])

  // Database fields that can be mapped
  const dbFields = [
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'email', label: 'Email', required: true },
    { value: 'phone', label: 'Phone', required: false },
    { value: 'licenseNumber', label: 'License Number', required: true },
    { value: 'licenseType', label: 'License Type', required: true },
    { value: 'licenseStatus', label: 'License Status', required: false },
    { value: 'issueDate', label: 'Issue Date', required: false },
    { value: 'expirationDate', label: 'Expiration Date', required: false },
    { value: 'address', label: 'Address', required: false },
    { value: 'city', label: 'City', required: false },
    { value: 'state', label: 'State', required: false },
    { value: 'zipCode', label: 'Zip Code', required: false },
    { value: 'skip', label: '-- Skip this column --', required: false }
  ]

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

    // Auto-map columns based on header names
    const autoMapping = {}
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase()
      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        autoMapping[header] = 'firstName'
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        autoMapping[header] = 'lastName'
      } else if (lowerHeader.includes('email')) {
        autoMapping[header] = 'email'
      } else if (lowerHeader.includes('phone')) {
        autoMapping[header] = 'phone'
      } else if (lowerHeader.includes('license') && lowerHeader.includes('number')) {
        autoMapping[header] = 'licenseNumber'
      } else if (lowerHeader.includes('license') && lowerHeader.includes('type')) {
        autoMapping[header] = 'licenseType'
      } else if (lowerHeader.includes('status')) {
        autoMapping[header] = 'licenseStatus'
      } else if (lowerHeader.includes('issue') && lowerHeader.includes('date')) {
        autoMapping[header] = 'issueDate'
      } else if (lowerHeader.includes('expir')) {
        autoMapping[header] = 'expirationDate'
      } else if (lowerHeader.includes('address')) {
        autoMapping[header] = 'address'
      } else if (lowerHeader.includes('city')) {
        autoMapping[header] = 'city'
      } else if (lowerHeader.includes('state')) {
        autoMapping[header] = 'state'
      } else if (lowerHeader.includes('zip')) {
        autoMapping[header] = 'zipCode'
      } else {
        autoMapping[header] = 'skip'
      }
    })
    setColumnMapping(autoMapping)
    setStep(2)
  }

  const handleQuickImport = async () => {
    setImporting(true)
    setProgress(0)
    setErrors([])
    setWarnings([])

    try {
      const csvContent = await file.text()
      
      const response = await fetch(`${API_BASE_URL}/users/import-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvContent })
      })

      if (response.ok) {
        const result = await response.json()
        setResults({
          total: result.stats.total_rows,
          imported: result.stats.imported,
          updated: result.stats.updated,
          failed: result.stats.skipped
        })
        setWarnings(result.warnings || [])
        setErrors(result.errors || [])
        setStep(4)

        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        const error = await response.json()
        alert('Import failed: ' + (error.message || error.error))
        setErrors(error.errors || [error.error])
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Failed to import: ' + err.message)
    } finally {
      setImporting(false)
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
      }).filter(row => row.email && row.firstName && row.lastName) // Filter out invalid rows

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
    setImportMode('quick')
    setStep(1)
    setFile(null)
    setParsedData(null)
    setColumnMapping({})
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
              <h3 className="text-xl font-semibold text-white">Bulk Import Licensees</h3>
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
              {['Upload File', 'Map Columns', 'Preview & Import', 'Results'].map((label, index) => (
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
                  Upload a CSV file containing licensee data. The file can contain up to 300,000 records.
                </p>
                
                {/* Import Mode Selection */}
                {!file && (
                  <div className="mb-6 w-full max-w-md">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Import Mode</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setImportMode('quick')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          importMode === 'quick'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 mb-1">Quick Import</div>
                        <div className="text-xs text-gray-600">Auto-detect fields (recommended)</div>
                      </button>
                      <button
                        onClick={() => setImportMode('manual')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          importMode === 'manual'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 mb-1">Manual Mapping</div>
                        <div className="text-xs text-gray-600">Map columns manually</div>
                      </button>
                    </div>
                  </div>
                )}
                
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
                  <div className="mt-6 space-y-4 w-full max-w-md">
                    <div className="text-sm text-gray-600 text-center">
                      Selected: <span className="font-medium">{file.name}</span>
                    </div>
                    {importMode === 'quick' && (
                      <button
                        onClick={handleQuickImport}
                        disabled={importing}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Quick Import Now</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Map Columns */}
            {step === 2 && parsedData && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Map CSV Columns to Database Fields</h4>
                <p className="text-sm text-gray-600 mb-6">
                  Match each column from your CSV file to the corresponding database field. Required fields are marked with *.
                </p>
                <div className="space-y-3 mb-6">
                  {parsedData.headers.map((header, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">{header}</label>
                        <div className="text-xs text-gray-500 mt-1">
                          Sample: {parsedData.rows[0]?.[header] || 'N/A'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <select
                          value={columnMapping[header] || 'skip'}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {dbFields.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label} {field.required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue to Preview
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Import */}
            {step === 3 && parsedData && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Showing first 10 rows. Total rows to import: <span className="font-semibold">{parsedData.rows.length}</span>
                </p>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(columnMapping).filter(k => columnMapping[k] !== 'skip').map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {dbFields.find(f => f.value === columnMapping[header])?.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.keys(columnMapping).filter(k => columnMapping[k] !== 'skip').map((header, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back to Mapping
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                  >
                    {importing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Importing... {progress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Start Import</span>
                      </>
                    )}
                  </button>
                </div>
                {importing && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Results */}
            {step === 4 && results && (
              <div>
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h4>
                  <div className="text-center space-y-2 mb-6">
                    <p className="text-sm text-gray-600">
                      Total Records: <span className="font-semibold">{results.total}</span>
                    </p>
                    <p className="text-sm text-green-600">
                      New Licensees: <span className="font-semibold">{results.imported}</span>
                    </p>
                    {results.updated > 0 && (
                      <p className="text-sm text-blue-600">
                        Updated: <span className="font-semibold">{results.updated}</span>
                      </p>
                    )}
                    {results.failed > 0 && (
                      <p className="text-sm text-red-600">
                        Failed: <span className="font-semibold">{results.failed}</span>
                      </p>
                    )}
                  </div>
                  {warnings.length > 0 && (
                    <div className="w-full mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Warnings ({warnings.length}):</h5>
                      <div className="max-h-48 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        {warnings.map((warning, index) => (
                          <div key={index} className="text-xs text-yellow-800 mb-1">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {errors.length > 0 && (
                    <div className="w-full mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Errors:</h5>
                      <div className="max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                        {errors.map((error, index) => (
                          <div key={index} className="text-xs text-red-700 mb-1">
                            {error.error || JSON.stringify(error)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkImportModal


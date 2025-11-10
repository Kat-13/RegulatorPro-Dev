import { useState } from 'react'
import { X, Upload, FileArchive, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const API_BASE_URL = '/api'

function ZipImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [errors, setErrors] = useState([])

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile)
      setResults(null)
      setErrors([])
    } else {
      alert('Please select a ZIP file')
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/documents/bulk-import-zip`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setResults(result)
        
        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        const error = await response.json()
        alert('Import failed: ' + (error.message || error.error))
        setErrors([error.error])
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Failed to import: ' + err.message)
      setErrors([err.message])
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResults(null)
    setErrors([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl relative" style={{ zIndex: 10000 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center space-x-3">
              <FileArchive className="w-6 h-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Import Documents from ZIP</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {!results ? (
              <div>
                {/* Instructions */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">ZIP File Structure</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>Organize documents in folders by license number:</p>
                    <pre className="mt-2 p-2 bg-white rounded text-xs">
{`documents.zip
├── VET-2024-001/
│   ├── application.pdf
│   ├── degree.pdf
│   └── photo.jpg
├── VET-2024-002/
│   ├── application.pdf
│   └── transcript.pdf`}
                    </pre>
                    <p className="mt-2">Files will be automatically categorized by filename.</p>
                  </div>
                </div>

                {/* File Upload */}
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileArchive className="w-16 h-16 text-blue-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload ZIP File</h4>
                  <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                    Select a ZIP file containing documents organized by license number
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                      <Upload className="w-5 h-5" />
                      <span>Choose ZIP File</span>
                    </div>
                  </label>
                  {file && (
                    <div className="mt-4 text-sm text-gray-600">
                      Selected: <span className="font-medium">{file.name}</span>
                    </div>
                  )}
                </div>

                {/* Import Button */}
                {file && !importing && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleImport}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Start Import</span>
                    </button>
                  </div>
                )}

                {/* Importing State */}
                {importing && (
                  <div className="mt-6 flex items-center justify-center space-x-3">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-gray-700">Importing documents...</span>
                  </div>
                )}
              </div>
            ) : (
              /* Results */
              <div>
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h4>
                  
                  <div className="text-center space-y-2 mb-6">
                    <p className="text-sm text-gray-600">
                      Total Files: <span className="font-semibold">{results.stats.total_files}</span>
                    </p>
                    <p className="text-sm text-green-600">
                      Successfully Imported: <span className="font-semibold">{results.stats.imported}</span>
                    </p>
                    {results.stats.skipped > 0 && (
                      <p className="text-sm text-yellow-600">
                        Skipped: <span className="font-semibold">{results.stats.skipped}</span>
                      </p>
                    )}
                  </div>

                  {/* Licensee Stats */}
                  {Object.keys(results.licensee_stats).length > 0 && (
                    <div className="w-full mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Documents per Licensee:</h5>
                      <div className="max-h-48 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
                        {Object.entries(results.licensee_stats).map(([license, count]) => (
                          <div key={license} className="text-xs text-gray-700 mb-1 flex justify-between">
                            <span>{license}</span>
                            <span className="font-semibold">{count} documents</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {results.stats.errors && results.stats.errors.length > 0 && (
                    <div className="w-full mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Errors ({results.stats.errors.length}):</h5>
                      <div className="max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                        {results.stats.errors.map((error, index) => (
                          <div key={index} className="text-xs text-red-700 mb-1">
                            {error}
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

export default ZipImportModal


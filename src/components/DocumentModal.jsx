import { useState, useEffect } from 'react'
import { X, Upload, Download, Trash2, FileText, File, Image, FileCheck, Loader, FolderOpen, Eye } from 'lucide-react'

const API_BASE_URL = '/api'

const CATEGORY_ICONS = {
  application: FileCheck,
  education: FileText,
  notarized: FileCheck,
  photo: Image,
  identification: File,
  other: File
}

const CATEGORY_LABELS = {
  application: 'Applications',
  education: 'Education',
  notarized: 'Notarized Documents',
  photo: 'Photos',
  identification: 'Identification',
  other: 'Other Documents'
}

function DocumentModal({ isOpen, onClose, user }) {
  const [documents, setDocuments] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('application')
  const [previewDocument, setPreviewDocument] = useState(null)

  useEffect(() => {
    if (isOpen && user) {
      fetchDocuments()
    }
  }, [isOpen, user])

  const fetchDocuments = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/documents`)
      const data = await response.json()
      setDocuments(data.documents_by_category || {})
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', selectedCategory)

      const response = await fetch(`${API_BASE_URL}/users/${user.id}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        await fetchDocuments()
        alert('Document uploaded successfully')
      } else {
        const error = await response.json()
        alert('Upload failed: ' + (error.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload document')
    } finally {
      setUploading(false)
      e.target.value = '' // Reset file input
    }
  }

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download document')
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download document')
    }
  }

  const handleDelete = async (documentId, filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchDocuments()
        alert('Document deleted successfully')
      } else {
        alert('Failed to delete document')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete document')
    }
  }

  const getTotalDocumentCount = () => {
    return Object.values(documents).reduce((sum, docs) => sum + docs.length, 0)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString()
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl relative" style={{ zIndex: 10000 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {user.firstName} {user.lastName} - Documents
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                License: {user.licenseNumber || 'N/A'} | Total: {getTotalDocumentCount()} documents
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Upload Section */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="application">Application</option>
                    <option value="education">Education</option>
                    <option value="notarized">Notarized</option>
                    <option value="photo">Photo</option>
                    <option value="identification">Identification</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Documents List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : getTotalDocumentCount() === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No documents uploaded yet</p>
                <p className="text-sm text-gray-500 mt-2">Upload documents using the button above</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(documents).map(([category, docs]) => {
                  const Icon = CATEGORY_ICONS[category] || File
                  const label = CATEGORY_LABELS[category] || category

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-5 h-5 text-gray-600" />
                          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                          <span className="text-xs text-gray-500">({docs.length})</span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {docs.map((doc) => (
                          <div key={doc.id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.original_filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.file_size)} • {formatDate(doc.upload_date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setPreviewDocument(doc)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(doc.id, doc.original_filename)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(doc.id, doc.original_filename)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10001 }}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={() => setPreviewDocument(null)}></div>

            <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl relative" style={{ zIndex: 10002 }}>
              {/* Preview Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {previewDocument.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(previewDocument.file_size)} • {formatDate(previewDocument.upload_date)}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="px-6 py-6" style={{ minHeight: '500px', maxHeight: '80vh', overflow: 'auto' }}>
                {previewDocument.mime_type?.startsWith('image/') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={`${API_BASE_URL}/documents/${previewDocument.id}/download`}
                      alt={previewDocument.original_filename}
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: '70vh' }}
                    />
                  </div>
                ) : previewDocument.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`${API_BASE_URL}/documents/${previewDocument.id}/download`}
                    className="w-full border-0"
                    style={{ height: '70vh' }}
                    title={previewDocument.original_filename}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    <button
                      onClick={() => handleDownload(previewDocument.id, previewDocument.original_filename)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download to View</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => handleDownload(previewDocument.id, previewDocument.original_filename)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentModal


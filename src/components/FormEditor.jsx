import React, { useState, useEffect } from 'react'
import { Edit2, Save, X, Plus, DollarSign, FileText, GitBranch } from 'lucide-react'
import FeeRulesConfig from './FeeRulesConfig'
import ConditionalLogicBuilder from './ConditionalLogicBuilder'
import FieldLibrarySidebar from './FieldLibrarySidebar'
import KanbanBoard from './KanbanBoard'
import ApplicationTypesKanban from './ApplicationTypesKanban'

const API_BASE_URL = '/api'

function FormEditor() {
  const [applicationTypes, setApplicationTypes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [fields, setFields] = useState([])
  const [editingField, setEditingField] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewTypeModal, setShowNewTypeModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [creatingType, setCreatingType] = useState(false)
  const [creationMode, setCreationMode] = useState('template') // 'template', 'clone', or 'import'
  const [cloneSourceId, setCloneSourceId] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [activeTab, setActiveTab] = useState('fields') // 'fields', 'fees', or 'logic'
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [viewMode, setViewMode] = useState('kanban') // 'list' or 'kanban'
  const [sections, setSections] = useState([])
  const [selectedAppTypeId, setSelectedAppTypeId] = useState(null)

  useEffect(() => {
    fetchApplicationTypes()
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/form-templates`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates || [])
        // Auto-select Standard License Application template
        const standardTemplate = data.templates.find(t => t.template_type === 'standard_license')
        if (standardTemplate) {
          setSelectedTemplateId(standardTemplate.id)
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  const fetchApplicationTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/application-types`)
      const data = await response.json()
      const allTypes = data.applicationTypes || data
      // Filter: show draft and published, hide archived and deleted
      // - active=false means soft-deleted (hide completely)
      // - status='archived' means deprecated but kept for history (hide from editing)
      const activeTypes = allTypes.filter(type => 
        type.active !== false && type.status !== 'archived'
      )
      setApplicationTypes(activeTypes)
      if (activeTypes.length > 0) {
        selectApplicationType(activeTypes[0])
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching application types:', err)
      setLoading(false)
    }
  }

  const selectApplicationType = (type) => {
    setSelectedType(type)
    // The API returns fields as a parsed array already
    const fieldData = type.fields || JSON.parse(type.form_definition || '[]')
    setFields(fieldData)
    
    // Load sections if available
    const sectionsData = type.sections || JSON.parse(type.sections_json || '[]')
    if (sectionsData && sectionsData.length > 0) {
      setSections(sectionsData)
    } else {
      // Create default section if none exist
      setSections([{
        id: 'section_1',
        name: 'Application Fields',
        fields: fieldData.map((f, idx) => ({
          ...f,
          id: f.id || f.name || `field_${idx}`
        }))
      }])
    }
  }

  const handleFieldUpdate = (index, updates) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const handleToggle = (index, field) => {
    handleFieldUpdate(index, { [field]: !fields[index][field] })
  }

  const saveChanges = async () => {
    if (!selectedType) return
    
    setSaving(true)
    try {
      // Check if the Application Type name (first field's label) has changed
      const applicationTypeField = fields.find(f => f.name === 'applicationType')
      const newName = applicationTypeField?.label || selectedType.name
      
      const updateData = {
        form_definition: JSON.stringify(fields)
      }
      
      // If the name has changed, include it in the update
      if (newName !== selectedType.name) {
        updateData.name = newName
      }
      
      const response = await fetch(`${API_BASE_URL}/application-types/${selectedType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        alert('Changes saved successfully!')
        // Refresh the application types list to update the dropdown
        await fetchApplicationTypes()
        // Re-select the current type to maintain selection
        const updatedTypes = await fetch(`${API_BASE_URL}/application-types`).then(r => r.json())
        const updatedType = (updatedTypes.applicationTypes || updatedTypes).find(t => t.id === selectedType.id)
        if (updatedType) {
          setSelectedType(updatedType)
        }
      } else {
        alert('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving changes:', err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const deleteApplicationType = async (appTypeToDelete) => {
    // Use parameter if provided, otherwise use selectedType
    const appType = appTypeToDelete || selectedType
    
    if (!appType) return
    
    if (applicationTypes.length <= 1) {
      alert('Cannot delete the last application type')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${appType.name}"?\n\nThis action cannot be undone.`
    )
    
    if (!confirmDelete) return

    try {
      const response = await fetch(`${API_BASE_URL}/application-types/${appType.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('Application type deleted successfully!')
        // Refresh the list and select the first remaining type
        await fetchApplicationTypes()
        // Clear selection if we deleted the currently selected type
        if (selectedType && selectedType.id === appType.id) {
          setSelectedType(null)
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.message || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error deleting application type:', err)
      alert('Failed to delete application type')
    }
  }

  const createNewLicenseType = async () => {
    if (creationMode === 'template') {
      await createFromTemplate()
    } else if (creationMode === 'clone') {
      await cloneLicenseType()
    } else if (creationMode === 'ai-extract') {
      await extractFromPDF()
    } else {
      await importFromDocument()
    }
  }

  const createFromTemplate = async () => {
    if (!newTypeName.trim()) {
      alert('Please enter a license type name')
      return
    }

    if (!selectedTemplateId) {
      alert('Please select a template')
      return
    }

    setCreatingType(true)
    try {
      // Find the selected template
      const template = templates.find(t => t.id === parseInt(selectedTemplateId))
      if (!template) {
        alert('Template not found')
        return
      }

      // Create application type from template
      const response = await fetch(`${API_BASE_URL}/application-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          description: template.description || '',
          fields: template.fields,
          workflow: {},
          fees: {}
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert('License type created successfully from template!')
        resetModal()
        // Refresh the application types list
        await fetchApplicationTypes()
        // Select the newly created type
        if (result.applicationType) {
          selectApplicationType(result.applicationType)
        }
      } else {
        alert('Failed to create license type')
      }
    } catch (err) {
      console.error('Error creating from template:', err)
      alert('Failed to create license type')
    } finally {
      setCreatingType(false)
    }
  }

  const cloneLicenseType = async () => {
    if (!newTypeName.trim()) {
      alert('Please enter a license type name')
      return
    }

    if (!cloneSourceId) {
      alert('Please select a license type to clone')
      return
    }

    setCreatingType(true)
    try {
      // Find the source application type
      const sourceType = applicationTypes.find(t => t.id === parseInt(cloneSourceId))
      if (!sourceType) {
        alert('Source license type not found')
        return
      }

      // Clone all fields from source
      const clonedFields = sourceType.fields || []

      const response = await fetch(`${API_BASE_URL}/application-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          description: sourceType.description || '',
          renewalPeriod: sourceType.renewalPeriod,
          duration: sourceType.duration,
          licenseNumberFormat: sourceType.licenseNumberFormat,
          fields: clonedFields,
          workflow: sourceType.workflow || {},
          fees: sourceType.fees || {}
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert('License type cloned successfully!')
        resetModal()
        // Refresh the application types list
        await fetchApplicationTypes()
        // Select the newly created type
        if (result.applicationType) {
          selectApplicationType(result.applicationType)
        }
      } else {
        alert('Failed to clone license type')
      }
    } catch (err) {
      console.error('Error cloning license type:', err)
      alert('Failed to clone license type')
    } finally {
      setCreatingType(false)
    }
  }

  const extractFromPDF = async () => {
    if (!uploadedFile) {
      alert('Please upload a PDF file')
      return
    }

    if (!newTypeName.trim()) {
      alert('Please enter a license type name')
      return
    }

    setCreatingType(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('applicationName', newTypeName.trim())

      const response = await fetch(`${API_BASE_URL}/extract-pdf`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        const stats = result.extractionStats || {}
        alert(
          `PDF extracted successfully!\n\n` +
          `Total Sections: ${stats.total_sections || 0}\n` +
          `Total Questions: ${stats.total_questions || 0}\n` +
          `Estimated Time: ${stats.estimated_time_minutes || 0} minutes`
        )
        resetModal()
        await fetchApplicationTypes()
        if (result.applicationType) {
          selectApplicationType(result.applicationType)
        }
      } else {
        const error = await response.json()
        alert(`Failed to extract PDF: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error extracting PDF:', err)
      alert('Failed to extract PDF. Please try again.')
    } finally {
      setCreatingType(false)
    }
  }

  const importFromDocument = async () => {
    if (!uploadedFile) {
      alert('Please upload a document to import')
      return
    }

    if (!newTypeName.trim()) {
      alert('Please enter a license type name')
      return
    }

    setCreatingType(true)
    try {
      const fileText = await uploadedFile.text()
      const fileName = uploadedFile.name.toLowerCase()
      
      // Check if it's a CSV file
      if (fileName.endsWith('.csv')) {
        // Import CSV file
        const response = await fetch(`${API_BASE_URL}/application-types/import-csv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            csvContent: fileText,
            applicationName: newTypeName.trim()
          })
        })

        if (response.ok) {
          const result = await response.json()
          const stats = result.stats || {}
          alert(
            `CSV imported successfully!\n\n` +
            `Total Fields: ${stats.total_fields || 0}\n` +
            `Matched to UFL: ${stats.matched_fields || 0}\n` +
            `New Fields: ${stats.new_fields || 0}\n` +
            `Reuse Rate: ${stats.reuse_rate || 0}%\n\n` +
            (result.warnings && result.warnings.length > 0 ? `Warnings:\n${result.warnings.join('\n')}` : '')
          )
          resetModal()
          await fetchApplicationTypes()
          if (result.applicationType) {
            selectApplicationType(result.applicationType)
          }
        } else {
          const error = await response.json()
          alert(`Failed to import CSV: ${error.error || 'Unknown error'}\n\n${error.errors ? error.errors.join('\n') : ''}`)
        }
      } else if (fileName.endsWith('.json')) {
        // Import JSON file
        const jsonData = JSON.parse(fileText)
        
        // Validate JSON structure
        if (!jsonData.name || !jsonData.fields) {
          alert('Invalid JSON format. Expected fields: name, fields (array)')
          setCreatingType(false)
          return
        }
        
        // Create the application type
        const response = await fetch(`${API_BASE_URL}/application-types`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: jsonData.name,
            description: jsonData.description || '',
            renewalPeriod: jsonData.renewalPeriod || 24,
            duration: jsonData.duration || 24,
            licenseNumberFormat: jsonData.licenseNumberFormat || 'VET-{YYYY}-{####}',
            fields: jsonData.fields,
            workflow: jsonData.workflow || {},
            fees: jsonData.fees || {}
          })
        })

        if (response.ok) {
          const result = await response.json()
          alert(`License type "${jsonData.name}" imported successfully!`)
          resetModal()
          await fetchApplicationTypes()
          if (result.applicationType) {
            selectApplicationType(result.applicationType)
          }
        } else {
          const error = await response.json()
          alert(`Failed to import: ${error.error || 'Unknown error'}`)
        }
      } else {
        alert('Unsupported file format. Please upload a CSV or JSON file.')
      }
    } catch (err) {
      console.error('Error importing document:', err)
      if (err instanceof SyntaxError) {
        alert('Invalid file format. Please check the file.')
      } else {
        alert('Failed to import document: ' + err.message)
      }
    } finally {
      setCreatingType(false)
    }
  }

  const resetModal = () => {
    setShowNewTypeModal(false)
    setNewTypeName('')
    setCreationMode('template')
    setCloneSourceId(null)
    setUploadedFile(null)
    // Reset to standard template
    const standardTemplate = templates.find(t => t.template_type === 'standard_license')
    if (standardTemplate) {
      setSelectedTemplateId(standardTemplate.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Editor</h1>
          <p className="text-gray-600">Customize application forms for your regulatory board</p>
        </div>

        {/* Unified View - Top bar + Kanban cards */}
        <div>
        {/* Application Type Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Application Type
              </label>
              <select
                value={selectedType?.id || ''}
                onChange={(e) => {
                  const type = applicationTypes.find(t => t.id === parseInt(e.target.value))
                  selectApplicationType(type)
                }}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {applicationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({(type.fields || []).length} fields) {!type.active ? '[DRAFT]' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Publish/Draft Toggle */}
            {selectedType && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <button
                  onClick={async () => {
                    if (!selectedType) return;
                    // Toggle between draft and published (not archived)
                    const newStatus = selectedType.status === 'published' ? 'draft' : 'published';
                    try {
                      const response = await fetch(`${API_BASE_URL}/application-types/${selectedType.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                      });
                      if (response.ok) {
                        // Update selectedType immediately for UI responsiveness
                        setSelectedType(prev => ({ ...prev, status: newStatus }));
                        // Refresh the full list in background
                        await fetchApplicationTypes();
                        // Get the updated type with all its data
                        const updatedTypes = await fetch(`${API_BASE_URL}/application-types`).then(r => r.json());
                        const updatedType = (updatedTypes.applicationTypes || updatedTypes).find(t => t.id === selectedType.id);
                        if (updatedType) {
                          selectApplicationType(updatedType);
                        }
                      }
                    } catch (err) {
                      console.error('Error updating status:', err);
                      alert('Failed to update status');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    selectedType.status === 'published' ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      selectedType.status === 'published' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-semibold ${
                  selectedType.status === 'published' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {selectedType.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewTypeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} />
                New License Type
              </button>
              <button
                onClick={deleteApplicationType}
                disabled={!selectedType || applicationTypes.length <= 1}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap"
                title={applicationTypes.length <= 1 ? 'Cannot delete the last application type' : 'Delete this application type'}
              >
                <X size={18} />
                Delete
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board - Merged from Kanban View */}
        <ApplicationTypesKanban
          applicationTypes={applicationTypes}
          selectedAppTypeId={selectedAppTypeId}
          onSelectAppType={(id) => setSelectedAppTypeId(id)}
          onUpdateApplicationType={async (updatedType) => {
            setApplicationTypes(prev =>
              prev.map(t => t.id === updatedType.id ? updatedType : t)
            );
            
            try {
              const response = await fetch(`${API_BASE_URL}/application-types/${updatedType.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedType)
              });
              
              if (!response.ok) {
                throw new Error('Failed to save application type');
              }
              
              console.log('Application type saved successfully');
            } catch (error) {
              console.error('Error saving application type:', error);
              alert('Failed to save changes. Please try again.');
            }
          }}
          onDeleteApplicationType={deleteApplicationType}
          onCreateNew={() => setShowNewTypeModal(true)}
        />
        </div>

      {/* New License Type Modal */}
      {showNewTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New License Type</h2>
            
            {/* Mode Selection */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <button
                onClick={() => setCreationMode('template')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  creationMode === 'template'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold mb-1">📋 Template</div>
                <div className="text-xs">Start from base template</div>
              </button>
              <button
                onClick={() => setCreationMode('clone')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  creationMode === 'clone'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold mb-1">📑 Clone</div>
                <div className="text-xs">Copy existing type</div>
              </button>
              <button
                onClick={() => setCreationMode('import')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  creationMode === 'import'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold mb-1">📄 Import</div>
                <div className="text-xs">Upload CSV/JSON</div>
              </button>
              <button
                onClick={() => setCreationMode('ai-extract')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  creationMode === 'ai-extract'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold mb-1">🤖 AI Extract</div>
                <div className="text-xs">Upload PDF form</div>
              </button>
            </div>

            {/* Template Mode */}
            {creationMode === 'template' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template
                  </label>
                  <select
                    value={selectedTemplateId || ''}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.fields.length} fields)
                      </option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <p className="text-xs text-gray-500 mt-2">
                      {templates.find(t => t.id === parseInt(selectedTemplateId))?.description}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New License Type Name
                  </label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g., Veterinary License - New Application"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !creatingType) {
                        createNewLicenseType()
                      }
                    }}
                  />
                </div>
              </div>
            )}


            {/* Clone Mode */}
            {creationMode === 'clone' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select License Type to Clone
                  </label>
                  <select
                    value={cloneSourceId || ''}
                    onChange={(e) => setCloneSourceId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a license type...</option>
                    {applicationTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({(type.fields || []).length} fields)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New License Type Name
                  </label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g., Veterinary Technician License"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !creatingType) {
                        createNewLicenseType()
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Import Mode */}
            {creationMode === 'import' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New License Type Name
                  </label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g., Dental Board - DDS License"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Document
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setUploadedFile(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: CSV (.csv), JSON (.json)
                  </p>
                </div>
                {uploadedFile && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <strong>Selected file:</strong> {uploadedFile.name}
                  </div>
                )}
              </div>
            )}

            {/* AI Extract Mode */}
            {creationMode === 'ai-extract' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New License Type Name
                  </label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g., ALFSB3 - Adult-Use Marijuana Grower License"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF Form
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedFile(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Upload a PDF of your application form. AI will automatically extract all fields.
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Please be patient, the processing takes a moment.
                  </p>
                </div>
                {uploadedFile && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <strong>Selected file:</strong> {uploadedFile.name}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={createNewLicenseType}
                disabled={creatingType || 
                  (creationMode === 'template' && (!newTypeName.trim() || !selectedTemplateId)) ||
                  (creationMode === 'clone' && (!newTypeName.trim() || !cloneSourceId)) || 
                  (creationMode === 'import' && (!uploadedFile || !newTypeName.trim())) ||
                  (creationMode === 'ai-extract' && (!uploadedFile || !newTypeName.trim()))}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {creatingType ? 'Processing...' : 
                  creationMode === 'template' ? 'Create from Template' :
                  creationMode === 'clone' ? 'Clone License Type' : 
                  creationMode === 'ai-extract' ? 'Extract from PDF' :
                  'Import Document'}
              </button>
              <button
                onClick={resetModal}
                disabled={creatingType}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function FieldCard({ field, index, onUpdate, onToggle }) {
  const [isEditing, setIsEditing] = useState(false)
  const [localField, setLocalField] = useState(field)

  const handleSave = () => {
    onUpdate(localField)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalField(field)
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-blue-600 hover:text-blue-700"
        >
          {isEditing ? <X size={20} /> : <Edit2 size={20} />}
        </button>
      </div>

      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Label
            </label>
            <input
              type="text"
              value={localField.label}
              onChange={(e) => setLocalField({ ...localField, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => setLocalField({ ...localField, placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text
              <span className="text-xs text-gray-500 ml-2">(Optional) Guidance text shown to applicants</span>
            </label>
            <textarea
              value={localField.helpText || ''}
              onChange={(e) => setLocalField({ ...localField, helpText: e.target.value })}
              rows={2}
              placeholder="e.g., Arizona statute requires 5 years of experience"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Field Type:</span>
              <span className="ml-2 font-medium text-gray-900">{field.type}</span>
            </div>
            <div>
              <span className="text-gray-500">Placeholder:</span>
              <span className="ml-2 text-gray-700">{field.placeholder || 'None'}</span>
            </div>
          </div>

          {field.helpText && (
            <div className="text-sm">
              <span className="text-gray-500">Help Text:</span>
              <p className="mt-1 text-gray-700 italic">{field.helpText}</p>
            </div>
          )}

          {/* Toggles */}
          <div className="flex gap-6 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Required</span>
              <button
                onClick={() => onToggle('required')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  field.required ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    field.required ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Visible</span>
              <button
                onClick={() => onToggle('visible')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  field.visible !== false ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    field.visible !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormEditor


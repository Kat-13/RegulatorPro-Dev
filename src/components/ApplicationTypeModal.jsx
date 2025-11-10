import { useState } from 'react';
import { X, Plus, Trash2, Edit2, ChevronUp, ChevronDown, GripVertical, ChevronRight } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FieldLibraryPicker from './FieldLibraryPicker';
import EditElementDialog from './EditElementDialog';
import ConditionalRuleBuilder from './ConditionalRuleBuilder';
import ValidationRuleEditor from './ValidationRuleEditor';

// Element type constants
const ELEMENT_TYPES = {
  SECTION_HEADER: 'section_header',
  FIELD: 'field',
  INSTRUCTION_BLOCK: 'instruction_block',
  DOCUMENT_UPLOAD: 'document_upload',
  SIGNATURE_BLOCK: 'signature_block',
  ATTESTATION_BLOCK: 'attestation_block',
  FEE_DISPLAY: 'fee_display'
};

// Sortable Form Element Card Component
const SortableFormElement = ({ element, onEdit, onDelete, onMoveUp, onMoveDown }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderContent = () => {
    switch(element.type) {
      case ELEMENT_TYPES.SECTION_HEADER:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Section Header</div>
            <div className="text-gray-900 font-medium mt-1">"{element.content}"</div>
          </div>
        );
      case ELEMENT_TYPES.FIELD:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Field</div>
            <div className="text-gray-900 font-medium mt-1">
              {element.display_name || element.canonical_name || element.label || element.name || 'Unnamed Field'}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Type: {element.field_type || element.type}
            </div>
          </div>
        );
      case ELEMENT_TYPES.INSTRUCTION_BLOCK:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Instruction Block</div>
            <div className="text-gray-700 mt-1 text-sm italic line-clamp-2">"{element.content}"</div>
          </div>
        );
      case ELEMENT_TYPES.DOCUMENT_UPLOAD:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Document Upload</div>
            <div className="text-gray-900 font-medium mt-1">
              {element.name}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </div>
          </div>
        );
      case ELEMENT_TYPES.SIGNATURE_BLOCK:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Signature Block</div>
            <div className="text-gray-700 mt-1 text-sm">
              {element.config?.applicant && 'Applicant'}
              {element.config?.witnesses && ' + Witnesses'}
              {element.config?.notary && ' + Notary'}
            </div>
          </div>
        );
      case ELEMENT_TYPES.ATTESTATION_BLOCK:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Attestation Block</div>
            <div className="text-gray-700 mt-1 text-sm italic line-clamp-2">"{element.content}"</div>
          </div>
        );
      case ELEMENT_TYPES.FEE_DISPLAY:
        return (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Fee Display</div>
            <div className="text-gray-900 font-medium mt-1">Base: ${element.base_amount || '0.00'}</div>
          </div>
        );
      default:
        return <div className="text-gray-500">Unknown element type</div>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1">
          <GripVertical size={20} />
        </div>
        
        {/* Order Number */}
        <div className="text-sm font-medium text-gray-400 mt-1 w-6">{element.order}.</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(element)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(element)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => onMoveUp(element)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Move Up"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => onMoveDown(element)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Move Down"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Modal Component
const ApplicationTypeModal = ({ applicationType, onClose, onSave }) => {
  const [currentTab, setCurrentTab] = useState('form'); // 'form' or 'conditional-logic'
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  
  // Initialize fields from existing data
  const initializeFormElements = () => {
    const elements = [];
    let order = 1;
    
    // Convert existing fields to form elements
    // Check multiple possible locations for fields data
    const fieldsSource = applicationType.fields || applicationType.sections?.[0]?.fields || [];
    
    if (fieldsSource.length > 0) {
      fieldsSource.forEach(field => {
        elements.push({
          id: field.id || field.field_key || field.name || `field-${order}`,
          ...field,
          type: ELEMENT_TYPES.FIELD,  // Must be after spread to not get overwritten
          field_type: field.type,  // Preserve original type as field_type
          order: order++
        });
      });
    }
    
    // Add existing documents as document upload elements
    if (applicationType.required_documents) {
      applicationType.required_documents.forEach(doc => {
        elements.push({
          id: `doc-${order}`,
          type: ELEMENT_TYPES.DOCUMENT_UPLOAD,
          ...doc,
          order: order++
        });
      });
    }
    
    // Add signature block if configured
    if (applicationType.signature_config) {
      elements.push({
        id: `sig-${order}`,
        type: ELEMENT_TYPES.SIGNATURE_BLOCK,
        config: applicationType.signature_config,
        order: order++
      });
    }
    
    return elements;
  };
  
  const [localData, setLocalData] = useState({
    ...applicationType,
    fields: applicationType.fields || initializeFormElements(),
    baseFee: applicationType.baseFee || 0,
    lateFeePercentage: applicationType.lateFeePercentage || 0,
    renewalWindowDays: applicationType.renewalWindowDays || 30,
    expirationMonths: applicationType.expirationMonths || 12,
    fee_rules: applicationType.fee_rules || [],
    dependencies: applicationType.dependencies || [],
    reciprocity_rules: applicationType.reciprocity_rules || [],
    conditional_logic: applicationType.conditional_logic || [],
    description: applicationType.description || ''
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalData(prev => {
        const oldIndex = prev.fields.findIndex(el => el.id === active.id);
        const newIndex = prev.fields.findIndex(el => el.id === over.id);
        
        const newElements = arrayMove(prev.fields, oldIndex, newIndex);
        // Update order numbers
        newElements.forEach((el, idx) => {
          el.order = idx + 1;
        });
        
        return { ...prev, fields: newElements };
      });
    }
  };

  const handleSave = () => {
    // Backend expects camelCase for fee fields
    const dataToSave = {
      ...localData
    };
    
    onSave && onSave(dataToSave);
    onClose && onClose();
  };

  const addElement = (type) => {
    setShowAddMenu(false);
    
    if (type === ELEMENT_TYPES.FIELD) {
      setShowFieldPicker(true);
      return;
    }
    
    const newOrder = localData.fields.length + 1;
    const newElement = {
      id: `${type}-${Date.now()}`,
      type,
      order: newOrder
    };
    
    // Set defaults based on type
    switch(type) {
      case ELEMENT_TYPES.SECTION_HEADER:
        newElement.content = 'New Section';
        break;
      case ELEMENT_TYPES.INSTRUCTION_BLOCK:
        newElement.content = 'Enter instructions here...';
        break;
      case ELEMENT_TYPES.DOCUMENT_UPLOAD:
        newElement.name = 'Document Name';
        newElement.required = true;
        break;
      case ELEMENT_TYPES.SIGNATURE_BLOCK:
        newElement.config = { applicant: true, witnesses: false, notary: false };
        break;
      case ELEMENT_TYPES.ATTESTATION_BLOCK:
        newElement.content = 'I hereby certify...';
        break;
      case ELEMENT_TYPES.FEE_DISPLAY:
        newElement.base_amount = localData.base_fee || '0.00';
        break;
    }
    
    setLocalData(prev => ({
      ...prev,
      fields: [...prev.fields, newElement]
    }));
  };

  const handleFieldSelected = (field) => {
    const newOrder = localData.fields.length + 1;
    setLocalData(prev => ({
      ...prev,
      fields: [...prev.fields, {
        id: `field-${Date.now()}`,
        type: ELEMENT_TYPES.FIELD,
        ...field,
        order: newOrder
      }]
    }));
  };

  const editElement = (element) => {
    setEditingElement(element);
  };

  const handleElementSave = (updatedElement) => {
    setLocalData(prev => ({
      ...prev,
      fields: prev.fields.map(el => 
        el.id === updatedElement.id ? updatedElement : el
      )
    }));
    setEditingElement(null);
  };

  const deleteElement = (element) => {
    setLocalData(prev => {
      const newElements = prev.fields.filter(el => el.id !== element.id);
      // Reorder
      newElements.forEach((el, idx) => {
        el.order = idx + 1;
      });
      return { ...prev, fields: newElements };
    });
  };

  const moveElementUp = (element) => {
    setLocalData(prev => {
      const index = prev.fields.findIndex(el => el.id === element.id);
      if (index > 0) {
        const newElements = arrayMove(prev.fields, index, index - 1);
        newElements.forEach((el, idx) => {
          el.order = idx + 1;
        });
        return { ...prev, fields: newElements };
      }
      return prev;
    });
  };

  const moveElementDown = (element) => {
    setLocalData(prev => {
      const index = prev.fields.findIndex(el => el.id === element.id);
      if (index < prev.fields.length - 1) {
        const newElements = arrayMove(prev.fields, index, index + 1);
        newElements.forEach((el, idx) => {
          el.order = idx + 1;
        });
        return { ...prev, fields: newElements };
      }
      return prev;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fee rules functions from original
  const addFeeRule = () => {
    setLocalData(prev => ({
      ...prev,
      fee_rules: [...prev.fee_rules, { name: '', amount: '', type: 'flat' }]
    }));
  };

  const updateFeeRule = (index, field, value) => {
    setLocalData(prev => {
      const newRules = [...prev.fee_rules];
      newRules[index] = { ...newRules[index], [field]: value };
      return { ...prev, fee_rules: newRules };
    });
  };

  const removeFeeRule = (index) => {
    setLocalData(prev => ({
      ...prev,
      fee_rules: prev.fee_rules.filter((_, idx) => idx !== index)
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-8">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 my-8">
          
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex-shrink-0 mt-1"></div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={localData.name}
                    onChange={(e) => setLocalData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-xl font-semibold text-gray-900 w-full border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {localData.fields.length} elements • {localData.status || 'Draft'}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Add Element Dropdown */}
            <div className="mt-4">
              <div className="relative inline-block">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} /> Add Element
                </button>
                {showAddMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 w-64">
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.SECTION_HEADER)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Section Header</div>
                      <div className="text-xs text-gray-500">Add a section divider</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.FIELD)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Field</div>
                      <div className="text-xs text-gray-500">Add from field library</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.INSTRUCTION_BLOCK)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Instruction Block</div>
                      <div className="text-xs text-gray-500">Add instructional text</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.DOCUMENT_UPLOAD)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Document Upload</div>
                      <div className="text-xs text-gray-500">Add file upload field</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.SIGNATURE_BLOCK)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Signature Block</div>
                      <div className="text-xs text-gray-500">Add signature capture</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.ATTESTATION_BLOCK)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Attestation Block</div>
                      <div className="text-xs text-gray-500">Add legal attestation text</div>
                    </button>
                    <button
                      onClick={() => addElement(ELEMENT_TYPES.FEE_DISPLAY)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <div className="font-medium">Fee Display</div>
                      <div className="text-xs text-gray-500">Show calculated fee</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setCurrentTab('form')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  currentTab === 'form'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Form Elements
                {localData.fields.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {localData.fields.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCurrentTab('conditional-logic')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  currentTab === 'conditional-logic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Conditional Logic
                {localData.conditional_logic && localData.conditional_logic.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    {localData.conditional_logic.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCurrentTab('validation')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  currentTab === 'validation'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Field Validation
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {currentTab === 'form' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Form Elements</h3>
            
            {localData.fields.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="mb-2">No elements added yet</p>
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add your first element
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localData.fields.map(el => el.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localData.fields.map(element => (
                    <SortableFormElement
                      key={element.id}
                      element={element}
                      onEdit={editElement}
                      onDelete={deleteElement}
                      onMoveUp={moveElementUp}
                      onMoveDown={moveElementDown}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            
            {localData.fields.length > 0 && (
              <button
                onClick={() => setShowAddMenu(true)}
                className="w-full py-3 text-sm text-gray-600 hover:text-gray-900 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors mt-3"
              >
                + Add Element
              </button>
            )}
              </>
            )}

            {currentTab === 'conditional-logic' && (
              <ConditionalRuleBuilder
                applicationTypeId={applicationType?.id}
                availableFields={localData.fields.filter(el => el.type === ELEMENT_TYPES.FIELD)}
                onSave={(rules) => {
                  setLocalData(prev => ({ ...prev, conditional_logic: rules }));
                }}
              />
            )}

            {currentTab === 'validation' && (
              <ValidationRuleEditor
                applicationTypeId={applicationType?.id}
                fields={localData.fields.filter(el => el.type === ELEMENT_TYPES.FIELD)}
              />
            )}
          </div>

          {/* Advanced Configuration */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Advanced Configuration</h3>
            
            {/* Fee Rules */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection('feeRules')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className={`transition-transform ${expandedSections.feeRules ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900">Fee Configuration</span>
                  <span className="text-sm text-gray-500">(Base: ${(localData.baseFee || 0).toFixed(2)})</span>
                </div>
              </button>
              {expandedSections.feeRules && (
                <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="space-y-4">
                    {/* Base Fee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Fee (Flat Rate)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={localData.baseFee || ''}
                          onChange={(e) => setLocalData(prev => ({ ...prev, baseFee: parseFloat(e.target.value) || 0 }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">The standard fee for this application type</p>
                    </div>

                    {/* Late Fee Percentage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Late Fee Percentage
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={localData.lateFeePercentage || ''}
                          onChange={(e) => setLocalData(prev => ({ ...prev, lateFeePercentage: parseFloat(e.target.value) || 0 }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Additional fee charged as percentage of base fee for late renewals</p>
                    </div>

                    {/* Renewal Window */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Renewal Window (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={localData.renewalWindowDays || 30}
                        onChange={(e) => setLocalData(prev => ({ ...prev, renewalWindowDays: parseInt(e.target.value) || 30 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="30"
                      />
                      <p className="text-xs text-gray-500 mt-1">Number of days before expiration when renewal is allowed</p>
                    </div>

                    {/* License Expiration Period */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Validity Period (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={localData.expirationMonths || 12}
                        onChange={(e) => setLocalData(prev => ({ ...prev, expirationMonths: parseInt(e.target.value) || 12 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="12"
                      />
                      <p className="text-xs text-gray-500 mt-1">How long the license remains valid after issuance</p>
                    </div>

                    {/* Fee Summary */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-2">Fee Summary</div>
                      <div className="space-y-1 text-sm text-blue-800">
                        <div className="flex justify-between">
                          <span>Base Fee:</span>
                          <span className="font-medium">${(localData.baseFee || 0).toFixed(2)}</span>
                        </div>
                        {localData.lateFeePercentage > 0 && (
                          <div className="flex justify-between">
                            <span>Late Fee ({localData.lateFeePercentage}%):</span>
                            <span className="font-medium">${((localData.baseFee || 0) * (localData.lateFeePercentage / 100)).toFixed(2)}</span>
                          </div>
                        )}
                        {localData.lateFeePercentage > 0 && (
                          <div className="flex justify-between pt-1 border-t border-blue-300">
                            <span className="font-semibold">Total (if late):</span>
                            <span className="font-semibold">${((localData.baseFee || 0) * (1 + (localData.lateFeePercentage / 100))).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dependencies */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection('dependencies')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className={`transition-transform ${expandedSections.dependencies ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900">Dependencies</span>
                  <span className="text-sm text-gray-500">({localData.dependencies.length} configured)</span>
                </div>
              </button>
              {expandedSections.dependencies && (
                <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">Dependencies list (to be implemented)</p>
                </div>
              )}
            </div>

            {/* Reciprocity Rules */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection('reciprocity')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className={`transition-transform ${expandedSections.reciprocity ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900">Reciprocity Rules</span>
                  <span className="text-sm text-gray-500">({localData.reciprocity_rules.length} configured)</span>
                </div>
              </button>
              {expandedSections.reciprocity && (
                <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">Reciprocity rules (to be implemented)</p>
                </div>
              )}
            </div>

            {/* Conditional Logic */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection('conditionalLogic')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className={`transition-transform ${expandedSections.conditionalLogic ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900">Conditional Logic</span>
                  <span className="text-sm text-gray-500">({localData.conditional_logic.length} configured)</span>
                </div>
              </button>
              {expandedSections.conditionalLogic && (
                <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">Conditional logic (to be implemented)</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection('description')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className={`transition-transform ${expandedSections.description ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-gray-900">Description</span>
                </div>
              </button>
              {expandedSections.description && (
                <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                  <textarea
                    value={localData.description}
                    onChange={(e) => setLocalData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="4"
                    placeholder="Enter application type description..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Field Library Picker Modal */}
      {showFieldPicker && (
        <FieldLibraryPicker
          onClose={() => setShowFieldPicker(false)}
          onSelect={handleFieldSelected}
          selectedApplicationType={applicationType}
        />
      )}

      {/* Edit Element Dialog */}
      {editingElement && (
        <EditElementDialog
          element={editingElement}
          onSave={handleElementSave}
          onClose={() => setEditingElement(null)}
        />
      )}
    </>
  );
};

export default ApplicationTypeModal;


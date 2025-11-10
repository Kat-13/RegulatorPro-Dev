import React, { useState, useEffect } from 'react';

const FieldLibrarySidebar = ({ onFieldSelect, onFieldDrag }) => {
  const [fields, setFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = '/api';

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/field-library`);
      if (!response.ok) throw new Error('Failed to fetch fields');
      
      const data = await response.json();
      const fieldsArray = Array.isArray(data) ? data : (data.fields || []);
      setFields(fieldsArray);
      
      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(
        fieldsArray
          .map(f => f.category)
          .filter(c => c && c !== '')
      )];
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const filteredFields = fields.filter(field => {
    const matchesCategory = selectedCategory === 'All' || field.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      field.canonical_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (field.description && field.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleFieldClick = (field) => {
    if (onFieldSelect) {
      onFieldSelect(field);
    }
  };

  const handleDragStart = (e, field) => {
    e.dataTransfer.setData('field', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
    if (onFieldDrag) {
      onFieldDrag(field);
    }
  };

  if (loading) {
    return (
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h3 style={styles.title}>Field Library</h3>
        </div>
        <div style={styles.loading}>Loading fields...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h3 style={styles.title}>Field Library</h3>
        </div>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h3 style={styles.title}>Field Library</h3>
        <p style={styles.subtitle}>{fields.length} fields</p>
      </div>

      {/* Search Box */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Category Filter */}
      <div style={styles.categoryFilter}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.categorySelect}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Compact Fields Table */}
      <div style={styles.fieldsList}>
        {filteredFields.length === 0 ? (
          <div style={styles.noFields}>No fields found</div>
        ) : (
          <div style={styles.table}>
            {filteredFields.map(field => (
              <div
                key={field.id}
                style={styles.tableRow}
                draggable
                onDragStart={(e) => handleDragStart(e, field)}
                onClick={() => handleFieldClick(field)}
                title={`${field.canonical_name}${field.description ? '\n' + field.description : ''}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f7ff';
                  e.currentTarget.style.borderLeft = '3px solid #0d6efd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderLeft = '3px solid transparent';
                }}
              >
                <div style={styles.fieldName}>{field.canonical_name}</div>
                <div style={styles.fieldType}>{field.field_type}</div>
                <button 
                  style={styles.addButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFieldClick(field);
                  }}
                  title="Add field to form"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div style={styles.helpText}>
        Drag fields or click + to add
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    width: '280px',
    height: '100%',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    borderBottom: '2px solid #dee2e6',
    backgroundColor: '#fff',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#6c757d',
  },
  searchBox: {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#fff',
  },
  searchInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  categoryFilter: {
    padding: '8px 12px',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#fff',
  },
  categorySelect: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '13px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  fieldsList: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#fff',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    borderLeft: '3px solid transparent',
    cursor: 'grab',
    transition: 'all 0.15s ease',
    backgroundColor: '#fff',
  },
  fieldName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#212529',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldType: {
    fontSize: '11px',
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    padding: '2px 8px',
    borderRadius: '3px',
    fontFamily: 'monospace',
  },
  addButton: {
    width: '24px',
    height: '24px',
    padding: 0,
    border: '1px solid #0d6efd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#0d6efd',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    lineHeight: 1,
  },
  helpText: {
    padding: '12px',
    fontSize: '11px',
    color: '#6c757d',
    textAlign: 'center',
    borderTop: '1px solid #dee2e6',
    backgroundColor: '#fff',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '13px',
  },
  error: {
    padding: '20px',
    textAlign: 'center',
    color: '#dc3545',
    fontSize: '13px',
  },
  noFields: {
    padding: '20px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '13px',
  },
};

export default FieldLibrarySidebar;


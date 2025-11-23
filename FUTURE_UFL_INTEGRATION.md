# Future Enhancement: UFL Integration in AIInterviewEditor

## Overview
The old ApplicationTypeModal had integration with the Universal Field Library (UFL) via PurposeMatcher. This allowed automatic field matching and reuse across forms.

## Current Status
- **Phase 4 DEFERRED**: UFL integration in AIInterviewEditor is not critical for the migration
- The core functionality works without it
- Can be added as a future enhancement

## What's Needed

### 1. Field Library Lookup Modal
Add a button/modal in AIInterviewEditor that allows admins to:
- Search the field library
- See suggested matches based on field name/type
- Link a form field to a UFL entry
- View field usage statistics

### 2. Backend API
Create endpoints for:
- `GET /api/field-library/search?q={query}&type={type}` - Search UFL
- `POST /api/field-library/link` - Link a field to UFL entry
- `GET /api/field-library/suggestions?name={name}&type={type}` - Get AI suggestions

### 3. UI Components
- FieldLibraryPicker component
- Field metadata display (usage count, canonical name, etc.)
- Visual indicator when field is linked to UFL

### 4. Data Model Updates
Update sections format to include UFL references:
```json
{
  "fields": [{
    "name": "first_name",
    "label": "First Name",
    "type": "text",
    "field_library_id": 123,  // NEW: Link to UFL
    "field_library_key": "applicant_first_name"  // NEW: For reference
  }]
}
```

### 5. Migration Considerations
- Existing forms won't have UFL links initially
- Admins can add links over time
- Non-UFL fields should still work (not all fields need to be in library)

## Benefits (When Implemented)
- Field reuse across forms
- Consistent naming and validation
- Integration with Thentia/Salesforce mappings
- Better data quality

## Priority
**Low** - The system works without this. Focus on core migration first.

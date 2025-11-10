"""
Field Library Two-Way Sync Utility

This module handles bidirectional synchronization between the Form Builder
and the Field Library:
1. When fields are created in Form Builder → auto-add to Field Library
2. When fields are used from Field Library → increment usage count
3. Duplicate detection to prevent redundant fields
4. Auto-categorization of new fields
"""

import re
from datetime import datetime


class FieldLibrarySync:
    """Handles two-way synchronization between Form Builder and Field Library"""
    
    def __init__(self, db, field_library_model):
        self.db = db
        self.FieldLibrary = field_library_model
    
    def generate_field_key(self, field_name):
        """Generate a snake_case field key from field name"""
        # Convert to lowercase and replace spaces/special chars with underscores
        key = re.sub(r'[^a-z0-9]+', '_', field_name.lower())
        # Remove leading/trailing underscores
        key = key.strip('_')
        # Collapse multiple underscores
        key = re.sub(r'_+', '_', key)
        return key
    
    def auto_detect_category(self, field_name, field_type):
        """Auto-detect field category based on name and type"""
        name_lower = field_name.lower()
        
        # Personal Information
        personal_keywords = ['name', 'address', 'email', 'phone', 'contact', 'birth', 'ssn', 'social security']
        if any(kw in name_lower for kw in personal_keywords):
            return 'Personal Information'
        
        # Professional Background
        professional_keywords = ['license', 'certification', 'credential', 'experience', 'employer', 'practice', 'specialty']
        if any(kw in name_lower for kw in professional_keywords):
            return 'Professional Background'
        
        # Education
        education_keywords = ['education', 'school', 'degree', 'college', 'university', 'training', 'course']
        if any(kw in name_lower for kw in education_keywords):
            return 'Education'
        
        # Compliance & Background
        compliance_keywords = ['criminal', 'disciplinary', 'conviction', 'felony', 'background', 'complaint']
        if any(kw in name_lower for kw in compliance_keywords):
            return 'Compliance & Background Checks'
        
        # Employment
        employment_keywords = ['employment', 'employer', 'job', 'work', 'occupation']
        if any(kw in name_lower for kw in employment_keywords):
            return 'Employment Information'
        
        # Default to Other
        return 'Other'
    
    def find_existing_field(self, field_name, field_type):
        """
        Find existing field in Field Library by name and type
        Returns the field if found, None otherwise
        """
        # Try exact match on canonical_name
        field = self.FieldLibrary.query.filter_by(
            canonical_name=field_name,
            field_type=field_type
        ).first()
        
        if field:
            return field
        
        # Try field_key match (in case name is slightly different)
        field_key = self.generate_field_key(field_name)
        field = self.FieldLibrary.query.filter_by(
            field_key=field_key,
            field_type=field_type
        ).first()
        
        return field
    
    def get_or_create_field(self, field_data, created_by='System'):
        """
        Get existing field from Field Library or create new one
        
        Args:
            field_data: dict with keys: name, type, label, options, helpText, etc.
            created_by: string identifying who created the field
        
        Returns:
            tuple: (field_library_object, was_created_boolean)
        """
        field_name = field_data.get('label') or field_data.get('name')
        field_type = field_data.get('type', 'text')
        
        # Check if field already exists
        existing_field = self.find_existing_field(field_name, field_type)
        
        if existing_field:
            # Field exists - return it without modification
            return (existing_field, False)
        
        # Field doesn't exist - create new one
        field_key = self.generate_field_key(field_name)
        category = self.auto_detect_category(field_name, field_type)
        
        # Prepare options if it's a select/radio/checkbox field
        options = None
        if field_type in ['select', 'radio', 'checkbox'] and field_data.get('options'):
            options = field_data.get('options')
            if isinstance(options, list):
                options = ','.join(options)
        
        new_field = self.FieldLibrary(
            field_key=field_key,
            canonical_name=field_name,
            field_type=field_type,
            category=category,
            description=field_data.get('helpText', ''),
            options=options,
            validation_rules=field_data.get('validation', ''),
            is_pii=False,  # Manual flag by board admin
            is_hipaa=False,  # Manual flag by board admin
            obfuscation_rule='none',  # Options: 'none', 'last_4', 'partial', 'full'
            created_by=created_by,
            created_at=datetime.utcnow()
        )
        
        self.db.session.add(new_field)
        self.db.session.commit()
        
        return (new_field, True)
    

    
    def sync_form_fields(self, form_fields, created_by='System'):
        """
        Sync an entire form's fields with Field Library
        
        Args:
            form_fields: list of field dictionaries
            created_by: string identifying who created the fields
        
        Returns:
            dict with stats: {
                'total_fields': int,
                'existing_fields': int,
                'new_fields': int,
                'field_mappings': list of {form_field_name: field_library_id}
            }
        """
        stats = {
            'total_fields': len(form_fields),
            'existing_fields': 0,
            'new_fields': 0,
            'field_mappings': []
        }
        
        for field in form_fields:
            field_lib, was_created = self.get_or_create_field(field, created_by)
            
            if was_created:
                stats['new_fields'] += 1
            else:
                stats['existing_fields'] += 1
            
            stats['field_mappings'].append({
                'form_field_name': field.get('name'),
                'field_library_id': field_lib.id,
                'field_key': field_lib.field_key
            })
        
        return stats
    
    def check_duplicate(self, field_name, field_type):
        """
        Check if a field would be a duplicate before creating it
        
        Returns:
            dict: {
                'is_duplicate': boolean,
                'existing_field': field_library_object or None,
                'suggestion': string message
            }
        """
        existing_field = self.find_existing_field(field_name, field_type)
        
        if existing_field:
            return {
                'is_duplicate': True,
                'existing_field': existing_field.to_dict() if hasattr(existing_field, 'to_dict') else None,
                'suggestion': f'Field "{field_name}" already exists in the Field Library. Would you like to use the existing field?'
            }
        
        return {
            'is_duplicate': False,
            'existing_field': None,
            'suggestion': f'Field "{field_name}" is new and will be added to the Field Library.'
        }


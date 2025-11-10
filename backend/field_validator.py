"""
Field Validation and Normalization Module
Ensures data consistency and prevents breaking changes
"""

import re
from difflib import SequenceMatcher
from typing import Dict, List, Any, Optional

class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {', '.join(errors)}")

class FieldValidator:
    """Validates and normalizes field data"""
    
    # Allowed field types (immutable)
    ALLOWED_FIELD_TYPES = [
        'text', 'email', 'phone', 'number',
        'date', 'select', 'radio', 'checkbox',
        'textarea', 'file', 'url'
    ]
    
    # Standard categories (for normalization)
    STANDARD_CATEGORIES = [
        'Personal Information',
        'Contact Information',
        'Education',
        'Examination',
        'Professional Background',
        'Fee Waivers',
        'Compliance & Declarations',
        'Other'
    ]
    
    # Validation rules schema
    VALIDATION_SCHEMA = {
        'required': bool,
        'min_length': int,
        'max_length': int,
        'pattern': str,
        'min_value': (int, float),
        'max_value': (int, float),
        'allowed_values': list,
        'custom_message': str
    }
    
    # Immutable field properties (cannot be overridden)
    IMMUTABLE_PROPERTIES = ['field_key', 'field_type', 'id']
    
    @staticmethod
    def normalize_field_key(raw_name: str) -> str:
        """
        Normalize field key to lowercase, underscores, alphanumeric only
        
        Examples:
            "First Name" → "first_name"
            "ZIP Code" → "zip_code"
            "SSN#" → "ssn"
            "Date-of-Birth" → "date_of_birth"
        """
        if not raw_name:
            raise ValueError("Field name cannot be empty")
        
        key = raw_name.lower()
        key = key.replace(' ', '_').replace('-', '_')
        key = re.sub(r'[^a-z0-9_]', '', key)
        key = re.sub(r'_+', '_', key).strip('_')
        
        if not key:
            raise ValueError(f"Field name '{raw_name}' produces empty key after normalization")
        
        return key
    
    @classmethod
    def validate_field_type(cls, field_type: str) -> str:
        """Validate field type against allowed types"""
        if field_type not in cls.ALLOWED_FIELD_TYPES:
            raise ValueError(
                f"Invalid field type: '{field_type}'. "
                f"Allowed types: {', '.join(cls.ALLOWED_FIELD_TYPES)}"
            )
        return field_type
    
    @classmethod
    def normalize_category(cls, raw_category: str) -> str:
        """
        Normalize category to closest standard category
        Uses fuzzy matching to map variations
        """
        if not raw_category:
            return 'Other'
        
        # Exact match
        if raw_category in cls.STANDARD_CATEGORIES:
            return raw_category
        
        # Fuzzy match
        best_match = None
        best_score = 0.0
        
        for standard_cat in cls.STANDARD_CATEGORIES:
            similarity = SequenceMatcher(
                None,
                raw_category.lower(),
                standard_cat.lower()
            ).ratio()
            
            if similarity > best_score:
                best_score = similarity
                best_match = standard_cat
        
        # Use fuzzy match if confidence > 70%
        if best_score >= 0.7:
            return best_match
        
        # Default to 'Other'
        return 'Other'
    
    @classmethod
    def validate_validation_rules(cls, rules: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate validation rules against schema
        Ensures type safety and prevents invalid rules
        """
        if not isinstance(rules, dict):
            raise TypeError("Validation rules must be a dictionary")
        
        validated_rules = {}
        
        for key, value in rules.items():
            if key not in cls.VALIDATION_SCHEMA:
                raise ValueError(f"Unknown validation rule: '{key}'")
            
            expected_type = cls.VALIDATION_SCHEMA[key]
            
            if not isinstance(value, expected_type):
                raise TypeError(
                    f"Invalid type for '{key}': expected {expected_type.__name__}, "
                    f"got {type(value).__name__}"
                )
            
            validated_rules[key] = value
        
        return validated_rules
    
    @classmethod
    def validate_ufl_field(cls, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate UFL field before creation/update
        Ensures all required properties are present and valid
        """
        errors = []
        
        # Required fields
        if 'field_key' not in field_data:
            errors.append("field_key is required")
        else:
            try:
                field_data['field_key'] = cls.normalize_field_key(field_data['field_key'])
            except ValueError as e:
                errors.append(str(e))
        
        if 'canonical_name' not in field_data:
            errors.append("canonical_name is required")
        
        if 'field_type' not in field_data:
            errors.append("field_type is required")
        else:
            try:
                field_data['field_type'] = cls.validate_field_type(field_data['field_type'])
            except ValueError as e:
                errors.append(str(e))
        
        # Optional fields with validation
        if 'category' in field_data:
            field_data['category'] = cls.normalize_category(field_data['category'])
        
        if 'validation_rules' in field_data:
            try:
                field_data['validation_rules'] = cls.validate_validation_rules(
                    field_data['validation_rules']
                )
            except (ValueError, TypeError) as e:
                errors.append(f"Invalid validation_rules: {str(e)}")
        
        if 'options' in field_data:
            if not isinstance(field_data['options'], (list, dict)):
                errors.append("options must be a list or dictionary")
        
        if 'common_aliases' in field_data:
            if not isinstance(field_data['common_aliases'], list):
                errors.append("common_aliases must be a list")
        
        if errors:
            raise ValidationError(errors)
        
        return field_data
    
    @classmethod
    def validate_application_field(cls, field_data: Dict[str, Any], ufl_field: Optional[Any] = None) -> Dict[str, Any]:
        """
        Validate application type field (with optional UFL reference)
        Ensures overrides don't break immutable properties
        """
        errors = []
        
        # If referencing UFL field
        if field_data.get('field_library_id'):
            if not ufl_field:
                errors.append("Referenced UFL field does not exist")
            else:
                # Check for invalid overrides
                overrides = field_data.get('overrides', {})
                
                for immutable_prop in cls.IMMUTABLE_PROPERTIES:
                    if immutable_prop in overrides:
                        errors.append(
                            f"Cannot override immutable property: '{immutable_prop}'"
                        )
                
                # Validate override validation rules
                if 'validation' in overrides:
                    try:
                        overrides['validation'] = cls.validate_validation_rules(
                            overrides['validation']
                        )
                    except (ValueError, TypeError) as e:
                        errors.append(f"Invalid override validation: {str(e)}")
        
        # If custom field (not from UFL)
        else:
            custom_field = field_data.get('custom_field', {})
            
            if not custom_field:
                errors.append("Either field_library_id or custom_field is required")
            else:
                # Validate custom field as if it were a UFL field
                try:
                    field_data['custom_field'] = cls.validate_ufl_field(custom_field)
                except ValidationError as e:
                    errors.extend([f"Custom field: {err}" for err in e.errors])
        
        if errors:
            raise ValidationError(errors)
        
        return field_data
    
    @classmethod
    def merge_field_config(cls, ufl_field: Any, overrides: Dict[str, Any]) -> Dict[str, Any]:
        """
        Safely merge UFL field with board overrides
        Immutable properties always come from UFL
        """
        # Start with UFL defaults
        config = {
            'field_key': ufl_field.field_key,
            'field_type': ufl_field.field_type,
            'canonical_name': ufl_field.canonical_name,
            'category': ufl_field.category,
            'validation_rules': ufl_field.validation_rules or {},
            'options': ufl_field.options,
            'help_text': ufl_field.help_text,
            'placeholder': ufl_field.placeholder
        }
        
        # Apply overrides (excluding immutable properties)
        for key, value in overrides.items():
            if key not in cls.IMMUTABLE_PROPERTIES:
                # Special handling for validation rules (merge, don't replace)
                if key == 'validation':
                    config['validation_rules'].update(value)
                elif key == 'display_name':
                    config['canonical_name'] = value
                else:
                    config[key] = value
        
        return config


class FieldDeduplicator:
    """Detects and merges duplicate fields"""
    
    @staticmethod
    def find_duplicates(field_library_query) -> List[tuple]:
        """
        Find potential duplicate fields based on:
        - Exact field_key match
        - Similar canonical_name (90%+ similarity)
        - Same field_type
        """
        all_fields = field_library_query.all()
        duplicates = []
        
        for i, field1 in enumerate(all_fields):
            for field2 in all_fields[i+1:]:
                # Same field_key (shouldn't happen due to unique constraint)
                if field1.field_key == field2.field_key:
                    duplicates.append((field1, field2, 1.0, 'exact_key'))
                    continue
                
                # Similar name and same type
                if field1.field_type == field2.field_type:
                    similarity = SequenceMatcher(
                        None,
                        field1.canonical_name.lower(),
                        field2.canonical_name.lower()
                    ).ratio()
                    
                    if similarity >= 0.9:
                        duplicates.append((field1, field2, similarity, 'similar_name'))
        
        return duplicates
    
    @staticmethod
    def merge_fields(primary_field, duplicate_field, db_session):
        """
        Merge duplicate field into primary field
        Updates all references and consolidates usage
        """
        # Update all ApplicationTypeField references
        from app import ApplicationType
        
        # Find all application types using the duplicate
        for app_type in ApplicationType.query.all():
            if app_type.form_fields_v2:
                fields = app_type.form_fields_v2
                for field in fields:
                    if field.get('field_library_id') == duplicate_field.id:
                        field['field_library_id'] = primary_field.id
                
                # Mark as modified
                app_type.form_fields_v2 = fields
        
        # Merge aliases
        if duplicate_field.common_aliases:
            primary_aliases = primary_field.common_aliases or []
            for alias in duplicate_field.common_aliases:
                if alias not in primary_aliases:
                    primary_aliases.append(alias)
            primary_field.common_aliases = primary_aliases
        
        # Update usage count
        primary_field.usage_count += duplicate_field.usage_count
        
        # Delete duplicate
        db_session.delete(duplicate_field)
        db_session.commit()


# Export main classes
__all__ = ['FieldValidator', 'FieldDeduplicator', 'ValidationError']


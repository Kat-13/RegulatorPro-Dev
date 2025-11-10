"""
Internal Standard Format (ISF) for Field Definitions

This module defines the canonical schema for all fields in the RegulatePro system.
All data sources (CSV, JSON, database, API) should be transformed to/from this format.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

# Supported field types
FIELD_TYPES = [
    'text',
    'email',
    'tel',
    'number',
    'date',
    'textarea',
    'select',
    'radio',
    'checkbox',
    'file',
    'section',  # Field grouping
    'heading'   # Display-only heading
]

# Field validation types
VALIDATION_RULES = {
    'minLength': int,
    'maxLength': int,
    'min': (int, float),
    'max': (int, float),
    'pattern': str,
    'required': bool
}

class FieldOption:
    """Standard format for field options (select, radio, checkbox)"""
    def __init__(self, label: str, value: str):
        self.label = label
        self.value = value
    
    def to_dict(self):
        return {
            'label': self.label,
            'value': self.value
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'FieldOption':
        if isinstance(data, str):
            return FieldOption(label=data, value=data)
        return FieldOption(
            label=data.get('label', ''),
            value=data.get('value', '')
        )

class ConditionalRule:
    """Defines when a field should be shown/hidden based on other field values"""
    def __init__(
        self,
        field_id: str,
        operator: str,  # 'equals', 'not_equals', 'contains', 'greater_than', etc.
        value: Any
    ):
        self.field_id = field_id
        self.operator = operator
        self.value = value
    
    def to_dict(self):
        return {
            'fieldId': self.field_id,
            'operator': self.operator,
            'value': self.value
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'ConditionalRule':
        return ConditionalRule(
            field_id=data.get('fieldId', ''),
            operator=data.get('operator', 'equals'),
            value=data.get('value')
        )

class InternalStandardField:
    """
    Internal Standard Format for field definitions.
    All fields in the system should conform to this structure.
    """
    def __init__(
        self,
        id: str,
        type: str,
        label: str,
        required: bool = False,
        placeholder: Optional[str] = None,
        help_text: Optional[str] = None,
        options: Optional[List[FieldOption]] = None,
        validation: Optional[Dict[str, Any]] = None,
        default_value: Optional[Any] = None,
        conditional_rules: Optional[List[ConditionalRule]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.type = type
        self.label = label
        self.required = required
        self.placeholder = placeholder
        self.help_text = help_text
        self.options = options or []
        self.validation = validation or {}
        self.default_value = default_value
        self.conditional_rules = conditional_rules or []
        self.metadata = metadata or {}
        
        # Validate field type
        if self.type not in FIELD_TYPES:
            raise ValueError(f"Invalid field type: {self.type}. Must be one of {FIELD_TYPES}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for API responses"""
        result = {
            'id': self.id,
            'type': self.type,
            'label': self.label,
            'required': self.required
        }
        
        if self.placeholder:
            result['placeholder'] = self.placeholder
        
        if self.help_text:
            result['helpText'] = self.help_text
        
        if self.options:
            result['options'] = [opt.to_dict() for opt in self.options]
        
        if self.validation:
            result['validation'] = self.validation
        
        if self.default_value is not None:
            result['defaultValue'] = self.default_value
        
        if self.conditional_rules:
            result['conditionalRules'] = [rule.to_dict() for rule in self.conditional_rules]
        
        return result
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'InternalStandardField':
        """Create ISF from dictionary"""
        options = None
        if 'options' in data and data['options']:
            options = [FieldOption.from_dict(opt) for opt in data['options']]
        
        conditional_rules = None
        if 'conditionalRules' in data and data['conditionalRules']:
            conditional_rules = [ConditionalRule.from_dict(rule) for rule in data['conditionalRules']]
        
        return InternalStandardField(
            id=data.get('id', ''),
            type=data.get('type', 'text'),
            label=data.get('label', ''),
            required=data.get('required', False),
            placeholder=data.get('placeholder'),
            help_text=data.get('helpText') or data.get('help_text'),
            options=options,
            validation=data.get('validation', {}),
            default_value=data.get('defaultValue') or data.get('default_value'),
            conditional_rules=conditional_rules,
            metadata=data.get('metadata', {})
        )

def validate_field(field: InternalStandardField) -> List[str]:
    """Validate a field against ISF rules. Returns list of errors."""
    errors = []
    
    if not field.id:
        errors.append("Field ID is required")
    
    if not field.label:
        errors.append("Field label is required")
    
    if field.type not in FIELD_TYPES:
        errors.append(f"Invalid field type: {field.type}")
    
    # Validate that select/radio/checkbox have options
    if field.type in ['select', 'radio'] and not field.options:
        errors.append(f"Field type '{field.type}' requires options")
    
    # Validate options format
    if field.options:
        for i, opt in enumerate(field.options):
            if not isinstance(opt, FieldOption):
                errors.append(f"Option {i} is not a valid FieldOption")
            elif not opt.label or not opt.value:
                errors.append(f"Option {i} missing label or value")
    
    return errors


"""
Data Transformers for RegulatePro

Transforms data between different formats:
- Database models → Internal Standard Format (ISF)
- ISF → API responses
- CSV/JSON imports → ISF
"""

from typing import List, Dict, Any
from field_schema import InternalStandardField, FieldOption, ConditionalRule
import json

class DatabaseTransformer:
    """Transform database models to/from ISF"""
    
    @staticmethod
    def field_library_to_isf(db_field) -> InternalStandardField:
        """Convert FieldLibrary database model to ISF"""
        
        # Parse options if they exist
        options = None
        if db_field.options:
            try:
                if isinstance(db_field.options, str):
                    options_data = json.loads(db_field.options)
                else:
                    options_data = db_field.options
                
                if isinstance(options_data, list):
                    options = []
                    for opt in options_data:
                        if isinstance(opt, dict):
                            options.append(FieldOption(
                                label=opt.get('label', opt.get('value', '')),
                                value=opt.get('value', opt.get('label', ''))
                            ))
                        else:
                            options.append(FieldOption(label=str(opt), value=str(opt)))
            except (json.JSONDecodeError, TypeError):
                options = None
        
        # Parse validation rules
        validation = {}
        if hasattr(db_field, 'validation') and db_field.validation:
            try:
                if isinstance(db_field.validation, str):
                    validation = json.loads(db_field.validation)
                else:
                    validation = db_field.validation
            except (json.JSONDecodeError, TypeError):
                validation = {}
        
        # Parse conditional rules
        conditional_rules = []
        if hasattr(db_field, 'conditional_rules') and db_field.conditional_rules:
            try:
                if isinstance(db_field.conditional_rules, str):
                    rules_data = json.loads(db_field.conditional_rules)
                else:
                    rules_data = db_field.conditional_rules
                
                if isinstance(rules_data, list):
                    conditional_rules = [ConditionalRule.from_dict(rule) for rule in rules_data]
            except (json.JSONDecodeError, TypeError):
                conditional_rules = []
        
        return InternalStandardField(
            id=db_field.field_key,
            type=db_field.field_type,
            label=db_field.label,
            required=db_field.required or False,
            placeholder=db_field.placeholder,
            help_text=db_field.help_text,
            options=options,
            validation=validation,
            conditional_rules=conditional_rules,
            metadata={
                'db_id': db_field.id,
                'purpose': db_field.purpose,
                'category': db_field.category,
                'usage_count': db_field.usage_count or 0
            }
        )
    
    @staticmethod
    def form_field_to_isf(form_field) -> InternalStandardField:
        """Convert FormField database model to ISF"""
        
        # Get the associated FieldLibrary field
        field_lib = form_field.field
        
        # Start with the library field
        isf = DatabaseTransformer.field_library_to_isf(field_lib)
        
        # Override with form-specific settings
        if form_field.required is not None:
            isf.required = form_field.required
        
        if form_field.placeholder:
            isf.placeholder = form_field.placeholder
        
        # Add form-specific metadata
        isf.metadata.update({
            'form_field_id': form_field.id,
            'order': form_field.order,
            'visible': form_field.visible
        })
        
        return isf
    
    @staticmethod
    def isf_to_dict(field: InternalStandardField) -> Dict[str, Any]:
        """Convert ISF to dictionary for database storage"""
        return {
            'field_key': field.id,
            'field_type': field.type,
            'label': field.label,
            'required': field.required,
            'placeholder': field.placeholder,
            'help_text': field.help_text,
            'options': json.dumps([opt.to_dict() for opt in field.options]) if field.options else None,
            'validation': json.dumps(field.validation) if field.validation else None,
            'conditional_rules': json.dumps([rule.to_dict() for rule in field.conditional_rules]) if field.conditional_rules else None
        }

class APITransformer:
    """Transform ISF to/from API formats"""
    
    @staticmethod
    def isf_to_api_response(field: InternalStandardField) -> Dict[str, Any]:
        """Convert ISF to API response format"""
        return field.to_dict()
    
    @staticmethod
    def api_request_to_isf(data: Dict[str, Any]) -> InternalStandardField:
        """Convert API request to ISF"""
        return InternalStandardField.from_dict(data)
    
    @staticmethod
    def application_type_to_api(app_type, form_fields: List) -> Dict[str, Any]:
        """Convert ApplicationType with fields to API response"""
        
        # Transform all form fields to ISF then to API format
        fields = []
        for form_field in form_fields:
            isf = DatabaseTransformer.form_field_to_isf(form_field)
            fields.append(APITransformer.isf_to_api_response(isf))
        
        # Parse fees if they exist
        fees = {}
        if app_type.fees:
            try:
                if isinstance(app_type.fees, str):
                    fees = json.loads(app_type.fees)
                else:
                    fees = app_type.fees
            except (json.JSONDecodeError, TypeError):
                fees = {}
        
        # Parse workflow if it exists
        workflow = {}
        if hasattr(app_type, 'workflow') and app_type.workflow:
            try:
                if isinstance(app_type.workflow, str):
                    workflow = json.loads(app_type.workflow)
                else:
                    workflow = app_type.workflow
            except (json.JSONDecodeError, TypeError):
                workflow = {}
        
        return {
            'id': app_type.id,
            'name': app_type.name,
            'description': app_type.description,
            'fields': fields,
            'fees': fees,
            'workflow': workflow,
            'active': app_type.active,
            'licenseNumberFormat': app_type.license_number_format,
            'renewalPeriod': app_type.renewal_period,
            'duration': app_type.duration,
            'sourceDocument': app_type.source_document,
            'parserVersion': app_type.parser_version,
            'fee_rules': app_type.fee_rules,
            'createdAt': app_type.created_at.isoformat() if app_type.created_at else None,
            'updatedAt': app_type.updated_at.isoformat() if app_type.updated_at else None
        }

class ImportTransformer:
    """Transform import data (CSV, JSON) to ISF"""
    
    @staticmethod
    def csv_field_to_isf(field_name: str, field_type: str, **kwargs) -> InternalStandardField:
        """Convert CSV field definition to ISF"""
        
        # Normalize field type
        field_type = field_type.lower().strip()
        
        # Convert snake_case to camelCase for ID
        field_id = ''.join(word.capitalize() if i > 0 else word 
                          for i, word in enumerate(field_name.lower().split('_')))
        
        # Create label from field name
        label = ' '.join(word.capitalize() for word in field_name.replace('_', ' ').split())
        
        # Parse options if provided
        options = None
        if 'options' in kwargs and kwargs['options']:
            options = []
            for opt in kwargs['options']:
                if isinstance(opt, dict):
                    options.append(FieldOption.from_dict(opt))
                else:
                    options.append(FieldOption(label=str(opt), value=str(opt)))
        
        return InternalStandardField(
            id=field_id,
            type=field_type,
            label=label,
            required=kwargs.get('required', False),
            placeholder=kwargs.get('placeholder'),
            help_text=kwargs.get('help_text'),
            options=options,
            validation=kwargs.get('validation', {}),
            metadata={
                'source': 'csv_import',
                'original_field_name': field_name
            }
        )
    
    @staticmethod
    def json_field_to_isf(data: Dict[str, Any]) -> InternalStandardField:
        """Convert JSON field definition to ISF"""
        return InternalStandardField.from_dict(data)


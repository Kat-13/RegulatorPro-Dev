"""
Utility functions to convert between old (fields) and new (sections) formats
"""

def convert_fields_to_sections(fields):
    """
    Convert flat fields array (OLD format) to sections structure (NEW format)
    
    Args:
        fields: List of field objects [{name, label, type, required, ...}]
    
    Returns:
        List of section objects with elements
    """
    if not fields:
        return [{
            "title": "Section 1",
            "description": "",
            "elements": []
        }]
    
    # Group fields into a single section for now
    # Future enhancement: Use AI to intelligently group related fields
    elements = []
    
    for field in fields:
        # Create a question element with one field
        element = {
            "element_type": "question",
            "text": field.get('label') or field.get('name', ''),
            "fields": [{
                "name": field.get('name') or field.get('field_key', ''),
                "label": field.get('label') or field.get('canonical_name', ''),
                "type": field.get('type') or field.get('field_type', 'text'),
                "required": field.get('required', False),
                "placeholder": field.get('placeholder'),
                "help_text": field.get('help_text') or field.get('helpText'),
                "options": field.get('options'),
                "validation": field.get('validation') or field.get('validation_rules')
            }]
        }
        elements.append(element)
    
    return [{
        "title": "Form Fields",
        "description": "Converted from legacy format",
        "elements": elements
    }]


def convert_sections_to_fields(sections):
    """
    Convert sections structure (NEW format) to flat fields array (OLD format)
    Used for backward compatibility
    
    Args:
        sections: List of section objects with elements
    
    Returns:
        List of field objects
    """
    if not sections:
        return []
    
    fields = []
    
    for section in sections:
        elements = section.get('elements') or section.get('questions', [])
        
        for element in elements:
            # Skip instruction blocks
            if element.get('element_type') == 'instruction_block':
                continue
            
            # Extract fields from question
            element_fields = element.get('fields', [])
            for field in element_fields:
                fields.append({
                    'name': field.get('name'),
                    'label': field.get('label'),
                    'type': field.get('type'),
                    'required': field.get('required', False),
                    'placeholder': field.get('placeholder'),
                    'helpText': field.get('help_text'),
                    'options': field.get('options'),
                    'validation': field.get('validation')
                })
    
    return fields

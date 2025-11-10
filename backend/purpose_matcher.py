"""
Purpose-Driven Field Matcher
Matches fields based on FUNCTION, not wording
"""

import re
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

class PurposeMatcher:
    """
    Matches fields based on their functional purpose
    Ignores wording differences like "Legal Name" vs "Formal Legal Name"
    """
    
    # Field purpose taxonomy - what the field DOES
    FIELD_PURPOSES = {
        # Identification
        'identification.first_name': {
            'keywords': ['first', 'given', 'forename', 'fname'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Personal Information'
        },
        'identification.last_name': {
            'keywords': ['last', 'surname', 'family', 'lname'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Personal Information'
        },
        'identification.middle_name': {
            'keywords': ['middle', 'mname', 'initial'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Personal Information'
        },
        'identification.ssn': {
            'keywords': ['ssn', 'social', 'security', 'tax', 'tin'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Personal Information'
        },
        'identification.dob': {
            'keywords': ['birth', 'dob', 'born'],
            'field_type': 'date',
            'data_type': 'date',
            'category': 'Personal Information'
        },
        
        # Contact
        'contact.email': {
            'keywords': ['email', 'e-mail', 'mail'],
            'field_type': 'email',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        'contact.phone': {
            'keywords': ['phone', 'telephone', 'mobile', 'cell', 'tel'],
            'field_type': 'phone',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        'contact.address': {
            'keywords': ['address', 'street', 'addr'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        'contact.city': {
            'keywords': ['city', 'municipality', 'town'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        'contact.state': {
            'keywords': ['state', 'province', 'region'],
            'field_type': 'select',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        'contact.zip': {
            'keywords': ['zip', 'postal', 'postcode'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Contact Information'
        },
        
        # Education
        'education.school': {
            'keywords': ['school', 'university', 'college', 'institution', 'alma'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Education'
        },
        'education.degree': {
            'keywords': ['degree', 'diploma', 'certification'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Education'
        },
        'education.graduation_date': {
            'keywords': ['graduation', 'graduated', 'completion'],
            'field_type': 'date',
            'data_type': 'date',
            'category': 'Education'
        },
        
        # Examination
        'examination.exam_name': {
            'keywords': ['exam', 'test', 'assessment'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Examination'
        },
        'examination.exam_date': {
            'keywords': ['exam', 'test'],
            'field_type': 'date',
            'data_type': 'date',
            'category': 'Examination'
        },
        'examination.exam_score': {
            'keywords': ['score', 'result', 'grade'],
            'field_type': 'number',
            'data_type': 'number',
            'category': 'Examination'
        },
        
        # Professional Background
        'professional.license_number': {
            'keywords': ['license', 'licence', 'registration', 'permit'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Professional Background'
        },
        'professional.employer': {
            'keywords': ['employer', 'company', 'organization', 'firm'],
            'field_type': 'text',
            'data_type': 'string',
            'category': 'Professional Background'
        },
        'professional.years_experience': {
            'keywords': ['experience', 'years', 'practice'],
            'field_type': 'number',
            'data_type': 'number',
            'category': 'Professional Background'
        },
        
        # Attestation & Compliance
        'compliance.attestation': {
            'keywords': ['attest', 'certify', 'declare', 'affirm', 'swear'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Compliance & Declarations'
        },
        'compliance.consent': {
            'keywords': ['consent', 'agree', 'authorize', 'permission'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Compliance & Declarations'
        },
        'compliance.criminal_history': {
            'keywords': ['criminal', 'conviction', 'felony', 'misdemeanor'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Compliance & Declarations'
        },
        'compliance.criminal_details': {
            'keywords': ['criminal', 'conviction', 'details', 'explain'],
            'field_type': 'textarea',
            'data_type': 'string',
            'category': 'Compliance & Declarations'
        },
        'compliance.disciplinary_action': {
            'keywords': ['disciplinary', 'sanction', 'suspension', 'revocation'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Compliance & Declarations'
        },
        'compliance.disciplinary_details': {
            'keywords': ['disciplinary', 'details', 'explain'],
            'field_type': 'textarea',
            'data_type': 'string',
            'category': 'Compliance & Declarations'
        },
        
        # Fee Waivers
        'waiver.military_spouse': {
            'keywords': ['military', 'spouse', 'veteran'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Fee Waivers'
        },
        'waiver.poverty': {
            'keywords': ['poverty', 'indigent', 'hardship', 'financial'],
            'field_type': 'checkbox',
            'data_type': 'boolean',
            'category': 'Fee Waivers'
        },
    }
    
    @classmethod
    def normalize_field_name(cls, name: str) -> str:
        """Normalize field name for comparison"""
        if not name:
            return ""
        
        # Convert to lowercase
        normalized = name.lower()
        
        # Remove common prefixes/suffixes that don't change meaning
        prefixes = ['legal', 'formal', 'official', 'full', 'complete', 'applicant', 'your']
        suffixes = ['required', 'optional', 'if applicable']
        
        for prefix in prefixes:
            if normalized.startswith(prefix + ' '):
                normalized = normalized[len(prefix)+1:]
        
        for suffix in suffixes:
            if normalized.endswith(' ' + suffix):
                normalized = normalized[:-len(suffix)-1]
        
        # Remove special characters
        normalized = re.sub(r'[^a-z0-9\s]', ' ', normalized)
        
        # Normalize whitespace
        normalized = ' '.join(normalized.split())
        
        return normalized
    
    @classmethod
    def detect_purpose(cls, field_name: str, field_type: Optional[str] = None) -> Optional[str]:
        """
        Detect the purpose of a field based on its name and type
        Returns purpose key (e.g., 'identification.first_name') or None
        """
        normalized = cls.normalize_field_name(field_name)
        
        # Score each purpose
        scores = {}
        
        for purpose_key, purpose_def in cls.FIELD_PURPOSES.items():
            score = 0
            
            # Check if any keyword appears in field name
            for keyword in purpose_def['keywords']:
                if keyword in normalized:
                    score += 10
                    
                    # Bonus if keyword is the whole word
                    if normalized == keyword or normalized.startswith(keyword + ' ') or normalized.endswith(' ' + keyword):
                        score += 5
            
            # Bonus if field type matches
            if field_type and field_type == purpose_def['field_type']:
                score += 20
            
            if score > 0:
                scores[purpose_key] = score
        
        # Return purpose with highest score (if score > threshold)
        if scores:
            best_purpose = max(scores.items(), key=lambda x: x[1])
            if best_purpose[1] >= 10:  # Minimum confidence threshold
                return best_purpose[0]
        
        return None
    
    @classmethod
    def find_match(cls, field_name: str, field_type: str, field_library_query) -> Tuple[Optional[any], float, Optional[str]]:
        """
        Find matching field in library based on purpose
        Returns: (field, confidence, match_type) or (None, 0.0, None)
        """
        # Detect purpose of incoming field
        purpose = cls.detect_purpose(field_name, field_type)
        
        if not purpose:
            return (None, 0.0, None)
        
        # Get purpose definition
        purpose_def = cls.FIELD_PURPOSES.get(purpose)
        if not purpose_def:
            return (None, 0.0, None)
        
        # Look for existing field with same purpose
        # Match on: category + field_type + similar purpose
        category = purpose_def['category']
        
        # Get all fields in same category with same type
        candidates = field_library_query.filter_by(
            category=category,
            field_type=field_type
        ).all()
        
        if not candidates:
            return (None, 0.0, None)
        
        # Score each candidate
        best_match = None
        best_score = 0.0
        
        for candidate in candidates:
            score = 0.0
            
            # Check if candidate's field_key matches any keyword
            for keyword in purpose_def['keywords']:
                if keyword in candidate.field_key:
                    score += 0.3
            
            # Check if candidate's canonical_name matches any keyword
            normalized_canonical = cls.normalize_field_name(candidate.canonical_name)
            for keyword in purpose_def['keywords']:
                if keyword in normalized_canonical:
                    score += 0.2
            
            # Exact field_key match (after normalization)
            normalized_key = cls.normalize_field_name(candidate.field_key)
            normalized_input = cls.normalize_field_name(field_name)
            
            if normalized_key == normalized_input:
                score += 0.5
            
            if score > best_score:
                best_score = score
                best_match = candidate
        
        # Return match if confidence is high enough
        if best_score >= 0.5:
            return (best_match, min(best_score, 1.0), 'purpose_match')
        
        return (None, 0.0, None)
    
    @classmethod
    def suggest_field_key(cls, field_name: str, field_type: str) -> str:
        """
        Suggest a standardized field_key based on detected purpose
        Falls back to normalized name if purpose unknown
        """
        # Detect purpose
        purpose = cls.detect_purpose(field_name, field_type)
        
        if purpose:
            # Use purpose as field_key (e.g., 'identification.first_name' → 'first_name')
            return purpose.split('.')[-1]
        
        # Fallback: normalize the field name
        normalized = cls.normalize_field_name(field_name)
        field_key = normalized.replace(' ', '_')
        field_key = re.sub(r'[^a-z0-9_]', '', field_key)
        field_key = re.sub(r'_+', '_', field_key).strip('_')
        
        return field_key or 'custom_field'
    
    @classmethod
    def suggest_category(cls, field_name: str, field_type: str) -> str:
        """
        Suggest category based on detected purpose
        """
        purpose = cls.detect_purpose(field_name, field_type)
        
        if purpose:
            purpose_def = cls.FIELD_PURPOSES.get(purpose)
            if purpose_def:
                return purpose_def['category']
        
        # Fallback categories based on field type
        if field_type == 'checkbox':
            return 'Compliance & Declarations'
        elif field_type in ['email', 'phone']:
            return 'Contact Information'
        elif field_type == 'date':
            return 'Personal Information'
        
        return 'Other'


# Export
__all__ = ['PurposeMatcher']


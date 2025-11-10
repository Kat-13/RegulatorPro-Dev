"""
Enhanced Field Matcher for Universal Field Library
Handles fuzzy matching, aliases, and smart field detection
"""

import re
from difflib import SequenceMatcher

class FieldMatcher:
    """Smart field matching with fuzzy logic and alias support"""
    
    # Common field aliases and variations
    FIELD_ALIASES = {
        'first_name': ['firstname', 'fname', 'given_name', 'forename'],
        'last_name': ['lastname', 'lname', 'surname', 'family_name'],
        'middle_name': ['middlename', 'mname', 'middle_initial'],
        'email': ['email_address', 'e_mail', 'emailaddress'],
        'phone': ['phone_number', 'telephone', 'tel', 'phonenumber', 'mobile'],
        'address': ['street_address', 'street', 'address_line_1', 'addr'],
        'city': ['municipality', 'town'],
        'state': ['province', 'region', 'state_province'],
        'zip_code': ['zipcode', 'postal_code', 'postcode', 'zip'],
        'date_of_birth': ['dateofbirth', 'dob', 'birth_date', 'birthdate'],
        'social_security_number': ['socialsecurity', 'ssn', 'social_security', 'ss_number'],
        'graduation_date': ['graduationdate', 'grad_date', 'date_graduated'],
        'years_of_experience': ['yearsexperience', 'experience_years', 'years_experience'],
        'current_employer': ['currentemployer', 'employer', 'employer_name'],
        'military_spouse': ['militaryspouse', 'military_spouse_status'],
        'criminal_history': ['criminalhistory', 'criminal_record', 'has_criminal_history'],
        'criminal_history_details': ['criminalhistorydetails', 'criminal_details'],
        'disciplinary_action': ['disciplinaryaction', 'disciplinary_history', 'has_disciplinary_action'],
        'disciplinary_action_details': ['disciplinaryactiondetails', 'disciplinary_details'],
    }
    
    @staticmethod
    def normalize_field_key(field_name):
        """Convert field name to normalized key"""
        key = field_name.lower()
        key = key.replace(' ', '_').replace('-', '_')
        key = re.sub(r'[^a-z0-9_]', '', key)
        key = re.sub(r'_+', '_', key).strip('_')
        return key
    
    @classmethod
    def find_match(cls, field_name, field_library_query):
        """
        Find best matching field in library
        Returns: (field, confidence, match_type) or (None, 0.0, None)
        """
        field_key = cls.normalize_field_key(field_name)
        
        # 1. Exact key match
        exact_match = field_library_query.filter_by(field_key=field_key).first()
        if exact_match:
            return (exact_match, 1.0, 'exact_key')
        
        # 2. Check aliases
        for canonical_key, aliases in cls.FIELD_ALIASES.items():
            if field_key in aliases or field_key == canonical_key:
                alias_match = field_library_query.filter_by(field_key=canonical_key).first()
                if alias_match:
                    return (alias_match, 0.95, 'alias_match')
                
                # Check if any alias exists in library
                for alias in aliases:
                    alias_match = field_library_query.filter_by(field_key=alias).first()
                    if alias_match:
                        return (alias_match, 0.95, 'alias_match')
        
        # 3. Fuzzy string matching on canonical names
        all_fields = field_library_query.all()
        best_match = None
        best_score = 0.0
        
        for field in all_fields:
            # Compare normalized keys
            similarity = SequenceMatcher(None, field_key, field.field_key).ratio()
            
            if similarity > best_score:
                best_score = similarity
                best_match = field
            
            # Also compare canonical names
            name_similarity = SequenceMatcher(
                None, 
                field_name.lower(), 
                field.canonical_name.lower()
            ).ratio()
            
            if name_similarity > best_score:
                best_score = name_similarity
                best_match = field
        
        # Only return fuzzy match if confidence is high enough
        if best_score >= 0.8:
            return (best_match, best_score, 'fuzzy_match')
        
        # No match found
        return (None, 0.0, None)
    
    @classmethod
    def match_fields_batch(cls, field_names, field_library_query):
        """
        Match multiple fields at once
        Returns: list of (field_name, matched_field, confidence, match_type)
        """
        results = []
        for field_name in field_names:
            matched_field, confidence, match_type = cls.find_match(field_name, field_library_query)
            results.append({
                'field_name': field_name,
                'matched_field': matched_field,
                'confidence': confidence,
                'match_type': match_type
            })
        return results


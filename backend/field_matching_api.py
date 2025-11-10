"""
Smart Field Matching API
Provides endpoints for intelligent field mapping during CSV imports
"""

from field_matcher import FieldMatcher
from difflib import SequenceMatcher
import re

class SmartFieldMatcher:
    """Enhanced field matcher with User table and Field Library support"""
    
    # User table columns that can be mapped
    USER_TABLE_FIELDS = [
        {'field_key': 'username', 'label': 'Username', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'email', 'label': 'Email', 'type': 'email', 'source': 'user_table'},
        {'field_key': 'first_name', 'label': 'First Name', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'last_name', 'label': 'Last Name', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'phone', 'label': 'Phone', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'address', 'label': 'Address', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'city', 'label': 'City', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'state', 'label': 'State', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'zipCode', 'label': 'Zip Code', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'licenseNumber', 'label': 'License Number', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'licenseType', 'label': 'License Type', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'licenseStatus', 'label': 'License Status', 'type': 'text', 'source': 'user_table'},
        {'field_key': 'issueDate', 'label': 'Issue Date', 'type': 'date', 'source': 'user_table'},
        {'field_key': 'expirationDate', 'label': 'Expiration Date', 'type': 'date', 'source': 'user_table'},
        {'field_key': 'date_of_birth', 'label': 'Date of Birth', 'type': 'date', 'source': 'user_table'},
        {'field_key': 'account_status', 'label': 'Account Status', 'type': 'text', 'source': 'user_table'},
    ]
    
    @classmethod
    def normalize_field_key(cls, field_name):
        """Convert field name to normalized key"""
        key = field_name.lower()
        key = key.replace(' ', '_').replace('-', '_')
        key = re.sub(r'[^a-z0-9_]', '', key)
        key = re.sub(r'_+', '_', key).strip('_')
        return key
    
    @classmethod
    def calculate_similarity(cls, str1, str2):
        """Calculate similarity between two strings"""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    # Common field synonyms
    FIELD_SYNONYMS = {
        'postal': ['zip', 'zipcode', 'postalcode'],
        'zip': ['postal', 'zipcode', 'postalcode'],
        'province': ['state'],
        'state': ['province'],
        'enrollment': ['registration', 'issue'],
        'registration': ['enrollment', 'issue'],
    }
    
    @classmethod
    def extract_key_terms(cls, field_name):
        """Extract key terms from field name for smart matching"""
        normalized = cls.normalize_field_key(field_name)
        # Remove common prefixes/suffixes
        terms = normalized.replace('reg_', '').replace('_mailing', '').replace('_address', '')
        terms = terms.replace('lm_', '').replace('tc_', '').replace('_date', '').replace('_code', '')
        terms = terms.replace('code', '')  # Handle camelCase like zipCode
        terms = terms.strip('_')
        return terms
    
    @classmethod
    def check_synonym_match(cls, term1, term2):
        """Check if two terms are synonyms"""
        if term1 == term2:
            return True
        if term1 in cls.FIELD_SYNONYMS:
            return term2 in cls.FIELD_SYNONYMS[term1]
        if term2 in cls.FIELD_SYNONYMS:
            return term1 in cls.FIELD_SYNONYMS[term2]
        return False
    
    @classmethod
    def match_against_user_fields(cls, csv_column_name):
        """Match CSV column against User table fields"""
        normalized_csv = cls.normalize_field_key(csv_column_name)
        key_terms = cls.extract_key_terms(csv_column_name)
        matches = []
        
        for field in cls.USER_TABLE_FIELDS:
            # Check exact match
            if normalized_csv == field['field_key']:
                matches.append({
                    'field': field,
                    'confidence': 1.0,
                    'match_type': 'exact'
                })
                continue
            
            # Check key terms match (e.g., reg_mailing_city -> city)
            field_key_terms = cls.extract_key_terms(field['field_key'])
            if key_terms == field_key_terms and len(key_terms) > 2:
                matches.append({
                    'field': field,
                    'confidence': 0.85,
                    'match_type': 'pattern'
                })
                continue
            
            # Check synonym match (e.g., postal_code -> zip_code)
            if cls.check_synonym_match(key_terms, field_key_terms):
                matches.append({
                    'field': field,
                    'confidence': 0.80,
                    'match_type': 'synonym'
                })
                continue
            
            # Check if key terms are contained
            if key_terms in field['field_key'] or field['field_key'] in key_terms:
                similarity = max(len(key_terms), len(field['field_key'])) / max(len(normalized_csv), len(field['field_key']))
                if similarity >= 0.5:
                    matches.append({
                        'field': field,
                        'confidence': 0.75,
                        'match_type': 'partial'
                    })
                    continue
            
            # Check fuzzy match on field_key
            key_similarity = cls.calculate_similarity(normalized_csv, field['field_key'])
            if key_similarity >= 0.6:
                matches.append({
                    'field': field,
                    'confidence': key_similarity,
                    'match_type': 'fuzzy'
                })
                continue
            
            # Check fuzzy match on label
            label_similarity = cls.calculate_similarity(csv_column_name, field['label'])
            if label_similarity >= 0.7:
                matches.append({
                    'field': field,
                    'confidence': label_similarity,
                    'match_type': 'fuzzy'
                })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches
    
    @classmethod
    def match_against_field_library(cls, csv_column_name, field_library_query):
        """Match CSV column against Field Library"""
        normalized_csv = cls.normalize_field_key(csv_column_name)
        matches = []
        
        all_fields = field_library_query.all()
        
        for field in all_fields:
            # Check exact match on field_key
            if normalized_csv == field.field_key:
                matches.append({
                    'field': {
                        'field_key': field.field_key,
                        'label': field.canonical_name,
                        'type': field.field_type,
                        'source': 'field_library',
                        'id': field.id,
                        'usage_count': field.usage_count
                    },
                    'confidence': 1.0,
                    'match_type': 'exact'
                })
                continue
            
            # Check common_aliases
            if field.common_aliases:
                import json
                aliases = json.loads(field.common_aliases) if isinstance(field.common_aliases, str) else field.common_aliases
                if normalized_csv in [cls.normalize_field_key(alias) for alias in aliases]:
                    matches.append({
                        'field': {
                            'field_key': field.field_key,
                            'label': field.canonical_name,
                            'type': field.field_type,
                            'source': 'field_library',
                            'id': field.id,
                            'usage_count': field.usage_count
                        },
                        'confidence': 0.95,
                        'match_type': 'alias'
                    })
                    continue
            
            # Fuzzy match on field_key
            key_similarity = cls.calculate_similarity(normalized_csv, field.field_key)
            if key_similarity >= 0.7:
                matches.append({
                    'field': {
                        'field_key': field.field_key,
                        'label': field.canonical_name,
                        'type': field.field_type,
                        'source': 'field_library',
                        'id': field.id,
                        'usage_count': field.usage_count
                    },
                    'confidence': key_similarity,
                    'match_type': 'fuzzy'
                })
                continue
            
            # Fuzzy match on canonical_name
            name_similarity = cls.calculate_similarity(csv_column_name, field.canonical_name)
            if name_similarity >= 0.7:
                matches.append({
                    'field': {
                        'field_key': field.field_key,
                        'label': field.canonical_name,
                        'type': field.field_type,
                        'source': 'field_library',
                        'id': field.id,
                        'usage_count': field.usage_count
                    },
                    'confidence': name_similarity,
                    'match_type': 'fuzzy'
                })
        
        # Sort by confidence, then by usage_count
        matches.sort(key=lambda x: (x['confidence'], x['field'].get('usage_count', 0)), reverse=True)
        return matches
    
    @classmethod
    def find_best_matches(cls, csv_column_name, field_library_query, max_suggestions=5):
        """
        Find best matching fields from both User table and Field Library
        Returns top suggestions ranked by confidence
        """
        all_matches = []
        
        # Match against User table fields
        user_matches = cls.match_against_user_fields(csv_column_name)
        all_matches.extend(user_matches)
        
        # Match against Field Library
        library_matches = cls.match_against_field_library(csv_column_name, field_library_query)
        all_matches.extend(library_matches)
        
        # Remove duplicates (prefer Field Library over User table for same field)
        seen_keys = set()
        unique_matches = []
        for match in sorted(all_matches, key=lambda x: (x['confidence'], x['field'].get('usage_count', 0)), reverse=True):
            field_key = match['field']['field_key']
            if field_key not in seen_keys:
                seen_keys.add(field_key)
                unique_matches.append(match)
        
        # Return top N suggestions
        return unique_matches[:max_suggestions]
    
    @classmethod
    def batch_match(cls, csv_columns, field_library_query):
        """
        Match multiple CSV columns at once
        Returns a dictionary mapping each column to its best matches
        """
        results = {}
        for column in csv_columns:
            results[column] = cls.find_best_matches(column, field_library_query)
        return results


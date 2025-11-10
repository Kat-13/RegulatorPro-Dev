"""
CSV Parser for RegulatePro
Parses CSV files containing field definitions and integrates with Universal Field Library
"""

import csv
import io
from typing import List, Dict, Any, Optional
from purpose_matcher import PurposeMatcher
from field_validator import FieldValidator

class CSVParser:
    """Parse CSV files and create application types with UFL integration"""
    
    # Required CSV columns
    REQUIRED_COLUMNS = ['field_name', 'field_type', 'label']
    
    # Optional CSV columns
    OPTIONAL_COLUMNS = ['required', 'help_text', 'category', 'options', 'placeholder', 'validation']
    
    # Supported field types
    SUPPORTED_TYPES = ['text', 'email', 'tel', 'number', 'date', 'textarea', 'select', 'radio', 'checkbox']
    
    def __init__(self, db_session=None):
        """Initialize CSV parser with database session"""
        self.db = db_session
        self.purpose_matcher = PurposeMatcher()
        self.validator = FieldValidator()
        self.errors = []
        self.warnings = []
    
    def parse_csv(self, csv_content: str) -> Dict[str, Any]:
        """
        Parse CSV content and return structured field data
        
        Args:
            csv_content: CSV file content as string
            
        Returns:
            Dictionary with parsed fields and metadata
        """
        self.errors = []
        self.warnings = []
        
        try:
            # Parse CSV
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)
            
            # Validate headers
            if not self._validate_headers(reader.fieldnames):
                return {'success': False, 'errors': self.errors}
            
            # Parse rows
            fields = []
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
                field = self._parse_row(row, row_num)
                if field:
                    fields.append(field)
            
            if not fields:
                self.errors.append("No valid fields found in CSV")
                return {'success': False, 'errors': self.errors}
            
            return {
                'success': True,
                'fields': fields,
                'field_count': len(fields),
                'errors': self.errors,
                'warnings': self.warnings
            }
            
        except Exception as e:
            self.errors.append(f"CSV parsing error: {str(e)}")
            return {'success': False, 'errors': self.errors}
    
    def _validate_headers(self, headers: List[str]) -> bool:
        """Validate CSV headers"""
        if not headers:
            self.errors.append("CSV file is empty")
            return False
        
        # Check required columns
        missing = [col for col in self.REQUIRED_COLUMNS if col not in headers]
        if missing:
            self.errors.append(f"Missing required columns: {', '.join(missing)}")
            return False
        
        # Warn about unknown columns
        known_columns = self.REQUIRED_COLUMNS + self.OPTIONAL_COLUMNS
        unknown = [col for col in headers if col not in known_columns]
        if unknown:
            self.warnings.append(f"Unknown columns will be ignored: {', '.join(unknown)}")
        
        return True
    
    def _parse_row(self, row: Dict[str, str], row_num: int) -> Optional[Dict[str, Any]]:
        """Parse a single CSV row into a field definition"""
        try:
            # Extract required fields
            field_name = row.get('field_name', '').strip()
            field_type = row.get('field_type', '').strip().lower()
            label = row.get('label', '').strip()
            
            # Validate required fields
            if not field_name:
                self.errors.append(f"Row {row_num}: Missing field_name")
                return None
            
            if not field_type:
                self.errors.append(f"Row {row_num}: Missing field_type for '{field_name}'")
                return None
            
            if field_type not in self.SUPPORTED_TYPES:
                self.errors.append(f"Row {row_num}: Unsupported field_type '{field_type}' for '{field_name}'. Supported: {', '.join(self.SUPPORTED_TYPES)}")
                return None
            
            if not label:
                self.errors.append(f"Row {row_num}: Missing label for '{field_name}'")
                return None
            
            # Normalize field_name
            normalized_name = self.validator.normalize_field_key(field_name)
            if normalized_name != field_name:
                self.warnings.append(f"Row {row_num}: Field name '{field_name}' normalized to '{normalized_name}'")
            
            # Parse optional fields
            required = self._parse_boolean(row.get('required', 'false'))
            help_text = row.get('help_text', '').strip()
            category = row.get('category', '').strip() or 'Other'
            placeholder = row.get('placeholder', '').strip()
            
            # Parse options for select/radio fields
            options = None
            if field_type in ['select', 'radio']:
                options_str = row.get('options', '').strip()
                if options_str:
                    # Split by comma and clean up
                    options = [opt.strip() for opt in options_str.split(',') if opt.strip()]
                    if not options:
                        self.warnings.append(f"Row {row_num}: Field '{field_name}' is type '{field_type}' but has no options")
                else:
                    self.warnings.append(f"Row {row_num}: Field '{field_name}' is type '{field_type}' but has no options")
            
            # Build field definition
            field = {
                'name': normalized_name,
                'type': field_type,
                'label': label,
                'required': required,
                'helpText': help_text,
                'category': category,
                'placeholder': placeholder
            }
            
            if options:
                field['options'] = options
            
            return field
            
        except Exception as e:
            self.errors.append(f"Row {row_num}: Error parsing row - {str(e)}")
            return None
    
    def _parse_boolean(self, value: str) -> bool:
        """Parse boolean value from CSV"""
        if isinstance(value, bool):
            return value
        value_lower = str(value).lower().strip()
        return value_lower in ['true', 'yes', '1', 'y', 't']
    
    def create_application_type_from_csv(self, csv_content: str, application_name: str) -> Dict[str, Any]:
        """
        Parse CSV and create application type with UFL integration
        
        Args:
            csv_content: CSV file content
            application_name: Name for the application type
            
        Returns:
            Dictionary with application type data and match statistics
        """
        # Parse CSV
        parse_result = self.parse_csv(csv_content)
        if not parse_result['success']:
            return parse_result
        
        fields = parse_result['fields']
        
        # Match fields to UFL
        matched_fields = []
        new_fields = []
        
        for field in fields:
            # Try to match to existing UFL field
            if self.db:
                # Use the db session to query FieldLibrary
                # Import inside app context to avoid circular imports
                try:
                    from app import FieldLibrary
                    
                    matched_field, confidence, match_type = self.purpose_matcher.find_match(
                        field['label'],
                        field['type'],
                        self.db.query(FieldLibrary)
                    )
                except Exception as e:
                    # If import fails, treat as new field
                    matched_field = None
                    confidence = 0.0
                    match_type = None
                
                if matched_field and confidence >= 0.5:
                    # Field matched to UFL
                    matched_fields.append({
                        'field_library_id': matched_field.id,
                        'field_key': matched_field.field_key,
                        'display_name': field['label'],  # Board's custom label
                        'confidence': confidence,
                        'match_type': match_type
                    })
                else:
                    # New field - needs to be added to UFL
                    new_fields.append(field)
            else:
                # No database session - all fields are new
                new_fields.append(field)
        
        return {
            'success': True,
            'application_name': application_name,
            'fields': fields,
            'matched_count': len(matched_fields),
            'new_count': len(new_fields),
            'total_count': len(fields),
            'reuse_rate': round((len(matched_fields) / len(fields)) * 100, 1) if fields else 0,
            'matched_fields': matched_fields,
            'new_fields': new_fields,
            'errors': self.errors,
            'warnings': self.warnings
        }
    
    def generate_sample_csv(self) -> str:
        """Generate a sample CSV template"""
        sample = """field_name,field_type,label,required,help_text,category,options
first_name,text,First Name,true,Enter your legal first name,Personal Information,
last_name,text,Last Name,true,Enter your legal last name,Personal Information,
middle_name,text,Middle Name,false,Optional middle name or initial,Personal Information,
email,email,Email Address,true,Primary contact email,Contact Information,
phone,tel,Phone Number,true,Include area code,Contact Information,
date_of_birth,date,Date of Birth,true,MM/DD/YYYY format,Personal Information,
license_type,select,License Type,true,Select the type of license you are applying for,Professional Background,"Standard Practice,Specialty Practice,Temporary License"
years_experience,number,Years of Experience,true,Total years in practice,Professional Background,
education_degree,text,Degree Earned,true,e.g. DVM or MD,Education,
graduation_date,date,Graduation Date,true,Date you graduated,Education,
exam_score,number,National Exam Score,false,If applicable,Examination,
military_spouse,checkbox,Are you a military spouse?,false,Check if yes for fee waiver eligibility,Fee Waivers,
attestation,checkbox,I certify that all information provided is true and accurate,true,Required certification,Compliance & Declarations,
background_check,radio,Have you ever been convicted of a felony?,true,Required disclosure,Compliance & Declarations,"Yes,No"
additional_info,textarea,Additional Information,false,Any other relevant information,Other,
"""
        return sample.strip()


# Utility function for easy import
def parse_csv_file(csv_content: str, application_name: str, db_session=None) -> Dict[str, Any]:
    """
    Convenience function to parse CSV and create application type
    
    Args:
        csv_content: CSV file content as string
        application_name: Name for the application type
        db_session: Database session (optional)
        
    Returns:
        Dictionary with parse results and match statistics
    """
    parser = CSVParser(db_session)
    return parser.create_application_type_from_csv(csv_content, application_name)


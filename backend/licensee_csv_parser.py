"""
Licensee CSV Parser
Parses CSV files containing existing licensee/registrant data for bulk import
"""

import csv
import io
from datetime import datetime
from typing import Dict, List, Any, Optional

class LicenseeCSVParser:
    """Parse CSV files containing licensee data"""
    
    # Standard field mappings (CSV column name -> database field name)
    FIELD_MAPPINGS = {
        'license_number': 'licenseNumber',
        'license_num': 'licenseNumber',
        'licensenumber': 'licenseNumber',
        'number': 'licenseNumber',
        
        'first_name': 'first_name',
        'firstname': 'first_name',
        'fname': 'first_name',
        
        'last_name': 'last_name',
        'lastname': 'last_name',
        'lname': 'last_name',
        
        'email': 'email',
        'email_address': 'email',
        
        'phone': 'phone',
        'phone_number': 'phone',
        'telephone': 'phone',
        
        'address': 'address',
        'street_address': 'address',
        'street': 'address',
        
        'city': 'city',
        
        'state': 'state',
        
        'zip': 'zipCode',
        'zipcode': 'zipCode',
        'zip_code': 'zipCode',
        'postal_code': 'zipCode',
        
        'license_type': 'licenseType',
        'licensetype': 'licenseType',
        'type': 'licenseType',
        
        'status': 'licenseStatus',
        'license_status': 'licenseStatus',
        'licensestatus': 'licenseStatus',
        
        'issue_date': 'issueDate',
        'issuedate': 'issueDate',
        'issued': 'issueDate',
        'date_issued': 'issueDate',
        
        'expiration_date': 'expirationDate',
        'expirationdate': 'expirationDate',
        'expiration': 'expirationDate',
        'expires': 'expirationDate',
        'exp_date': 'expirationDate',
    }
    
    # Valid license statuses
    VALID_STATUSES = [
        'Active',
        'Expired',
        'Suspended',
        'Revoked',
        'Inactive',
        'Pending',
        'Retired'
    ]
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.stats = {
            'total_rows': 0,
            'successful': 0,
            'failed': 0,
            'duplicates': 0
        }
    
    def parse(self, csv_content: str) -> Dict[str, Any]:
        """
        Parse CSV content and return licensee records
        
        Args:
            csv_content: CSV file content as string
            
        Returns:
            Dictionary containing:
            - licensees: List of parsed licensee records
            - errors: List of error messages
            - warnings: List of warning messages
            - stats: Import statistics
        """
        self.errors = []
        self.warnings = []
        self.stats = {
            'total_rows': 0,
            'successful': 0,
            'failed': 0,
            'duplicates': 0
        }
        
        licensees = []
        seen_license_numbers = set()
        seen_emails = set()
        
        try:
            # Parse CSV
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)
            
            # Validate headers
            if not reader.fieldnames:
                self.errors.append("CSV file has no headers")
                return self._build_result(licensees)
            
            # Normalize headers (lowercase, strip whitespace)
            normalized_headers = [h.lower().strip().replace(' ', '_') for h in reader.fieldnames]
            
            # Check for required fields
            required_fields = ['license_number', 'first_name', 'last_name', 'email']
            missing_fields = []
            
            for req_field in required_fields:
                found = False
                for header in normalized_headers:
                    if header in self.FIELD_MAPPINGS and self.FIELD_MAPPINGS[header] in [req_field, req_field.replace('_', '')]:
                        found = True
                        break
                    if header == req_field:
                        found = True
                        break
                if not found:
                    missing_fields.append(req_field)
            
            if missing_fields:
                self.errors.append(f"Missing required columns: {', '.join(missing_fields)}")
                return self._build_result(licensees)
            
            # Process each row
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                self.stats['total_rows'] += 1
                
                try:
                    # Normalize row keys
                    normalized_row = {}
                    for key, value in row.items():
                        if key:
                            norm_key = key.lower().strip().replace(' ', '_')
                            normalized_row[norm_key] = value.strip() if value else ''
                    
                    # Parse licensee data
                    licensee = self._parse_licensee_row(normalized_row, row_num)
                    
                    if not licensee:
                        continue
                    
                    # Check for duplicates within the CSV
                    license_num = licensee.get('licenseNumber', '')
                    email = licensee.get('email', '')
                    
                    if license_num and license_num in seen_license_numbers:
                        self.warnings.append(f"Row {row_num}: Duplicate license number '{license_num}'")
                        self.stats['duplicates'] += 1
                        continue
                    
                    if email and email in seen_emails:
                        self.warnings.append(f"Row {row_num}: Duplicate email '{email}'")
                        self.stats['duplicates'] += 1
                        continue
                    
                    if license_num:
                        seen_license_numbers.add(license_num)
                    if email:
                        seen_emails.add(email)
                    
                    licensees.append(licensee)
                    self.stats['successful'] += 1
                    
                except Exception as e:
                    self.errors.append(f"Row {row_num}: {str(e)}")
                    self.stats['failed'] += 1
                    
        except Exception as e:
            self.errors.append(f"Failed to parse CSV: {str(e)}")
        
        return self._build_result(licensees)
    
    def _parse_licensee_row(self, row: Dict[str, str], row_num: int) -> Optional[Dict[str, Any]]:
        """Parse a single CSV row into a licensee record"""
        licensee = {}
        
        # Map CSV columns to database fields
        for csv_key, value in row.items():
            if csv_key in self.FIELD_MAPPINGS:
                db_field = self.FIELD_MAPPINGS[csv_key]
                licensee[db_field] = value
        
        # Validate required fields
        if not licensee.get('licenseNumber'):
            raise ValueError("Missing license number")
        if not licensee.get('first_name'):
            raise ValueError("Missing first name")
        if not licensee.get('last_name'):
            raise ValueError("Missing last name")
        if not licensee.get('email'):
            raise ValueError("Missing email")
        
        # Validate email format
        email = licensee.get('email', '')
        if '@' not in email or '.' not in email:
            raise ValueError(f"Invalid email format: {email}")
        
        # Validate and normalize status
        status = licensee.get('licenseStatus', 'Active')
        if status and status not in self.VALID_STATUSES:
            # Try to match case-insensitively
            matched = False
            for valid_status in self.VALID_STATUSES:
                if status.lower() == valid_status.lower():
                    licensee['licenseStatus'] = valid_status
                    matched = True
                    break
            if not matched:
                self.warnings.append(f"Row {row_num}: Unknown status '{status}', defaulting to 'Active'")
                licensee['licenseStatus'] = 'Active'
        elif not status:
            licensee['licenseStatus'] = 'Active'
        
        # Validate dates (basic format check)
        for date_field in ['issueDate', 'expirationDate']:
            if date_field in licensee and licensee[date_field]:
                date_str = licensee[date_field]
                try:
                    # Try to parse common date formats
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%Y/%m/%d']:
                        try:
                            datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        self.warnings.append(f"Row {row_num}: Invalid date format for {date_field}: {date_str}")
                except Exception:
                    pass
        
        # Generate username from email if not provided
        if 'username' not in licensee:
            licensee['username'] = licensee['email'].split('@')[0] + '_' + licensee['licenseNumber']
        
        return licensee
    
    def _build_result(self, licensees: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build the final result dictionary"""
        return {
            'licensees': licensees,
            'errors': self.errors,
            'warnings': self.warnings,
            'stats': self.stats
        }


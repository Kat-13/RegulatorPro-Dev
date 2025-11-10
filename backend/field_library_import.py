"""
Field Library Import Module
Handles importing field definitions and reference data into the Field Library
"""
import csv
import io
import json
from datetime import datetime


class FieldLibraryImporter:
    """Handles importing field definitions and reference data"""
    
    def __init__(self, db, FieldLibrary):
        self.db = db
        self.FieldLibrary = FieldLibrary
    
    def analyze_reference_data(self, csv_content):
        """
        Analyze a reference data CSV and check if matching field exists
        Returns analysis with matching field info and preview data
        """
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        if not rows:
            return {'error': 'CSV file is empty'}
        
        # First row is the header/field name
        header = rows[0][0] if rows[0] else 'Unknown Field'
        
        # Remaining rows are the options
        options = [row[0].strip() for row in rows[1:] if row and row[0].strip()]
        
        # Generate field_key from header
        suggested_field_key = self._normalize_field_key(header)
        
        # Check if field exists
        existing_field = self.FieldLibrary.query.filter_by(field_key=suggested_field_key).first()
        
        result = {
            'field_name': header,
            'suggested_field_key': suggested_field_key,
            'options_count': len(options),
            'options_preview': options[:10],  # First 10 options
            'field_exists': existing_field is not None
        }
        
        if existing_field:
            existing_options = json.loads(existing_field.options) if existing_field.options else []
            existing_values = [opt['value'] if isinstance(opt, dict) else opt for opt in existing_options]
            
            # Find new options that don't exist
            new_options = [opt for opt in options if opt not in existing_values]
            
            result['existing_field'] = {
                'id': existing_field.id,
                'field_key': existing_field.field_key,
                'canonical_name': existing_field.canonical_name,
                'current_options_count': len(existing_options),
                'current_options': existing_values,
                'new_options_count': len(new_options),
                'new_options': new_options
            }
        
        return result
    
    def detect_import_type(self, csv_content):
        """
        Detect what type of data is being imported
        Returns: 'reference_data', 'field_definitions', or 'unknown'
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        headers = reader.fieldnames
        
        # Single column CSV = reference data (dropdown options)
        if len(headers) == 1:
            return 'reference_data'
        
        # Multiple columns with field definition structure
        if any(h.lower() in ['field_name', 'field_type', 'canonical_name', 'field_key'] for h in headers):
            return 'field_definitions'
        
        return 'unknown'
    
    def import_reference_data(self, csv_content, field_key=None, field_name=None, board_name=None, merge_strategy='merge'):
        """
        Import reference data (dropdown options) from a single-column CSV
        
        Args:
            csv_content: CSV file content as string
            field_key: Optional - the field_key to update (e.g., 'employment_status')
            field_name: Optional - display name for the field if creating new
            board_name: Optional - which board is importing this data
            merge_strategy: 'merge' (add new options), 'replace' (replace all), 'create_new' (new field)
        
        Returns:
            dict with success status, field info, and statistics
        """
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        if not rows:
            return {
                'success': False,
                'error': 'CSV file is empty'
            }
        
        # First row is the header/field name
        header = rows[0][0] if rows[0] else 'Unknown Field'
        
        # Remaining rows are the options
        options = [row[0].strip() for row in rows[1:] if row and row[0].strip()]
        
        if not options:
            return {
                'success': False,
                'error': 'No data rows found in CSV'
            }
        
        # Determine field_key
        if not field_key:
            field_key = self._normalize_field_key(field_name or header)
        
        # Check if field exists
        field = self.FieldLibrary.query.filter_by(field_key=field_key).first()
        
        if field:
            # Update existing field based on merge strategy
            existing_options = json.loads(field.options) if field.options else []
            existing_values = [opt['value'] if isinstance(opt, dict) else opt for opt in existing_options]
            
            if merge_strategy == 'replace':
                # Replace all options
                field.options = json.dumps([{'value': opt, 'label': opt} for opt in options])
                field.updated_at = datetime.utcnow()
                self.db.session.commit()
                
                return {
                    'success': True,
                    'action': 'replaced',
                    'field_key': field_key,
                    'field_name': field.canonical_name,
                    'total_options': len(options),
                    'previous_count': len(existing_options)
                }
            
            elif merge_strategy == 'create_new':
                # Create a new field with incremented key
                base_key = field_key
                counter = 2
                while self.FieldLibrary.query.filter_by(field_key=f"{base_key}_{counter}").first():
                    counter += 1
                new_field_key = f"{base_key}_{counter}"
                
                new_field = self.FieldLibrary(
                    field_key=new_field_key,
                    canonical_name=f"{field.canonical_name} (v{counter})",
                    description=f'Alternative version of {field.canonical_name}',
                    field_type='select',
                    data_type='string',
                    category=field.category or 'Reference Data',
                    options=json.dumps([{'value': opt, 'label': opt} for opt in options]),
                    first_used_by=board_name or 'CSV Import',
                    usage_count=0,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                self.db.session.add(new_field)
                self.db.session.commit()
                
                return {
                    'success': True,
                    'action': 'created_new',
                    'field_key': new_field_key,
                    'field_name': new_field.canonical_name,
                    'total_options': len(options),
                    'original_field': field_key
                }
            
            else:  # merge_strategy == 'merge' (default)
                # Add new options to existing
                new_options_added = []
                for option in options:
                    if option not in existing_values:
                        existing_options.append({'value': option, 'label': option})
                        new_options_added.append(option)
                
                field.options = json.dumps(existing_options)
                field.updated_at = datetime.utcnow()
                
                self.db.session.commit()
                
                return {
                    'success': True,
                    'action': 'merged',
                    'field_key': field_key,
                    'field_name': field.canonical_name,
                    'total_options': len(existing_options),
                    'new_options_added': len(new_options_added),
                    'new_options': new_options_added
                }
        else:
            # Create new field
            new_field = self.FieldLibrary(
                field_key=field_key,
                canonical_name=field_name or header,
                description=f'Reference data imported from CSV',
                field_type='select',
                data_type='string',
                category='Reference Data',
                options=json.dumps([{'value': opt, 'label': opt} for opt in options]),
                first_used_by=board_name or 'CSV Import',
                usage_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.db.session.add(new_field)
            self.db.session.commit()
            
            return {
                'success': True,
                'action': 'created',
                'field_key': field_key,
                'field_name': new_field.canonical_name,
                'total_options': len(options),
                'options': options
            }
    
    def import_field_definitions(self, csv_content, board_name=None):
        """
        Import complete field definitions from CSV
        Expected columns: field_key, canonical_name, field_type, category, options, etc.
        
        Returns:
            dict with success status and statistics
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for row in reader:
            try:
                field_key = row.get('field_key') or self._normalize_field_key(row.get('canonical_name', ''))
                
                if not field_key:
                    errors.append(f"Row missing field_key: {row}")
                    continue
                
                # Check if field exists
                field = self.FieldLibrary.query.filter_by(field_key=field_key).first()
                
                # Parse options if present
                options = None
                if row.get('options'):
                    try:
                        # Try parsing as JSON first
                        options = json.loads(row['options'])
                    except:
                        # Otherwise split by comma
                        options = [{'value': opt.strip(), 'label': opt.strip()} 
                                  for opt in row['options'].split(',')]
                
                if field:
                    # Update existing field
                    field.canonical_name = row.get('canonical_name', field.canonical_name)
                    field.field_type = row.get('field_type', field.field_type)
                    field.category = row.get('category', field.category)
                    if options:
                        field.options = json.dumps(options)
                    field.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    # Create new field
                    new_field = self.FieldLibrary(
                        field_key=field_key,
                        canonical_name=row.get('canonical_name', field_key),
                        description=row.get('description', ''),
                        field_type=row.get('field_type', 'text'),
                        data_type=row.get('data_type', 'string'),
                        category=row.get('category', 'General'),
                        options=json.dumps(options) if options else None,
                        first_used_by=board_name or 'CSV Import',
                        usage_count=0
                    )
                    self.db.session.add(new_field)
                    created_count += 1
            
            except Exception as e:
                errors.append(f"Error processing row {row}: {str(e)}")
        
        self.db.session.commit()
        
        return {
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        }
    
    def _normalize_field_key(self, name):
        """Convert a field name to a normalized field_key (snake_case)"""
        # Remove special characters and convert to lowercase
        key = re.sub(r'[^a-zA-Z0-9\s]', '', name)
        # Replace spaces with underscores
        key = re.sub(r'\s+', '_', key.strip())
        return key.lower()


# For backwards compatibility
import re


#!/usr/bin/env python3
"""
Migration Script: Populate Universal Field Library from Existing Data
Extracts fields from ApplicationType.form_definition and creates FieldLibrary entries
"""

from app import app, db, ApplicationType, FieldLibrary
import json
import re

def generate_field_key(field_name):
    """Generate standardized field_key from field name"""
    # Convert to lowercase
    key = field_name.lower()
    # Replace spaces and hyphens with underscores
    key = key.replace(' ', '_').replace('-', '_')
    # Remove special characters
    key = re.sub(r'[^a-z0-9_]', '', key)
    # Remove multiple underscores
    key = re.sub(r'_+', '_', key)
    # Remove leading/trailing underscores
    key = key.strip('_')
    return key

def categorize_field(field_name, field_label):
    """Auto-categorize field based on name/label"""
    name_lower = (field_name + ' ' + field_label).lower()
    
    # Personal Information
    if any(word in name_lower for word in ['first name', 'last name', 'middle name', 'name', 'dob', 'birth', 'ssn', 'social security']):
        return 'Personal Information'
    
    # Contact Information
    if any(word in name_lower for word in ['email', 'phone', 'fax', 'contact', 'address', 'street', 'city', 'state', 'zip', 'country']):
        return 'Contact Information'
    
    # Education
    if any(word in name_lower for word in ['school', 'university', 'college', 'education', 'degree', 'graduation', 'transcript']):
        return 'Education'
    
    # Examination
    if any(word in name_lower for word in ['exam', 'test', 'score', 'navle', 'nclex', 'certification']):
        return 'Examination'
    
    # Professional Background
    if any(word in name_lower for word in ['experience', 'employer', 'employment', 'practice', 'specialty', 'discipline', 'license']):
        return 'Professional Background'
    
    # Compliance & Declarations
    if any(word in name_lower for word in ['criminal', 'disciplinary', 'malpractice', 'complaint', 'violation', 'revocation']):
        return 'Compliance & Declarations'
    
    # Fee Waivers
    if any(word in name_lower for word in ['military', 'spouse', 'waiver', 'poverty', 'veteran']):
        return 'Fee Waivers'
    
    # Documents
    if any(word in name_lower for word in ['upload', 'document', 'file', 'attachment', 'photo', 'image']):
        return 'Documents & Attachments'
    
    return 'Other'

def map_field_type(field_type):
    """Map various field type names to standard types"""
    type_lower = field_type.lower()
    
    if type_lower in ['text', 'string', 'basic-string']:
        return 'text'
    elif type_lower in ['email', 'basic-email']:
        return 'email'
    elif type_lower in ['number', 'integer', 'decimal', 'basic-number']:
        return 'number'
    elif type_lower in ['date', 'basic-date']:
        return 'date'
    elif type_lower in ['select', 'dropdown', 'picklist', 'basic-picklist']:
        return 'select'
    elif type_lower in ['checkbox', 'boolean', 'basic-boolean']:
        return 'checkbox'
    elif type_lower in ['radio', 'radiogroup']:
        return 'radio'
    elif type_lower in ['textarea', 'longtext', 'basic-longtext']:
        return 'textarea'
    elif type_lower in ['file', 'upload', 'attachment']:
        return 'file'
    elif type_lower in ['phone', 'tel', 'basic-phone']:
        return 'tel'
    else:
        return 'text'  # Default fallback

def migrate_to_field_library():
    """Main migration function"""
    with app.app_context():
        print("=" * 80)
        print("Universal Field Library Migration")
        print("=" * 80)
        
        # Create tables if they don't exist
        db.create_all()
        print("✓ Database tables created/verified")
        
        # Get all application types
        app_types = ApplicationType.query.all()
        print(f"\nFound {len(app_types)} application types to process")
        
        if not app_types:
            print("\n⚠️  No application types found. Nothing to migrate.")
            return
        
        total_fields_processed = 0
        fields_created = 0
        fields_reused = 0
        
        for app_type in app_types:
            print(f"\n--- Processing: {app_type.name} ---")
            
            if not app_type.form_definition:
                print("  ⚠️  No form_definition found, skipping")
                continue
            
            try:
                form_def = json.loads(app_type.form_definition)
            except json.JSONDecodeError:
                print("  ❌ Invalid JSON in form_definition, skipping")
                continue
            
            fields = form_def if isinstance(form_def, list) else form_def.get('fields', [])
            
            if not fields:
                print("  ⚠️  No fields found in form_definition")
                continue
            
            print(f"  Found {len(fields)} fields")
            
            for field in fields:
                total_fields_processed += 1
                
                # Extract field info
                field_name = field.get('name', field.get('label', f'field_{total_fields_processed}'))
                field_label = field.get('label', field_name)
                field_type = field.get('type', 'text')
                
                # Generate field_key
                field_key = generate_field_key(field_name)
                
                # Check if field already exists
                existing = FieldLibrary.query.filter_by(field_key=field_key).first()
                
                if existing:
                    # Field exists - increment usage count
                    existing.usage_count += 1
                    db.session.commit()
                    fields_reused += 1
                    print(f"    ✓ Reused: {field_key} (usage: {existing.usage_count})")
                else:
                    # Create new field in library
                    category = categorize_field(field_name, field_label)
                    mapped_type = map_field_type(field_type)
                    
                    new_field = FieldLibrary(
                        field_key=field_key,
                        canonical_name=field_label,
                        description=field.get('description', f'{field_label} field'),
                        field_type=mapped_type,
                        data_type='string',  # Default, can be refined later
                        category=category,
                        placeholder=field.get('placeholder'),
                        help_text=field.get('helpText'),
                        usage_count=1,
                        first_used_by=app_type.name,
                        validation_rules=json.dumps({
                            'required': field.get('required', False)
                        }),
                        options=json.dumps(field.get('options')) if field.get('options') else None,
                        tags=json.dumps(['imported', 'migration_v1'])
                    )
                    
                    db.session.add(new_field)
                    db.session.commit()
                    fields_created += 1
                    print(f"    + Created: {field_key} [{category}]")
        
        # Summary
        print("\n" + "=" * 80)
        print("Migration Complete!")
        print("=" * 80)
        print(f"Total fields processed: {total_fields_processed}")
        print(f"New fields created: {fields_created}")
        print(f"Existing fields reused: {fields_reused}")
        print(f"Total fields in library: {FieldLibrary.query.count()}")
        print("\n✓ Universal Field Library is ready!")

if __name__ == '__main__':
    migrate_to_field_library()


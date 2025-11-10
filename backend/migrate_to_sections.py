"""
Migration Script: Convert Existing Forms to Section-Based Structure

This script migrates existing application types from field-based to section-based structure.
It preserves all existing fields and organizes them into logical sections.
"""

import sqlite3
import json
from datetime import datetime


def auto_categorize_field(field_name, field_type):
    """Auto-categorize a field into a section based on its name"""
    name_lower = field_name.lower()
    
    # Personal Information
    personal_keywords = ['name', 'address', 'email', 'phone', 'contact', 'birth', 'ssn', 'social security', 'dob']
    if any(kw in name_lower for kw in personal_keywords):
        return 'Personal Information'
    
    # Professional Background
    professional_keywords = ['license', 'certification', 'credential', 'experience', 'employer', 'practice', 'specialty']
    if any(kw in name_lower for kw in professional_keywords):
        return 'Professional Background'
    
    # Education
    education_keywords = ['education', 'school', 'degree', 'college', 'university', 'training', 'course']
    if any(kw in name_lower for kw in education_keywords):
        return 'Education'
    
    # Compliance & Background
    compliance_keywords = ['criminal', 'disciplinary', 'conviction', 'felony', 'background', 'complaint']
    if any(kw in name_lower for kw in compliance_keywords):
        return 'Compliance & Background Checks'
    
    # Employment
    employment_keywords = ['employment', 'employer', 'job', 'work', 'occupation']
    if any(kw in name_lower for kw in employment_keywords):
        return 'Employment Information'
    
    # Default to Other
    return 'Other Information'


def migrate_application_type_to_sections(conn, app_type_id, app_name):
    """Migrate a single application type to section-based structure"""
    cursor = conn.cursor()
    
    # Get existing form structure
    cursor.execute('SELECT form_definition, form_fields_v2 FROM application_type WHERE id = ?', (app_type_id,))
    row = cursor.fetchone()
    
    if not row:
        print(f"  ❌ Application type {app_type_id} not found")
        return False
    
    form_definition = row[0]
    form_fields_v2 = row[1]
    
    # Try to parse existing fields
    fields = []
    if form_fields_v2:
        try:
            fields = json.loads(form_fields_v2)
        except:
            pass
    
    if not fields and form_definition:
        try:
            form_def = json.loads(form_definition)
            fields = form_def.get('fields', [])
        except:
            pass
    
    if not fields:
        print(f"  ℹ️  No fields found, creating default section")
        sections = [{
            'id': 'section_1',
            'name': 'Application Information',
            'description': 'General application information',
            'order': 0,
            'fields': []
        }]
    else:
        # Group fields by section
        section_groups = {}
        for field in fields:
            field_name = field.get('label') or field.get('name', 'Unnamed Field')
            field_type = field.get('type', 'text')
            section_name = auto_categorize_field(field_name, field_type)
            
            if section_name not in section_groups:
                section_groups[section_name] = []
            
            section_groups[section_name].append(field)
        
        # Create sections
        sections = []
        section_order = 0
        for section_name, section_fields in section_groups.items():
            section_id = section_name.lower().replace(' ', '_').replace('&', 'and')
            sections.append({
                'id': section_id,
                'name': section_name,
                'description': f'{section_name} fields',
                'order': section_order,
                'fields': section_fields
            })
            section_order += 1
    
    # Update application_type with sections
    sections_json = json.dumps(sections)
    cursor.execute('UPDATE application_type SET sections = ? WHERE id = ?', (sections_json, app_type_id))
    
    print(f"  ✅ Migrated {len(sections)} sections with {len(fields)} total fields")
    return True


def main():
    """Main migration function"""
    print("=" * 60)
    print("Migration: Convert Forms to Section-Based Structure")
    print("=" * 60)
    print()
    
    # Connect to database
    conn = sqlite3.connect('instance/regulatory_platform.db')
    cursor = conn.cursor()
    
    # Get all application types
    cursor.execute('SELECT id, name FROM application_type')
    app_types = cursor.fetchall()
    
    if not app_types:
        print("No application types found. Nothing to migrate.")
        conn.close()
        return
    
    print(f"Found {len(app_types)} application types to migrate:")
    print()
    
    migrated_count = 0
    for app_id, app_name in app_types:
        print(f"📋 Migrating: {app_name} (ID: {app_id})")
        if migrate_application_type_to_sections(conn, app_id, app_name):
            migrated_count += 1
        print()
    
    # Commit changes
    conn.commit()
    cursor.close()
    conn.close()
    
    print("=" * 60)
    print(f"✅ Migration Complete!")
    print(f"   Migrated: {migrated_count}/{len(app_types)} application types")
    print("=" * 60)


if __name__ == '__main__':
    main()


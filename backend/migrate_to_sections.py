"""
Migration Script: Convert Existing Forms to Section-Based Structure

Updated to use format_converter utility and Flask app context.

Usage:
    python3.11 migrate_to_sections.py [--dry-run] [--backup]

Options:
    --dry-run    Show what would be migrated without making changes
    --backup     Create database backup before migration
"""

import sys
import json
import argparse
import shutil
from datetime import datetime
from app import app, db, ApplicationType
from format_converter import convert_fields_to_sections

def backup_database():
    """Create a backup of the database before migration"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'instance/regulatory_platform_backup_{timestamp}.db'
    
    try:
        shutil.copy2('instance/regulatory_platform.db', backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return None

def get_fields_from_old_format(app_type):
    """Extract fields from OLD format (form_definition or form_fields_v2)"""
    # Try form_definition first (oldest format)
    if app_type.form_definition:
        try:
            fields = json.loads(app_type.form_definition)
            if isinstance(fields, list) and len(fields) > 0:
                return fields, 'form_definition'
        except:
            pass
    
    # Try form_fields_v2 (UFL format)
    if app_type.form_fields_v2:
        try:
            field_refs = json.loads(app_type.form_fields_v2)
            # Reconstruct basic fields from UFL references
            fields = []
            for ref in field_refs:
                overrides = ref.get('overrides', {})
                fields.append({
                    'name': overrides.get('display_name', '').lower().replace(' ', '_'),
                    'label': overrides.get('display_name', ''),
                    'type': 'text',
                    'required': overrides.get('required', False),
                    'help_text': overrides.get('help_text'),
                    'placeholder': overrides.get('placeholder')
                })
            if len(fields) > 0:
                return fields, 'form_fields_v2'
        except:
            pass
    
    return None, None

def migrate_application_type(app_type, dry_run=False):
    """Migrate a single application type to sections format"""
    # Skip if already has sections
    if app_type.sections:
        return 'skipped', 'Already has sections'
    
    # Get fields from old format
    fields, source = get_fields_from_old_format(app_type)
    
    if not fields:
        return 'skipped', 'No fields found in old formats'
    
    # Convert to sections using utility
    sections = convert_fields_to_sections(fields)
    
    if dry_run:
        return 'would_migrate', f'Would convert {len(fields)} fields from {source}'
    
    # Update the application type
    app_type.sections = json.dumps(sections)
    
    # Set parser_version to indicate migration
    if not app_type.parser_version:
        app_type.parser_version = f'Migrated_from_{source}'
    
    return 'migrated', f'Converted {len(fields)} fields from {source}'

def main():
    """Main migration function"""
    parser = argparse.ArgumentParser(description='Migrate application types to sections format')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without making changes')
    parser.add_argument('--backup', action='store_true', help='Create database backup before migration')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Application Type Migration to Sections Format")
    print("=" * 60)
    print()
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()
    
    # Create backup if requested
    if args.backup and not args.dry_run:
        backup_path = backup_database()
        if not backup_path:
            print("❌ Cannot proceed without backup")
            return 1
        print()
    
    with app.app_context():
        # Get all application types
        all_types = ApplicationType.query.all()
        print(f"Found {len(all_types)} application types")
        print()
        
        # Track results
        results = {
            'migrated': [],
            'would_migrate': [],
            'skipped': [],
            'errors': []
        }
        
        # Migrate each one
        for app_type in all_types:
            try:
                status, message = migrate_application_type(app_type, dry_run=args.dry_run)
                results[status].append({
                    'id': app_type.id,
                    'name': app_type.name,
                    'message': message
                })
                
                # Print progress
                icon = {
                    'migrated': '✅',
                    'would_migrate': '🔄',
                    'skipped': '⏭️'
                }[status]
                print(f"{icon} [{app_type.id}] {app_type.name}: {message}")
                
            except Exception as e:
                results['errors'].append({
                    'id': app_type.id,
                    'name': app_type.name,
                    'error': str(e)
                })
                print(f"❌ [{app_type.id}] {app_type.name}: ERROR - {e}")
        
        # Commit changes if not dry run
        if not args.dry_run and len(results['migrated']) > 0:
            try:
                db.session.commit()
                print()
                print("✅ Changes committed to database")
            except Exception as e:
                db.session.rollback()
                print()
                print(f"❌ Failed to commit: {e}")
                return 1
        
        # Print summary
        print()
        print("=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        
        if args.dry_run:
            print(f"Would migrate: {len(results['would_migrate'])}")
        else:
            print(f"Migrated:      {len(results['migrated'])}")
        
        print(f"Skipped:       {len(results['skipped'])}")
        print(f"Errors:        {len(results['errors'])}")
        print()
        
        if results['errors']:
            print("ERRORS:")
            for err in results['errors']:
                print(f"  - [{err['id']}] {err['name']}: {err['error']}")
            print()
        
        if args.dry_run and results['would_migrate']:
            print("To perform the migration, run without --dry-run flag")
            print("Recommended: python3.11 migrate_to_sections.py --backup")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3.11
"""
Auto-configure multi-step wizard for all existing application types
Run this script to automatically generate steps for all forms
"""

from app import app, db, ApplicationType
from step_auto_configurator import StepAutoConfigurator

def main():
    print("=" * 60)
    print("Auto-Configuring Multi-Step Wizard for All Application Types")
    print("=" * 60)
    print()
    
    with app.app_context():
        # Get all active application types
        app_types = ApplicationType.query.filter_by(active=True).all()
        
        print(f"Found {len(app_types)} active application types\n")
        
        configured_count = 0
        skipped_count = 0
        error_count = 0
        
        for app_type in app_types:
            print(f"Processing: {app_type.name} (ID: {app_type.id})")
            
            # Skip if already configured
            if app_type.steps and app_type.steps.strip() not in ['null', '']:
                print(f"  ⏭️  Already configured, skipping")
                skipped_count += 1
                continue
            
            # Get fields
            fields = app_type.get_fields()
            if not fields or len(fields) == 0:
                print(f"  ⚠️  No fields found, skipping")
                skipped_count += 1
                continue
            
            print(f"  📊 Found {len(fields)} fields")
            
            # Auto-configure
            try:
                config = StepAutoConfigurator.analyze_fields(fields)
                
                if config['enabled']:
                    app_type.steps = json.dumps(config)
                    db.session.commit()
                    
                    step_count = len(config.get('steps', []))
                    print(f"  ✅ Configured {step_count} steps")
                    
                    # Show step breakdown
                    for step in config['steps']:
                        field_count = len(step['field_keys'])
                        print(f"     Step {step['id']}: {step['name']} ({field_count} fields)")
                    
                    configured_count += 1
                else:
                    print(f"  ⏭️  Too few fields ({len(fields)}), single-page form is fine")
                    skipped_count += 1
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
                error_count += 1
                db.session.rollback()
            
            print()
        
        print("=" * 60)
        print("Auto-Configuration Complete!")
        print("=" * 60)
        print(f"✅ Configured: {configured_count}")
        print(f"⏭️  Skipped: {skipped_count}")
        print(f"❌ Errors: {error_count}")
        print(f"📝 Total: {len(app_types)}")
        print()

if __name__ == '__main__':
    import json
    main()

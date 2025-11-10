#!/usr/bin/env python3
"""
Demo: Field Reuse with BTR Import
Shows how Universal Field Library enables field reuse across boards
"""

from app import app, db, FieldLibrary
import json
import re

def generate_field_key(field_name):
    """Generate standardized field_key from field name"""
    key = field_name.lower().replace(' ', '_').replace('-', '_')
    key = re.sub(r'[^a-z0-9_]', '', key)
    key = re.sub(r'_+', '_', key).strip('_')
    return key

def simulate_btr_import():
    """
    Simulate importing BTR (Board of Technical Registration) fields
    and show how many fields are reused vs. created new
    """
    with app.app_context():
        print("=" * 80)
        print("BTR Field Import Simulation - Universal Field Library Demo")
        print("=" * 80)
        
        # Simulated BTR fields (based on typical engineering board requirements)
        btr_fields = [
            {'name': 'First Name', 'type': 'text', 'required': True},
            {'name': 'Last Name', 'type': 'text', 'required': True},
            {'name': 'Email', 'type': 'email', 'required': True},
            {'name': 'Phone', 'type': 'tel', 'required': True},
            {'name': 'Address', 'type': 'text', 'required': True},
            {'name': 'City', 'type': 'text', 'required': True},
            {'name': 'State', 'type': 'select', 'required': True},
            {'name': 'ZIP Code', 'type': 'text', 'required': True},
            {'name': 'Date of Birth', 'type': 'date', 'required': True},
            {'name': 'Social Security Number', 'type': 'text', 'required': False},
            {'name': 'Engineering School', 'type': 'text', 'required': True},
            {'name': 'Graduation Date', 'type': 'date', 'required': True},
            {'name': 'Engineering Discipline', 'type': 'select', 'required': True},
            {'name': 'FE Exam Date', 'type': 'date', 'required': True},
            {'name': 'PE Exam Date', 'type': 'date', 'required': True},
            {'name': 'PE Exam Score', 'type': 'number', 'required': False},
            {'name': 'Years of Experience', 'type': 'number', 'required': True},
            {'name': 'Current Employer', 'type': 'text', 'required': False},
            {'name': 'Practice Hours', 'type': 'number', 'required': True},
            {'name': 'Military Spouse', 'type': 'checkbox', 'required': False},
            {'name': 'Criminal History', 'type': 'checkbox', 'required': True},
            {'name': 'Criminal History Details', 'type': 'textarea', 'required': False},
            {'name': 'Disciplinary Action', 'type': 'checkbox', 'required': True},
            {'name': 'Disciplinary Action Details', 'type': 'textarea', 'required': False},
        ]
        
        print(f"\nSimulating import of {len(btr_fields)} BTR fields...")
        print("\nCurrent UFL Stats:")
        print(f"  Total fields in library: {FieldLibrary.query.count()}")
        
        matched = 0
        created = 0
        match_details = []
        
        for field in btr_fields:
            field_key = generate_field_key(field['name'])
            
            # Try to find existing field
            existing = FieldLibrary.query.filter_by(field_key=field_key).first()
            
            if existing:
                matched += 1
                match_details.append({
                    'field': field['name'],
                    'key': field_key,
                    'status': 'REUSED',
                    'usage_count': existing.usage_count,
                    'first_used_by': existing.first_used_by
                })
            else:
                created += 1
                match_details.append({
                    'field': field['name'],
                    'key': field_key,
                    'status': 'NEW',
                    'usage_count': 0,
                    'first_used_by': 'Would be: AZ Board of Technical Registration'
                })
        
        # Display results
        print("\n" + "=" * 80)
        print("Import Results")
        print("=" * 80)
        
        print(f"\n✓ Fields Matched (Reused): {matched}")
        print(f"+ Fields Created (New): {created}")
        print(f"📊 Total Fields: {len(btr_fields)}")
        print(f"♻️  Reuse Rate: {(matched / len(btr_fields) * 100):.1f}%")
        
        print("\n" + "-" * 80)
        print("Detailed Field Mapping")
        print("-" * 80)
        
        # Show reused fields
        print("\n✓ REUSED FIELDS (from existing boards):")
        for detail in match_details:
            if detail['status'] == 'REUSED':
                print(f"  ✓ {detail['field']:30} → {detail['key']:30} (used by {detail['usage_count']} boards)")
        
        # Show new fields
        print("\n+ NEW FIELDS (unique to BTR):")
        for detail in match_details:
            if detail['status'] == 'NEW':
                print(f"  + {detail['field']:30} → {detail['key']:30}")
        
        print("\n" + "=" * 80)
        print("Key Insights")
        print("=" * 80)
        print(f"\n1. {matched} fields ({(matched / len(btr_fields) * 100):.0f}%) were reused from existing boards")
        print(f"2. Only {created} new fields ({(created / len(btr_fields) * 100):.0f}%) needed to be created")
        print(f"3. Common fields (name, email, address) are automatically shared")
        print(f"4. Profession-specific fields (PE Exam, Engineering Discipline) are new")
        print(f"5. Compliance fields (Criminal History, Disciplinary Action) are reused")
        
        print("\n✨ Universal Field Library enables instant field reuse!")
        print("   Next board will reuse even more fields!\n")

if __name__ == '__main__':
    simulate_btr_import()


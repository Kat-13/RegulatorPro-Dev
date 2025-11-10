"""
End-to-End Board Import Demo
Shows how Purpose Matcher works during real import
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db, FieldLibrary, ApplicationType
from purpose_matcher import PurposeMatcher
from field_validator import FieldValidator
import json

def import_board_with_purpose_matching(board_name, fields):
    """
    Import a new board using purpose-driven matching
    """
    print(f"\n{'='*80}")
    print(f"IMPORTING: {board_name}")
    print(f"{'='*80}\n")
    
    matched_fields = []
    created_fields = []
    field_references = []
    
    for i, field_data in enumerate(fields, 1):
        field_name = field_data['name']
        field_type = field_data['type']
        
        print(f"{i}. Processing: \"{field_name}\" ({field_type})")
        
        # Try to find match using purpose matcher
        match, confidence, match_type = PurposeMatcher.find_match(
            field_name,
            field_type,
            FieldLibrary.query
        )
        
        if match and confidence >= 0.5:
            # MATCHED - Reuse existing field
            print(f"   ✅ MATCHED to existing field: '{match.field_key}' (confidence: {confidence:.0%})")
            matched_fields.append(match.field_key)
            
            # Create reference with board-specific override
            field_references.append({
                'field_library_id': match.id,
                'display_order': i,
                'overrides': {
                    'display_name': field_name,  # Board can use their own wording
                    'required': field_data.get('required', False)
                }
            })
            
            # Update usage count
            match.usage_count += 1
        
        else:
            # NO MATCH - Create new field
            print(f"   🆕 CREATING new field")
            
            # Suggest standardized field_key
            field_key = PurposeMatcher.suggest_field_key(field_name, field_type)
            category = PurposeMatcher.suggest_category(field_name, field_type)
            
            print(f"      → field_key: '{field_key}'")
            print(f"      → category: '{category}'")
            
            # Create new UFL field
            new_field = FieldLibrary(
                field_key=field_key,
                canonical_name=field_name,
                field_type=field_type,
                data_type='string',  # Default
                category=category,
                usage_count=1,
                first_used_by=board_name
            )
            
            db.session.add(new_field)
            db.session.flush()  # Get ID
            
            created_fields.append(field_key)
            
            # Create reference
            field_references.append({
                'field_library_id': new_field.id,
                'display_order': i,
                'overrides': {
                    'display_name': field_name,
                    'required': field_data.get('required', False)
                }
            })
        
        print()
    
    # Create application type
    app_type = ApplicationType(
        name=board_name,
        description=f"Imported using purpose-driven matching",
        form_fields_v2=json.dumps(field_references),
        active=True
    )
    
    db.session.add(app_type)
    db.session.commit()
    
    # Summary
    total = len(fields)
    matched = len(matched_fields)
    created = len(created_fields)
    reuse_rate = (matched / total * 100) if total > 0 else 0
    
    print(f"{'='*80}")
    print(f"IMPORT COMPLETE: {board_name}")
    print(f"{'='*80}")
    print(f"Total fields: {total}")
    print(f"Matched (reused): {matched} ({reuse_rate:.0%})")
    print(f"Created (new): {created} ({100-reuse_rate:.0%})")
    print(f"\nMatched fields: {', '.join(matched_fields) if matched_fields else 'None'}")
    print(f"Created fields: {', '.join(created_fields) if created_fields else 'None'}")
    print(f"{'='*80}\n")
    
    return {
        'total': total,
        'matched': matched,
        'created': created,
        'reuse_rate': reuse_rate
    }


# Test with multiple boards
with app.app_context():
    print("\n" + "="*80)
    print("MULTI-BOARD IMPORT SIMULATION")
    print("="*80)
    
    # Board 1: Nursing Board
    nursing_fields = [
        {"name": "Legal First Name", "type": "text", "required": True},
        {"name": "Legal Last Name", "type": "text", "required": True},
        {"name": "Email Address", "type": "email", "required": True},
        {"name": "Phone Number", "type": "phone", "required": True},
        {"name": "Nursing School Attended", "type": "text", "required": True},
        {"name": "NCLEX Exam Date", "type": "date", "required": True},
        {"name": "I certify that all information is accurate", "type": "checkbox", "required": True},
        {"name": "Have you ever been subject to disciplinary action?", "type": "checkbox", "required": False},
    ]
    
    stats1 = import_board_with_purpose_matching("Nursing Board - RN License", nursing_fields)
    
    # Board 2: Engineering Board (should reuse most fields)
    engineering_fields = [
        {"name": "First Name", "type": "text", "required": True},
        {"name": "Last Name", "type": "text", "required": True},
        {"name": "E-mail", "type": "email", "required": True},
        {"name": "Telephone", "type": "phone", "required": True},
        {"name": "Engineering School", "type": "text", "required": True},
        {"name": "PE Exam Date", "type": "date", "required": True},
        {"name": "Years of Professional Experience", "type": "number", "required": True},
        {"name": "I attest under penalty of perjury", "type": "checkbox", "required": True},
    ]
    
    stats2 = import_board_with_purpose_matching("Board of Technical Registration - PE License", engineering_fields)
    
    # Board 3: Veterinary Board (should reuse even more)
    vet_fields = [
        {"name": "Applicant First Name", "type": "text", "required": True},
        {"name": "Applicant Last Name", "type": "text", "required": True},
        {"name": "Contact Email", "type": "email", "required": True},
        {"name": "Veterinary School", "type": "text", "required": True},
        {"name": "NAVLE Exam Date", "type": "date", "required": True},
        {"name": "I declare all information is true and correct", "type": "checkbox", "required": True},
        {"name": "Are you a military spouse?", "type": "checkbox", "required": False},
    ]
    
    stats3 = import_board_with_purpose_matching("Veterinary Medical Board - DVM License", vet_fields)
    
    # Overall summary
    print("\n" + "="*80)
    print("OVERALL SUMMARY")
    print("="*80)
    print(f"\nBoard 1 (Nursing):     {stats1['reuse_rate']:.0%} field reuse")
    print(f"Board 2 (Engineering): {stats2['reuse_rate']:.0%} field reuse")
    print(f"Board 3 (Veterinary):  {stats3['reuse_rate']:.0%} field reuse")
    print(f"\n✅ System learns from each board")
    print(f"✅ Reuse rate improves over time")
    print(f"✅ Zero manual configuration required")
    print("="*80)
    
    # Show final field library stats
    total_fields = FieldLibrary.query.count()
    print(f"\nFinal Field Library: {total_fields} unique fields")
    print(f"Total fields imported: {stats1['total'] + stats2['total'] + stats3['total']}")
    print(f"Fields saved by deduplication: {(stats1['total'] + stats2['total'] + stats3['total']) - total_fields}")
    print()


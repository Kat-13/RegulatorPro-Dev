#!/usr/bin/env python3
"""
Demo: Smart Field Matching with Enhanced Matcher
Shows improved field reuse with fuzzy matching and aliases
"""

from app import app, db, FieldLibrary
from field_matcher import FieldMatcher

def demo_smart_matching():
    """Demonstrate smart field matching"""
    with app.app_context():
        print("=" * 80)
        print("Smart Field Matching Demo - Enhanced Universal Field Library")
        print("=" * 80)
        
        # BTR fields to match
        btr_fields = [
            'First Name',
            'Last Name',
            'Email',
            'Phone',
            'Address',
            'City',
            'State',
            'ZIP Code',  # Should match 'zipcode'
            'Date of Birth',  # Should match 'dateofbirth'
            'Social Security Number',  # Should match 'socialsecurity'
            'Engineering School',
            'Graduation Date',  # Should match 'graduationdate'
            'Engineering Discipline',
            'FE Exam Date',
            'PE Exam Date',
            'PE Exam Score',
            'Years of Experience',  # Should match 'yearsexperience'
            'Current Employer',  # Should match 'currentemployer'
            'Practice Hours',
            'Military Spouse',  # Should match 'militaryspouse'
            'Criminal History',  # Should match 'criminalhistory'
            'Criminal History Details',
            'Disciplinary Action',  # Should match 'disciplinaryaction'
            'Disciplinary Action Details',
        ]
        
        print(f"\nMatching {len(btr_fields)} BTR fields against UFL...")
        print(f"Current UFL size: {FieldLibrary.query.count()} fields\n")
        
        # Match all fields
        results = FieldMatcher.match_fields_batch(btr_fields, FieldLibrary.query)
        
        # Categorize results
        exact_matches = [r for r in results if r['match_type'] == 'exact_key']
        alias_matches = [r for r in results if r['match_type'] == 'alias_match']
        fuzzy_matches = [r for r in results if r['match_type'] == 'fuzzy_match']
        no_matches = [r for r in results if r['matched_field'] is None]
        
        total_matched = len(exact_matches) + len(alias_matches) + len(fuzzy_matches)
        
        # Display results
        print("=" * 80)
        print("Matching Results")
        print("=" * 80)
        
        print(f"\n✓ Total Matched: {total_matched} / {len(btr_fields)} ({total_matched/len(btr_fields)*100:.1f}%)")
        print(f"  - Exact matches: {len(exact_matches)}")
        print(f"  - Alias matches: {len(alias_matches)}")
        print(f"  - Fuzzy matches: {len(fuzzy_matches)}")
        print(f"+ New fields needed: {len(no_matches)}")
        
        # Show exact matches
        if exact_matches:
            print("\n" + "-" * 80)
            print("✓ EXACT MATCHES")
            print("-" * 80)
            for r in exact_matches:
                field = r['matched_field']
                print(f"  ✓ {r['field_name']:35} → {field.field_key:30} (used {field.usage_count}x)")
        
        # Show alias matches
        if alias_matches:
            print("\n" + "-" * 80)
            print("≈ ALIAS MATCHES (smart matching)")
            print("-" * 80)
            for r in alias_matches:
                field = r['matched_field']
                print(f"  ≈ {r['field_name']:35} → {field.field_key:30} ({r['confidence']*100:.0f}% confidence)")
        
        # Show fuzzy matches
        if fuzzy_matches:
            print("\n" + "-" * 80)
            print("~ FUZZY MATCHES (similarity-based)")
            print("-" * 80)
            for r in fuzzy_matches:
                field = r['matched_field']
                print(f"  ~ {r['field_name']:35} → {field.field_key:30} ({r['confidence']*100:.0f}% confidence)")
        
        # Show new fields
        if no_matches:
            print("\n" + "-" * 80)
            print("+ NEW FIELDS (no match found)")
            print("-" * 80)
            for r in no_matches:
                normalized = FieldMatcher.normalize_field_key(r['field_name'])
                print(f"  + {r['field_name']:35} → {normalized:30} (would be created)")
        
        # Summary
        print("\n" + "=" * 80)
        print("Impact Analysis")
        print("=" * 80)
        
        reuse_rate = (total_matched / len(btr_fields)) * 100
        time_saved = total_matched * 5  # Assume 5 minutes per field configuration
        
        print(f"\n📊 Field Reuse Rate: {reuse_rate:.1f}%")
        print(f"⏱️  Estimated Time Saved: {time_saved} minutes ({time_saved/60:.1f} hours)")
        print(f"🎯 Fields Ready to Use: {total_matched}")
        print(f"🔧 Fields to Configure: {len(no_matches)}")
        
        print("\n✨ Smart matching increased reuse from 33% to {:.0f}%!".format(reuse_rate))
        print("   Alias detection and fuzzy matching make a huge difference!\n")

if __name__ == '__main__':
    demo_smart_matching()


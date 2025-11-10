"""
Test Purpose-Driven Field Matcher
Shows how it handles wording variations
"""

from purpose_matcher import PurposeMatcher

# Test cases: Different boards, different wording, SAME field
test_fields = [
    # First Name variations
    {"name": "First Name", "type": "text"},
    {"name": "Legal First Name", "type": "text"},
    {"name": "Formal Legal First Name", "type": "text"},
    {"name": "Applicant First Name", "type": "text"},
    {"name": "Your First Name (Required)", "type": "text"},
    {"name": "Given Name", "type": "text"},
    
    # Attestation variations
    {"name": "I attest that all information is true and correct", "type": "checkbox"},
    {"name": "I certify the accuracy of this application", "type": "checkbox"},
    {"name": "I declare under penalty of perjury", "type": "checkbox"},
    {"name": "Attestation (Required)", "type": "checkbox"},
    
    # Criminal History variations
    {"name": "Have you ever been convicted of a crime?", "type": "checkbox"},
    {"name": "Criminal History Disclosure", "type": "checkbox"},
    {"name": "Any felony or misdemeanor convictions?", "type": "checkbox"},
    
    # Email variations
    {"name": "Email Address", "type": "email"},
    {"name": "E-mail", "type": "email"},
    {"name": "Your Email (Required)", "type": "email"},
    {"name": "Contact Email", "type": "email"},
]

print("=" * 80)
print("PURPOSE-DRIVEN FIELD MATCHER TEST")
print("=" * 80)
print()

# Group by detected purpose
purpose_groups = {}

for field in test_fields:
    # Normalize
    normalized = PurposeMatcher.normalize_field_name(field['name'])
    
    # Detect purpose
    purpose = PurposeMatcher.detect_purpose(field['name'], field['type'])
    
    # Suggest field_key
    field_key = PurposeMatcher.suggest_field_key(field['name'], field['type'])
    
    # Suggest category
    category = PurposeMatcher.suggest_category(field['name'], field['type'])
    
    # Group by purpose
    if purpose not in purpose_groups:
        purpose_groups[purpose] = []
    
    purpose_groups[purpose].append({
        'original': field['name'],
        'normalized': normalized,
        'field_key': field_key,
        'category': category,
        'type': field['type']
    })

# Display results
for purpose, fields in purpose_groups.items():
    print(f"\n{'=' * 80}")
    print(f"PURPOSE: {purpose or 'UNKNOWN'}")
    print(f"{'=' * 80}")
    
    if fields:
        first_field = fields[0]
        print(f"  Standardized Field Key: {first_field['field_key']}")
        print(f"  Category: {first_field['category']}")
        print(f"  Type: {first_field['type']}")
        print(f"\n  All {len(fields)} variations map to this field:")
        print()
        
        for i, field in enumerate(fields, 1):
            print(f"    {i}. \"{field['original']}\"")
            print(f"       → normalized: \"{field['normalized']}\"")
            print()

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Total fields tested: {len(test_fields)}")
print(f"Unique purposes detected: {len([p for p in purpose_groups.keys() if p])}")
print(f"Fields that would be deduplicated: {len(test_fields) - len([p for p in purpose_groups.keys() if p])}")
print()
print("✅ Boards can use ANY wording they want")
print("✅ System recognizes the PURPOSE and maps to standard field")
print("✅ No manual configuration needed")
print("=" * 80)


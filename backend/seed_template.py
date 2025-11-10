#!/usr/bin/env python3.11
"""
Seed script to populate database with a generic professional license application template
"""

import sys
import os
import json
from datetime import datetime

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, ApplicationType

def seed_template():
    """Create a generic professional license application template"""
    
    with app.app_context():
        # Check if template already exists
        existing = ApplicationType.query.filter_by(name="Professional License Application").first()
        if existing:
            print("✓ Template already exists, skipping...")
            return
        
        # Create form elements using Field Library references
        form_elements = [
            {
                "id": "section_header_personal",
                "type": "section_header",
                "content": "Personal Information",
                "order": 0
            },
            {
                "id": "firstname",
                "type": "field",
                "field_library_id": 1,  # First Name from Field Library
                "display_name": "First Name",
                "canonical_name": "firstname",
                "required": True,
                "order": 1
            },
            {
                "id": "lastname",
                "type": "field",
                "field_library_id": 2,  # Last Name from Field Library
                "display_name": "Last Name",
                "canonical_name": "lastname",
                "required": True,
                "order": 2
            },
            {
                "id": "email",
                "type": "field",
                "field_library_id": 5,  # Email from Field Library
                "display_name": "Email Address",
                "canonical_name": "email",
                "required": True,
                "order": 3
            },
            {
                "id": "phone",
                "type": "field",
                "field_library_id": 6,  # Phone from Field Library
                "display_name": "Phone Number",
                "canonical_name": "phone",
                "required": True,
                "order": 4
            },
            {
                "id": "dateofbirth",
                "type": "field",
                "field_library_id": 3,  # Date of Birth from Field Library
                "display_name": "Date of Birth",
                "canonical_name": "dateofbirth",
                "required": True,
                "order": 5
            },
            {
                "id": "section_header_address",
                "type": "section_header",
                "content": "Mailing Address",
                "order": 6
            },
            {
                "id": "address",
                "type": "field",
                "field_library_id": 7,  # Address from Field Library
                "display_name": "Street Address",
                "canonical_name": "address",
                "required": True,
                "order": 7
            },
            {
                "id": "city",
                "type": "field",
                "field_library_id": 8,  # City from Field Library
                "display_name": "City",
                "canonical_name": "city",
                "required": True,
                "order": 8
            },
            {
                "id": "state",
                "type": "field",
                "field_library_id": 9,  # State from Field Library
                "display_name": "State",
                "canonical_name": "state",
                "required": True,
                "order": 9
            },
            {
                "id": "zipcode",
                "type": "field",
                "field_library_id": 10,  # ZIP Code from Field Library
                "display_name": "ZIP Code",
                "canonical_name": "zipcode",
                "required": True,
                "order": 10
            },
            {
                "id": "section_header_license",
                "type": "section_header",
                "content": "License Information",
                "order": 11
            },
            {
                "id": "application_type",
                "type": "field",
                "field_type": "select",
                "display_name": "Application Type",
                "canonical_name": "application_type",
                "required": True,
                "options": [
                    {"value": "new", "label": "New Application"},
                    {"value": "renewal", "label": "License Renewal"},
                    {"value": "reinstatement", "label": "Reinstatement"}
                ],
                "order": 12
            },
            {
                "id": "previous_license_number",
                "type": "field",
                "field_type": "text",
                "display_name": "Previous License Number",
                "canonical_name": "previous_license_number",
                "required": False,
                "help_text": "If renewing or reinstating, enter your previous license number",
                "order": 13
            },
            {
                "id": "section_header_education",
                "type": "section_header",
                "content": "Education & Credentials",
                "order": 14
            },
            {
                "id": "highest_degree",
                "type": "field",
                "field_type": "select",
                "display_name": "Highest Degree Earned",
                "canonical_name": "highest_degree",
                "required": True,
                "options": [
                    {"value": "high_school", "label": "High School Diploma/GED"},
                    {"value": "associate", "label": "Associate's Degree"},
                    {"value": "bachelor", "label": "Bachelor's Degree"},
                    {"value": "master", "label": "Master's Degree"},
                    {"value": "doctorate", "label": "Doctorate/PhD"},
                    {"value": "professional", "label": "Professional Degree (MD, JD, etc.)"}
                ],
                "order": 15
            },
            {
                "id": "institution_name",
                "type": "field",
                "field_type": "text",
                "display_name": "Institution Name",
                "canonical_name": "institution_name",
                "required": True,
                "order": 16
            },
            {
                "id": "graduation_year",
                "type": "field",
                "field_type": "number",
                "display_name": "Graduation Year",
                "canonical_name": "graduation_year",
                "required": True,
                "order": 17
            },
            {
                "id": "section_header_documents",
                "type": "section_header",
                "content": "Required Documents",
                "order": 18
            },
            {
                "id": "instruction_documents",
                "type": "instruction_block",
                "content": "Please upload the following required documents. All documents must be in PDF format and under 10MB.",
                "order": 19
            },
            {
                "id": "doc_id_verification",
                "type": "document_upload",
                "display_name": "Government-Issued ID",
                "canonical_name": "doc_id_verification",
                "required": True,
                "accepted_formats": [".pdf", ".jpg", ".png"],
                "max_size_mb": 10,
                "order": 20
            },
            {
                "id": "doc_diploma",
                "type": "document_upload",
                "display_name": "Diploma or Degree Certificate",
                "canonical_name": "doc_diploma",
                "required": True,
                "accepted_formats": [".pdf"],
                "max_size_mb": 10,
                "order": 21
            },
            {
                "id": "section_header_attestation",
                "type": "section_header",
                "content": "Attestation",
                "order": 22
            },
            {
                "id": "attestation",
                "type": "attestation_block",
                "content": "I hereby certify that all information provided in this application is true and correct to the best of my knowledge. I understand that any false statements may result in denial or revocation of my license.",
                "required": True,
                "order": 23
            },
            {
                "id": "fee_display",
                "type": "fee_display",
                "content": "Application Fee",
                "order": 24
            }
        ]
        
        # Create conditional rules
        conditional_rules = [
            {
                "id": "rule_1",
                "trigger": {
                    "field": "application_type",
                    "condition": "equals",
                    "value": "renewal"
                },
                "actions": [
                    {
                        "type": "show_field",
                        "target_field": "previous_license_number"
                    },
                    {
                        "type": "set_required",
                        "target_field": "previous_license_number"
                    }
                ]
            },
            {
                "id": "rule_2",
                "trigger": {
                    "field": "application_type",
                    "condition": "equals",
                    "value": "reinstatement"
                },
                "actions": [
                    {
                        "type": "show_field",
                        "target_field": "previous_license_number"
                    },
                    {
                        "type": "set_required",
                        "target_field": "previous_license_number"
                    },
                    {
                        "type": "fee_modifier",
                        "fee_modifier": {
                            "type": "surcharge",
                            "amount": 50,
                            "unit": "dollars"
                        }
                    }
                ]
            },
            {
                "id": "rule_3",
                "trigger": {
                    "field": "application_type",
                    "condition": "equals",
                    "value": "new"
                },
                "actions": [
                    {
                        "type": "hide_field",
                        "target_field": "previous_license_number"
                    }
                ]
            }
        ]
        
        # Create validation rules
        validation_rules = {
            "firstname": {
                "required": True,
                "min_length": 2,
                "max_length": 50
            },
            "lastname": {
                "required": True,
                "min_length": 2,
                "max_length": 50
            },
            "email": {
                "required": True,
                "format": "email"
            },
            "phone": {
                "required": True,
                "format": "phone"
            },
            "zipcode": {
                "required": True,
                "format": "zip_code"
            },
            "graduation_year": {
                "required": True,
                "min_value": 1950,
                "max_value": 2025
            }
        }
        
        # Create the application type
        template = ApplicationType(
            name="Professional License Application",
            description="Generic professional license application template suitable for any regulatory board. Includes personal information, education credentials, document uploads, and conditional logic for renewals.",
            duration="Annual",
            renewal_period="12 months",
            license_number_format="PL-XXXXXX",
            source_document="Generic Template",
            parser_version="1.0",
            form_fields_v2=json.dumps(form_elements),
            conditional_rules=json.dumps(conditional_rules),
            validation_rules=json.dumps(validation_rules),
            base_fee=150.0,
            late_fee_percentage=10.0,
            renewal_window_days=30,
            expiration_months=12,
            status="published",
            active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(template)
        db.session.commit()
        
        print("✓ Successfully created 'Professional License Application' template")
        print(f"  - ID: {template.id}")
        print(f"  - Status: {template.status}")
        print(f"  - Form Elements: {len(form_elements)}")
        print(f"  - Conditional Rules: {len(conditional_rules)}")
        print(f"  - Base Fee: ${template.base_fee}")

if __name__ == "__main__":
    print("Seeding database with professional license template...")
    seed_template()
    print("\n✓ Database seeding complete!")

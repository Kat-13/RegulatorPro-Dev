#!/usr/bin/env python3.11
"""
Seed base form templates into the database
"""

import sqlite3
import json
from datetime import datetime

DATABASE = 'instance/regulatory_platform.db'

# Define base form templates
TEMPLATES = [
    {
        'name': 'Blank Form',
        'description': 'Start from scratch with no pre-filled fields',
        'template_type': 'blank',
        'fields': [],
        'sections': []
    },
    {
        'name': 'Standard License Application',
        'description': 'Common fields for new license applications',
        'template_type': 'standard_license',
        'fields': [
            # Personal Information Section
            {'name': 'firstName', 'label': 'First Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'middleName', 'label': 'Middle Name', 'type': 'text', 'required': False, 'pii': True, 'section': 'personal'},
            {'name': 'lastName', 'label': 'Last Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'dateOfBirth', 'label': 'Date of Birth', 'type': 'date', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'ssn', 'label': 'Social Security Number (Last 4 digits)', 'type': 'text', 'required': True, 'pii': True, 'hipaa': True, 'section': 'personal'},
            {'name': 'email', 'label': 'Email Address', 'type': 'email', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'phone', 'label': 'Phone Number', 'type': 'tel', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'address', 'label': 'Street Address', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'city', 'label': 'City', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'state', 'label': 'State', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'zipCode', 'label': 'ZIP Code', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            
            # Professional Background Section
            {'name': 'licenseType', 'label': 'License Type', 'type': 'select', 'required': True, 'section': 'professional', 'options': ['Standard', 'Specialty', 'Temporary']},
            {'name': 'education', 'label': 'Highest Level of Education', 'type': 'select', 'required': True, 'section': 'professional'},
            {'name': 'graduationYear', 'label': 'Graduation Year', 'type': 'number', 'required': True, 'section': 'professional'},
            {'name': 'schoolName', 'label': 'School/University Name', 'type': 'text', 'required': True, 'section': 'professional'},
            {'name': 'yearsExperience', 'label': 'Years of Experience', 'type': 'number', 'required': True, 'section': 'professional'},
            {'name': 'currentEmployer', 'label': 'Current Employer', 'type': 'text', 'required': False, 'section': 'professional'},
            
            # Compliance & Declarations Section
            {'name': 'felonyConviction', 'label': 'Have you ever been convicted of a felony?', 'type': 'radio', 'required': True, 'section': 'compliance', 'options': ['Yes', 'No']},
            {'name': 'disciplinaryAction', 'label': 'Have you ever been subject to disciplinary action?', 'type': 'radio', 'required': True, 'section': 'compliance', 'options': ['Yes', 'No']},
            {'name': 'licenseRevoked', 'label': 'Has your license ever been revoked or suspended?', 'type': 'radio', 'required': True, 'section': 'compliance', 'options': ['Yes', 'No']},
            
            # Fee Waivers Section
            {'name': 'militarySpouse', 'label': 'Are you a military spouse?', 'type': 'radio', 'required': False, 'section': 'fees', 'options': ['Yes', 'No']},
            {'name': 'povertyFeeWaiver', 'label': 'Do you qualify for a poverty fee waiver?', 'type': 'radio', 'required': False, 'section': 'fees', 'options': ['Yes', 'No']},
            
            # Application Details Section
            {'name': 'applicationDate', 'label': 'Application Date', 'type': 'date', 'required': True, 'section': 'other'}
        ],
        'sections': [
            {'id': 'personal', 'title': 'Personal Information', 'order': 1},
            {'id': 'professional', 'title': 'Professional Background', 'order': 2},
            {'id': 'compliance', 'title': 'Compliance & Declarations', 'order': 3},
            {'id': 'fees', 'title': 'Fee Waivers', 'order': 4},
            {'id': 'other', 'title': 'Application Details', 'order': 5}
        ]
    },
    {
        'name': 'Renewal Application',
        'description': 'Simplified fields for license renewals',
        'template_type': 'renewal',
        'fields': [
            # Personal Information (minimal)
            {'name': 'firstName', 'label': 'First Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'lastName', 'label': 'Last Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'licenseNumber', 'label': 'Current License Number', 'type': 'text', 'required': True, 'section': 'personal'},
            {'name': 'email', 'label': 'Email Address', 'type': 'email', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'phone', 'label': 'Phone Number', 'type': 'tel', 'required': True, 'pii': True, 'section': 'personal'},
            
            # Address Verification
            {'name': 'addressChanged', 'label': 'Has your address changed?', 'type': 'radio', 'required': True, 'section': 'verification', 'options': ['Yes', 'No']},
            {'name': 'employmentChanged', 'label': 'Has your employment changed?', 'type': 'radio', 'required': True, 'section': 'verification', 'options': ['Yes', 'No']},
            
            # Continuing Education
            {'name': 'continuingEducationHours', 'label': 'Continuing Education Hours Completed', 'type': 'number', 'required': True, 'section': 'education'},
            {'name': 'continuingEducationCertificate', 'label': 'Upload CE Certificate', 'type': 'file', 'required': True, 'section': 'education'},
            
            # Compliance
            {'name': 'newComplaintsOrActions', 'label': 'Have you had any complaints or disciplinary actions since last renewal?', 'type': 'radio', 'required': True, 'section': 'compliance', 'options': ['Yes', 'No']},
            
            # Renewal Date
            {'name': 'renewalDate', 'label': 'Renewal Date', 'type': 'date', 'required': True, 'section': 'other'}
        ],
        'sections': [
            {'id': 'personal', 'title': 'Personal Information', 'order': 1},
            {'id': 'verification', 'title': 'Verify Information', 'order': 2},
            {'id': 'education', 'title': 'Continuing Education', 'order': 3},
            {'id': 'compliance', 'title': 'Compliance', 'order': 4},
            {'id': 'other', 'title': 'Renewal Details', 'order': 5}
        ]
    },
    {
        'name': 'Endorsement Application',
        'description': 'For out-of-state license holders seeking endorsement',
        'template_type': 'endorsement',
        'fields': [
            # Personal Information
            {'name': 'firstName', 'label': 'First Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'lastName', 'label': 'Last Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'email', 'label': 'Email Address', 'type': 'email', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'phone', 'label': 'Phone Number', 'type': 'tel', 'required': True, 'pii': True, 'section': 'personal'},
            
            # Current License Information
            {'name': 'currentState', 'label': 'State of Current License', 'type': 'text', 'required': True, 'section': 'current_license'},
            {'name': 'currentLicenseNumber', 'label': 'Current License Number', 'type': 'text', 'required': True, 'section': 'current_license'},
            {'name': 'currentLicenseIssueDate', 'label': 'Current License Issue Date', 'type': 'date', 'required': True, 'section': 'current_license'},
            {'name': 'currentLicenseExpirationDate', 'label': 'Current License Expiration Date', 'type': 'date', 'required': True, 'section': 'current_license'},
            {'name': 'licenseInGoodStanding', 'label': 'Is your license in good standing?', 'type': 'radio', 'required': True, 'section': 'current_license', 'options': ['Yes', 'No']},
            
            # Verification Documents
            {'name': 'licenseVerificationLetter', 'label': 'Upload License Verification Letter', 'type': 'file', 'required': True, 'section': 'documents'},
            {'name': 'transcripts', 'label': 'Upload Official Transcripts', 'type': 'file', 'required': True, 'section': 'documents'},
            
            # Compliance
            {'name': 'disciplinaryActions', 'label': 'Any disciplinary actions in any state?', 'type': 'radio', 'required': True, 'section': 'compliance', 'options': ['Yes', 'No']},
            
            # Application Date
            {'name': 'applicationDate', 'label': 'Application Date', 'type': 'date', 'required': True, 'section': 'other'}
        ],
        'sections': [
            {'id': 'personal', 'title': 'Personal Information', 'order': 1},
            {'id': 'current_license', 'title': 'Current License Information', 'order': 2},
            {'id': 'documents', 'title': 'Verification Documents', 'order': 3},
            {'id': 'compliance', 'title': 'Compliance', 'order': 4},
            {'id': 'other', 'title': 'Application Details', 'order': 5}
        ]
    },
    {
        'name': 'Temporary License',
        'description': 'Quick approval fields for temporary licenses',
        'template_type': 'temporary',
        'fields': [
            # Personal Information (minimal)
            {'name': 'firstName', 'label': 'First Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'lastName', 'label': 'Last Name', 'type': 'text', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'email', 'label': 'Email Address', 'type': 'email', 'required': True, 'pii': True, 'section': 'personal'},
            {'name': 'phone', 'label': 'Phone Number', 'type': 'tel', 'required': True, 'pii': True, 'section': 'personal'},
            
            # Temporary License Details
            {'name': 'reasonForTemporary', 'label': 'Reason for Temporary License', 'type': 'select', 'required': True, 'section': 'temporary', 'options': ['Pending Exam Results', 'Emergency Situation', 'Temporary Assignment', 'Other']},
            {'name': 'requestedDuration', 'label': 'Requested Duration (months)', 'type': 'number', 'required': True, 'section': 'temporary'},
            {'name': 'supervisingPractitioner', 'label': 'Supervising Practitioner Name', 'type': 'text', 'required': False, 'section': 'temporary'},
            {'name': 'supervisingLicenseNumber', 'label': 'Supervising Practitioner License Number', 'type': 'text', 'required': False, 'section': 'temporary'},
            
            # Supporting Documents
            {'name': 'supportingDocuments', 'label': 'Upload Supporting Documents', 'type': 'file', 'required': True, 'section': 'documents'},
            
            # Application Date
            {'name': 'applicationDate', 'label': 'Application Date', 'type': 'date', 'required': True, 'section': 'other'}
        ],
        'sections': [
            {'id': 'personal', 'title': 'Personal Information', 'order': 1},
            {'id': 'temporary', 'title': 'Temporary License Details', 'order': 2},
            {'id': 'documents', 'title': 'Supporting Documents', 'order': 3},
            {'id': 'other', 'title': 'Application Details', 'order': 4}
        ]
    }
]

def seed_templates():
    """Insert base form templates into database"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("Seeding form templates...")
    
    for template in TEMPLATES:
        # Check if template already exists
        cursor.execute(
            "SELECT id FROM form_templates WHERE template_type = ?",
            (template['template_type'],)
        )
        existing = cursor.fetchone()
        
        if existing:
            print(f"  ⚠️  Template '{template['name']}' already exists, skipping...")
            continue
        
        # Insert template
        cursor.execute("""
            INSERT INTO form_templates (name, description, template_type, fields, sections)
            VALUES (?, ?, ?, ?, ?)
        """, (
            template['name'],
            template['description'],
            template['template_type'],
            json.dumps(template['fields']),
            json.dumps(template['sections'])
        ))
        
        print(f"  ✅ Created template: {template['name']}")
    
    conn.commit()
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM form_templates")
    count = cursor.fetchone()[0]
    print(f"\n✅ Total templates in database: {count}")
    
    conn.close()

if __name__ == '__main__':
    seed_templates()


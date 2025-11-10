"""
Comprehensive Regulated Business License Application Seed
Creates a realistic, complex application form for testing multi-step wizard
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, ApplicationType
import json

def seed_comprehensive_test():
    with app.app_context():
        # Check if already exists
        existing = ApplicationType.query.filter_by(name="Regulated Business License Application").first()
        if existing:
            print(f"Deleting existing application type ID {existing.id}")
            db.session.delete(existing)
            db.session.commit()
        
        # Create comprehensive test application
        app_type = ApplicationType(
            name="Regulated Business License Application",
            description="Comprehensive business license application for regulated industries. Includes business information, ownership details, facility specifications, financial information, compliance documentation, and background checks. Perfect for testing multi-step wizard functionality.",
            status="published",
            base_fee=2500.00,
            late_fee_percentage=15.0
        )
        
        # Form Elements - 50+ fields across 6 logical steps
        form_elements = [
            # ========== STEP 1: BUSINESS INFORMATION ==========
            {
                "id": "section-business-info",
                "type": "section",
                "label": "Step 1: Business Information",
                "description": "Provide basic information about your business entity",
                "required": False,
                "order": 1
            },
            {
                "id": "business-legal-name",
                "type": "text",
                "label": "Legal Business Name",
                "placeholder": "Enter the legal name of your business",
                "required": True,
                "order": 2
            },
            {
                "id": "business-dba",
                "type": "text",
                "label": "Doing Business As (DBA)",
                "placeholder": "Enter DBA name if different from legal name",
                "required": False,
                "order": 3
            },
            {
                "id": "business-entity-type",
                "type": "select",
                "label": "Entity Type",
                "options": ["Sole Proprietorship", "Partnership", "LLC", "Corporation", "Non-Profit"],
                "required": True,
                "order": 4
            },
            {
                "id": "business-ein",
                "type": "text",
                "label": "Federal Employer Identification Number (EIN)",
                "placeholder": "XX-XXXXXXX",
                "required": True,
                "order": 5
            },
            {
                "id": "business-state-tax-id",
                "type": "text",
                "label": "State Tax ID Number",
                "placeholder": "Enter state tax identification number",
                "required": True,
                "order": 6
            },
            {
                "id": "business-formation-date",
                "type": "date",
                "label": "Date of Formation",
                "required": True,
                "order": 7
            },
            {
                "id": "business-formation-state",
                "type": "select",
                "label": "State of Formation",
                "options": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
                "required": True,
                "order": 8
            },
            
            # ========== STEP 2: OWNERSHIP INFORMATION ==========
            {
                "id": "section-ownership",
                "type": "section",
                "label": "Step 2: Ownership & Principal Information",
                "description": "Provide information about all owners and principals with 5% or greater ownership interest",
                "required": False,
                "order": 9
            },
            {
                "id": "owner-count",
                "type": "select",
                "label": "Number of Owners/Principals",
                "options": ["1", "2", "3", "4", "5+"],
                "required": True,
                "order": 10
            },
            {
                "id": "owner1-first-name",
                "type": "text",
                "label": "Owner 1 - First Name",
                "required": True,
                "order": 11
            },
            {
                "id": "owner1-last-name",
                "type": "text",
                "label": "Owner 1 - Last Name",
                "required": True,
                "order": 12
            },
            {
                "id": "owner1-email",
                "type": "email",
                "label": "Owner 1 - Email Address",
                "required": True,
                "order": 13
            },
            {
                "id": "owner1-phone",
                "type": "tel",
                "label": "Owner 1 - Phone Number",
                "placeholder": "(555) 555-5555",
                "required": True,
                "order": 14
            },
            {
                "id": "owner1-ssn",
                "type": "text",
                "label": "Owner 1 - Social Security Number",
                "placeholder": "XXX-XX-XXXX",
                "required": True,
                "order": 15
            },
            {
                "id": "owner1-dob",
                "type": "date",
                "label": "Owner 1 - Date of Birth",
                "required": True,
                "order": 16
            },
            {
                "id": "owner1-ownership-percentage",
                "type": "number",
                "label": "Owner 1 - Ownership Percentage",
                "placeholder": "Enter percentage (0-100)",
                "required": True,
                "order": 17
            },
            {
                "id": "owner1-background-consent",
                "type": "checkbox",
                "label": "Owner 1 - I consent to a background check",
                "required": True,
                "order": 18
            },
            
            # ========== STEP 3: FACILITY & LOCATION ==========
            {
                "id": "section-facility",
                "type": "section",
                "label": "Step 3: Facility & Location Information",
                "description": "Provide details about your business location and facility specifications",
                "required": False,
                "order": 19
            },
            {
                "id": "facility-street-address",
                "type": "text",
                "label": "Facility Street Address",
                "placeholder": "Street address",
                "required": True,
                "order": 20
            },
            {
                "id": "facility-city",
                "type": "text",
                "label": "City",
                "required": True,
                "order": 21
            },
            {
                "id": "facility-state",
                "type": "select",
                "label": "State",
                "options": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
                "required": True,
                "order": 22
            },
            {
                "id": "facility-zip",
                "type": "text",
                "label": "ZIP Code",
                "placeholder": "XXXXX or XXXXX-XXXX",
                "required": True,
                "order": 23
            },
            {
                "id": "facility-type",
                "type": "select",
                "label": "Facility Type",
                "options": ["Retail", "Wholesale", "Manufacturing", "Distribution", "Mixed Use"],
                "required": True,
                "order": 24
            },
            {
                "id": "facility-square-footage",
                "type": "number",
                "label": "Total Square Footage",
                "placeholder": "Enter total square footage",
                "required": True,
                "order": 25
            },
            {
                "id": "facility-owned-leased",
                "type": "select",
                "label": "Property Ownership Status",
                "options": ["Owned", "Leased"],
                "required": True,
                "order": 26
            },
            {
                "id": "facility-lease-expiration",
                "type": "date",
                "label": "Lease Expiration Date (if leased)",
                "required": False,
                "order": 27
            },
            {
                "id": "facility-security-measures",
                "type": "textarea",
                "label": "Security Measures",
                "placeholder": "Describe security systems, cameras, access controls, etc.",
                "required": True,
                "order": 28
            },
            {
                "id": "facility-distance-compliance",
                "type": "checkbox",
                "label": "I certify that this facility is at least 1,000 feet from schools, churches, and daycare centers",
                "required": True,
                "order": 29
            },
            
            # ========== STEP 4: FINANCIAL INFORMATION ==========
            {
                "id": "section-financial",
                "type": "section",
                "label": "Step 4: Financial Information",
                "description": "Provide financial details and banking information",
                "required": False,
                "order": 30
            },
            {
                "id": "bank-name",
                "type": "text",
                "label": "Bank Name",
                "required": True,
                "order": 31
            },
            {
                "id": "bank-account-number",
                "type": "text",
                "label": "Account Number",
                "placeholder": "Enter bank account number",
                "required": True,
                "order": 32
            },
            {
                "id": "bank-routing-number",
                "type": "text",
                "label": "Routing Number",
                "placeholder": "9-digit routing number",
                "required": True,
                "order": 33
            },
            {
                "id": "initial-capitalization",
                "type": "number",
                "label": "Initial Capitalization Amount",
                "placeholder": "Enter amount in USD",
                "required": True,
                "order": 34
            },
            {
                "id": "funding-source",
                "type": "select",
                "label": "Primary Funding Source",
                "options": ["Personal Savings", "Bank Loan", "Investor Funding", "Business Loan", "Other"],
                "required": True,
                "order": 35
            },
            {
                "id": "financial-statements",
                "type": "file",
                "label": "Financial Statements (Last 2 Years)",
                "accept": ".pdf,.xlsx,.xls",
                "required": True,
                "order": 36
            },
            {
                "id": "bank-statements",
                "type": "file",
                "label": "Bank Statements (Last 3 Months)",
                "accept": ".pdf",
                "required": True,
                "order": 37
            },
            
            # ========== STEP 5: COMPLIANCE & DOCUMENTATION ==========
            {
                "id": "section-compliance",
                "type": "section",
                "label": "Step 5: Compliance & Documentation",
                "description": "Upload required compliance documents and operating procedures",
                "required": False,
                "order": 38
            },
            {
                "id": "business-plan",
                "type": "file",
                "label": "Business Plan",
                "accept": ".pdf,.doc,.docx",
                "required": True,
                "order": 39
            },
            {
                "id": "operating-procedures",
                "type": "file",
                "label": "Standard Operating Procedures (SOPs)",
                "accept": ".pdf,.doc,.docx",
                "required": True,
                "order": 40
            },
            {
                "id": "security-plan",
                "type": "file",
                "label": "Security Plan",
                "accept": ".pdf,.doc,.docx",
                "required": True,
                "order": 41
            },
            {
                "id": "insurance-certificate",
                "type": "file",
                "label": "Certificate of Insurance",
                "accept": ".pdf",
                "required": True,
                "order": 42
            },
            {
                "id": "zoning-approval",
                "type": "file",
                "label": "Zoning Approval Letter",
                "accept": ".pdf",
                "required": True,
                "order": 43
            },
            {
                "id": "fire-inspection",
                "type": "file",
                "label": "Fire Safety Inspection Certificate",
                "accept": ".pdf",
                "required": True,
                "order": 44
            },
            
            # ========== STEP 6: BACKGROUND & ATTESTATIONS ==========
            {
                "id": "section-background",
                "type": "section",
                "label": "Step 6: Background Information & Attestations",
                "description": "Answer background questions and provide required attestations",
                "required": False,
                "order": 45
            },
            {
                "id": "criminal-history",
                "type": "select",
                "label": "Have you or any owner/principal been convicted of a felony in the past 10 years?",
                "options": ["No", "Yes"],
                "required": True,
                "order": 46
            },
            {
                "id": "criminal-history-details",
                "type": "textarea",
                "label": "If yes, provide details",
                "placeholder": "Describe the conviction, date, and disposition",
                "required": False,
                "order": 47
            },
            {
                "id": "regulatory-violations",
                "type": "select",
                "label": "Have you or any owner/principal had a professional license revoked or suspended?",
                "options": ["No", "Yes"],
                "required": True,
                "order": 48
            },
            {
                "id": "regulatory-violations-details",
                "type": "textarea",
                "label": "If yes, provide details",
                "placeholder": "Describe the violation, date, and resolution",
                "required": False,
                "order": 49
            },
            {
                "id": "attestation-truthfulness",
                "type": "checkbox",
                "label": "I attest that all information provided in this application is true and accurate to the best of my knowledge",
                "required": True,
                "order": 50
            },
            {
                "id": "attestation-compliance",
                "type": "checkbox",
                "label": "I agree to comply with all applicable federal, state, and local laws and regulations",
                "required": True,
                "order": 51
            },
            {
                "id": "attestation-inspection",
                "type": "checkbox",
                "label": "I consent to inspections of the facility by regulatory authorities at any time",
                "required": True,
                "order": 52
            },
            {
                "id": "applicant-signature",
                "type": "text",
                "label": "Applicant Signature (Type Full Name)",
                "placeholder": "Type your full legal name",
                "required": True,
                "order": 53
            },
            {
                "id": "signature-date",
                "type": "date",
                "label": "Date",
                "required": True,
                "order": 54
            }
        ]
        
        # Conditional Logic Rules
        conditional_rules = [
            {
                "id": "rule-lease-expiration",
                "condition": {
                    "field": "facility-owned-leased",
                    "operator": "equals",
                    "value": "Leased"
                },
                "action": {
                    "type": "show",
                    "target": "facility-lease-expiration"
                }
            },
            {
                "id": "rule-criminal-details",
                "condition": {
                    "field": "criminal-history",
                    "operator": "equals",
                    "value": "Yes"
                },
                "action": {
                    "type": "show",
                    "target": "criminal-history-details"
                }
            },
            {
                "id": "rule-regulatory-details",
                "condition": {
                    "field": "regulatory-violations",
                    "operator": "equals",
                    "value": "Yes"
                },
                "action": {
                    "type": "show",
                    "target": "regulatory-violations-details"
                }
            }
        ]
        
        # Validation Rules
        validation_rules = [
            {
                "fieldId": "business-ein",
                "rules": [
                    {"type": "pattern", "value": "^\\d{2}-\\d{7}$", "message": "EIN must be in format XX-XXXXXXX"}
                ]
            },
            {
                "fieldId": "owner1-email",
                "rules": [
                    {"type": "email", "message": "Please enter a valid email address"}
                ]
            },
            {
                "fieldId": "owner1-phone",
                "rules": [
                    {"type": "phone", "message": "Please enter a valid phone number"}
                ]
            },
            {
                "fieldId": "owner1-ssn",
                "rules": [
                    {"type": "pattern", "value": "^\\d{3}-\\d{2}-\\d{4}$", "message": "SSN must be in format XXX-XX-XXXX"}
                ]
            },
            {
                "fieldId": "facility-zip",
                "rules": [
                    {"type": "zipCode", "message": "Please enter a valid ZIP code"}
                ]
            },
            {
                "fieldId": "bank-routing-number",
                "rules": [
                    {"type": "minLength", "value": 9, "message": "Routing number must be 9 digits"},
                    {"type": "maxLength", "value": 9, "message": "Routing number must be 9 digits"}
                ]
            }
        ]
        
        app_type.form_definition = json.dumps({"elements": form_elements})
        app_type.conditional_rules = json.dumps(conditional_rules)
        app_type.validation_rules = json.dumps(validation_rules)
        
        db.session.add(app_type)
        db.session.commit()
        
        print(f"✅ Created comprehensive test application: ID {app_type.id}")
        print(f"   - 54 form elements across 6 logical steps")
        print(f"   - 3 conditional logic rules")
        print(f"   - 6 validation rules")
        print(f"   - Base fee: ${app_type.base_fee}")
        print(f"   - Status: {app_type.status}")

if __name__ == '__main__':
    seed_comprehensive_test()

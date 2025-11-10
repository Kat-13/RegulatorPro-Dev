"""
Intelligent Step Auto-Configurator
Automatically generates multi-step wizard configuration based on field analysis
"""

import json
import re
from typing import List, Dict, Any, Tuple

class StepAutoConfigurator:
    """
    Analyzes form fields and automatically generates optimal multi-step wizard configuration
    Based on standard regulatory application patterns (OMMA-inspired, domain-neutral)
    """
    
    # Standard section definitions with field patterns
    STANDARD_SECTIONS = [
        {
            'id': 1,
            'name': 'Applicant Information',
            'description': 'Basic information about the applicant',
            'patterns': [
                'first_name', 'last_name', 'middle_name', 'suffix', 'prefix',
                'full_name', 'legal_name', 'name',
                'date_of_birth', 'dob', 'birth_date', 'age',
                'ssn', 'social_security', 'tax_id', 'ein',
                'gender', 'sex', 'race', 'ethnicity'
            ],
            'field_types': ['text', 'date', 'select', 'radio'],
            'required': True,
            'estimated_minutes': 3
        },
        {
            'id': 2,
            'name': 'Contact Information',
            'description': 'How we can reach you',
            'patterns': [
                'email', 'phone', 'mobile', 'telephone', 'fax',
                'address', 'street', 'city', 'state', 'zip', 'postal',
                'country', 'county', 'province',
                'mailing', 'physical', 'residence', 'home_address'
            ],
            'field_types': ['email', 'tel', 'text'],
            'required': True,
            'estimated_minutes': 2
        },
        {
            'id': 3,
            'name': 'Business Details',
            'description': 'Information about your business',
            'patterns': [
                'business_name', 'company', 'organization', 'entity',
                'business_type', 'entity_type', 'structure',
                'business_address', 'business_phone', 'business_email',
                'dba', 'doing_business_as', 'trade_name',
                'incorporation', 'formation', 'established',
                'employee', 'staff', 'owner', 'partner'
            ],
            'field_types': ['text', 'select', 'date'],
            'required': False,  # Only if business license
            'estimated_minutes': 4
        },
        {
            'id': 4,
            'name': 'Qualifications & Credentials',
            'description': 'Your professional background',
            'patterns': [
                'license', 'certification', 'credential', 'qualification',
                'education', 'degree', 'school', 'university', 'training',
                'experience', 'years', 'employment', 'work_history',
                'professional', 'specialty', 'practice', 'field_of_study'
            ],
            'field_types': ['text', 'select', 'number', 'date'],
            'required': False,  # Only if professional license
            'estimated_minutes': 5
        },
        {
            'id': 5,
            'name': 'Supporting Documents',
            'description': 'Upload required documentation',
            'patterns': [
                'document', 'upload', 'file', 'attachment',
                'proof', 'certificate', 'transcript', 'diploma',
                'identification', 'id', 'passport', 'driver',
                'photo', 'image', 'picture'
            ],
            'field_types': ['file', 'document_upload'],
            'element_types': ['document_upload'],
            'required': True,
            'estimated_minutes': 5
        },
        {
            'id': 6,
            'name': 'Attestation & Declarations',
            'description': 'Certify the accuracy of your information',
            'patterns': [
                'attestation', 'declaration', 'certify', 'affirm',
                'signature', 'sign', 'acknowledge',
                'agree', 'consent', 'authorize',
                'terms', 'conditions', 'policy'
            ],
            'field_types': ['checkbox'],
            'element_types': ['attestation_block', 'signature_block'],
            'required': True,
            'estimated_minutes': 2
        }
    ]
    
    @classmethod
    def analyze_fields(cls, fields: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze form fields and generate optimal multi-step wizard configuration
        
        Args:
            fields: List of field dictionaries with keys: id, name, label, type, field_key
            
        Returns:
            Dictionary with 'enabled' and 'steps' keys
        """
        if not fields or len(fields) == 0:
            return {'enabled': False, 'steps': []}
        
        # Categorize fields into sections
        section_assignments = cls._categorize_fields(fields)
        
        # Generate steps from sections that have fields
        steps = cls._generate_steps(section_assignments)
        
        # Always add Review & Submit as second-to-last step
        steps.append({
            'id': len(steps) + 1,
            'name': 'Review & Submit',
            'description': 'Review your application before submitting',
            'field_keys': [],
            'required': True,
            'estimated_minutes': 2
        })
        
        # Always add Payment as final step
        steps.append({
            'id': len(steps) + 1,
            'name': 'Payment',
            'description': 'Complete payment for your application',
            'field_keys': [],
            'required': True,
            'estimated_minutes': 3
        })
        
        return {
            'enabled': True,
            'steps': steps
        }
    
    @classmethod
    def _categorize_fields(cls, fields: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Categorize fields into standard sections based on pattern matching
        
        Returns:
            Dictionary mapping section_id to list of fields
        """
        section_assignments = {section['id']: [] for section in cls.STANDARD_SECTIONS}
        
        for field in fields:
            # Get field identifiers
            field_key = field.get('field_key', '').lower()
            field_name = field.get('name', '').lower()
            field_label = field.get('label', '').lower()
            field_type = field.get('type', '').lower()
            element_type = field.get('type', '').lower()  # For non-field elements
            
            # Combine all identifiers for matching
            field_text = f"{field_key} {field_name} {field_label}".lower()
            
            # Try to match to a section
            best_match = None
            best_score = 0
            
            for section in cls.STANDARD_SECTIONS:
                score = 0
                
                # Check pattern matching
                for pattern in section['patterns']:
                    if pattern in field_text:
                        score += 10
                
                # Check field type matching
                if field_type in section.get('field_types', []):
                    score += 5
                
                # Check element type matching (for non-field elements)
                if element_type in section.get('element_types', []):
                    score += 15  # Higher weight for element types
                
                if score > best_score:
                    best_score = score
                    best_match = section['id']
            
            # Assign to best matching section, or default to Applicant Information
            if best_match and best_score > 0:
                section_assignments[best_match].append(field)
            else:
                # Default to Applicant Information if no clear match
                section_assignments[1].append(field)
        
        return section_assignments
    
    @classmethod
    def _generate_steps(cls, section_assignments: Dict[int, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """
        Generate step configuration from section assignments
        
        Args:
            section_assignments: Dictionary mapping section_id to list of fields
            
        Returns:
            List of step dictionaries
        """
        steps = []
        step_number = 1
        
        for section in cls.STANDARD_SECTIONS:  # Process all sections
            section_id = section['id']
            assigned_fields = section_assignments.get(section_id, [])
            
            # Skip sections with no fields (unless required)
            if not assigned_fields and not section['required']:
                continue
            
            # Skip optional sections if they have no fields
            if not assigned_fields and section['id'] in [3, 4]:  # Business Details, Qualifications
                continue
            
            # Extract field keys
            field_keys = [f.get('field_key') or f.get('id') or f.get('name') for f in assigned_fields]
            
            # Create step
            step = {
                'id': step_number,
                'name': section['name'],
                'description': section['description'],
                'field_keys': field_keys,
                'required': section['required'],
                'estimated_minutes': section['estimated_minutes']
            }
            
            steps.append(step)
            step_number += 1
        
        return steps
    
    @classmethod
    def auto_configure_application_type(cls, app_type, db):
        """
        Auto-configure multi-step wizard for an application type
        
        Args:
            app_type: ApplicationType model instance
            db: SQLAlchemy database instance
        """
        # Get fields for this application type
        fields = app_type.get_fields()
        
        if not fields:
            print(f"⚠️  No fields found for application type {app_type.id}")
            return
        
        # Generate step configuration
        step_config = cls.analyze_fields(fields)
        
        # Save to database
        app_type.steps = json.dumps(step_config)
        db.session.commit()
        
        print(f"✅ Auto-configured {len(step_config.get('steps', []))} steps for '{app_type.name}'")
        
        return step_config
    
    @classmethod
    def bulk_auto_configure(cls, db, ApplicationType):
        """
        Auto-configure all application types that don't have steps configured
        
        Args:
            db: SQLAlchemy database instance
            ApplicationType: ApplicationType model class
        """
        app_types = ApplicationType.query.filter_by(active=True).all()
        
        configured_count = 0
        skipped_count = 0
        
        for app_type in app_types:
            # Skip if already configured
            if app_type.steps:
                skipped_count += 1
                continue
            
            # Auto-configure
            try:
                cls.auto_configure_application_type(app_type, db)
                configured_count += 1
            except Exception as e:
                print(f"❌ Error configuring {app_type.name}: {str(e)}")
        
        print(f"\n📊 Bulk Auto-Configuration Complete:")
        print(f"   ✅ Configured: {configured_count}")
        print(f"   ⏭️  Skipped (already configured): {skipped_count}")
        print(f"   📝 Total: {len(app_types)}")
        
        return configured_count, skipped_count


if __name__ == '__main__':
    # Test the configurator with sample fields
    sample_fields = [
        {'field_key': 'first_name', 'name': 'First Name', 'type': 'text'},
        {'field_key': 'last_name', 'name': 'Last Name', 'type': 'text'},
        {'field_key': 'email', 'name': 'Email Address', 'type': 'email'},
        {'field_key': 'phone', 'name': 'Phone Number', 'type': 'tel'},
        {'field_key': 'business_name', 'name': 'Business Name', 'type': 'text'},
        {'field_key': 'business_type', 'name': 'Business Type', 'type': 'select'},
        {'field_key': 'license_number', 'name': 'Professional License Number', 'type': 'text'},
        {'field_key': 'document_upload', 'name': 'Supporting Documents', 'type': 'file'},
        {'field_key': 'attestation', 'name': 'I certify this information', 'type': 'checkbox'},
    ]
    
    config = StepAutoConfigurator.analyze_fields(sample_fields)
    print(json.dumps(config, indent=2))

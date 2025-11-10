from flask import Flask, request, jsonify, send_file, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json
import re
from rule_engine import RuleEngine
import os
from csv_parser import CSVParser
from document_utils import save_uploaded_file, delete_file, categorize_file, get_mime_type
from auth_utils import hash_password, verify_password, create_session, verify_session, destroy_session, require_auth
from werkzeug.utils import secure_filename
import zipfile
import tempfile
import shutil
from transformers import DatabaseTransformer, APITransformer
from field_library_import import FieldLibraryImporter
# from field_matching_api import SmartFieldMatcher  # Temporarily disabled

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///regulatory_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'regulatory-platform-secret-key-2024'

# CORS configuration - CRITICAL: Do not expose port 5000, only allow frontend port
CORS(app, origins=["http://localhost:5173", "https://5173-if4j0l8kg1824dwz6da49-f18e74fa.manusvm.computer", "https://5173-i4u5q4wzga20dqo40gx3x-50251577.manusvm.computer"], supports_credentials=True)

# Initialize Rule Engine
rule_engine = RuleEngine()

db = SQLAlchemy(app)

# ============================================================================
# DATABASE MODELS
# ============================================================================

class Entity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

class Field(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_id = db.Column(db.Integer, db.ForeignKey('entity.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # string, number, date, file, etc.
    required = db.Column(db.Boolean, default=False)
    pii = db.Column(db.Boolean, default=False)
    hipaa = db.Column(db.Boolean, default=False)
    gdpr = db.Column(db.Boolean, default=False)
    
    entity = db.relationship('Entity', backref=db.backref('fields', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'entity_id': self.entity_id,
            'name': self.name,
            'label': self.label,
            'type': self.type,
            'required': self.required,
            'pii': self.pii,
            'hipaa': self.hipaa,
            'gdpr': self.gdpr
        }

class FieldValue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_instance_id = db.Column(db.Integer, nullable=False)
    field_id = db.Column(db.Integer, db.ForeignKey('field.id'), nullable=False)
    value = db.Column(db.Text)
    
    field = db.relationship('Field', backref=db.backref('values', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'entity_instance_id': self.entity_instance_id,
            'field_id': self.field_id,
            'value': self.value
        }

class FieldLibrary(db.Model):
    """Universal field catalog - stores all possible fields across all boards"""
    __tablename__ = 'field_library'
    
    id = db.Column(db.Integer, primary_key=True)
    field_key = db.Column(db.String(100), unique=True, nullable=False)
    canonical_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # Field Type & Validation
    field_type = db.Column(db.String(50), nullable=False)  # text, email, date, select, etc.
    data_type = db.Column(db.String(50))  # string, number, boolean, date
    validation_rules = db.Column(db.Text)  # JSON
    conditional_rules = db.Column(db.Text)  # JSON array of conditional display rules
    
    # Display Configuration
    placeholder = db.Column(db.Text)
    help_text = db.Column(db.Text)
    default_value = db.Column(db.Text)
    
    # For Select/Radio/Checkbox
    options = db.Column(db.Text)  # JSON array [{value, label}]
    options_source = db.Column(db.String(100))  # 'static', 'lookup_table', 'api'
    options_lookup_table = db.Column(db.String(100))  # Table name if options_source = 'lookup_table'
    
    # Categorization
    category = db.Column(db.String(100))  # Personal Info, Contact, Education, etc.
    subcategory = db.Column(db.String(100))
    tags = db.Column(db.Text)  # JSON array ['common', 'healthcare', 'engineering']
    
    # Usage Tracking
    usage_count = db.Column(db.Integer, default=0)
    first_used_by = db.Column(db.String(200))  # Which board first introduced it
    
    # Mapping & Integration
    thentia_attribute_name = db.Column(db.String(200))  # e.g., "reg_firstname"
    salesforce_field_name = db.Column(db.String(200))  # e.g., "First_Name__c"
    common_aliases = db.Column(db.Text)  # JSON array ["firstName", "first_name", "fname"]
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'field_key': self.field_key,
            'canonical_name': self.canonical_name,
            'description': self.description,
            'field_type': self.field_type,
            'data_type': self.data_type,
            'validation_rules': json.loads(self.validation_rules) if self.validation_rules else None,
            'placeholder': self.placeholder,
            'help_text': self.help_text,
            'default_value': self.default_value,
            'options': json.loads(self.options) if self.options else None,
            'options_source': self.options_source,
            'options_lookup_table': self.options_lookup_table,
            'category': self.category,
            'subcategory': self.subcategory,
            'tags': json.loads(self.tags) if self.tags else [],
            'usage_count': self.usage_count,
            'first_used_by': self.first_used_by,
            'thentia_attribute_name': self.thentia_attribute_name,
            'salesforce_field_name': self.salesforce_field_name,
            'common_aliases': json.loads(self.common_aliases) if self.common_aliases else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ApplicationType(db.Model):
    """Stores application type definitions parsed from regulatory documents"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    renewal_period = db.Column(db.String(500))
    duration = db.Column(db.String(255))
    license_number_format = db.Column(db.String(255))
    source_document = db.Column(db.String(500))  # Original document name
    parser_version = db.Column(db.String(50))
    form_definition = db.Column(db.Text)  # JSON string of complete form structure (OLD FORMAT)
    form_fields_v2 = db.Column(db.Text)  # JSON array of field_library references (NEW FORMAT)
    workflow_definition = db.Column(db.Text)  # JSON string of workflow steps
    fees_definition = db.Column(db.Text)  # JSON string of fee structure
    fee_rules = db.Column(db.Text)  # JSON string of fee calculation rules
    conditional_rules = db.Column(db.Text, default='[]')  # JSON array of conditional logic rules
    validation_rules = db.Column(db.Text, default='{}')  # JSON object of field validation rules
    
    # Fee Configuration
    base_fee = db.Column(db.Float, default=0.0)  # Flat rate fee
    late_fee_percentage = db.Column(db.Float, default=0.0)  # Late fee as % of base fee
    renewal_window_days = db.Column(db.Integer, default=30)  # Days before expiration to allow renewal
    expiration_months = db.Column(db.Integer, default=12)  # License validity period in months
    
    active = db.Column(db.Boolean, default=True)  # For soft delete only
    status = db.Column(db.String(20), default='draft')  # 'draft', 'published', 'archived'
    steps = db.Column(db.Text)  # JSON string of multi-step wizard configuration
    sections = db.Column(db.Text)  # JSON string of interview sections (from PDF extraction)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_fields(self):
        """
        Get fields for this application type
        Supports both old format (form_definition) and new format (form_fields_v2)
        """
        # New format: field library references with overrides
        # Check if form_fields_v2 exists AND has content (not just empty array)
        if self.form_fields_v2 and self.form_fields_v2.strip() not in ['[]', '', 'null']:
            fields_data = json.loads(self.form_fields_v2)
            if fields_data:  # Double-check array is not empty after parsing
                rendered_fields = []
            
            for field_ref in fields_data:
                # If referencing UFL field
                if field_ref.get('field_library_id'):
                    ufl_field = FieldLibrary.query.get(field_ref['field_library_id'])
                    if ufl_field:
                        overrides = field_ref.get('overrides', {})
                        
                        # Build field config with frontend-compatible property names
                        field_config = {
                            'id': ufl_field.field_key,  # Use field_key as id
                            'name': overrides.get('display_name') or ufl_field.canonical_name,
                            'label': overrides.get('display_name') or ufl_field.canonical_name,
                            'type': ufl_field.field_type,
                            'required': overrides.get('required', False),
                            'helpText': overrides.get('help_text') or ufl_field.help_text,
                            'placeholder': overrides.get('placeholder') or ufl_field.placeholder,
                            'options': json.loads(ufl_field.options) if ufl_field.options else None,
                            'validation': json.loads(ufl_field.validation_rules) if ufl_field.validation_rules else {},
                            'conditionalRules': json.loads(ufl_field.conditional_rules) if ufl_field.conditional_rules else None,
                            'category': ufl_field.category,
                            'field_key': ufl_field.field_key,
                            'display_order': field_ref.get('display_order', 999)
                        }
                        rendered_fields.append(field_config)
                
                # If custom field
                elif field_ref.get('custom_field'):
                    custom = field_ref['custom_field']
                    custom['display_order'] = field_ref.get('display_order', 999)
                    rendered_fields.append(custom)
            
            # ALSO include non-field elements from form_definition
            # (signature blocks, instruction blocks, fee displays, etc.)
            if self.form_definition:
                try:
                    form_def = json.loads(self.form_definition)
                    # Handle wrapped format
                    if isinstance(form_def, dict) and 'elements' in form_def:
                        form_def = form_def['elements']
                    # Handle flat array
                    if isinstance(form_def, list):
                        # Define field types (these are already in form_fields_v2)
                        field_types = ['text', 'email', 'tel', 'number', 'date', 'select', 'checkbox', 'radio', 'textarea', 'file']
                        # Define non-field element types (these need to be included)
                        non_field_types = ['section_header', 'instruction_block', 'attestation_block', 'signature_block', 'document_upload', 'fee_display']
                        
                        for element in form_def:
                            element_type = element.get('type')
                            # Only add non-field element types
                            if element_type in non_field_types:
                                rendered_fields.append(element)
                except:
                    pass
            
            # Sort by display_order
            rendered_fields.sort(key=lambda x: x.get('display_order', 999))
            return rendered_fields
        
        # Old format: direct field definitions
        elif self.form_definition:
            parsed = json.loads(self.form_definition)
            
            # Handle {"elements": [...]} wrapper format (e.g., ID 16)
            if isinstance(parsed, dict) and 'elements' in parsed:
                return parsed['elements']
            
            # Handle flat array format
            if isinstance(parsed, list):
                return parsed
            
            return []
        
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'renewalPeriod': self.renewal_period,
            'duration': self.duration,
            'licenseNumberFormat': self.license_number_format,
            'sourceDocument': self.source_document,
            'parserVersion': self.parser_version,
            'fields': self.get_fields(),  # Use new method that handles both formats
            'workflow': json.loads(self.workflow_definition) if self.workflow_definition else {},
            'fees': json.loads(self.fees_definition) if self.fees_definition else {},
            'fee_rules': json.loads(self.fee_rules) if self.fee_rules else None,
            'conditionalRules': json.loads(self.conditional_rules) if self.conditional_rules else [],
            'validationRules': json.loads(self.validation_rules) if self.validation_rules else {},
            'baseFee': self.base_fee,
            'lateFeePercentage': self.late_fee_percentage,
            'renewalWindowDays': self.renewal_window_days,
            'expirationMonths': self.expiration_months,
            'active': self.active,
            'status': self.status,
            'steps': json.loads(self.steps) if self.steps else None,
            'sections': json.loads(self.sections) if self.sections else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    address = db.Column(db.String(500))
    city = db.Column(db.String(255))
    state = db.Column(db.String(50))
    zipCode = db.Column(db.String(20))
    licenseNumber = db.Column(db.String(255))
    licenseType = db.Column(db.String(255))
    licenseStatus = db.Column(db.String(50))
    issueDate = db.Column(db.String(50))
    expirationDate = db.Column(db.String(50))
    
    # Authentication & Account Management
    account_claimed = db.Column(db.Boolean, default=False)  # Has user claimed their account?
    account_status = db.Column(db.String(50), default='pending_claim')  # pending_claim, active, suspended
    last_login = db.Column(db.DateTime)
    date_of_birth = db.Column(db.String(50))  # For identity verification
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        # Get active licenses from licenses table
        active_licenses = [lic for lic in self.licenses if lic.status == 'active']
        primary_license = active_licenses[0] if active_licenses else None
        
        # Use data from License table if available, otherwise fall back to User fields
        if primary_license:
            license_number = primary_license.license_number
            license_type = primary_license.license_type
            license_status = primary_license.status
            issue_date = primary_license.issue_date.isoformat() if primary_license.issue_date else None
            expiration_date = primary_license.expiration_date.isoformat() if primary_license.expiration_date else None
        else:
            license_number = self.licenseNumber
            license_type = self.licenseType
            license_status = self.licenseStatus
            issue_date = self.issueDate
            expiration_date = self.expirationDate
        
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'zipCode': self.zipCode,
            'licenseNumber': license_number,
            'licenseType': license_type,
            'licenseStatus': license_status,
            'issueDate': issue_date,
            'expirationDate': expiration_date,
            'accountClaimed': self.account_claimed,
            'accountStatus': self.account_status,
            'lastLogin': self.last_login.isoformat() if self.last_login else None,
            'dateOfBirth': self.date_of_birth,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'licenses': [lic.to_dict() for lic in self.licenses]  # Include all licenses
        }

class Document(db.Model):
    """Document storage for licensee files"""
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    category = db.Column(db.String(50))  # application, education, notarized, photo, identification, other
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('documents', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None
        }

class License(db.Model):
    """License records - one user can have multiple licenses"""
    __tablename__ = 'licenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    license_number = db.Column(db.String(255), unique=True, nullable=False)
    license_type = db.Column(db.String(255), nullable=False)  # RN, LPN, etc.
    state = db.Column(db.String(50))  # State where license is valid
    status = db.Column(db.String(50), default='active')  # active, expired, suspended, revoked
    issue_date = db.Column(db.Date)
    expiration_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('licenses', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'license_number': self.license_number,
            'license_type': self.license_type,
            'state': self.state,
            'status': self.status,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Payment(db.Model):
    """Payment records - tracks all payments for applications"""
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('license_applications.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    
    # Fee breakdown
    base_fee = db.Column(db.Float, nullable=False)
    late_fee = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    
    # Payment status
    status = db.Column(db.String(50), default='pending')  # pending, completed, failed, cancelled, refunded
    
    # Tilled integration
    tilled_payment_id = db.Column(db.String(255))  # Tilled's payment intent ID
    tilled_session_id = db.Column(db.String(255))  # Tilled's checkout session ID
    tilled_checkout_url = db.Column(db.String(500))  # Branded checkout URL
    
    # Return URLs
    success_url = db.Column(db.String(500))
    cancel_url = db.Column(db.String(500))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime)
    
    # Relationships
    application = db.relationship('LicenseApplication', backref=db.backref('payments', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('payments', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'user_id': self.user_id,
            'base_fee': self.base_fee,
            'late_fee': self.late_fee,
            'total_amount': self.total_amount,
            'status': self.status,
            'tilled_payment_id': self.tilled_payment_id,
            'tilled_session_id': self.tilled_session_id,
            'tilled_checkout_url': self.tilled_checkout_url,
            'success_url': self.success_url,
            'cancel_url': self.cancel_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None
        }

class LicenseApplication(db.Model):
    """Application submissions for new licenses or renewals"""
    __tablename__ = 'license_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    license_id = db.Column(db.Integer, db.ForeignKey('licenses.id', ondelete='SET NULL'), nullable=True)  # If renewal
    application_type_id = db.Column(db.Integer, db.ForeignKey('application_type.id'), nullable=False)
    
    # Application data stored as JSON
    form_data = db.Column(db.Text)  # JSON string of form field values
    
    # Status tracking
    status = db.Column(db.String(50), default='pending')  # pending, under_review, approved, rejected
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Admin who reviewed
    review_notes = db.Column(db.Text)
    
    # Renewal flag
    is_renewal = db.Column(db.Boolean, default=False)
    
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('applications', lazy=True, cascade='all, delete-orphan'))
    license = db.relationship('License', backref=db.backref('applications', lazy=True))
    application_type = db.relationship('ApplicationType', backref=db.backref('applications', lazy=True))
    
    def to_dict(self):
        user_data = None
        if self.user:
            user_data = {
                'id': self.user.id,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name
            }
        
        application_type_data = None
        if self.application_type:
            application_type_data = {
                'id': self.application_type.id,
                'name': self.application_type.name,
                'description': self.application_type.description
            }
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': user_data,
            'license_id': self.license_id,
            'application_type_id': self.application_type_id,
            'application_type': application_type_data,
            'form_data': json.loads(self.form_data) if self.form_data else {},
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by,
            'review_notes': self.review_notes,
            'is_renewal': self.is_renewal
        }

class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

class UserGroup(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), primary_key=True)
    
    user = db.relationship('User', backref=db.backref('user_groups', lazy=True))
    group = db.relationship('Group', backref=db.backref('group_users', lazy=True))

class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('profiles', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profile.id'), nullable=False)
    status = db.Column(db.String(255), default='Draft')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = db.Column(db.DateTime)
    
    profile = db.relationship('Profile', backref=db.backref('applications', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'profile_id': self.profile_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }

class Registration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profile.id'), nullable=False)
    application_id = db.Column(db.Integer, db.ForeignKey('application.id'))
    registration_number = db.Column(db.String(255), unique=True)
    effective_date = db.Column(db.Date)
    expiration_date = db.Column(db.Date)
    status = db.Column(db.String(255), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    profile = db.relationship('Profile', backref=db.backref('registrations', lazy=True))
    application = db.relationship('Application', backref=db.backref('registration', uselist=False))
    
    def to_dict(self):
        return {
            'id': self.id,
            'profile_id': self.profile_id,
            'application_id': self.application_id,
            'registration_number': self.registration_number,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ApplicationSubmission(db.Model):
    """New application submissions from licensee portal"""
    __tablename__ = 'application_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    application_type_id = db.Column(db.Integer, db.ForeignKey('application_type.id'), nullable=False)
    
    # Application data
    form_data = db.Column(db.Text)  # JSON string of form field values
    
    # Status tracking
    status = db.Column(db.String(50), default='draft')  # draft, submitted, under_review, approved, rejected
    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # Notes and messaging
    admin_notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='submitted_applications')
    application_type = db.relationship('ApplicationType', backref='submissions')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'applicationTypeId': self.application_type_id,
            'applicationTypeName': self.application_type.name if self.application_type else None,
            'formData': json.loads(self.form_data) if self.form_data else {},
            'status': self.status,
            'submittedAt': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewedBy': self.reviewed_by,
            'adminNotes': self.admin_notes,
            'rejectionReason': self.rejection_reason,
            'currentStep': self.current_step if hasattr(self, 'current_step') else 1,
            'lastSavedAt': self.last_saved_at.isoformat() if hasattr(self, 'last_saved_at') and self.last_saved_at else None,
            'isDraft': self.is_draft if hasattr(self, 'is_draft') else True,
            'stepsCompleted': json.loads(self.steps_completed) if hasattr(self, 'steps_completed') and self.steps_completed else [],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class ApplicationDocument(db.Model):
    """Documents attached to application submissions"""
    __tablename__ = 'application_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    application_submission_id = db.Column(db.Integer, db.ForeignKey('application_submissions.id', ondelete='CASCADE'), nullable=False)
    field_name = db.Column(db.String(255))  # Which form field this document is for
    category = db.Column(db.String(50))  # application, education, notarized, etc.
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    application_submission = db.relationship('ApplicationSubmission', backref='documents')
    
    def to_dict(self):
        return {
            'id': self.id,
            'applicationSubmissionId': self.application_submission_id,
            'fieldName': self.field_name,
            'category': self.category,
            'filename': self.filename,
            'originalFilename': self.original_filename,
            'filePath': self.file_path,
            'fileSize': self.file_size,
            'mimeType': self.mime_type,
            'uploadedAt': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new applicant (not claiming existing account)"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            username=data['email'],
            email=data['email'],
            password_hash=hash_password(data['password']),
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            phone=data.get('phone', ''),
            account_claimed=True,
            account_status='active'
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['login_time'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/claim-account', methods=['POST'])
def claim_account():
    """Claim an existing account (for bulk-imported licensees)"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('licenseNumber') or not data.get('email'):
            return jsonify({'success': False, 'message': 'License number and email are required'}), 400
        
        # Find user by license number and email
        user = User.query.filter_by(
            licenseNumber=data['licenseNumber'],
            email=data['email']
        ).first()
        
        if not user:
            return jsonify({'success': False, 'message': 'No matching licensee found. Please verify your license number and email.'}), 404
        
        # Check if account already claimed
        if user.account_claimed:
            return jsonify({'success': False, 'message': 'This account has already been claimed. Please use the login page.'}), 400
        
        # Additional verification (optional but recommended)
        if data.get('dateOfBirth') and user.date_of_birth:
            if data['dateOfBirth'] != user.date_of_birth:
                return jsonify({'success': False, 'message': 'Verification failed. Please check your information.'}), 403
        
        # Claim account and set password
        user.password_hash = hash_password(data['password'])
        user.account_claimed = True
        user.account_status = 'active'
        user.username = data['email']
        
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['login_time'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Account claimed successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/verify-licensee', methods=['POST'])
def verify_licensee():
    """Verify if a licensee exists in the system (for account claiming)"""
    try:
        data = request.json
        
        if not data.get('licenseNumber') or not data.get('email'):
            return jsonify({'success': False, 'message': 'License number and email are required'}), 400
        
        # Find user
        user = User.query.filter_by(
            licenseNumber=data['licenseNumber'],
            email=data['email']
        ).first()
        
        if not user:
            return jsonify({'success': True, 'found': False}), 200
        
        return jsonify({
            'success': True,
            'found': True,
            'accountClaimed': user.account_claimed,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'needsDateOfBirth': bool(user.date_of_birth)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login with proper authentication"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Please enter both email and password'
            }), 400
        
        # Check for demo admin credentials
        if email == 'admin@regulatepro.com' and password == 'admin123':
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    username='admin',
                    email=email,
                    password_hash=hash_password('admin123'),
                    first_name='Admin',
                    last_name='User',
                    account_claimed=True,
                    account_status='active'
                )
                db.session.add(user)
                db.session.commit()
            
            # Set session
            session['user_id'] = user.id
            session['user_email'] = user.email
            session['login_time'] = datetime.utcnow().isoformat()
            
            return jsonify({
                'success': True,
                'message': 'Login successful! Welcome to RegulatePro.',
                'user': user.to_dict()
            })
        
        # Real authentication
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password. Please try again.'
            }), 401
        
        # Check if account is claimed
        if not user.account_claimed:
            return jsonify({
                'success': False,
                'message': 'Account not claimed. Please claim your account first.'
            }), 403
        
        # Verify password
        if not verify_password(password, user.password_hash):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password. Please try again.'
            }), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['login_time'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user': user.to_dict()
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Unable to process login request',
            'error': str(e)
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """User logout"""
    try:
        session.clear()
        return jsonify({
            'success': True,
            'message': 'You have been logged out successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Unable to process logout request',
            'error': str(e)
        }), 500

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    """Get current user profile"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please log in to access your profile'
            }), 401
        
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({
                'success': False,
                'message': 'User account not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Profile retrieved successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': 'Administrator',
                'login_time': session.get('login_time')
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Unable to retrieve profile',
            'error': str(e)
        }), 500

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    try:
        if 'user_id' in session:
            return jsonify({
                'success': True,
                'authenticated': True,
                'message': 'User is logged in'
            })
        else:
            return jsonify({
                'success': True,
                'authenticated': False,
                'message': 'User is not logged in'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Unable to check authentication status',
            'error': str(e)
        }), 500

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})

# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

# Users
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    
    # Check if user already exists by email
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify(existing_user.to_dict()), 200
    
    # Parse name into first and last name
    name = data.get('name', '')
    name_parts = name.split(' ', 1)
    first_name = name_parts[0] if len(name_parts) > 0 else ''
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    # Create username from email
    username = data.get('username', data['email'].split('@')[0])
    
    user = User(
        username=username,
        email=data['email'],
        password_hash=data.get('password_hash', 'temp_hash'),  # Temporary for demo
        first_name=first_name,
        last_name=last_name
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/users/bulk-import', methods=['POST'])
def bulk_import_users():
    data = request.json
    users_data = data.get('users', [])
    
    imported = 0
    errors = []
    
    for user_data in users_data:
        try:
            # Check if user already exists by email
            email = user_data.get('email', '').strip()
            if not email:
                errors.append({'error': 'Missing email', 'data': user_data})
                continue
                
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                # Update existing user
                existing_user.first_name = user_data.get('firstName', existing_user.first_name)
                existing_user.last_name = user_data.get('lastName', existing_user.last_name)
                existing_user.phone = user_data.get('phone', existing_user.phone)
                existing_user.address = user_data.get('address', existing_user.address)
                existing_user.city = user_data.get('city', existing_user.city)
                existing_user.state = user_data.get('state', existing_user.state)
                existing_user.zipCode = user_data.get('zipCode', existing_user.zipCode)
                existing_user.licenseNumber = user_data.get('licenseNumber', existing_user.licenseNumber)
                existing_user.licenseType = user_data.get('licenseType', existing_user.licenseType)
                existing_user.licenseStatus = user_data.get('licenseStatus', existing_user.licenseStatus)
                existing_user.issueDate = user_data.get('issueDate', existing_user.issueDate)
                existing_user.expirationDate = user_data.get('expirationDate', existing_user.expirationDate)
                imported += 1
            else:
                # Create new user
                username = user_data.get('username', email.split('@')[0])
                # Make username unique if it already exists
                base_username = username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = User(
                    username=username,
                    email=email,
                    password_hash='temp_hash',  # Temporary for demo
                    first_name=user_data.get('firstName', ''),
                    last_name=user_data.get('lastName', ''),
                    phone=user_data.get('phone'),
                    address=user_data.get('address'),
                    city=user_data.get('city'),
                    state=user_data.get('state'),
                    zipCode=user_data.get('zipCode'),
                    licenseNumber=user_data.get('licenseNumber'),
                    licenseType=user_data.get('licenseType'),
                    licenseStatus=user_data.get('licenseStatus', 'active'),
                    issueDate=user_data.get('issueDate'),
                    expirationDate=user_data.get('expirationDate')
                )
                db.session.add(user)
                imported += 1
        except Exception as e:
            errors.append({'error': str(e), 'data': user_data})
    
    try:
        db.session.commit()
        return jsonify({
            'imported': imported,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/import-csv', methods=['POST'])
def import_licensees_csv():
    """Import licensees from CSV file"""
    try:
        data = request.json
        csv_content = data.get('csvContent', '')
        
        if not csv_content:
            return jsonify({'error': 'No CSV content provided'}), 400
        
        # Import the parser
        from licensee_csv_parser import LicenseeCSVParser
        
        # Parse CSV
        parser = LicenseeCSVParser()
        result = parser.parse(csv_content)
        
        licensees = result['licensees']
        parse_errors = result['errors']
        parse_warnings = result['warnings']
        
        if parse_errors:
            return jsonify({
                'error': 'CSV parsing failed',
                'errors': parse_errors,
                'warnings': parse_warnings
            }), 400
        
        # Import licensees into database
        imported = 0
        updated = 0
        skipped = 0
        db_errors = []
        
        for licensee_data in licensees:
            try:
                # Check if user already exists by license number or email
                license_num = licensee_data.get('licenseNumber')
                email = licensee_data.get('email')
                
                existing_user = None
                if license_num:
                    existing_user = User.query.filter_by(licenseNumber=license_num).first()
                if not existing_user and email:
                    existing_user = User.query.filter_by(email=email).first()
                
                if existing_user:
                    # Update existing user
                    existing_user.first_name = licensee_data.get('first_name', existing_user.first_name)
                    existing_user.last_name = licensee_data.get('last_name', existing_user.last_name)
                    existing_user.email = licensee_data.get('email', existing_user.email)
                    existing_user.phone = licensee_data.get('phone', existing_user.phone)
                    existing_user.address = licensee_data.get('address', existing_user.address)
                    existing_user.city = licensee_data.get('city', existing_user.city)
                    existing_user.state = licensee_data.get('state', existing_user.state)
                    existing_user.zipCode = licensee_data.get('zipCode', existing_user.zipCode)
                    existing_user.licenseNumber = licensee_data.get('licenseNumber', existing_user.licenseNumber)
                    existing_user.licenseType = licensee_data.get('licenseType', existing_user.licenseType)
                    existing_user.licenseStatus = licensee_data.get('licenseStatus', existing_user.licenseStatus)
                    existing_user.issueDate = licensee_data.get('issueDate', existing_user.issueDate)
                    existing_user.expirationDate = licensee_data.get('expirationDate', existing_user.expirationDate)
                    updated += 1
                else:
                    # Create new user
                    username = licensee_data.get('username', email.split('@')[0])
                    # Make username unique if it already exists
                    base_username = username
                    counter = 1
                    while User.query.filter_by(username=username).first():
                        username = f"{base_username}{counter}"
                        counter += 1
                    
                    user = User(
                        username=username,
                        email=licensee_data.get('email'),
                        password_hash='temp_hash',  # Temporary password hash
                        first_name=licensee_data.get('first_name', ''),
                        last_name=licensee_data.get('last_name', ''),
                        phone=licensee_data.get('phone'),
                        address=licensee_data.get('address'),
                        city=licensee_data.get('city'),
                        state=licensee_data.get('state'),
                        zipCode=licensee_data.get('zipCode'),
                        licenseNumber=licensee_data.get('licenseNumber'),
                        licenseType=licensee_data.get('licenseType'),
                        licenseStatus=licensee_data.get('licenseStatus', 'Active'),
                        issueDate=licensee_data.get('issueDate'),
                        expirationDate=licensee_data.get('expirationDate')
                    )
                    db.session.add(user)
                    imported += 1
                    
            except Exception as e:
                db_errors.append({
                    'licenseNumber': licensee_data.get('licenseNumber'),
                    'error': str(e)
                })
                skipped += 1
        
        # Commit all changes
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': 'Database commit failed',
                'message': str(e)
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'CSV import completed: {imported} new, {updated} updated, {skipped} skipped',
            'stats': {
                'total_rows': result['stats']['total_rows'],
                'imported': imported,
                'updated': updated,
                'skipped': skipped,
                'duplicates': result['stats']['duplicates']
            },
            'warnings': parse_warnings,
            'errors': db_errors
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user/licensee"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# DOCUMENT MANAGEMENT
# ============================================================================

@app.route('/api/users/<int:user_id>/documents', methods=['GET'])
def get_user_documents(user_id):
    """Get all documents for a specific user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        documents = Document.query.filter_by(user_id=user_id).order_by(Document.category, Document.upload_date.desc()).all()
        
        # Group documents by category
        grouped = {}
        for doc in documents:
            category = doc.category or 'other'
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(doc.to_dict())
        
        return jsonify({
            'user_id': user_id,
            'license_number': user.licenseNumber,
            'total_documents': len(documents),
            'documents_by_category': grouped,
            'all_documents': [doc.to_dict() for doc in documents]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/documents', methods=['POST'])
def upload_user_document(user_id):
    """Upload a single document for a user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.licenseNumber:
            return jsonify({'error': 'User must have a license number'}), 400
        
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get category from form data (optional)
        category = request.form.get('category', None)
        
        # Read file data
        file_data = file.read()
        
        # Save file
        file_info = save_uploaded_file(
            file_data=file_data,
            original_filename=secure_filename(file.filename),
            license_number=user.licenseNumber,
            category=category
        )
        
        # Create document record
        document = Document(
            user_id=user_id,
            category=file_info['category'],
            filename=file_info['filename'],
            original_filename=file_info['original_filename'],
            file_path=file_info['file_path'],
            file_size=file_info['file_size'],
            mime_type=file_info['mime_type']
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'document': document.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:document_id>', methods=['GET'])
def get_document(document_id):
    """Get document metadata"""
    try:
        document = Document.query.get(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify(document.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:document_id>/download', methods=['GET'])
def download_document(document_id):
    """Download a document file"""
    try:
        document = Document.query.get(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        if not os.path.exists(document.file_path):
            return jsonify({'error': 'File not found on disk'}), 404
        
        return send_file(
            document.file_path,
            as_attachment=True,
            download_name=document.original_filename,
            mimetype=document.mime_type
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    """Delete a document"""
    try:
        document = Document.query.get(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Delete file from disk
        delete_file(document.file_path)
        
        # Delete database record
        db.session.delete(document)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Document deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/bulk-import-zip', methods=['POST'])
def bulk_import_documents_zip():
    """
    Bulk import documents from ZIP file
    ZIP structure: {license_number}/filename.ext
    Auto-categorizes files based on filename patterns
    """
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No ZIP file provided'}), 400
        
        zip_file = request.files['file']
        if zip_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not zip_file.filename.endswith('.zip'):
            return jsonify({'error': 'File must be a ZIP archive'}), 400
        
        # Create temporary directory for extraction
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Save uploaded ZIP to temp location
            zip_path = os.path.join(temp_dir, 'upload.zip')
            zip_file.save(zip_path)
            
            # Extract ZIP
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Process extracted files
            stats = {
                'total_files': 0,
                'imported': 0,
                'skipped': 0,
                'errors': []
            }
            
            licensee_stats = {}  # Track documents per licensee
            
            # Walk through extracted directory
            for root, dirs, files in os.walk(temp_dir):
                for filename in files:
                    if filename == 'upload.zip' or filename.startswith('.'):
                        continue
                    
                    stats['total_files'] += 1
                    
                    # Get relative path from temp_dir
                    file_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(file_path, temp_dir)
                    
                    # Extract license number from path (first directory)
                    path_parts = rel_path.split(os.sep)
                    if len(path_parts) < 2:
                        stats['errors'].append(f"Invalid path structure: {rel_path}")
                        stats['skipped'] += 1
                        continue
                    
                    license_number = path_parts[0]
                    
                    # Find user by license number
                    user = User.query.filter_by(licenseNumber=license_number).first()
                    if not user:
                        stats['errors'].append(f"License number not found: {license_number}")
                        stats['skipped'] += 1
                        continue
                    
                    try:
                        # Read file data
                        with open(file_path, 'rb') as f:
                            file_data = f.read()
                        
                        # Save file
                        file_info = save_uploaded_file(
                            file_data=file_data,
                            original_filename=secure_filename(filename),
                            license_number=license_number,
                            category=None  # Auto-categorize
                        )
                        
                        # Create document record
                        document = Document(
                            user_id=user.id,
                            category=file_info['category'],
                            filename=file_info['filename'],
                            original_filename=file_info['original_filename'],
                            file_path=file_info['file_path'],
                            file_size=file_info['file_size'],
                            mime_type=file_info['mime_type']
                        )
                        
                        db.session.add(document)
                        stats['imported'] += 1
                        
                        # Track per licensee
                        if license_number not in licensee_stats:
                            licensee_stats[license_number] = 0
                        licensee_stats[license_number] += 1
                        
                    except ValueError as e:
                        stats['errors'].append(f"{license_number}/{filename}: {str(e)}")
                        stats['skipped'] += 1
                    except Exception as e:
                        stats['errors'].append(f"{license_number}/{filename}: {str(e)}")
                        stats['skipped'] += 1
            
            # Commit all documents
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f"Import completed: {stats['imported']} documents imported, {stats['skipped']} skipped",
                'stats': stats,
                'licensee_stats': licensee_stats
            }), 201
            
        finally:
            # Clean up temp directory
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# APPLICATION SUBMISSION ENDPOINTS
# ============================================================================

@app.route('/api/application-submissions', methods=['POST'])
def create_application_submission():
    """Create or update an application submission"""
    try:
        data = request.form.to_dict()
        files = request.files
        
        user_id = data.get('userId')
        application_type_id = data.get('applicationTypeId')
        form_data = data.get('formData')
        submission_id = data.get('submissionId')  # For updates
        
        if not user_id or not application_type_id:
            return jsonify({'error': 'User ID and Application Type ID are required'}), 400
        
        # Create or update submission
        if submission_id:
            submission = ApplicationSubmission.query.get(submission_id)
            if not submission:
                return jsonify({'error': 'Submission not found'}), 404
            submission.form_data = form_data
            submission.updated_at = datetime.utcnow()
        else:
            submission = ApplicationSubmission(
                user_id=user_id,
                application_type_id=application_type_id,
                form_data=form_data,
                status='draft'
            )
            db.session.add(submission)
            db.session.flush()  # Get the ID
        
        # Handle file uploads
        uploaded_files = []
        for field_name in files:
            file = files[field_name]
            if file and file.filename:
                try:
                    # Save file
                    file_info = save_uploaded_file(
                        file,
                        f'application_{submission.id}',
                        f'app_{submission.id}_{field_name}'
                    )
                    
                    # Create document record
                    doc = ApplicationDocument(
                        application_submission_id=submission.id,
                        field_name=field_name,
                        category=categorize_file(file.filename),
                        filename=file_info['filename'],
                        original_filename=file_info['original_filename'],
                        file_path=file_info['file_path'],
                        file_size=file_info['file_size'],
                        mime_type=file_info['mime_type']
                    )
                    db.session.add(doc)
                    uploaded_files.append(doc.to_dict())
                    
                except Exception as e:
                    return jsonify({'error': f'Failed to upload {field_name}: {str(e)}'}), 500
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Application saved successfully',
            'submission': submission.to_dict(),
            'uploadedFiles': uploaded_files
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-submissions/<int:submission_id>/submit', methods=['POST'])
def submit_application(submission_id):
    """Submit an application for review"""
    try:
        submission = ApplicationSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        if submission.status != 'draft':
            return jsonify({'error': 'Application has already been submitted'}), 400
        
        submission.status = 'submitted'
        submission.submitted_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Application submitted successfully',
            'submission': submission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-submissions/user/<int:user_id>', methods=['GET'])
def get_user_submissions(user_id):
    """Get all submissions for a user"""
    try:
        submissions = ApplicationSubmission.query.filter_by(user_id=user_id).all()
        return jsonify([s.to_dict() for s in submissions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-submissions/<int:submission_id>', methods=['GET'])
def get_submission(submission_id):
    """Get a specific submission with documents"""
    try:
        submission = ApplicationSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        result = submission.to_dict()
        result['documents'] = [doc.to_dict() for doc in submission.documents]
        result['user'] = submission.user.to_dict() if submission.user else None
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-submissions', methods=['GET'])
def get_all_submissions():
    """Get all application submissions (for admin)"""
    try:
        status = request.args.get('status')
        
        query = ApplicationSubmission.query
        if status:
            query = query.filter_by(status=status)
        
        submissions = query.order_by(ApplicationSubmission.submitted_at.desc()).all()
        
        results = []
        for s in submissions:
            data = s.to_dict()
            data['applicantName'] = f"{s.user.first_name} {s.user.last_name}" if s.user else 'Unknown'
            data['applicantEmail'] = s.user.email if s.user else None
            data['documentCount'] = len(s.documents)
            results.append(data)
        
        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profiles
@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    profiles = Profile.query.all()
    return jsonify([profile.to_dict() for profile in profiles])

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    data = request.json
    profile = Profile(user_id=data['user_id'])
    db.session.add(profile)
    db.session.commit()
    return jsonify(profile.to_dict()), 201

# Applications
@app.route('/api/applications', methods=['GET'])
def get_applications():
    applications = Application.query.all()
    result = []
    for app in applications:
        app_dict = app.to_dict()
        if app.profile and app.profile.user:
            app_dict['user'] = app.profile.user.to_dict()
        result.append(app_dict)
    return jsonify(result)

@app.route('/api/applications', methods=['POST'])
def create_application():
    data = request.json
    application = Application(
        profile_id=data['profile_id'],
        status=data.get('status', 'Draft')
    )
    db.session.add(application)
    db.session.commit()
    return jsonify(application.to_dict()), 201

@app.route('/api/applications/<int:app_id>', methods=['PUT'])
def update_application(app_id):
    application = Application.query.get_or_404(app_id)
    data = request.json
    
    if 'status' in data:
        application.status = data['status']
    
    db.session.commit()
    return jsonify(application.to_dict())

# Registrations
@app.route('/api/registrations', methods=['GET'])
def get_registrations():
    registrations = Registration.query.all()
    return jsonify([reg.to_dict() for reg in registrations])

@app.route('/api/registrations', methods=['POST'])
def create_registration():
    data = request.json
    registration = Registration(
        profile_id=data['profile_id'],
        application_id=data.get('application_id'),
        registration_number=data.get('registration_number'),
        status=data.get('status', 'Active')
    )
    db.session.add(registration)
    db.session.commit()
    return jsonify(registration.to_dict()), 201

# Field Values
@app.route('/api/field-values', methods=['POST'])
def create_field_value():
    data = request.json
    field_value = FieldValue(
        entity_instance_id=data['entity_instance_id'],
        field_id=data['field_id'],
        value=data['value']
    )
    db.session.add(field_value)
    db.session.commit()
    return jsonify(field_value.to_dict()), 201

# Initialize database
@app.route('/api/init-db', methods=['POST'])
def init_db():
    try:
        db.create_all()
        
        # Create default entities
        entities_data = [
            {'name': 'Profile', 'description': 'Licensee profile information'},
            {'name': 'Application', 'description': 'License application'},
            {'name': 'Registration', 'description': 'License registration record'}
        ]
        
        for entity_data in entities_data:
            if not Entity.query.filter_by(name=entity_data['name']).first():
                entity = Entity(**entity_data)
                db.session.add(entity)
        
        db.session.commit()
        
        # Create sample data if none exists
        if not User.query.first():
            # Create sample users
            users = [
                User(username='sarah_johnson', email='sarah.johnson@email.com', password_hash='hashed_password', first_name='Sarah', last_name='Johnson'),
                User(username='robert_chen', email='robert.chen@email.com', password_hash='hashed_password', first_name='Robert', last_name='Chen'),
                User(username='maria_garcia', email='maria.garcia@email.com', password_hash='hashed_password', first_name='Maria', last_name='Garcia')
            ]
            for user in users:
                db.session.add(user)
            
            db.session.commit()
            
            # Create profiles for users
            for user in users:
                profile = Profile(user_id=user.id)
                db.session.add(profile)
            
            db.session.commit()
            
            # Create sample applications
            profiles = Profile.query.all()
            applications = [
                Application(profile_id=profiles[0].id, status='Under Review'),
                Application(profile_id=profiles[1].id, status='Approved'),
                Application(profile_id=profiles[2].id, status='Pending Documents')
            ]
            for app in applications:
                db.session.add(app)
            
            db.session.commit()
        
        return jsonify({'message': 'Database initialized successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# RULES ENGINE ENDPOINTS
# ============================================================================

@app.route('/api/rules/evaluate', methods=['POST'])
def evaluate_rules():
    """Evaluate rules against application data"""
    try:
        data = request.json
        application_data = data.get('application_data', {})
        rule_type = data.get('rule_type', 'all')
        
        results = rule_engine.evaluate_rules(application_data, rule_type)
        
        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<board_id>', methods=['GET'])
def get_rules(board_id):
    """Get all rules for a board"""
    try:
        rules = rule_engine.load_rules(board_id)
        return jsonify({'rules': rules}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<board_id>', methods=['POST'])
def save_rules(board_id):
    """Save rules for a board"""
    try:
        data = request.json
        rules = data.get('rules', [])
        
        success = rule_engine.save_rules(board_id, rules)
        
        if success:
            return jsonify({'message': 'Rules saved successfully'}), 200
        else:
            return jsonify({'error': 'Failed to save rules'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# APPLICATION TYPE ENDPOINTS
# ============================================================================

@app.route('/api/application-types', methods=['GET'])
def get_application_types():
    """Get all application types (both active and draft for admin)"""
    try:
        # Check if we should filter to active only (for licensee portal)
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        if active_only:
            app_types = ApplicationType.query.filter_by(active=True).all()
        else:
            app_types = ApplicationType.query.all()
            
        return jsonify({
            'success': True,
            'applicationTypes': [at.to_dict() for at in app_types]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>', methods=['GET'])
def get_application_type(type_id):
    """Get a specific application type by ID"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        return jsonify({
            'success': True,
            'applicationType': app_type.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types', methods=['POST'])
def create_application_type():
    """Create a new application type from parsed document"""
    try:
        from purpose_matcher import PurposeMatcher
        
        data = request.json
        fields = data.get('fields', [])
        
        # Process fields using purpose matcher
        field_references = []
        matched_count = 0
        created_count = 0
        
        for i, field_data in enumerate(fields, 1):
            field_name = field_data.get('name') or field_data.get('label', '')
            field_type = field_data.get('type', 'text')
            
            # Try to match to existing UFL field
            match, confidence, match_type = PurposeMatcher.find_match(
                field_name,
                field_type,
                FieldLibrary.query
            )
            
            if match and confidence >= 0.5:
                # MATCHED - Reuse existing field
                matched_count += 1
                field_library_id = match.id
                match.usage_count += 1
            else:
                # NO MATCH - Create new field
                created_count += 1
                field_key = PurposeMatcher.suggest_field_key(field_name, field_type)
                category = PurposeMatcher.suggest_category(field_name, field_type)
                
                # Check if field_key already exists
                existing = FieldLibrary.query.filter_by(field_key=field_key).first()
                if existing:
                    # Use existing
                    field_library_id = existing.id
                    existing.usage_count += 1
                    matched_count += 1
                    created_count -= 1
                else:
                    # Create new
                    new_field = FieldLibrary(
                        field_key=field_key,
                        canonical_name=field_name,
                        field_type=field_type,
                        data_type=field_data.get('dataType', 'string'),
                        category=category,
                        validation_rules=json.dumps(field_data.get('validation', {})) if field_data.get('validation') else None,
                        options=json.dumps(field_data.get('options', [])) if field_data.get('options') else None,
                        help_text=field_data.get('helpText'),
                        placeholder=field_data.get('placeholder'),
                        usage_count=1,
                        first_used_by=data.get('name')
                    )
                    db.session.add(new_field)
                    db.session.flush()  # Get ID
                    field_library_id = new_field.id
            
            # Create field reference with board-specific overrides
            field_references.append({
                'field_library_id': field_library_id,
                'display_order': i,
                'overrides': {
                    'display_name': field_name,
                    'required': field_data.get('required', False),
                    'help_text': field_data.get('helpText'),
                    'placeholder': field_data.get('placeholder')
                }
            })
        
        # Create application type with both formats for backward compatibility
        app_type = ApplicationType(
            name=data.get('name'),
            description=data.get('description'),
            renewal_period=data.get('renewalPeriod'),
            duration=data.get('duration'),
            license_number_format=data.get('licenseNumberFormat'),
            source_document=data.get('sourceDocument'),
            parser_version=data.get('parserVersion'),
            form_definition=json.dumps(fields),  # OLD FORMAT (backward compatibility)
            form_fields_v2=json.dumps(field_references),  # NEW FORMAT (UFL)
            workflow_definition=json.dumps(data.get('workflow', {})),
            fees_definition=json.dumps(data.get('fees', {})),
            active=True
        )
        
        db.session.add(app_type)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Application type created successfully ({matched_count} fields matched, {created_count} new)',
            'applicationType': app_type.to_dict(),
            'stats': {
                'total_fields': len(fields),
                'matched': matched_count,
                'created': created_count,
                'reuse_rate': (matched_count / len(fields) * 100) if len(fields) > 0 else 0
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>', methods=['PUT'])
def update_application_type(type_id):
    """Update an application type's form definition"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        data = request.json
        
        # Update form definition if provided
        if 'form_definition' in data:
            app_type.form_definition = data['form_definition']
        
        # Update form elements if provided (new structure)
        # Accept 'fields' as primary, 'form_elements' for backward compatibility
        if 'fields' in data:
            elements_data = data['fields']
        elif 'form_elements' in data:
            elements_data = data['form_elements']  # Deprecated
        else:
            elements_data = None
        
        if elements_data:
            from purpose_matcher import PurposeMatcher
            import json
            
            # Save ALL elements first (sections, fields, document uploads, etc.)
            app_type.form_definition = json.dumps(elements_data)
            
            # Convert ONLY field elements to field library references for processing
            fields = []
            for element in elements_data:
                if element.get('type') == 'field':
                    fields.append({
                        'name': element.get('name') or element.get('label') or element.get('display_name'),
                        'label': element.get('label') or element.get('display_name') or element.get('canonical_name'),
                        'type': element.get('field_type') or element.get('type'),
                        'required': element.get('required', False),
                        'helpText': element.get('help_text') or element.get('helpText'),
                        'placeholder': element.get('placeholder'),
                        'options': element.get('options')
                    })
            
            # Run PurposeMatcher to maintain Field Library linkage
            field_references = []
            for i, field_data in enumerate(fields, 1):
                field_name = field_data.get('name') or field_data.get('label', '')
                field_type = field_data.get('type', 'text')
                
                # Try to match to existing UFL field
                match, confidence, match_type = PurposeMatcher.find_match(
                    field_name, field_type, FieldLibrary.query
                )
                
                if match and confidence >= 0.5:
                    field_library_id = match.id
                    match.usage_count += 1
                else:
                    # Create new field in UFL
                    field_key = PurposeMatcher.suggest_field_key(field_name, field_type)
                    existing = FieldLibrary.query.filter_by(field_key=field_key).first()
                    
                    if existing:
                        field_library_id = existing.id
                        existing.usage_count += 1
                    else:
                        new_field = FieldLibrary(
                            field_key=field_key,
                            canonical_name=field_name,
                            field_type=field_type,
                            data_type=field_data.get('dataType', 'string'),
                            category=PurposeMatcher.suggest_category(field_name, field_type),
                            validation_rules=json.dumps(field_data.get('validation', {})) if field_data.get('validation') else None,
                            options=json.dumps(field_data.get('options', [])) if field_data.get('options') else None,
                            help_text=field_data.get('helpText'),
                            placeholder=field_data.get('placeholder'),
                            usage_count=1,
                            first_used_by=app_type.name
                        )
                        db.session.add(new_field)
                        db.session.flush()
                        field_library_id = new_field.id
                
                field_references.append({
                    'field_library_id': field_library_id,
                    'display_order': i,
                    'overrides': {
                        'display_name': field_name,
                        'required': field_data.get('required', False),
                        'help_text': field_data.get('helpText'),
                        'placeholder': field_data.get('placeholder')
                    }
                })
            
            # Update form_fields_v2 for field library linkage
            app_type.form_fields_v2 = json.dumps(field_references)
        
        # Update sections if provided (for AI-extracted interviews)
        if 'sections' in data:
            import json
            app_type.sections = json.dumps(data['sections']) if isinstance(data['sections'], (list, dict)) else data['sections']
        
        # Update other fields if provided
        if 'name' in data:
            app_type.name = data['name']
        if 'description' in data:
            app_type.description = data['description']
        if 'active' in data:
            app_type.active = data['active']
        if 'status' in data:
            app_type.status = data['status']
        
        # Update fee configuration if provided
        if 'baseFee' in data:
            app_type.base_fee = float(data['baseFee'])
        if 'lateFeePercentage' in data:
            app_type.late_fee_percentage = float(data['lateFeePercentage'])
        if 'renewalWindowDays' in data:
            app_type.renewal_window_days = int(data['renewalWindowDays'])
        if 'expirationMonths' in data:
            app_type.expiration_months = int(data['expirationMonths'])
        
        # Update steps configuration if provided
        if 'steps' in data:
            app_type.steps = json.dumps(data['steps']) if data['steps'] else None
        else:
            # Auto-configure steps if not manually provided
            from step_auto_configurator import StepAutoConfigurator
            try:
                StepAutoConfigurator.auto_configure_application_type(app_type, db)
            except Exception as e:
                print(f"Warning: Auto-configuration failed: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Application type updated successfully',
            'applicationType': app_type.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>/conditional-rules', methods=['GET'])
def get_conditional_rules(type_id):
    """Get conditional rules for an application type"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        rules = json.loads(app_type.conditional_rules) if app_type.conditional_rules else []
        
        return jsonify({
            'success': True,
            'rules': rules
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>/conditional-rules', methods=['PUT'])
def update_conditional_rules(type_id):
    """Update conditional rules for an application type"""
    try:
        from conditional_rule_validator import ConditionalRuleValidator
        
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        data = request.json
        rules = data.get('rules', [])
        
        # Get available fields from form_fields_v2 or form_definition
        available_fields = []
        if app_type.form_fields_v2:
            # Get fields from v2 format
            field_refs = json.loads(app_type.form_fields_v2)
            for ref in field_refs:
                field_lib_id = ref.get('field_library_id')
                if field_lib_id:
                    field_lib = FieldLibrary.query.get(field_lib_id)
                    if field_lib:
                        available_fields.append(field_lib.field_key)
        elif app_type.form_definition:
            # Get fields from old format
            fields = json.loads(app_type.form_definition)
            for field in fields:
                if isinstance(field, dict):
                    field_name = field.get('name') or field.get('label', '')
                    if field_name:
                        available_fields.append(field_name)
        
        # Validate rules
        is_valid, errors = ConditionalRuleValidator.validate_rules(
            json.dumps(rules), available_fields
        )
        
        if not is_valid:
            return jsonify({
                'error': 'Invalid rules',
                'validation_errors': errors
            }), 400
        
        # Detect conflicts
        conflicts = ConditionalRuleValidator.detect_conflicts(rules)
        
        # Save rules
        app_type.conditional_rules = json.dumps(rules)
        app_type.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Conditional rules updated successfully',
            'conflicts': conflicts
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/validate-rule', methods=['POST'])
def validate_conditional_rule():
    """Validate a conditional rule before saving"""
    try:
        from conditional_rule_validator import ConditionalRuleValidator
        
        data = request.json
        rule = data.get('rule')
        available_fields = data.get('available_fields', [])
        
        if not rule:
            return jsonify({'error': 'No rule provided'}), 400
        
        is_valid, error = ConditionalRuleValidator.validate_rule(rule, available_fields)
        
        return jsonify({
            'valid': is_valid,
            'error': error if not is_valid else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== Validation Rules Endpoints ====================

@app.route('/api/application-types/<int:type_id>/validation-rules', methods=['GET'])
def get_validation_rules(type_id):
    """Get validation rules for an application type"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        rules = json.loads(app_type.validation_rules) if app_type.validation_rules else {}
        
        return jsonify({
            'success': True,
            'validation_rules': rules
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>/validation-rules', methods=['PUT'])
def update_validation_rules(type_id):
    """Update validation rules for an application type"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        data = request.json
        rules = data.get('validation_rules', {})
        
        # Validate rules structure
        if not isinstance(rules, dict):
            return jsonify({'error': 'Validation rules must be an object'}), 400
        
        # Validate each field's rules
        for field_name, field_rules in rules.items():
            if not isinstance(field_rules, dict):
                return jsonify({'error': f'Rules for {field_name} must be an object'}), 400
            
            # Check for valid rule types
            valid_rule_types = [
                'required', 'format', 'min_length', 'max_length',
                'min_value', 'max_value', 'regex', 'custom_message'
            ]
            for rule_type in field_rules.keys():
                if rule_type not in valid_rule_types:
                    return jsonify({'error': f'Invalid rule type: {rule_type}'}), 400
            
            # Validate format values
            if 'format' in field_rules:
                valid_formats = [
                    'email', 'phone', 'ssn', 'zip_code', 'date',
                    'url', 'license_number', 'npi'
                ]
                if field_rules['format'] not in valid_formats:
                    return jsonify({'error': f'Invalid format: {field_rules["format"]}'}), 400
        
        # Save rules
        app_type.validation_rules = json.dumps(rules)
        app_type.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Validation rules updated successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/<int:type_id>', methods=['DELETE'])
def delete_application_type(type_id):
    """Soft delete an application type by setting active=False"""
    try:
        app_type = ApplicationType.query.get(type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        # Soft delete - mark as inactive instead of actually deleting
        # This preserves historical records and prevents foreign key constraint issues
        app_type.active = False
        app_type.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Application type deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/import', methods=['POST'])
def import_application_types():
    """Import multiple application types from parsed document (bulk)"""
    try:
        data = request.json
        application_types = data.get('applicationTypes', [])
        metadata = data.get('metadata', {})
        
        imported = []
        for app_data in application_types:
            app_type = ApplicationType(
                name=app_data.get('applicationType'),
                description=app_data.get('description', ''),
                renewal_period=app_data.get('renewalPeriod'),
                duration=app_data.get('duration'),
                license_number_format=app_data.get('licenseNumberFormat'),
                source_document=metadata.get('documentSource'),
                parser_version=metadata.get('parserVersion'),
                form_definition=json.dumps(app_data.get('fields', [])),
                workflow_definition=json.dumps(app_data.get('workflow', {})),
                fees_definition=json.dumps(app_data.get('fees', {})),
                active=True
            )
            db.session.add(app_type)
            imported.append(app_type)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Imported {len(imported)} application types successfully',
            'applicationTypes': [at.to_dict() for at in imported]
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/application-types/import-csv', methods=['POST'])
def import_csv():
    """Import application type from CSV file with UFL integration"""
    try:
        data = request.json
        csv_content = data.get('csvContent')
        application_name = data.get('applicationName')
        
        if not csv_content:
            return jsonify({'error': 'No CSV content provided'}), 400
        
        if not application_name:
            return jsonify({'error': 'Application name is required'}), 400
        
        # Parse CSV with UFL integration
        parser = CSVParser(db.session)
        result = parser.create_application_type_from_csv(csv_content, application_name)
        
        if not result['success']:
            return jsonify(result), 400
        
        # Create application type with matched and new fields
        fields = result['fields']
        matched_fields = result.get('matched_fields', [])
        new_fields = result.get('new_fields', [])
        
        # Build field_references array for form_fields_v2 (UFL format)
        field_references = []
        field_library_map = {}  # Map field names to library IDs
        
        # First, update usage counts for matched fields and build map
        for matched_field in matched_fields:
            field_lib = FieldLibrary.query.get(matched_field['field_library_id'])
            if field_lib:
                field_lib.usage_count = (field_lib.usage_count or 0) + 1
                field_library_map[matched_field['display_name']] = matched_field['field_library_id']
        
        # Second, add new fields to UFL and build map
        for new_field in new_fields:
            # Check if field_key already exists
            existing = FieldLibrary.query.filter_by(field_key=new_field['name']).first()
            
            if existing:
                # Field key exists - check if it's the same type
                if existing.field_type == new_field['type']:
                    # Same field, just increment usage
                    existing.usage_count = (existing.usage_count or 0) + 1
                    field_library_map[new_field['label']] = existing.id
                else:
                    # Different type - create variant with type suffix
                    variant_key = f"{new_field['name']}_{new_field['type']}"
                    field_lib = FieldLibrary(
                        field_key=variant_key,
                        canonical_name=new_field['label'],
                        description=new_field.get('helpText', ''),
                        field_type=new_field['type'],
                        data_type='string',  # Default
                        category=new_field.get('category', 'Other'),
                        placeholder=new_field.get('placeholder', ''),
                        help_text=new_field.get('helpText', ''),
                        options=json.dumps(new_field.get('options', [])) if new_field.get('options') else None,
                        usage_count=1
                    )
                    db.session.add(field_lib)
                    db.session.flush()  # Get ID
                    field_library_map[new_field['label']] = field_lib.id
            else:
                # New field - add to UFL
                field_lib = FieldLibrary(
                    field_key=new_field['name'],
                    canonical_name=new_field['label'],
                    description=new_field.get('helpText', ''),
                    field_type=new_field['type'],
                    data_type='string',  # Default
                    category=new_field.get('category', 'Other'),
                    placeholder=new_field.get('placeholder', ''),
                    help_text=new_field.get('helpText', ''),
                    options=json.dumps(new_field.get('options', [])) if new_field.get('options') else None,
                    usage_count=1
                )
                db.session.add(field_lib)
                db.session.flush()  # Get ID
                field_library_map[new_field['label']] = field_lib.id
        
        # Third, build field_references array using the map
        for i, field in enumerate(fields, 1):
            field_label = field.get('label', '')
            field_library_id = field_library_map.get(field_label)
            
            if field_library_id:
                field_references.append({
                    'field_library_id': field_library_id,
                    'display_order': i,
                    'overrides': {
                        'display_name': field_label,
                        'required': field.get('required', False),
                        'help_text': field.get('helpText'),
                        'placeholder': field.get('placeholder')
                    }
                })
        
        # Create the application type with BOTH formats
        app_type = ApplicationType(
            name=application_name,
            description=f"Imported from CSV - {result['total_count']} fields",
            renewal_period=24,
            duration=24,
            license_number_format='LIC-{YYYY}-{####}',
            source_document='CSV Import',
            parser_version='csv_v1.0',
            form_definition=json.dumps(fields),  # OLD FORMAT (backward compatibility)
            form_fields_v2=json.dumps(field_references),  # NEW FORMAT (UFL)
            workflow_definition=json.dumps({}),
            fees_definition=json.dumps({}),
            active=True
        )
        db.session.add(app_type)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'CSV imported successfully: {result["matched_count"]} fields matched, {result["new_count"]} new fields added',
            'applicationType': app_type.to_dict(),
            'stats': {
                'total_fields': result['total_count'],
                'matched_fields': result['matched_count'],
                'new_fields': result['new_count'],
                'reuse_rate': result['reuse_rate']
            },
            'warnings': result.get('warnings', []),
            'errors': result.get('errors', [])
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# FIELD LIBRARY API ENDPOINTS
# ============================================================================

@app.route('/api/field-library', methods=['GET'])
def get_field_library():
    """Get all fields from library with optional filtering"""
    try:
        category = request.args.get('category')
        search = request.args.get('search')
        
        query = FieldLibrary.query
        
        if category and category != 'all':
            query = query.filter_by(category=category)
        
        if search:
            query = query.filter(
                db.or_(
                    FieldLibrary.canonical_name.ilike(f'%{search}%'),
                    FieldLibrary.field_key.ilike(f'%{search}%')
                )
            )
        
        fields = query.order_by(FieldLibrary.usage_count.desc()).all()
        return jsonify([f.to_dict() for f in fields])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/<int:id>', methods=['GET'])
def get_field_library_item(id):
    """Get a single field from library by ID"""
    try:
        field = FieldLibrary.query.get_or_404(id)
        return jsonify(field.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library', methods=['POST'])
def create_field_library_item():
    """Create a new field in the library"""
    try:
        data = request.json
        
        # Check if field_key already exists
        existing = FieldLibrary.query.filter_by(field_key=data['field_key']).first()
        if existing:
            return jsonify({'error': 'Field key already exists'}), 400
        
        field = FieldLibrary(
            field_key=data['field_key'],
            canonical_name=data['canonical_name'],
            description=data.get('description'),
            field_type=data['field_type'],
            data_type=data.get('data_type'),
            validation_rules=json.dumps(data.get('validation_rules')) if data.get('validation_rules') else None,
            placeholder=data.get('placeholder'),
            help_text=data.get('help_text'),
            default_value=data.get('default_value'),
            options=json.dumps(data.get('options')) if data.get('options') else None,
            options_source=data.get('options_source'),
            options_lookup_table=data.get('options_lookup_table'),
            category=data.get('category'),
            subcategory=data.get('subcategory'),
            tags=json.dumps(data.get('tags', [])),
            usage_count=data.get('usage_count', 0),
            first_used_by=data.get('first_used_by'),
            thentia_attribute_name=data.get('thentia_attribute_name'),
            salesforce_field_name=data.get('salesforce_field_name'),
            common_aliases=json.dumps(data.get('common_aliases', []))
        )
        
        db.session.add(field)
        db.session.commit()
        
        return jsonify(field.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/match', methods=['POST'])
def match_field_to_library():
    """
    Find matching field in library based on name, label, type.
    Returns best match with confidence score.
    """
    try:
        data = request.json
        
        # Generate field_key from name
        field_name = data.get('name', '')
        field_key = re.sub(r'[^a-z0-9_]', '', field_name.lower().replace(' ', '_').replace('-', '_'))
        field_key = re.sub(r'_+', '_', field_key).strip('_')
        
        # Try exact key match
        exact_match = FieldLibrary.query.filter_by(field_key=field_key).first()
        if exact_match:
            result = exact_match.to_dict()
            result['confidence'] = 1.0
            result['match_type'] = 'exact_key'
            return jsonify(result)
        
        # Try external system field name match
        external_system = data.get('external_system')
        external_field_name = data.get('external_field_name')
        
        if external_system == 'thentia' and external_field_name:
            thentia_match = FieldLibrary.query.filter_by(
                thentia_attribute_name=external_field_name
            ).first()
            if thentia_match:
                result = thentia_match.to_dict()
                result['confidence'] = 1.0
                result['match_type'] = 'thentia_attribute'
                return jsonify(result)
        
        # Try label similarity match
        label = data.get('label', '').lower()
        if label:
            similar = FieldLibrary.query.filter(
                FieldLibrary.canonical_name.ilike(f'%{label}%')
            ).first()
            
            if similar:
                result = similar.to_dict()
                result['confidence'] = 0.8
                result['match_type'] = 'label_similarity'
                return jsonify(result)
        
        # No match found
        return jsonify({'match': None, 'confidence': 0.0}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/stats', methods=['GET'])
def get_field_library_stats():
    """Get statistics about the field library"""
    try:
        total_fields = FieldLibrary.query.count()
        
        # Count by category
        categories = db.session.query(
            FieldLibrary.category,
            db.func.count(FieldLibrary.id)
        ).group_by(FieldLibrary.category).all()
        
        # Most used fields
        most_used = FieldLibrary.query.order_by(
            FieldLibrary.usage_count.desc()
        ).limit(10).all()
        
        return jsonify({
            'total_fields': total_fields,
            'categories': [{'category': c[0], 'count': c[1]} for c in categories],
            'most_used_fields': [f.to_dict() for f in most_used]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/import/analyze', methods=['POST'])
def analyze_field_library_import():
    """Analyze a CSV file for Field Library import and check for existing fields"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read CSV content
        csv_content = file.read().decode('utf-8')
        
        # Initialize importer
        importer = FieldLibraryImporter(db, FieldLibrary)
        
        # Detect import type
        import_type = importer.detect_import_type(csv_content)
        
        if import_type == 'reference_data':
            # Analyze reference data
            analysis = importer.analyze_reference_data(csv_content)
            analysis['import_type'] = 'reference_data'
            return jsonify(analysis)
        
        elif import_type == 'field_definitions':
            return jsonify({
                'import_type': 'field_definitions',
                'message': 'Field definitions import not yet implemented'
            })
        
        else:
            return jsonify({
                'error': 'Unable to determine import type',
                'import_type': 'unknown'
            }), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/import/execute', methods=['POST'])
def execute_field_library_import():
    """Execute Field Library import with specified merge strategy"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get merge strategy from form data
        merge_strategy = request.form.get('merge_strategy', 'merge')  # merge, replace, create_new
        field_key = request.form.get('field_key')
        field_name = request.form.get('field_name')
        board_name = request.form.get('board_name', 'Admin')
        
        # Read CSV content
        csv_content = file.read().decode('utf-8')
        
        # Initialize importer
        importer = FieldLibraryImporter(db, FieldLibrary)
        
        # Detect import type
        import_type = importer.detect_import_type(csv_content)
        
        if import_type == 'reference_data':
            result = importer.import_reference_data(
                csv_content,
                field_key=field_key,
                field_name=field_name,
                board_name=board_name,
                merge_strategy=merge_strategy
            )
            return jsonify(result)
        
        elif import_type == 'field_definitions':
            result = importer.import_field_definitions(csv_content, board_name=board_name)
            return jsonify(result)
        
        else:
            return jsonify({'error': 'Unable to determine import type'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# FORM TEMPLATES API ENDPOINTS
# ============================================================================

@app.route('/api/form-templates', methods=['GET'])
def get_form_templates():
    """Get all form templates"""
    try:
        conn = db.engine.raw_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description, template_type, fields, sections, is_active
            FROM form_templates
            WHERE is_active = 1
            ORDER BY 
                CASE template_type
                    WHEN 'blank' THEN 1
                    WHEN 'standard_license' THEN 2
                    WHEN 'renewal' THEN 3
                    WHEN 'endorsement' THEN 4
                    WHEN 'temporary' THEN 5
                    ELSE 99
                END
        """)
        
        templates = []
        for row in cursor.fetchall():
            templates.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'template_type': row[3],
                'fields': json.loads(row[4]) if row[4] else [],
                'sections': json.loads(row[5]) if row[5] else [],
                'is_active': bool(row[6])
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'templates': templates
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/form-templates/<int:template_id>', methods=['GET'])
def get_form_template(template_id):
    """Get a specific form template"""
    try:
        conn = db.engine.raw_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description, template_type, fields, sections, is_active
            FROM form_templates
            WHERE id = ?
        """, (template_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Template not found'}), 404
        
        template = {
            'id': row[0],
            'name': row[1],
            'description': row[2],
            'template_type': row[3],
            'fields': json.loads(row[4]) if row[4] else [],
            'sections': json.loads(row[5]) if row[5] else [],
            'is_active': bool(row[6])
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'template': template
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# CONDITIONAL RULES API ENDPOINTS
# ============================================================================

# ============================================================================
# FIELD LIBRARY SYNC API ENDPOINTS
# ============================================================================

@app.route('/api/field-library/check-duplicate', methods=['POST'])
def check_field_duplicate():
    """Check if a field would be a duplicate before creating it"""
    try:
        from field_library_sync import FieldLibrarySync
        
        data = request.json
        field_name = data.get('name')
        field_type = data.get('type', 'text')
        
        if not field_name:
            return jsonify({'error': 'Field name is required'}), 400
        
        sync = FieldLibrarySync(db, FieldLibrary)
        result = sync.check_duplicate(field_name, field_type)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/create-from-form', methods=['POST'])
def create_field_from_form():
    """Create a new field in Field Library from Form Builder"""
    try:
        from field_library_sync import FieldLibrarySync
        
        data = request.json
        field_data = data.get('field')
        created_by = data.get('created_by', 'Form Builder')
        
        if not field_data:
            return jsonify({'error': 'Field data is required'}), 400
        
        sync = FieldLibrarySync(db, FieldLibrary)
        field, was_created = sync.get_or_create_field(field_data, created_by)
        
        return jsonify({
            'success': True,
            'field': {
                'id': field.id,
                'field_key': field.field_key,
                'canonical_name': field.canonical_name,
                'field_type': field.field_type,
                'category': field.category,
                'is_pii': field.is_pii,
                'is_hipaa': field.is_hipaa,
                'obfuscation_rule': field.obfuscation_rule
            },
            'was_created': was_created,
            'message': 'Field created' if was_created else 'Using existing field'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/field-library/<int:field_id>/flags', methods=['PUT'])
def update_field_flags(field_id):
    """Update PII/HIPAA flags and obfuscation rule for a field"""
    try:
        field = FieldLibrary.query.get(field_id)
        if not field:
            return jsonify({'error': 'Field not found'}), 404
        
        data = request.json
        
        if 'is_pii' in data:
            field.is_pii = data['is_pii']
        if 'is_hipaa' in data:
            field.is_hipaa = data['is_hipaa']
        if 'obfuscation_rule' in data:
            field.obfuscation_rule = data['obfuscation_rule']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'field': {
                'id': field.id,
                'field_key': field.field_key,
                'canonical_name': field.canonical_name,
                'is_pii': field.is_pii,
                'is_hipaa': field.is_hipaa,
                'obfuscation_rule': field.obfuscation_rule
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# LICENSEE DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/users/<int:user_id>/licenses', methods=['GET'])
def get_user_licenses(user_id):
    """Get all licenses for a specific user"""
    try:
        licenses = License.query.filter_by(user_id=user_id).all()
        return jsonify({
            'licenses': [license.to_dict() for license in licenses]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/applications', methods=['GET'])
def get_user_applications(user_id):
    """Get all applications for a specific user"""
    try:
        applications = LicenseApplication.query.filter_by(user_id=user_id).order_by(LicenseApplication.submitted_at.desc()).all()
        return jsonify({
            'applications': [app.to_dict() for app in applications]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/license-applications', methods=['GET'])
def get_license_applications():
    """Get all license applications for admin review"""
    try:
        applications = LicenseApplication.query.order_by(LicenseApplication.submitted_at.desc()).all()
        return jsonify({
            'success': True,
            'applications': [app.to_dict() for app in applications]
        }), 200
    except Exception as e:
        app.logger.error(f"[LICENSE_APP] Error fetching applications: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/license-applications', methods=['POST'])
def submit_license_application():
    """Submit a new license application"""
    import sys
    import traceback
    
    try:
        data = request.json
        app.logger.info(f"[LICENSE_APP] Received application data: {data}")
        sys.stdout.flush()
        
        # Create new application
        application = LicenseApplication(
            user_id=data['user_id'],
            application_type_id=data['application_type_id'],
            form_data=json.dumps(data.get('form_data', {})),
            is_renewal=data.get('is_renewal', False),
            license_id=data.get('license_id')  # If renewal
        )
        
        app.logger.info(f"[LICENSE_APP] Created application object for user_id={application.user_id}")
        sys.stdout.flush()
        
        db.session.add(application)
        app.logger.info(f"[LICENSE_APP] Added to session")
        sys.stdout.flush()
        
        db.session.commit()
        app.logger.info(f"[LICENSE_APP] Committed to database, assigned ID: {application.id}")
        sys.stdout.flush()
        
        # VERIFICATION: Immediately query to confirm persistence
        verification = LicenseApplication.query.get(application.id)
        if verification:
            app.logger.info(f"[LICENSE_APP] ✓ VERIFIED: Application {application.id} exists in database")
        else:
            app.logger.error(f"[LICENSE_APP] ✗ VERIFICATION FAILED: Application {application.id} NOT found in database after commit!")
        sys.stdout.flush()
        
        return jsonify({
            'message': 'Application submitted successfully',
            'application': application.to_dict()
        }), 201
    except Exception as e:
        app.logger.error(f"[LICENSE_APP] ERROR: {str(e)}")
        app.logger.error(f"[LICENSE_APP] Traceback: {traceback.format_exc()}")
        sys.stdout.flush()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/license-applications/<int:app_id>', methods=['PUT'])
def update_license_application(app_id):
    """Update a license application (status, review notes, etc.)"""
    try:
        application = LicenseApplication.query.get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        data = request.json
        app.logger.info(f"[LICENSE_APP_UPDATE] Updating application {app_id} with data: {data}")
        
        # Track if status is changing to approved
        old_status = application.status
        
        # Update allowed fields
        if 'status' in data:
            application.status = data['status']
            app.logger.info(f"[LICENSE_APP_UPDATE] Updated status to: {data['status']}")
        
        if 'review_notes' in data:
            application.review_notes = data['review_notes']
        
        if 'reviewed_by' in data:
            application.reviewed_by = data['reviewed_by']
        
        if 'reviewed_at' in data:
            application.reviewed_at = datetime.utcnow()
        
        # If status changed to approved, create a license
        license_created = None
        if old_status.lower() != 'approved' and application.status.lower() == 'approved':
            app.logger.info(f"[LICENSE_APP_UPDATE] Application approved, creating license...")
            
            # Generate unique license number
            from datetime import date
            year = date.today().year
            # Count existing licenses this year to get next number
            existing_count = License.query.filter(
                License.license_number.like(f'LIC-{year}-%')
            ).count()
            license_number = f'LIC-{year}-{str(existing_count + 1).zfill(4)}'
            
            # Get license type from application type
            license_type = application.application_type.name if application.application_type else 'General License'
            
            # Create license
            new_license = License(
                user_id=application.user_id,
                license_number=license_number,
                license_type=license_type,
                state='Oklahoma',  # Default state, could be from form data
                status='active',
                issue_date=date.today(),
                expiration_date=date(year + 1, date.today().month, date.today().day)  # 1 year from today
            )
            
            db.session.add(new_license)
            app.logger.info(f"[LICENSE_APP_UPDATE] Created license {license_number} for user {application.user_id}")
            license_created = new_license
        
        db.session.commit()
        app.logger.info(f"[LICENSE_APP_UPDATE] Successfully updated application {app_id}")
        
        if license_created:
            app.logger.info(f"[LICENSE_APP_UPDATE] License {license_created.license_number} committed to database")
        
        response_data = {
            'success': True,
            'message': 'Application updated successfully',
            'application': application.to_dict()
        }
        
        if license_created:
            response_data['license_created'] = license_created.to_dict()
            response_data['message'] = 'Application approved and license created successfully'
        
        return jsonify(response_data), 200
    except Exception as e:
        app.logger.error(f"[LICENSE_APP_UPDATE] Error updating application {app_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/license-applications/<int:app_id>', methods=['DELETE'])
def delete_license_application(app_id):
    """Delete a license application"""
    try:
        application = LicenseApplication.query.get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        app.logger.info(f"[LICENSE_APP_DELETE] Deleting application {app_id}")
        
        db.session.delete(application)
        db.session.commit()
        
        app.logger.info(f"[LICENSE_APP_DELETE] Successfully deleted application {app_id}")
        
        return jsonify({
            'success': True,
            'message': 'Application deleted successfully'
        }), 200
    except Exception as e:
        app.logger.error(f"[LICENSE_APP_DELETE] Error deleting application {app_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# SMART FIELD MATCHING ENDPOINTS - TEMPORARILY DISABLED
# ============================================================================

'''  # Commented out until debugging complete
@app.route('/api/fields/match', methods=['POST'])
def match_fields():
    """Smart field matching for CSV import"""
    try:
        data = request.json
        csv_columns = data.get('columns', [])
        
        if not csv_columns:
            return jsonify({'error': 'No columns provided'}), 400
        
        # Get Field Library query
        field_library_query = FieldLibrary.query
        
        # Batch match all columns
        results = SmartFieldMatcher.batch_match(csv_columns, field_library_query)
        
        return jsonify({
            'matches': results
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fields/user-schema', methods=['GET'])
def get_user_schema():
    """Get User table schema for field mapping"""
    try:
        return jsonify({
            'fields': SmartFieldMatcher.USER_TABLE_FIELDS
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fields/library', methods=['GET'])
def get_field_library_fields():
    """Get all Field Library fields for dropdown"""
    try:
        fields = FieldLibrary.query.order_by(FieldLibrary.usage_count.desc()).all()
        
        return jsonify({
            'fields': [{
                'id': f.id,
                'field_key': f.field_key,
                'label': f.canonical_name,
                'type': f.field_type,
                'category': f.category,
                'usage_count': f.usage_count,
                'source': 'field_library'
            } for f in fields]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fields/create', methods=['POST'])
def create_new_field():
    """Create a new field in Field Library"""
    try:
        data = request.json
        
        # Validate required fields
        required = ['field_key', 'canonical_name', 'field_type']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if field already exists
        existing = FieldLibrary.query.filter_by(field_key=data['field_key']).first()
        if existing:
            return jsonify({'error': 'Field with this key already exists'}), 409
        
        # Create new field
        new_field = FieldLibrary(
            field_key=data['field_key'],
            canonical_name=data['canonical_name'],
            description=data.get('description'),
            field_type=data['field_type'],
            data_type=data.get('data_type', 'string'),
            category=data.get('category', 'custom'),
            subcategory=data.get('subcategory'),
            placeholder=data.get('placeholder'),
            help_text=data.get('help_text'),
            usage_count=0,
            first_used_by=data.get('created_by', 'system')
        )
        
        db.session.add(new_field)
        db.session.commit()
        
        return jsonify({
            'message': 'Field created successfully',
            'field': new_field.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/fields/<int:field_id>/add-alias', methods=['POST'])
def add_field_alias(field_id):
    """Add an alias to an existing field (for learning)"""
    try:
        data = request.json
        alias = data.get('alias')
        
        if not alias:
            return jsonify({'error': 'No alias provided'}), 400
        
        field = FieldLibrary.query.get(field_id)
        if not field:
            return jsonify({'error': 'Field not found'}), 404
        
        # Parse existing aliases
        import json
        aliases = json.loads(field.common_aliases) if field.common_aliases else []
        
        # Add new alias if not already present
        normalized_alias = SmartFieldMatcher.normalize_field_key(alias)
        if normalized_alias not in [SmartFieldMatcher.normalize_field_key(a) for a in aliases]:
            aliases.append(alias)
            field.common_aliases = json.dumps(aliases)
            db.session.commit()
        
        return jsonify({
            'message': 'Alias added successfully',
            'aliases': aliases
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
'''  # End of commented section

# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

@app.route('/api/payments/calculate-fee', methods=['POST'])
def calculate_fee():
    """Calculate fee for an application (base fee + late fee if applicable)"""
    try:
        data = request.json
        application_type_id = data.get('application_type_id')
        is_late = data.get('is_late', False)
        
        if not application_type_id:
            return jsonify({'error': 'Application type ID required'}), 400
        
        app_type = ApplicationType.query.get(application_type_id)
        if not app_type:
            return jsonify({'error': 'Application type not found'}), 404
        
        base_fee = app_type.base_fee or 0.0
        late_fee = 0.0
        
        if is_late and app_type.late_fee_percentage:
            late_fee = base_fee * (app_type.late_fee_percentage / 100.0)
        
        total_amount = base_fee + late_fee
        
        return jsonify({
            'success': True,
            'base_fee': base_fee,
            'late_fee': late_fee,
            'late_fee_percentage': app_type.late_fee_percentage,
            'total_amount': total_amount,
            'expiration_months': app_type.expiration_months,
            'renewal_window_days': app_type.renewal_window_days
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments', methods=['POST'])
def create_payment():
    """Create a payment record and generate Tilled checkout URL (stub)"""
    try:
        data = request.json
        application_id = data.get('application_id')
        user_id = data.get('user_id')
        base_fee = data.get('base_fee')
        late_fee = data.get('late_fee', 0.0)
        
        if not all([application_id, user_id, base_fee is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Verify application exists
        application = LicenseApplication.query.get(application_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        total_amount = base_fee + late_fee
        
        # Create payment record
        payment = Payment(
            application_id=application_id,
            user_id=user_id,
            base_fee=base_fee,
            late_fee=late_fee,
            total_amount=total_amount,
            status='pending'
        )
        
        # TODO: Generate Tilled checkout URL
        # For now, use a placeholder URL that will be replaced with actual Tilled integration
        frontend_url = request.headers.get('Origin', 'http://localhost:5173')
        payment.success_url = f"{frontend_url}/licensee/application/{application_id}/payment-success"
        payment.cancel_url = f"{frontend_url}/licensee/application/{application_id}/payment-cancelled"
        
        # Placeholder Tilled checkout URL (will be replaced with actual Tilled API call)
        payment.tilled_checkout_url = f"https://checkout.tilled.com/pay?amount={total_amount}&return_url={payment.success_url}"
        
        db.session.add(payment)
        db.session.commit()
        
        app.logger.info(f"[PAYMENT_CREATE] Created payment {payment.id} for application {application_id}, amount: ${total_amount}")
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict()
        }), 201
    except Exception as e:
        app.logger.error(f"[PAYMENT_CREATE] Error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    """Get payment details"""
    try:
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/application/<int:application_id>', methods=['GET'])
def get_application_payments(application_id):
    """Get all payments for an application"""
    try:
        payments = Payment.query.filter_by(application_id=application_id).all()
        
        return jsonify({
            'success': True,
            'payments': [p.to_dict() for p in payments]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:payment_id>/status', methods=['PATCH'])
def update_payment_status(payment_id):
    """Update payment status (typically called by webhook)"""
    try:
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        data = request.json
        new_status = data.get('status')
        
        if new_status not in ['pending', 'completed', 'failed', 'cancelled', 'refunded']:
            return jsonify({'error': 'Invalid status'}), 400
        
        payment.status = new_status
        
        if new_status == 'completed' and not payment.paid_at:
            payment.paid_at = datetime.utcnow()
        
        # Update Tilled IDs if provided
        if 'tilled_payment_id' in data:
            payment.tilled_payment_id = data['tilled_payment_id']
        if 'tilled_session_id' in data:
            payment.tilled_session_id = data['tilled_session_id']
        
        db.session.commit()
        
        app.logger.info(f"[PAYMENT_STATUS] Updated payment {payment_id} status to {new_status}")
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict()
        }), 200
    except Exception as e:
        app.logger.error(f"[PAYMENT_STATUS] Error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/tilled', methods=['POST'])
def tilled_webhook():
    """Webhook endpoint for Tilled payment notifications"""
    try:
        data = request.json
        
        # TODO: Verify webhook signature for security
        
        event_type = data.get('type')
        payment_data = data.get('data', {})
        
        app.logger.info(f"[TILLED_WEBHOOK] Received event: {event_type}")
        
        # Handle different event types
        if event_type == 'payment_intent.succeeded':
            # Find payment by Tilled payment ID
            tilled_payment_id = payment_data.get('id')
            payment = Payment.query.filter_by(tilled_payment_id=tilled_payment_id).first()
            
            if payment:
                payment.status = 'completed'
                payment.paid_at = datetime.utcnow()
                db.session.commit()
                app.logger.info(f"[TILLED_WEBHOOK] Payment {payment.id} marked as completed")
        
        elif event_type == 'payment_intent.payment_failed':
            tilled_payment_id = payment_data.get('id')
            payment = Payment.query.filter_by(tilled_payment_id=tilled_payment_id).first()
            
            if payment:
                payment.status = 'failed'
                db.session.commit()
                app.logger.info(f"[TILLED_WEBHOOK] Payment {payment.id} marked as failed")
        
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"[TILLED_WEBHOOK] Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# PDF EXTRACTION ENDPOINT
# ============================================================================

@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    """Extract interview structure from uploaded PDF using AI"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get form data
        application_type_name = request.form.get('applicationName', 'Extracted Application')
        
        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Extract interview structure using AI
            from pdf_interview_extractor import PDFInterviewExtractor
            extractor = PDFInterviewExtractor(db=db, FieldLibrary=FieldLibrary)
            interview_data = extractor.extract_interview_from_pdf(tmp_path)
            
            # Create application type with extracted data
            app_type = ApplicationType(
                name=application_type_name,
                description=interview_data.get('description', ''),
                source_document=file.filename,
                parser_version='AI_PDF_Extractor_v1',
                sections=json.dumps(interview_data.get('sections', [])),
                form_definition=json.dumps({'extracted': True}),  # Mark as AI-extracted
                active=True,
                status='draft'
            )
            
            db.session.add(app_type)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully extracted {interview_data.get("total_questions", 0)} questions from PDF',
                'applicationType': app_type.to_dict(),
                'extractionStats': {
                    'total_sections': len(interview_data.get('sections', [])),
                    'total_questions': interview_data.get('total_questions', 0),
                    'estimated_time_minutes': interview_data.get('estimated_time_minutes', 0)
                }
            }), 201
            
        finally:
            # Clean up temporary file
            import os
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except Exception as e:
        app.logger.error(f"[PDF_EXTRACTION] Error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Register multi-step wizard endpoints
from multistep_wizard_endpoints import register_multistep_endpoints
register_multistep_endpoints(app, db, ApplicationSubmission, ApplicationType)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=False)

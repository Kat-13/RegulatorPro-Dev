from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///regulatory_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'regulatory-platform-secret-key-2024'

# CORS configuration - CRITICAL: Do not expose port 5000, only allow frontend port
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

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

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

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
        
        # Demo credentials - matches frontend expectations
        if email == 'admin@regulatepro.com' and password == 'admin123':
            # Create or get user
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    username='admin',
                    email=email,
                    password_hash='hashed_password',
                    first_name='Admin',
                    last_name='User'
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
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': 'Administrator'
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password. Please try again.'
            }), 401
            
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
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=data['password_hash'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)

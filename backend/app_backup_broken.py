from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///regulatory_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db = SQLAlchemy(app)

# Core Entity Models
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
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
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

# API Routes

# User Management
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    user = User(
        email=data['email'],
        password_hash=data['password_hash'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    
    user.email = data.get('email', user.email)
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify(user.to_dict())

# Profile Management
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

@app.route('/api/profiles/<int:profile_id>', methods=['GET'])
def get_profile(profile_id):
    profile = Profile.query.get_or_404(profile_id)
    return jsonify(profile.to_dict())

# Application Management
@app.route('/api/applications', methods=['GET'])
def get_applications():
    applications = Application.query.all()
    result = []
    for app in applications:
        app_dict = app.to_dict()
        # Add profile and user information
        if app.profile:
            app_dict['profile'] = app.profile.to_dict()
            if app.profile.user:
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

@app.route('/api/applications/<int:app_id>', methods=['GET'])
def get_application(app_id):
    application = Application.query.get_or_404(app_id)
    app_dict = application.to_dict()
    # Add profile and user information
    if application.profile:
        app_dict['profile'] = application.profile.to_dict()
        if application.profile.user:
            app_dict['user'] = application.profile.user.to_dict()
    return jsonify(app_dict)

@app.route('/api/applications/<int:app_id>', methods=['PUT'])
def update_application(app_id):
    application = Application.query.get_or_404(app_id)
    data = request.json
    
    application.status = data.get('status', application.status)
    if data.get('status') == 'Submitted' and not application.submitted_at:
        application.submitted_at = datetime.utcnow()
    application.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify(application.to_dict())

# Registration Management
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
        effective_date=datetime.strptime(data['effective_date'], '%Y-%m-%d').date() if data.get('effective_date') else None,
        expiration_date=datetime.strptime(data['expiration_date'], '%Y-%m-%d').date() if data.get('expiration_date') else None,
        status=data.get('status', 'Active')
    )
    db.session.add(registration)
    db.session.commit()
    return jsonify(registration.to_dict()), 201

# Dynamic Field Management
@app.route('/api/entities', methods=['GET'])
def get_entities():
    entities = Entity.query.all()
    return jsonify([entity.to_dict() for entity in entities])

@app.route('/api/entities/<int:entity_id>/fields', methods=['GET'])
def get_entity_fields(entity_id):
    fields = Field.query.filter_by(entity_id=entity_id).all()
    return jsonify([field.to_dict() for field in fields])

@app.route('/api/field-values/<int:entity_instance_id>', methods=['GET'])
def get_field_values(entity_instance_id):
    values = FieldValue.query.filter_by(entity_instance_id=entity_instance_id).all()
    return jsonify([value.to_dict() for value in values])

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
    return jsonify({'message': 'Database initialized successfully'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from rule_engine import RuleEngine
from datetime import datetime
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///regulatory_platform.db'
CORS(app, origins=["https://5173-iph2m5vold9ymnpblfqys-edd9f582.manusvm.computer", "https://5174-iph2m5vold9ymnpblfqys-edd9f582.manusvm.computer"])

rule_engine = RuleEngine()
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

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})

# ============================================================================
# RULE ENGINE ENDPOINTS - SPECIFIC ROUTES FIRST!
# ============================================================================

@app.route('/api/rules/sample', methods=['GET'])
def get_sample_rules():
    """Get sample rules for demonstration"""
    sample_rules = rule_engine.get_sample_rules()
    return jsonify({'rules': sample_rules}), 200

@app.route('/api/rules/evaluate', methods=['POST'])
def evaluate_rules():
    """Evaluate rules against application data"""
    data = request.json
    application_data = data.get('application_data', {})
    rule_type = data.get('rule_type', 'all')
    
    results = rule_engine.evaluate_rules(application_data, rule_type)
    
    return jsonify(results), 200

@app.route('/api/rules/test', methods=['POST'])
def test_rule():
    """Test a single rule against sample data"""
    data = request.json
    rule = data.get('rule', {})
    test_data = data.get('test_data', {})
    
    # Create temporary rule engine with single rule
    temp_rules = [rule]
    board_id = 'test'
    rule_engine.save_rules(board_id, temp_rules)
    
    # Evaluate
    test_data['board_id'] = board_id
    results = rule_engine.evaluate_rules(test_data)
    
    return jsonify(results), 200

# Dynamic routes come AFTER specific routes
@app.route('/api/rules/<board_id>', methods=['GET'])
def get_rules(board_id):
    """Get all rules for a board"""
    rules = rule_engine.load_rules(board_id)
    return jsonify({'rules': rules}), 200

@app.route('/api/rules/<board_id>', methods=['POST'])
def save_rules(board_id):
    """Save rules for a board"""
    data = request.json
    rules = data.get('rules', [])
    
    success = rule_engine.save_rules(board_id, rules)
    
    if success:
        return jsonify({'message': 'Rules saved successfully'}), 200
    else:
        return jsonify({'error': 'Failed to save rules'}), 500

# ============================================================================
# OTHER API ENDPOINTS
# ============================================================================

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
        
        # Create sample data
        if not User.query.first():
            # Create sample users
            users = [
                User(email='sarah.johnson@email.com', password_hash='hashed_password', first_name='Sarah', last_name='Johnson'),
                User(email='robert.chen@email.com', password_hash='hashed_password', first_name='Robert', last_name='Chen'),
                User(email='maria.garcia@email.com', password_hash='hashed_password', first_name='Maria', last_name='Garcia')
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
        return jsonify({'message': 'Database initialized successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        password_hash=data.get('password_hash', 'temp_hash'),
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

# Profile Management
@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    profiles = Profile.query.all()
    result = []
    for profile in profiles:
        profile_dict = profile.to_dict()
        if profile.user:
            profile_dict['user'] = profile.user.to_dict()
        result.append(profile_dict)
    return jsonify(result)

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    data = request.json
    profile = Profile(user_id=data['user_id'])
    db.session.add(profile)
    db.session.commit()
    return jsonify(profile.to_dict()), 201

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

# Dynamic Field Management
@app.route('/api/entities', methods=['GET'])
def get_entities():
    entities = Entity.query.all()
    return jsonify([entity.to_dict() for entity in entities])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

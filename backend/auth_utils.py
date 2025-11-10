"""
Authentication utilities for RegulatePro
Handles password hashing, verification, and session management
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

# Simple session storage (in production, use Redis or database)
active_sessions = {}

def hash_password(password):
    """Hash a password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(password, password_hash):
    """Verify a password against its hash"""
    try:
        salt, pwd_hash = password_hash.split('$')
        test_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return test_hash == pwd_hash
    except:
        return False

def create_session(user_id):
    """Create a new session token for a user"""
    token = secrets.token_urlsafe(32)
    active_sessions[token] = {
        'user_id': user_id,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(days=7)
    }
    return token

def verify_session(token):
    """Verify a session token and return user_id if valid"""
    if token not in active_sessions:
        return None
    
    session = active_sessions[token]
    if datetime.utcnow() > session['expires_at']:
        del active_sessions[token]
        return None
    
    return session['user_id']

def destroy_session(token):
    """Destroy a session"""
    if token in active_sessions:
        del active_sessions[token]

def require_auth(f):
    """Decorator to require authentication for an endpoint"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_session(token)
        if not user_id:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Add user_id to request context
        request.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated_function


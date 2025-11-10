"""
Document management utilities for RegulatePro
Handles file storage, categorization, and ZIP import
"""

import os
import uuid
import mimetypes
from pathlib import Path


# Storage configuration
STORAGE_BASE = os.path.join(os.path.dirname(__file__), '..', 'storage', 'licensees')

# Allowed file types
ALLOWED_EXTENSIONS = {
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'txt'
}

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
}

# File size limits (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB per file
MAX_TOTAL_SIZE_PER_USER = 100 * 1024 * 1024  # 100MB per user


def ensure_storage_directory():
    """Create storage directory if it doesn't exist"""
    os.makedirs(STORAGE_BASE, exist_ok=True)


def get_user_storage_path(license_number):
    """Get storage path for a specific user"""
    ensure_storage_directory()
    user_path = os.path.join(STORAGE_BASE, license_number)
    os.makedirs(user_path, exist_ok=True)
    return user_path


def get_category_path(license_number, category):
    """Get storage path for a specific category"""
    user_path = get_user_storage_path(license_number)
    category_path = os.path.join(user_path, category)
    os.makedirs(category_path, exist_ok=True)
    return category_path


def generate_unique_filename(original_filename):
    """Generate a unique filename while preserving extension"""
    ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    return unique_name


def categorize_file(filename):
    """
    Auto-categorize file based on filename patterns
    Returns: category string
    """
    lower = filename.lower()
    
    # Application documents
    if 'application' in lower or 'app_' in lower or lower.startswith('app.'):
        return 'application'
    
    # Education documents
    if any(word in lower for word in ['degree', 'diploma', 'transcript', 'education', 'certificate']):
        return 'education'
    
    # Notarized documents
    if any(word in lower for word in ['notarized', 'notary', 'affidavit', 'sworn']):
        return 'notarized'
    
    # Identification documents
    if any(word in lower for word in ['license', 'id', 'identification', 'passport', 'driver']):
        return 'identification'
    
    # Photos
    if any(word in lower for word in ['photo', 'headshot', 'picture', 'image']):
        return 'photo'
    
    # Check file extension for images
    ext = Path(filename).suffix.lower()
    if ext in ['.jpg', '.jpeg', '.png', '.gif']:
        return 'photo'
    
    # Default category
    return 'other'


def validate_file(filename, file_size):
    """
    Validate file type and size
    Returns: (is_valid, error_message)
    """
    # Check file extension
    ext = Path(filename).suffix.lower().lstrip('.')
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '.{ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        return False, f"File size exceeds maximum of {max_mb}MB"
    
    return True, None


def get_mime_type(filename):
    """Get MIME type for a file"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def save_uploaded_file(file_data, original_filename, license_number, category=None):
    """
    Save an uploaded file to storage
    
    Args:
        file_data: File content (bytes)
        original_filename: Original filename from upload
        license_number: User's license number
        category: Document category (optional, will auto-detect if not provided)
    
    Returns:
        dict with file info (filename, file_path, file_size, mime_type, category)
    """
    # Validate file
    file_size = len(file_data)
    is_valid, error = validate_file(original_filename, file_size)
    if not is_valid:
        raise ValueError(error)
    
    # Auto-categorize if not provided
    if not category:
        category = categorize_file(original_filename)
    
    # Generate unique filename
    unique_filename = generate_unique_filename(original_filename)
    
    # Get storage path
    category_path = get_category_path(license_number, category)
    file_path = os.path.join(category_path, unique_filename)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_data)
    
    # Get MIME type
    mime_type = get_mime_type(original_filename)
    
    return {
        'filename': unique_filename,
        'original_filename': original_filename,
        'file_path': file_path,
        'file_size': file_size,
        'mime_type': mime_type,
        'category': category
    }


def delete_file(file_path):
    """Delete a file from storage"""
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False


def get_user_total_storage(license_number):
    """Calculate total storage used by a user"""
    user_path = get_user_storage_path(license_number)
    total_size = 0
    
    for dirpath, dirnames, filenames in os.walk(user_path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            total_size += os.path.getsize(filepath)
    
    return total_size


def format_file_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


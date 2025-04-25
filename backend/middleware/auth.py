# backend/middleware/auth.py
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps
from flask import request, jsonify, current_app
import os
import json
import time



# Decorator for routes that require admin privileges
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        
        # Check if header is missing
        if not auth_header:
            return jsonify({'error': 'Authorization header is required'}), 401
        
        # Format should be "Bearer <token>"
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return jsonify({'error': 'Authorization header must be in format "Bearer <token>"'}), 401
        
        token = parts[1]
        
        # Try to verify the token with Firebase
        try:
            # Initialize Firebase if not already done
            if not initialize_firebase():
                return jsonify({'error': 'Firebase authentication is unavailable'}), 500
            
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            
            # Extract user_id
            user_id = decoded_token['uid']
            
            # Check if the user has admin custom claim
            if not decoded_token.get('admin', False):
                current_app.logger.warning(f"User {user_id} attempted to access admin route without admin privileges")
                return jsonify({'error': 'Admin access required for this operation'}), 403
            
            # Pass the user_id to the route handler
            kwargs['user_id'] = user_id
            
            return f(*args, **kwargs)
        except auth.ExpiredIdTokenError:
            return jsonify({'error': 'Token has expired. Please log in again.'}), 401
        except auth.InvalidIdTokenError:
            return jsonify({'error': 'Invalid token. Please log in again.'}), 401
        except auth.RevokedIdTokenError:
            return jsonify({'error': 'Token has been revoked. Please log in again.'}), 401
        except Exception as e:
            current_app.logger.error(f"Authentication error: {str(e)}")
            return jsonify({'error': 'Failed to authenticate token'}), 401
    
    return decorated_function

# Function to get user_id from token (for non-decorated functions)
def get_user_id_from_token():
    try:
        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        
        # Check if header is missing
        if not auth_header:
            return None
        
        # Format should be "Bearer <token>"
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return None
        
        token = parts[1]
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        
        # Extract user_id
        user_id = decoded_token['uid']
        
        return user_id
    except Exception as e:
        current_app.logger.error(f"Error extracting user_id from token: {str(e)}")
        return None

# Function to check if a user has admin privileges
def is_admin(user_id):
    try:
        # Get the user's custom claims
        user = auth.get_user(user_id)
        custom_claims = user.custom_claims or {}
        
        # Check if the user has the admin claim
        return custom_claims.get('admin', False)
    except Exception as e:
        current_app.logger.error(f"Error checking admin status for user {user_id}: {str(e)}")
        return False

# Return current user's info (optional helper function)
def get_current_user_info():
    try:
        user_id = get_user_id_from_token()
        if not user_id:
            return None
        
        # Get user info from Firebase
        user_record = auth.get_user(user_id)
        
        # Return relevant user info
        return {
            'uid': user_id,
            'email': user_record.email,
            'display_name': user_record.display_name,
            'photo_url': user_record.photo_url,
            'email_verified': user_record.email_verified,
            'custom_claims': user_record.custom_claims or {}
        }
    except Exception as e:
        current_app.logger.error(f"Error getting user info: {str(e)}")
        return None

# Admin helper functions

def set_user_admin_status(email, admin_status=True):
    """
    Set or remove admin privileges for a user by email
    Returns (success, message)
    """
    try:
        # Get the user by email
        try:
            user = auth.get_user_by_email(email)
        except auth.UserNotFoundError:
            return False, f"User with email {email} not found"
        
        # Update admin status in custom claims
        current_claims = user.custom_claims or {}
        current_claims['admin'] = admin_status
        
        # Set the custom claims
        auth.set_custom_user_claims(user.uid, current_claims)
        
        status_str = "granted" if admin_status else "revoked"
        return True, f"Admin privileges {status_str} for user {email}"
    except Exception as e:
        current_app.logger.error(f"Error setting admin status: {str(e)}")
        return False, f"Error setting admin status: {str(e)}"

def get_all_users(limit=1000):
    """
    Get all users from Firebase Auth
    Returns list of user records
    """
    try:
        # List all users
        page = auth.list_users()
        users = []
        
        # Get all users (up to limit)
        while page and len(users) < limit:
            for user in page.users:
                users.append({
                    'uid': user.uid,
                    'email': user.email,
                    'display_name': user.display_name,
                    'email_verified': user.email_verified,
                    'disabled': user.disabled,
                    'created_at': user.user_metadata.creation_timestamp if user.user_metadata else None,
                    'last_sign_in': user.user_metadata.last_sign_in_timestamp if user.user_metadata else None,
                    'is_admin': (user.custom_claims or {}).get('admin', False),
                    'custom_claims': user.custom_claims
                })
            
            # Get the next page of users
            if hasattr(page, 'next_page_token') and page.next_page_token:
                page = auth.list_users(page_token=page.next_page_token)
            else:
                break
        
        return users
    except Exception as e:
        current_app.logger.error(f"Error getting all users: {str(e)}")
        return None

def create_user(email, password, display_name=None, is_admin=False):
    """
    Create a new user in Firebase Auth
    Returns (success, user_record or error_message)
    """
    try:
        # Create the user
        user_properties = {
            'email': email,
            'email_verified': False,
            'password': password,
            'disabled': False
        }
        
        if display_name:
            user_properties['display_name'] = display_name
        
        user_record = auth.create_user(**user_properties)
        
        # Set admin status if requested
        if is_admin:
            auth.set_custom_user_claims(user_record.uid, {'admin': True})
        
        return True, user_record
    except Exception as e:
        current_app.logger.error(f"Error creating user: {str(e)}")
        return False, str(e)

def delete_user(uid):
    """
    Delete a user from Firebase Auth
    Returns (success, message)
    """
    try:
        # Delete the user
        auth.delete_user(uid)
        return True, f"User {uid} deleted successfully"
    except auth.UserNotFoundError:
        return False, f"User with ID {uid} not found"
    except Exception as e:
        current_app.logger.error(f"Error deleting user: {str(e)}")
        return False, str(e)

def update_user(uid, properties):
    """
    Update a user's properties in Firebase Auth
    properties: dict of properties to update (email, display_name, password, disabled, etc.)
    Returns (success, user_record or error_message)
    """
    try:
        # Update the user
        user_record = auth.update_user(uid, **properties)
        return True, user_record
    except auth.UserNotFoundError:
        return False, f"User with ID {uid} not found"
    except Exception as e:
        current_app.logger.error(f"Error updating user: {str(e)}")
        return False, str(e)

def get_user_by_id(uid):
    """
    Get a user by ID from Firebase Auth
    Returns user record or None
    """
    try:
        user_record = auth.get_user(uid)
        
        return {
            'uid': user_record.uid,
            'email': user_record.email,
            'display_name': user_record.display_name,
            'email_verified': user_record.email_verified,
            'disabled': user_record.disabled,
            'created_at': user_record.user_metadata.creation_timestamp if user_record.user_metadata else None,
            'last_sign_in': user_record.user_metadata.last_sign_in_timestamp if user_record.user_metadata else None,
            'is_admin': (user_record.custom_claims or {}).get('admin', False),
            'custom_claims': user_record.custom_claims
        }
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        current_app.logger.error(f"Error getting user by ID: {str(e)}")
        return None
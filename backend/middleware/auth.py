# backend/middleware/auth.py
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps
from flask import request, jsonify, current_app
import os
import json

# Initialize Firebase Admin with service account
firebase_initialized = False

def initialize_firebase():
    global firebase_initialized
    if not firebase_initialized:
        try:
            # Path to service account credentials file
            service_account_path = os.path.join(os.path.dirname(__file__), '../firebase-credentials.json')
            
            # Check if file exists
            if not os.path.exists(service_account_path):
                # Create a temporary credentials file from environment variable if available
                firebase_credentials = os.environ.get('FIREBASE_CREDENTIALS')
                if firebase_credentials:
                    try:
                        # Parse JSON string from environment variable
                        creds_dict = json.loads(firebase_credentials)
                        with open(service_account_path, 'w') as f:
                            json.dump(creds_dict, f)
                        print(f"✅ Created Firebase credentials file from environment variable")
                    except Exception as e:
                        print(f"❌ Failed to create Firebase credentials file from environment: {str(e)}")
                        return False
                else:
                    print(f"❌ Firebase credentials file not found at {service_account_path}")
                    return False
            
            # Initialize Firebase Admin SDK
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            print("✅ Firebase Admin SDK initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to initialize Firebase Admin SDK: {str(e)}")
            return False
    
    return firebase_initialized

# Decorator for routes that require authentication
def require_auth(f):
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
        
        # Initialize Firebase if not already done
        if not initialize_firebase():
            return None
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        
        # Extract user_id
        user_id = decoded_token['uid']
        
        return user_id
    except Exception as e:
        current_app.logger.error(f"Error extracting user_id from token: {str(e)}")
        return None

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
            'email_verified': user_record.email_verified
        }
    except Exception as e:
        current_app.logger.error(f"Error getting user info: {str(e)}")
        return None
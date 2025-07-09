#!/usr/bin/env python3
"""
Test Firebase Admin initialization
"""
import os
import sys

# Set Firebase mode
os.environ['USE_FIREBASE'] = 'true'

def test_firebase_admin():
    """Test Firebase Admin initialization"""
    try:
        print("🔧 Testing Firebase Admin initialization...")
        
        # Try importing firebase_admin
        import firebase_admin
        from firebase_admin import credentials
        print("✅ Firebase Admin imported successfully")
        
        # Check if already initialized
        if firebase_admin._apps:
            print("✅ Firebase Admin already initialized")
            return True
        
        # Try to initialize Firebase Admin
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(BASE_DIR, "firebase-credentials.json")
        
        print(f"🔄 Loading credentials from: {cred_path}")
        print(f"📁 Credentials file exists: {os.path.exists(cred_path)}")
        
        if not os.path.exists(cred_path):
            raise FileNotFoundError(f"Firebase credentials not found at {cred_path}")
        
        # Load credentials
        cred = credentials.Certificate(cred_path)
        print("✅ Credentials loaded successfully")
        
        # Initialize Firebase Admin
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'hypelist-99a07.appspot.com'
        })
        print("✅ Firebase Admin initialized successfully")
        
        return True
        
    except Exception as e:
        print(f"💥 Error initializing Firebase Admin: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_firebase_admin()
    if success:
        print("✅ Firebase Admin test passed!")
    else:
        print("❌ Firebase Admin test failed!")
        sys.exit(1) 
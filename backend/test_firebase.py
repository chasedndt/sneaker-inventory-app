# backend/test_firebase.py
# Simple test to verify Firebase connection

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from app import initialize_firebase_admin
from services.firebase_db import firebase_db
from services.firebase_storage import firebase_storage

def test_firebase_connection():
    """Test Firebase Firestore and Storage connections"""
    
    print("🔥 Testing Firebase Connection...")
    
    try:
        # Test Firestore connection
        print("📊 Testing Firestore...")
        test_user_id = "test_user_123"
        
        # Try to get user settings (this will create default settings if none exist)
        settings = firebase_db.get_user_settings(test_user_id)
        print(f"✅ Firestore connected! Default settings: {settings}")
        
        # Test Storage connection
        print("📁 Testing Storage...")
        files = firebase_storage.list_user_files(test_user_id, 'items')
        print(f"✅ Storage connected! User files: {len(files)} files found")
        
        print("🎉 All Firebase services are working!")
        return True
        
    except Exception as e:
        print(f"❌ Firebase connection failed: {e}")
        print("💡 Make sure your Firebase credentials are set up correctly")
        return False

if __name__ == "__main__":
    test_firebase_connection() 
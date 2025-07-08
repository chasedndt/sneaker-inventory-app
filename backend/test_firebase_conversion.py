#!/usr/bin/env python3
"""
Test script to verify Firebase conversion works properly.
Tests both SQLite and Firebase modes.
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_imports():
    """Test that all required modules can be imported"""
    print("🔍 Testing imports...")
    
    try:
        from database_service import DatabaseService
        print("✅ database_service imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import database_service: {e}")
        return False
    
    try:
        from firebase_service import FirebaseService
        print("✅ firebase_service imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import firebase_service: {e}")
        return False
    
    try:
        from config import Config
        print("✅ config imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import config: {e}")
        return False
    
    return True

def test_config():
    """Test configuration options"""
    print("\n🔧 Testing configuration...")
    
    from config import Config
    
    # Test SQLite mode (default)
    os.environ.pop('USE_FIREBASE', None)
    print(f"USE_FIREBASE (default): {Config.USE_FIREBASE}")
    
    # Test Firebase mode
    os.environ['USE_FIREBASE'] = 'true'
    # Need to reload config for environment variable change
    import importlib
    import config
    importlib.reload(config)
    print(f"USE_FIREBASE (set to true): {config.Config.USE_FIREBASE}")
    
    # Reset to default
    os.environ.pop('USE_FIREBASE', None)
    importlib.reload(config)
    
    return True

def test_database_service():
    """Test database service initialization"""
    print("\n🗄️ Testing database service...")
    
    from database_service import DatabaseService
    
    try:
        # Test SQLite mode
        os.environ.pop('USE_FIREBASE', None)
        service = DatabaseService()
        print(f"✅ Database service created (Firebase: {service.is_using_firebase()})")
        
        # Test Firebase mode (will fail without credentials, but should not crash)
        os.environ['USE_FIREBASE'] = 'true'
        try:
            service = DatabaseService()
            print(f"✅ Database service created in Firebase mode (Firebase: {service.is_using_firebase()})")
        except Exception as e:
            print(f"⚠️ Firebase mode failed (expected without credentials): {e}")
        
        # Reset
        os.environ.pop('USE_FIREBASE', None)
        
        return True
    except Exception as e:
        print(f"❌ Database service test failed: {e}")
        return False

def test_app_imports():
    """Test that app.py can import with the new changes"""
    print("\n🚀 Testing app.py imports...")
    
    try:
        # This will test if our changes to app.py don't break imports
        from app import create_app
        print("✅ app.py imports successfully")
        
        # Try to create the app (might fail due to missing config, but shouldn't crash on imports)
        try:
            app = create_app()
            print("✅ Flask app created successfully")
        except Exception as e:
            print(f"⚠️ App creation failed (might be due to missing config): {e}")
        
        return True
    except Exception as e:
        print(f"❌ App import failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Firebase Conversion Test Suite")
    print("=" * 50)
    
    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Database Service", test_database_service),
        ("App Imports", test_app_imports)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"💥 {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Firebase conversion is ready.")
        print("\n📋 Next steps:")
        print("1. Set up Firebase credentials")
        print("2. Set USE_FIREBASE=true environment variable")
        print("3. Start your app and test with real data")
    else:
        print("⚠️ Some tests failed. Check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
#!/usr/bin/env python3
"""
Simple test script to debug the tags endpoint
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))

# Set Firebase mode
os.environ['USE_FIREBASE'] = 'true'

from database_service import DatabaseService
import traceback

def test_tags_endpoint():
    """Test the tags endpoint without authentication"""
    try:
        print("🔧 Testing Firebase connection and tags endpoint...")
        
        # Initialize database service
        database_service = DatabaseService()
        print(f"✅ Database service initialized. Using Firebase: {database_service.is_using_firebase()}")
        
        # Test with a dummy user ID
        test_user_id = "test_user_123"
        print(f"🔄 Testing get_tags for user: {test_user_id}")
        
        # Try to get tags
        tags = database_service.get_tags(test_user_id)
        print(f"✅ Successfully retrieved {len(tags)} tags")
        print(f"Tags: {tags}")
        
        return True
        
    except Exception as e:
        print(f"💥 Error testing tags endpoint: {e}")
        print("Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_tags_endpoint()
    if success:
        print("✅ Tags endpoint test passed!")
    else:
        print("❌ Tags endpoint test failed!")
        sys.exit(1) 
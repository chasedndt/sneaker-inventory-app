#!/usr/bin/env python3
"""
Test script for bulk sales operations (delete and return to inventory)
Tests the live backend endpoints without requiring frontend packages.
"""

import os
import sys
import json
import requests
import time
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables
os.environ['USE_FIREBASE'] = 'true'

def test_bulk_operations():
    """Test bulk delete and bulk return to inventory operations"""
    
    print("[TEST] Testing Bulk Sales Operations")
    print("=" * 50)
    
    # Test configuration
    BASE_URL = "http://127.0.0.1:5000"
    TEST_USER_ID = "PpdcAvliVrR4zBAH6WGBeLqd0c73"  # Your actual user ID from the logs
    
    # Mock Firebase token (you'll need to replace this with a real token for full testing)
    # For now, we'll test the endpoint structure
    MOCK_TOKEN = "Bearer test-token"
    
    headers = {
        'Authorization': MOCK_TOKEN,
        'Content-Type': 'application/json'
    }
    
    print(f"[TARGET] Testing against: {BASE_URL}")
    print(f"[USER] User ID: {TEST_USER_ID}")
    
    # Test 1: Check if bulk-delete endpoint exists
    print("\n1. Testing bulk-delete endpoint availability...")
    test_data = {
        'saleIds': ['test-id-1', 'test-id-2']
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/sales/bulk-delete", 
                               json=test_data, 
                               headers=headers,
                               timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 401:
            print("   [OK] Endpoint exists (401 = auth required, expected)")
        elif response.status_code == 405:
            print("   [ERROR] Method not allowed - endpoint not properly registered")
        else:
            print(f"   [INFO] Unexpected status: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"   [ERROR] Request failed: {e}")
    
    # Test 2: Check if bulk-return endpoint exists
    print("\n2. Testing bulk-return endpoint availability...")
    try:
        response = requests.post(f"{BASE_URL}/api/sales/bulk-return", 
                               json=test_data, 
                               headers=headers,
                               timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 401:
            print("   [OK] Endpoint exists (401 = auth required, expected)")
        elif response.status_code == 405:
            print("   [ERROR] Method not allowed - endpoint not properly registered")
        else:
            print(f"   [INFO] Unexpected status: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"   [ERROR] Request failed: {e}")
    
    # Test 3: Check OPTIONS preflight for bulk-delete
    print("\n3. Testing OPTIONS preflight for bulk-delete...")
    try:
        response = requests.options(f"{BASE_URL}/api/sales/bulk-delete", 
                                  headers={'Origin': 'http://localhost:3000'},
                                  timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   CORS Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("   [OK] OPTIONS preflight working")
        else:
            print(f"   [ERROR] OPTIONS failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"   [ERROR] OPTIONS request failed: {e}")
    
    # Test 4: Check OPTIONS preflight for bulk-return
    print("\n4. Testing OPTIONS preflight for bulk-return...")
    try:
        response = requests.options(f"{BASE_URL}/api/sales/bulk-return", 
                                  headers={'Origin': 'http://localhost:3000'},
                                  timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   CORS Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("   [OK] OPTIONS preflight working")
        else:
            print(f"   [ERROR] OPTIONS failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"   [ERROR] OPTIONS request failed: {e}")
    
    # Test 5: List all available routes (if possible)
    print("\n5. Testing route registration...")
    try:
        # Import Flask app to check registered routes
        from app import create_app
        app = create_app()
        
        print("   [ROUTES] Registered routes containing 'bulk':")
        with app.app_context():
            for rule in app.url_map.iter_rules():
                if 'bulk' in rule.rule:
                    print(f"      {rule.rule} -> {rule.methods}")
                    
        print("   [ROUTES] All sales-related routes:")
        with app.app_context():
            for rule in app.url_map.iter_rules():
                if 'sales' in rule.rule:
                    print(f"      {rule.rule} -> {rule.methods}")
                    
    except Exception as e:
        print(f"   [ERROR] Could not check routes: {e}")
    
    print("\n" + "=" * 50)
    print("[COMPLETE] Bulk Operations Test Complete")
    print("\n[NEXT] Next Steps:")
    print("   - If endpoints show 405 errors, check Flask route registration")
    print("   - If endpoints show 401 errors, they're registered correctly")
    print("   - Use a real Firebase token for full end-to-end testing")

if __name__ == "__main__":
    test_bulk_operations()

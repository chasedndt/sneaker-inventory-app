#!/usr/bin/env python3
"""
Simple test to verify Firebase endpoints work
"""

import requests
import json

# Configuration
BASE_URL = 'http://127.0.0.1:5000'
TEST_USER_ID = 'test-user-simple'

def test_basic():
    """Test basic endpoints"""
    print("Testing basic endpoints...")
    
    # Test connection
    response = requests.get(f'{BASE_URL}/api/test-connection')
    print(f"Connection test: {response.status_code}")
    
    # Test database status
    headers = {'X-User-ID': TEST_USER_ID}
    response = requests.get(f'{BASE_URL}/api/database/status', headers=headers)
    print(f"Database status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Database type: {data.get('database_type')}")
    
    # Test items endpoint
    response = requests.get(f'{BASE_URL}/api/items', headers=headers)
    print(f"Items endpoint: {response.status_code}")
    
    # Test dashboard metrics
    response = requests.get(f'{BASE_URL}/api/dashboard/kpi-metrics', headers=headers)
    print(f"Dashboard metrics: {response.status_code}")
    
    print("Basic tests completed!")

if __name__ == '__main__':
    test_basic() 
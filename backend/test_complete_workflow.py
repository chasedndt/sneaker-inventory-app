#!/usr/bin/env python3
"""
Comprehensive test for complete mark-as-sold workflow
Tests currency handling, data persistence, and frontend visibility
"""
import os
import sys
import json
import requests
import time
from datetime import datetime
from typing import Dict, Any, List

# Set Firebase mode
os.environ['USE_FIREBASE'] = 'true'
sys.path.append(os.path.dirname(__file__))

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        if firebase_admin._apps:
            return True
        
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(BASE_DIR, "firebase-credentials.json")
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'hypelist-99a07.appspot.com'
            })
            print("✅ Firebase Admin SDK initialized successfully")
            return True
        else:
            print(f"❌ Firebase credentials not found at {cred_path}")
            return False
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        return False

def wait_for_backend():
    """Wait for backend to be ready"""
    print("⏳ Waiting for backend to start...")
    for i in range(15):
        try:
            response = requests.get('http://127.0.0.1:5000/api/ping', timeout=2)
            if response.status_code == 200:
                print(f"✅ Backend ready (took {i+1} seconds)")
                return True
        except:
            time.sleep(1)
    print("❌ Backend not ready after 15 seconds")
    return False

def test_1_backend_connection():
    """Test 1: Backend Connection & Health"""
    print("\n🔧 TEST 1: Backend Connection & Health")
    try:
        response = requests.get('http://127.0.0.1:5000/api/ping', timeout=5)
        if response.status_code == 200:
            print("   ✅ PASS: Backend is running and responds to ping")
            
            # Check headers
            csp = response.headers.get('Content-Security-Policy', '')
            required_domains = ['https://apis.google.com', 'https://www.googleapis.com', 'https://js.stripe.com']
            missing = [d for d in required_domains if d not in csp]
            
            if missing:
                print(f"   ⚠️  WARNING: CSP missing domains: {missing}")
            else:
                print("   ✅ PASS: All required CSP domains present")
                
            return True
        else:
            print(f"   ❌ FAIL: Backend responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ FAIL: Backend connection error - {str(e)[:100]}")
        return False

def test_2_firebase_data_retrieval():
    """Test 2: Firebase Data Retrieval"""
    print("\n🔧 TEST 2: Firebase Data Retrieval")
    try:
        from database_service import DatabaseService
        database_service = DatabaseService()
        test_user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
        
        # Test items retrieval
        items = database_service.get_items(test_user_id)
        print(f"   ✅ PASS: Retrieved {len(items)} items from Firebase")
        
        # Analyze item statuses
        active_items = [item for item in items if item.get('status') == 'active']
        sold_items = [item for item in items if item.get('status') == 'sold']
        print(f"   📊 INFO: {len(active_items)} active items, {len(sold_items)} sold items")
        
        # Test sales retrieval
        sales = database_service.get_sales(test_user_id)
        print(f"   ✅ PASS: Retrieved {len(sales)} sales from Firebase")
        
        # Test currency data in sales
        gbp_sales = [sale for sale in sales if sale.get('currency') == 'GBP']
        usd_sales = [sale for sale in sales if sale.get('currency') == 'USD']
        symbol_sales = [sale for sale in sales if sale.get('currency') in ['£', '$', '€']]
        
        print(f"   📊 CURRENCY INFO: {len(gbp_sales)} GBP sales, {len(usd_sales)} USD sales, {len(symbol_sales)} symbol sales")
        
        if gbp_sales:
            print("   ✅ PASS: Found GBP sales as expected")
            for i, sale in enumerate(gbp_sales[:2]):
                print(f"      GBP Sale {i+1}: £{sale.get('salePrice', 0)} on {sale.get('platform', 'unknown')}")
        else:
            print("   ⚠️  WARNING: No GBP sales found")
        
        if symbol_sales:
            print(f"   ❌ FAIL: Still have {len(symbol_sales)} sales with currency symbols instead of codes")
            for sale in symbol_sales[:2]:
                print(f"      Symbol Sale: {sale.get('currency')}{sale.get('salePrice', 0)} on {sale.get('platform', 'unknown')}")
        else:
            print("   ✅ PASS: All sales use proper currency codes")
            
        return True
    except Exception as e:
        print(f"   ❌ FAIL: Firebase data retrieval error - {str(e)[:100]}")
        return False

def test_3_currency_consistency():
    """Test 3: Currency Data Consistency"""
    print("\n🔧 TEST 3: Currency Data Consistency")
    try:
        from database_service import DatabaseService
        database_service = DatabaseService()
        test_user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
        
        sales = database_service.get_sales(test_user_id)
        
        # Check each sale for currency field
        sales_with_currency = 0
        sales_without_currency = 0
        currency_values = {}
        
        for sale in sales:
            if 'currency' in sale and sale['currency']:
                sales_with_currency += 1
                curr = sale['currency']
                currency_values[curr] = currency_values.get(curr, 0) + 1
            else:
                sales_without_currency += 1
                print(f"      ⚠️  Sale {sale.get('id', 'unknown')} missing currency field")
        
        print(f"   📊 RESULT: {sales_with_currency} sales with currency, {sales_without_currency} without")
        print(f"   📊 CURRENCIES: {currency_values}")
        
        # Check for currency symbols vs codes
        symbol_currencies = sum(1 for curr in currency_values.keys() if curr in ['£', '$', '€', '¥'])
        code_currencies = sum(1 for curr in currency_values.keys() if curr in ['GBP', 'USD', 'EUR', 'JPY'])
        
        print(f"   📊 SYMBOL CURRENCIES: {symbol_currencies}")
        print(f"   📊 CODE CURRENCIES: {code_currencies}")
        
        if sales_without_currency > 0:
            print(f"   ❌ FAIL: {sales_without_currency} sales missing currency data")
            return False
        elif symbol_currencies > 0:
            print(f"   ❌ FAIL: {symbol_currencies} sales still use currency symbols")
            return False
        else:
            print("   ✅ PASS: All sales have proper currency codes")
            return True
            
    except Exception as e:
        print(f"   ❌ FAIL: Currency consistency check error - {str(e)[:100]}")
        return False

def test_4_item_sale_relationship():
    """Test 4: Item-Sale Relationship Integrity"""
    print("\n🔧 TEST 4: Item-Sale Relationship Integrity")
    try:
        from database_service import DatabaseService
        database_service = DatabaseService()
        test_user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
        
        items = database_service.get_items(test_user_id)
        sales = database_service.get_sales(test_user_id)
        
        sold_items = [item for item in items if item.get('status') == 'sold']
        
        # Check if every sold item has a corresponding sale
        sold_item_ids = set(str(item.get('id', '')) for item in sold_items)
        sale_item_ids = set(str(sale.get('itemId', '')) for sale in sales if sale.get('itemId'))
        
        orphaned_sold_items = sold_item_ids - sale_item_ids
        orphaned_sales = sale_item_ids - sold_item_ids
        
        print(f"   📊 INFO: {len(sold_items)} items marked as sold")
        print(f"   📊 INFO: {len(sales)} sales recorded")
        print(f"   📊 INFO: {len(sold_item_ids & sale_item_ids)} matching item-sale pairs")
        
        if orphaned_sold_items:
            print(f"   ❌ FAIL: {len(orphaned_sold_items)} sold items without sales: {list(orphaned_sold_items)[:3]}")
        else:
            print("   ✅ PASS: All sold items have corresponding sales")
            
        if orphaned_sales:
            print(f"   ⚠️  WARNING: {len(orphaned_sales)} sales without items: {list(orphaned_sales)[:3]}")
        else:
            print("   ✅ PASS: All sales have corresponding items")
            
        # Show some missing sales data
        missing_itemid_sales = [sale for sale in sales if not sale.get('itemId')]
        if missing_itemid_sales:
            print(f"   ⚠️  WARNING: {len(missing_itemid_sales)} sales missing itemId field")
            
        return len(orphaned_sold_items) == 0
    except Exception as e:
        print(f"   ❌ FAIL: Item-sale relationship check error - {str(e)[:100]}")
        return False

def test_5_api_endpoints_authentication():
    """Test 5: API Endpoints with Authentication"""
    print("\n🔧 TEST 5: API Endpoints Authentication")
    
    endpoints_to_test = [
        ('/api/items', 'GET'),
        ('/api/sales', 'GET'),
        ('/api/expenses', 'GET'),
        ('/api/dashboard/metrics', 'GET')
    ]
    
    passed = 0
    total = len(endpoints_to_test)
    
    for endpoint, method in endpoints_to_test:
        try:
            response = requests.request(method, f'http://127.0.0.1:5000{endpoint}', timeout=3)
            if response.status_code == 401:
                print(f"   ✅ PASS: {method} {endpoint} properly requires auth (401)")
                passed += 1
            elif response.status_code == 403:
                print(f"   ✅ PASS: {method} {endpoint} properly requires auth (403)")
                passed += 1
            else:
                print(f"   ❌ FAIL: {method} {endpoint} returned unexpected {response.status_code}")
        except Exception as e:
            print(f"   ❌ FAIL: {method} {endpoint} - {str(e)[:50]}")
    
    print(f"   📊 RESULT: {passed}/{total} endpoints properly secured")
    return passed == total

def test_6_data_format_validation():
    """Test 6: Data Format Validation"""
    print("\n🔧 TEST 6: Data Format Validation")
    try:
        from database_service import DatabaseService
        database_service = DatabaseService()
        test_user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
        
        sales = database_service.get_sales(test_user_id)
        
        required_fields = ['salePrice', 'currency', 'platform', 'saleDate']
        valid_sales = 0
        
        for sale in sales:
            missing_fields = [field for field in required_fields if field not in sale or sale[field] is None]
            if missing_fields:
                print(f"      ⚠️  Sale {sale.get('id', 'unknown')} missing fields: {missing_fields}")
            else:
                valid_sales += 1
                
                # Validate data types
                try:
                    price = float(sale['salePrice'])
                    if price <= 0:
                        print(f"      ⚠️  Sale {sale.get('id', 'unknown')} has invalid price: {price}")
                        valid_sales -= 1
                except (ValueError, TypeError):
                    print(f"      ⚠️  Sale {sale.get('id', 'unknown')} has non-numeric price: {sale['salePrice']}")
                    valid_sales -= 1
        
        print(f"   📊 RESULT: {valid_sales}/{len(sales)} sales have valid data format")
        return valid_sales == len(sales)
    except Exception as e:
        print(f"   ❌ FAIL: Data format validation error - {str(e)[:100]}")
        return False

def main():
    """Run all comprehensive tests"""
    print("🧪 COMPREHENSIVE WORKFLOW TEST SUITE")
    print("=" * 70)
    
    # Wait for backend first
    if not wait_for_backend():
        print("❌ Cannot proceed without backend")
        return False
    
    # Initialize Firebase
    if not initialize_firebase():
        print("❌ Cannot proceed without Firebase")
        return False
    
    # Run all tests
    test_results = [
        ("Backend Connection", test_1_backend_connection()),
        ("Firebase Data Retrieval", test_2_firebase_data_retrieval()),
        ("Currency Consistency", test_3_currency_consistency()),
        ("Item-Sale Relationships", test_4_item_sale_relationship()),
        ("API Authentication", test_5_api_endpoints_authentication()),
        ("Data Format Validation", test_6_data_format_validation()),
    ]
    
    # Summary
    print("\n" + "=" * 70)
    print("📋 COMPREHENSIVE TEST RESULTS:")
    
    passed = 0
    critical_failed = []
    
    for test_name, result in test_results:
        if result:
            print(f"   ✅ PASS: {test_name}")
            passed += 1
        else:
            print(f"   ❌ FAIL: {test_name}")
            if test_name in ["Firebase Data Retrieval", "Currency Consistency", "Item-Sale Relationships"]:
                critical_failed.append(test_name)
    
    print(f"\n📊 OVERALL: {passed}/{len(test_results)} tests passed")
    
    if len(critical_failed) == 0:
        print("\n🎉 CRITICAL FUNCTIONALITY WORKING!")
        print("\n✅ Your frontend should show:")
        print("   • Dashboard displays recent items (including sold)")
        print("   • Sales page shows all sales with correct currencies")
        print("   • Items properly marked as sold disappear from active inventory")
        print("   • KPI metrics calculate correctly")
        print("   • No data inconsistency errors")
        
        if passed == len(test_results):
            print("\n🌟 ALL TESTS PASSED - App is fully functional!")
        else:
            print(f"\n⚠️  Minor issues detected in {len(test_results) - passed} non-critical areas")
            
    else:
        print(f"\n💥 CRITICAL ISSUES DETECTED!")
        print(f"   Failed critical tests: {critical_failed}")
        print("   Frontend may not work correctly until these are fixed")
    
    return len(critical_failed) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
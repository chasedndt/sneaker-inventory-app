#!/usr/bin/env python3
"""
Comprehensive test script to verify ALL endpoints work correctly with Firebase.
This tests every single endpoint that was converted to use database_service.
"""

import os
import sys
import json
import requests
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_USER_ID = "test_user_123"

# Mock Firebase token for testing
MOCK_TOKEN = "mock_firebase_token"

def make_request(method, endpoint, data=None, headers=None, files=None):
    """Make a request with proper headers"""
    if headers is None:
        headers = {}
    
    # Add mock authorization header
    headers['Authorization'] = f'Bearer {MOCK_TOKEN}'
    headers['X-User-ID'] = TEST_USER_ID
    
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=data)
        elif method == 'POST':
            if files:
                response = requests.post(url, headers=headers, data=data, files=files)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.post(url, headers=headers, json=data)
        elif method == 'PUT':
            if files:
                response = requests.put(url, headers=headers, data=data, files=files)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, headers=headers, json=data)
        elif method == 'PATCH':
            headers['Content-Type'] = 'application/json'
            response = requests.patch(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.ConnectionError:
        logger.error(f"❌ Connection failed to {url}")
        logger.error("Make sure the Flask server is running with Firebase enabled")
        return None

def test_basic_endpoints():
    """Test basic system endpoints"""
    logger.info("🧪 Testing basic endpoints...")
    
    # Test connection
    response = make_request('GET', '/api/test-connection')
    if response and response.status_code == 200:
        logger.info("✅ Test connection: PASSED")
    else:
        logger.error(f"❌ Test connection: FAILED ({response.status_code if response else 'No response'})")
    
    # Test database status
    response = make_request('GET', '/api/database/status')
    if response and response.status_code == 200:
        data = response.json()
        logger.info(f"✅ Database status: {data.get('database_type', 'Unknown')}")
    else:
        logger.error(f"❌ Database status: FAILED ({response.status_code if response else 'No response'})")
    
    # Test user endpoint
    response = make_request('GET', '/api/user')
    if response and response.status_code == 200:
        logger.info("✅ User endpoint: PASSED")
    else:
        logger.error(f"❌ User endpoint: FAILED ({response.status_code if response else 'No response'})")

def test_settings_endpoints():
    """Test settings endpoints"""
    logger.info("🧪 Testing settings endpoints...")
    
    # Test settings update
    settings_data = {
        'dark_mode': True,
        'currency': '€',
        'date_format': 'DD/MM/YYYY'
    }
    
    response = make_request('PUT', '/api/settings', settings_data)
    if response and response.status_code == 200:
        logger.info("✅ Settings update: PASSED")
    else:
        logger.error(f"❌ Settings update: FAILED ({response.status_code if response else 'No response'})")

def test_tag_endpoints():
    """Test tag endpoints"""
    logger.info("🧪 Testing tag endpoints...")
    
    # Create a tag
    tag_data = {
        'name': 'Test Tag',
        'color': '#ff0000'
    }
    
    response = make_request('POST', '/api/user-tags', tag_data)
    if response and response.status_code == 201:
        created_tag = response.json()
        tag_id = created_tag.get('id')
        logger.info(f"✅ Tag creation: PASSED (ID: {tag_id})")
        
        # Test get all tags
        response = make_request('GET', '/api/user-tags')
        if response and response.status_code == 200:
            tags = response.json()
            logger.info(f"✅ Get tags: PASSED ({len(tags)} tags)")
        else:
            logger.error(f"❌ Get tags: FAILED ({response.status_code if response else 'No response'})")
        
        # Test update tag
        update_data = {
            'name': 'Updated Test Tag',
            'color': '#00ff00'
        }
        
        response = make_request('PUT', f'/api/user-tags/{tag_id}', update_data)
        if response and response.status_code == 200:
            logger.info("✅ Tag update: PASSED")
        else:
            logger.error(f"❌ Tag update: FAILED ({response.status_code if response else 'No response'})")
        
        # Test delete tag
        response = make_request('DELETE', f'/api/user-tags/{tag_id}')
        if response and response.status_code == 200:
            logger.info("✅ Tag deletion: PASSED")
        else:
            logger.error(f"❌ Tag deletion: FAILED ({response.status_code if response else 'No response'})")
    else:
        logger.error(f"❌ Tag creation: FAILED ({response.status_code if response else 'No response'})")

def test_item_endpoints():
    """Test item endpoints"""
    logger.info("🧪 Testing item endpoints...")
    
    # Create an item
    item_data = {
        'productName': 'Test Sneaker',
        'category': 'sneakers',
        'brand': 'Nike',
        'purchasePrice': 150.00,
        'purchaseCurrency': '$',
        'purchaseDate': datetime.now().isoformat(),
        'status': 'unlisted'
    }
    
    response = make_request('POST', '/api/items', item_data)
    if response and response.status_code == 201:
        created_item = response.json()
        item_id = created_item.get('id')
        logger.info(f"✅ Item creation: PASSED (ID: {item_id})")
        
        # Test get all items
        response = make_request('GET', '/api/items')
        if response and response.status_code == 200:
            items = response.json()
            logger.info(f"✅ Get items: PASSED ({len(items)} items)")
        else:
            logger.error(f"❌ Get items: FAILED ({response.status_code if response else 'No response'})")
        
        # Test get single item
        response = make_request('GET', f'/api/items/{item_id}')
        if response and response.status_code == 200:
            logger.info("✅ Get single item: PASSED")
        else:
            logger.error(f"❌ Get single item: FAILED ({response.status_code if response else 'No response'})")
        
        # Test update item field
        field_data = {
            'field': 'productName',
            'value': 'Updated Test Sneaker'
        }
        
        response = make_request('PATCH', f'/api/items/{item_id}/field', field_data)
        if response and response.status_code == 200:
            logger.info("✅ Item field update: PASSED")
        else:
            logger.error(f"❌ Item field update: FAILED ({response.status_code if response else 'No response'})")
        
        # Test complex item update (should return 501 in Firebase mode)
        complex_data = {'data': json.dumps({'productDetails': {'productName': 'Complex Update'}})}
        response = make_request('PUT', f'/api/items/{item_id}', complex_data)
        if response and response.status_code == 501:
            logger.info("✅ Complex item update (Firebase limitation): PASSED")
        else:
            logger.error(f"❌ Complex item update: FAILED ({response.status_code if response else 'No response'})")
        
        # Test delete item
        response = make_request('DELETE', f'/api/items/{item_id}')
        if response and response.status_code == 200:
            logger.info("✅ Item deletion: PASSED")
        else:
            logger.error(f"❌ Item deletion: FAILED ({response.status_code if response else 'No response'})")
    else:
        logger.error(f"❌ Item creation: FAILED ({response.status_code if response else 'No response'})")

def test_sales_endpoints():
    """Test sales endpoints"""
    logger.info("🧪 Testing sales endpoints...")
    
    # First create an item to sell
    item_data = {
        'productName': 'Sale Test Sneaker',
        'category': 'sneakers',
        'brand': 'Adidas',
        'purchasePrice': 120.00,
        'purchaseCurrency': '$',
        'purchaseDate': datetime.now().isoformat(),
        'status': 'unlisted'
    }
    
    response = make_request('POST', '/api/items', item_data)
    if response and response.status_code == 201:
        created_item = response.json()
        item_id = created_item.get('id')
        
        # Create a sale
        sale_data = {
            'itemId': item_id,
            'salePrice': 180.00,
            'saleCurrency': '$',
            'saleDate': datetime.now().isoformat(),
            'platform': 'StockX'
        }
        
        response = make_request('POST', '/api/sales', sale_data)
        if response and response.status_code == 201:
            created_sale = response.json()
            sale_id = created_sale.get('id')
            logger.info(f"✅ Sale creation: PASSED (ID: {sale_id})")
            
            # Test get all sales
            response = make_request('GET', '/api/sales')
            if response and response.status_code == 200:
                sales = response.json()
                logger.info(f"✅ Get sales: PASSED ({len(sales)} sales)")
            else:
                logger.error(f"❌ Get sales: FAILED ({response.status_code if response else 'No response'})")
            
            # Test get single sale
            response = make_request('GET', f'/api/sales/{sale_id}')
            if response and response.status_code == 200:
                logger.info("✅ Get single sale: PASSED")
            else:
                logger.error(f"❌ Get single sale: FAILED ({response.status_code if response else 'No response'})")
            
            # Test update sale
            update_data = {
                'salePrice': 200.00,
                'platform': 'GOAT'
            }
            
            response = make_request('PUT', f'/api/sales/{sale_id}', update_data)
            if response and response.status_code == 200:
                logger.info("✅ Sale update: PASSED")
            else:
                logger.error(f"❌ Sale update: FAILED ({response.status_code if response else 'No response'})")
            
            # Test update sale field
            field_data = {
                'field': 'platform',
                'value': 'eBay'
            }
            
            response = make_request('PATCH', f'/api/sales/{sale_id}/field', field_data)
            if response and response.status_code == 200:
                logger.info("✅ Sale field update: PASSED")
            else:
                logger.error(f"❌ Sale field update: FAILED ({response.status_code if response else 'No response'})")
            
            # Test get sales by item
            response = make_request('GET', f'/api/items/{item_id}/sales')
            if response and response.status_code == 200:
                item_sales = response.json()
                logger.info(f"✅ Get sales by item: PASSED ({len(item_sales)} sales)")
            else:
                logger.error(f"❌ Get sales by item: FAILED ({response.status_code if response else 'No response'})")
            
            # Test delete sale
            response = make_request('DELETE', f'/api/sales/{sale_id}')
            if response and response.status_code == 200:
                logger.info("✅ Sale deletion: PASSED")
            else:
                logger.error(f"❌ Sale deletion: FAILED ({response.status_code if response else 'No response'})")
        else:
            logger.error(f"❌ Sale creation: FAILED ({response.status_code if response else 'No response'})")
        
        # Clean up item
        make_request('DELETE', f'/api/items/{item_id}')
    else:
        logger.error(f"❌ Item creation for sales test: FAILED ({response.status_code if response else 'No response'})")

def test_expense_endpoints():
    """Test expense endpoints"""
    logger.info("🧪 Testing expense endpoints...")
    
    # Test expense types
    response = make_request('GET', '/api/expenses/types')
    if response and response.status_code == 200:
        expense_types = response.json()
        logger.info(f"✅ Get expense types: PASSED ({len(expense_types)} types)")
    else:
        logger.error(f"❌ Get expense types: FAILED ({response.status_code if response else 'No response'})")
    
    # Create an expense
    expense_data = {
        'expenseType': 'shipping',
        'amount': 25.00,
        'currency': '$',
        'expenseDate': datetime.now().isoformat(),
        'vendor': 'Test Vendor'
    }
    
    response = make_request('POST', '/api/expenses', expense_data)
    if response and response.status_code == 201:
        created_expense = response.json()
        expense_id = created_expense.get('id')
        logger.info(f"✅ Expense creation: PASSED (ID: {expense_id})")
        
        # Test get all expenses
        response = make_request('GET', '/api/expenses')
        if response and response.status_code == 200:
            expenses = response.json()
            logger.info(f"✅ Get expenses: PASSED ({len(expenses)} expenses)")
        else:
            logger.error(f"❌ Get expenses: FAILED ({response.status_code if response else 'No response'})")
        
        # Test get single expense
        response = make_request('GET', f'/api/expenses/{expense_id}')
        if response and response.status_code == 200:
            logger.info("✅ Get single expense: PASSED")
        else:
            logger.error(f"❌ Get single expense: FAILED ({response.status_code if response else 'No response'})")
        
        # Test update expense
        update_data = {
            'amount': 30.00,
            'vendor': 'Updated Vendor'
        }
        
        response = make_request('PUT', f'/api/expenses/{expense_id}', update_data)
        if response and response.status_code == 200:
            logger.info("✅ Expense update: PASSED")
        else:
            logger.error(f"❌ Expense update: FAILED ({response.status_code if response else 'No response'})")
        
        # Test expense receipt URL (should return 404 since no receipt)
        response = make_request('GET', f'/api/expenses/{expense_id}/receipt-url')
        if response and response.status_code == 404:
            logger.info("✅ Expense receipt URL (no receipt): PASSED")
        else:
            logger.error(f"❌ Expense receipt URL: FAILED ({response.status_code if response else 'No response'})")
        
        # Test expense summary
        response = make_request('GET', '/api/expenses/summary')
        if response and response.status_code == 200:
            summary = response.json()
            logger.info(f"✅ Expense summary: PASSED (Total: {summary.get('totalAmount', 0)})")
        else:
            logger.error(f"❌ Expense summary: FAILED ({response.status_code if response else 'No response'})")
        
        # Test delete expense
        response = make_request('DELETE', f'/api/expenses/{expense_id}')
        if response and response.status_code == 200:
            logger.info("✅ Expense deletion: PASSED")
        else:
            logger.error(f"❌ Expense deletion: FAILED ({response.status_code if response else 'No response'})")
    else:
        logger.error(f"❌ Expense creation: FAILED ({response.status_code if response else 'No response'})")

def test_dashboard_endpoints():
    """Test dashboard endpoints"""
    logger.info("🧪 Testing dashboard endpoints...")
    
    # Test KPI metrics
    response = make_request('GET', '/api/dashboard/kpi-metrics')
    if response and response.status_code == 200:
        kpi_data = response.json()
        logger.info(f"✅ Dashboard KPI metrics: PASSED")
        logger.info(f"   - Total Items: {kpi_data.get('totalItems', 0)}")
        logger.info(f"   - Item Spend: {kpi_data.get('itemSpend', 0)}")
        logger.info(f"   - Total Sales: {kpi_data.get('totalSales', 0)}")
        logger.info(f"   - Total Expenses: {kpi_data.get('totalExpenses', 0)}")
    else:
        logger.error(f"❌ Dashboard KPI metrics: FAILED ({response.status_code if response else 'No response'})")

def main():
    """Run all tests"""
    logger.info("🚀 Starting comprehensive Firebase endpoint testing...")
    logger.info("=" * 60)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/ping")
        if response.status_code != 200:
            logger.error("❌ Server is not responding. Please start the Flask server first.")
            return
    except requests.exceptions.ConnectionError:
        logger.error("❌ Cannot connect to server. Please start the Flask server first.")
        return
    
    # Run all test suites
    test_basic_endpoints()
    logger.info("-" * 40)
    
    test_settings_endpoints()
    logger.info("-" * 40)
    
    test_tag_endpoints()
    logger.info("-" * 40)
    
    test_item_endpoints()
    logger.info("-" * 40)
    
    test_sales_endpoints()
    logger.info("-" * 40)
    
    test_expense_endpoints()
    logger.info("-" * 40)
    
    test_dashboard_endpoints()
    logger.info("-" * 40)
    
    logger.info("🎉 Comprehensive testing completed!")
    logger.info("=" * 60)

if __name__ == "__main__":
    main() 
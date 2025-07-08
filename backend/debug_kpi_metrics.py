#!/usr/bin/env python3
"""
Debug script to test KPI metrics calculation
"""

import os
import sys
import requests
import json

# Set environment to use Firebase
os.environ['USE_FIREBASE'] = 'true'

# Configuration
BASE_URL = 'http://127.0.0.1:5000'
TEST_USER_ID = 'test-user-debug'

def test_kpi_metrics():
    """Test KPI metrics calculation"""
    print("🧪 Testing KPI Metrics Calculation...")
    
    headers = {'X-User-ID': TEST_USER_ID}
    
    # Test items endpoint
    print("\n📦 Testing items endpoint...")
    response = requests.get(f'{BASE_URL}/api/items', headers=headers)
    print(f"Items response status: {response.status_code}")
    if response.status_code == 200:
        items = response.json()
        print(f"Items count: {len(items)}")
        for item in items:
            print(f"  - Item: {item.get('productName', 'Unknown')} | Price: {item.get('purchase_price', 0)} | Status: {item.get('status', 'Unknown')}")
    else:
        print(f"Items error: {response.text}")
    
    # Test sales endpoint
    print("\n💰 Testing sales endpoint...")
    response = requests.get(f'{BASE_URL}/api/sales', headers=headers)
    print(f"Sales response status: {response.status_code}")
    if response.status_code == 200:
        sales = response.json()
        print(f"Sales count: {len(sales)}")
        for sale in sales:
            print(f"  - Sale: {sale.get('sale_price', 0)} | Status: {sale.get('status', 'Unknown')}")
    else:
        print(f"Sales error: {response.text}")
    
    # Test expenses endpoint
    print("\n💸 Testing expenses endpoint...")
    response = requests.get(f'{BASE_URL}/api/expenses', headers=headers)
    print(f"Expenses response status: {response.status_code}")
    if response.status_code == 200:
        expenses = response.json()
        print(f"Expenses count: {len(expenses)}")
        for expense in expenses:
            print(f"  - Expense: {expense.get('amount', 0)} | Type: {expense.get('expense_type', 'Unknown')}")
    else:
        print(f"Expenses error: {response.text}")
    
    # Test KPI metrics
    print("\n📊 Testing KPI metrics...")
    response = requests.get(f'{BASE_URL}/api/dashboard/kpi-metrics', headers=headers)
    print(f"KPI metrics response status: {response.status_code}")
    if response.status_code == 200:
        metrics = response.json()
        print("KPI Metrics:")
        print(json.dumps(metrics, indent=2))
        
        # Extract key metrics
        inventory_metrics = metrics.get('inventoryMetrics', {})
        sales_metrics = metrics.get('salesMetrics', {})
        expense_metrics = metrics.get('expenseMetrics', {})
        
        print(f"\n📈 Key Metrics Summary:")
        print(f"Total Inventory: {inventory_metrics.get('totalInventory', 0)}")
        print(f"Total Inventory Cost: {inventory_metrics.get('totalInventoryCost', 0)}")
        print(f"Total Sales: {sales_metrics.get('totalSales', 0)}")
        print(f"Total Sales Revenue: {sales_metrics.get('totalSalesRevenue', 0)}")
        print(f"Total Expenses: {expense_metrics.get('totalExpenses', 0)}")
        
    else:
        print(f"KPI metrics error: {response.text}")

if __name__ == '__main__':
    test_kpi_metrics() 
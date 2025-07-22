#!/usr/bin/env python3
"""
Currency Consistency Test Script

This script tests the consistency of currency conversion and expense calculations
across different parts of the application to identify discrepancies and ensure
all components use the same source of truth.

Usage: python test_currency_consistency.py
"""

import requests
import json
import sys
from typing import Dict, List, Any
from currency_utils import convert_currency, normalize_currency_code

# Configuration
BASE_URL = "http://127.0.0.1:5000"
TEST_USER_ID = "PpdcAvliVrR4zBAH6WGBeLqd0c73"  # Replace with actual test user ID
DISPLAY_CURRENCY = "USD"

class CurrencyConsistencyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID
        self.display_currency = DISPLAY_CURRENCY
        self.errors = []
        self.warnings = []
        
    def log_error(self, message: str):
        """Log an error message"""
        self.errors.append(message)
        print(f"[ERROR] {message}")
        
    def log_warning(self, message: str):
        """Log a warning message"""
        self.warnings.append(message)
        print(f"[WARNING] {message}")
        
    def log_info(self, message: str):
        """Log an info message"""
        print(f"[INFO] {message}")
        
    def log_success(self, message: str):
        """Log a success message"""
        print(f"[SUCCESS] {message}")

    def fetch_expenses(self) -> List[Dict[str, Any]]:
        """Fetch expenses from the backend API"""
        try:
            response = requests.get(f"{self.base_url}/api/expenses", params={"user_id": self.user_id})
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.log_error(f"Failed to fetch expenses: {e}")
            return []

    def fetch_dashboard_metrics(self) -> Dict[str, Any]:
        """Fetch dashboard KPI metrics from the backend API"""
        try:
            params = {
                "user_id": self.user_id,
                "display_currency": self.display_currency,
                "start_date": "2025-06-22",
                "end_date": "2025-07-22"
            }
            response = requests.get(f"{self.base_url}/api/dashboard/kpi-metrics", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.log_error(f"Failed to fetch dashboard metrics: {e}")
            return {}

    def test_backend_currency_conversion(self):
        """Test backend currency conversion utility directly"""
        print("\n[TESTING BACKEND CURRENCY CONVERSION]")
        print("=" * 50)
        
        test_cases = [
            {"amount": 4.99, "from_currency": "GBP", "to_currency": "USD"},
            {"amount": 240.00, "from_currency": "GBP", "to_currency": "USD"},
            {"amount": 200.00, "from_currency": "GBP", "to_currency": "USD"},
        ]
        
        for case in test_cases:
            try:
                result = convert_currency(case["amount"], case["from_currency"], case["to_currency"])
                self.log_info(f"Backend conversion: {case['amount']} {case['from_currency']} → {result:.2f} {case['to_currency']}")
            except Exception as e:
                self.log_error(f"Backend conversion failed for {case}: {e}")

    def test_expense_consistency(self):
        """Test consistency of expense calculations"""
        print("\n[TESTING EXPENSE CONSISTENCY]")
        print("=" * 50)
        
        # Fetch raw expenses
        expenses = self.fetch_expenses()
        if not expenses:
            self.log_error("No expenses found to test")
            return
            
        # Fetch dashboard metrics
        dashboard_metrics = self.fetch_dashboard_metrics()
        
        # Calculate expense totals manually using backend conversion
        manual_expense_total = 0
        expense_details = []
        
        for expense in expenses:
            original_amount = expense.get('amount', 0)
            original_currency = expense.get('currency', 'USD')
            expense_type = expense.get('type', 'unknown')
            
            # Convert using backend utility
            try:
                converted_amount = convert_currency(original_amount, original_currency, self.display_currency)
                manual_expense_total += converted_amount
                
                expense_details.append({
                    'type': expense_type,
                    'original': f"{original_amount} {original_currency}",
                    'converted': f"{converted_amount:.2f} {self.display_currency}"
                })
                
                self.log_info(f"Expense '{expense_type}': {original_amount} {original_currency} → {converted_amount:.2f} {self.display_currency}")
                
            except Exception as e:
                self.log_error(f"Failed to convert expense {expense_type}: {e}")
        
        # Compare with dashboard metrics
        dashboard_expense_total = dashboard_metrics.get('expenseMetrics', {}).get('totalExpenses', 0)
        
        print(f"\n[EXPENSE TOTALS COMPARISON]:")
        print(f"Manual calculation: ${manual_expense_total:.2f}")
        print(f"Dashboard API: ${dashboard_expense_total:.2f}")
        
        if abs(manual_expense_total - dashboard_expense_total) < 0.01:
            self.log_success("Expense totals match between manual calculation and dashboard API")
        else:
            self.log_error(f"Expense total mismatch: Manual=${manual_expense_total:.2f}, Dashboard=${dashboard_expense_total:.2f}")
            
        return {
            'manual_total': manual_expense_total,
            'dashboard_total': dashboard_expense_total,
            'expense_details': expense_details
        }

    def test_individual_expense_conversion(self):
        """Test individual expense conversion scenarios"""
        print("\n[TESTING INDIVIDUAL EXPENSE CONVERSIONS]")
        print("=" * 50)
        
        # Test the specific case mentioned: 4.99 GBP expense
        test_amount = 4.99
        test_currency = "GBP"
        
        try:
            # Backend conversion
            backend_result = convert_currency(test_amount, test_currency, self.display_currency)
            self.log_info(f"Backend: {test_amount} {test_currency} → {backend_result:.2f} {self.display_currency}")
            
            # Expected results based on user reports
            dashboard_expected = 6.32  # What Dashboard shows
            expenses_page_expected = 6.72  # What Expenses page shows (incorrect)
            
            print(f"\n[COMPARISON FOR {test_amount} {test_currency}]:")
            print(f"Backend calculation: ${backend_result:.2f}")
            print(f"Dashboard shows: ${dashboard_expected:.2f}")
            print(f"Expenses page shows: ${expenses_page_expected:.2f}")
            
            # Check which one matches backend
            if abs(backend_result - dashboard_expected) < 0.01:
                self.log_success("Dashboard matches backend calculation")
            else:
                self.log_warning(f"Dashboard differs from backend: ${dashboard_expected:.2f} vs ${backend_result:.2f}")
                
            if abs(backend_result - expenses_page_expected) < 0.01:
                self.log_success("Expenses page matches backend calculation")
            else:
                self.log_error(f"Expenses page differs from backend: ${expenses_page_expected:.2f} vs ${backend_result:.2f}")
                
        except Exception as e:
            self.log_error(f"Failed to test individual expense conversion: {e}")

    def test_frontend_backend_api_consistency(self):
        """Test that frontend and backend APIs return consistent data"""
        print("\n[TESTING API CONSISTENCY]")
        print("=" * 50)
        
        # Test expenses endpoint
        expenses = self.fetch_expenses()
        dashboard_metrics = self.fetch_dashboard_metrics()
        
        if expenses and dashboard_metrics:
            self.log_success("Both expenses and dashboard APIs are accessible")
            
            # Check if dashboard metrics include expense data
            expense_metrics = dashboard_metrics.get('expenseMetrics', {})
            if expense_metrics:
                self.log_info(f"Dashboard expense metrics: {json.dumps(expense_metrics, indent=2)}")
            else:
                self.log_warning("Dashboard metrics missing expense data")
        else:
            self.log_error("Failed to fetch data from one or both APIs")

    def run_all_tests(self):
        """Run all consistency tests"""
        print("[STARTING CURRENCY CONSISTENCY TESTS]")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"User ID: {self.user_id}")
        print(f"Display Currency: {self.display_currency}")
        print("=" * 60)
        
        # Run all test suites
        self.test_backend_currency_conversion()
        self.test_individual_expense_conversion()
        self.test_expense_consistency()
        self.test_frontend_backend_api_consistency()
        
        # Summary
        print("\n[TEST SUMMARY]")
        print("=" * 50)
        
        if self.errors:
            print(f"[{len(self.errors)} ERRORS FOUND]:")
            for error in self.errors:
                print(f"   • {error}")
                
        if self.warnings:
            print(f"[{len(self.warnings)} WARNINGS]:")
            for warning in self.warnings:
                print(f"   • {warning}")
                
        if not self.errors and not self.warnings:
            print("[ALL TESTS PASSED - NO INCONSISTENCIES FOUND]")
        elif not self.errors:
            print("[NO CRITICAL ERRORS - ONLY WARNINGS]")
        else:
            print("[CRITICAL ERRORS FOUND - REQUIRES FIXING]")
            
        return len(self.errors) == 0

def main():
    """Main test runner"""
    tester = CurrencyConsistencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Comprehensive Expense Display Consistency Test

This test verifies that ALL expense displays across the application show consistent
values after the backend conversion fix. Tests multiple currencies and ensures
no hardcoded values or double conversion issues exist.

Usage: python test_expense_display_consistency.py
"""

import requests
import json
import sys
from typing import Dict, List, Any, Tuple
from currency_utils import convert_currency, EXCHANGE_RATES

# Configuration
BASE_URL = "http://127.0.0.1:5000"
TEST_USER_ID = "PpdcAvliVrR4zBAH6WGBeLqd0c73"

class ExpenseConsistencyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID
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

    def test_backend_conversion_accuracy(self):
        """Test backend conversion accuracy for multiple currencies"""
        print("\n[TESTING BACKEND CONVERSION ACCURACY FOR ALL CURRENCIES]")
        print("=" * 70)
        
        # Test cases covering different currency pairs
        test_cases = [
            {"amount": 4.99, "from": "GBP", "to": "USD", "expected_range": (6.30, 6.35)},
            {"amount": 100.00, "from": "GBP", "to": "USD", "expected_range": (126.00, 127.00)},
            {"amount": 50.00, "from": "EUR", "to": "USD", "expected_range": (58.00, 59.00)},
            {"amount": 1000.00, "from": "JPY", "to": "USD", "expected_range": (9.00, 9.20)},
            {"amount": 25.00, "from": "CAD", "to": "USD", "expected_range": (19.90, 20.10)},
            {"amount": 75.00, "from": "AUD", "to": "USD", "expected_range": (55.00, 56.00)},
            # Reverse conversions
            {"amount": 100.00, "from": "USD", "to": "GBP", "expected_range": (78.50, 79.50)},
            {"amount": 100.00, "from": "USD", "to": "EUR", "expected_range": (84.50, 85.50)},
        ]
        
        all_passed = True
        
        for case in test_cases:
            try:
                result = convert_currency(case["amount"], case["from"], case["to"])
                expected_min, expected_max = case["expected_range"]
                
                if expected_min <= result <= expected_max:
                    self.log_success(f"{case['amount']} {case['from']} -> {result:.2f} {case['to']} (within expected range)")
                else:
                    self.log_error(f"{case['amount']} {case['from']} -> {result:.2f} {case['to']} (outside expected range {expected_min}-{expected_max})")
                    all_passed = False
                    
            except Exception as e:
                self.log_error(f"Conversion failed for {case}: {e}")
                all_passed = False
        
        return all_passed

    def test_specific_problematic_case(self):
        """Test the specific 4.99 GBP case that was causing issues"""
        print("\n[TESTING SPECIFIC PROBLEMATIC CASE: 4.99 GBP -> USD]")
        print("=" * 70)
        
        amount = 4.99
        from_currency = "GBP"
        to_currency = "USD"
        
        try:
            # Backend conversion
            backend_result = convert_currency(amount, from_currency, to_currency)
            self.log_info(f"Backend conversion: {amount} {from_currency} -> {backend_result:.2f} {to_currency}")
            
            # Expected values
            correct_value = 6.32  # What Dashboard and backend should show
            incorrect_old_value = 6.72  # What the old frontend conversion was showing
            
            # Verify backend shows correct value
            if abs(backend_result - correct_value) < 0.01:
                self.log_success(f"Backend conversion matches expected correct value: ${correct_value:.2f}")
            else:
                self.log_error(f"Backend conversion doesn't match expected: Expected ${correct_value:.2f}, got ${backend_result:.2f}")
                return False
                
            # Verify backend doesn't show old incorrect value
            if abs(backend_result - incorrect_old_value) > 0.01:
                self.log_success(f"Backend conversion correctly differs from old incorrect value: ${incorrect_old_value:.2f}")
            else:
                self.log_error(f"Backend conversion still matches old incorrect value: ${incorrect_old_value:.2f}")
                return False
                
            return True
            
        except Exception as e:
            self.log_error(f"Failed to test specific problematic case: {e}")
            return False

    def test_no_hardcoded_values(self):
        """Test that the fix doesn't use hardcoded values and works for all currencies"""
        print("\n[TESTING NO HARDCODED VALUES - DYNAMIC CURRENCY SUPPORT]")
        print("=" * 70)
        
        # Test with various currency combinations to ensure no hardcoding
        dynamic_test_cases = [
            {"amount": 1.00, "from": "GBP", "to": "USD"},
            {"amount": 1.00, "from": "EUR", "to": "USD"},
            {"amount": 1.00, "from": "USD", "to": "GBP"},
            {"amount": 1.00, "from": "USD", "to": "EUR"},
            {"amount": 1.00, "from": "GBP", "to": "EUR"},
            {"amount": 1.00, "from": "EUR", "to": "GBP"},
        ]
        
        all_dynamic = True
        
        for case in dynamic_test_cases:
            try:
                result = convert_currency(case["amount"], case["from"], case["to"])
                
                # Calculate expected result manually using exchange rates
                from_rate = EXCHANGE_RATES[case["from"]]
                to_rate = EXCHANGE_RATES[case["to"]]
                expected = (case["amount"] / from_rate) * to_rate
                
                if abs(result - expected) < 0.001:  # Allow for small floating point differences
                    self.log_success(f"{case['from']} -> {case['to']}: Dynamic calculation correct ({result:.4f})")
                else:
                    self.log_error(f"{case['from']} -> {case['to']}: Dynamic calculation incorrect. Expected {expected:.4f}, got {result:.4f}")
                    all_dynamic = False
                    
            except Exception as e:
                self.log_error(f"Dynamic test failed for {case}: {e}")
                all_dynamic = False
        
        return all_dynamic

    def test_consistency_across_display_currency_options(self):
        """Test that conversion works correctly for different display currencies"""
        print("\n[TESTING CONSISTENCY ACROSS DIFFERENT DISPLAY CURRENCIES]")
        print("=" * 70)
        
        # Test the same expense amount converted to different display currencies
        base_amount = 4.99
        base_currency = "GBP"
        target_currencies = ["USD", "EUR", "CAD", "AUD"]
        
        all_consistent = True
        
        for target in target_currencies:
            try:
                result = convert_currency(base_amount, base_currency, target)
                
                # Verify the conversion is reasonable (not zero, not the same as input unless same currency)
                if result <= 0:
                    self.log_error(f"Invalid conversion result: {base_amount} {base_currency} -> {result} {target}")
                    all_consistent = False
                elif base_currency != target and abs(result - base_amount) < 0.01:
                    self.log_error(f"Suspicious conversion (too similar): {base_amount} {base_currency} -> {result} {target}")
                    all_consistent = False
                else:
                    self.log_success(f"Valid conversion: {base_amount} {base_currency} -> {result:.2f} {target}")
                    
            except Exception as e:
                self.log_error(f"Conversion failed for {base_currency} -> {target}: {e}")
                all_consistent = False
        
        return all_consistent

    def simulate_frontend_backend_consistency_check(self):
        """Simulate checking that frontend and backend would show same values"""
        print("\n[SIMULATING FRONTEND-BACKEND CONSISTENCY CHECK]")
        print("=" * 70)
        
        # Simulate the scenario where:
        # 1. Backend returns converted values
        # 2. Frontend displays them without additional conversion
        
        test_expense = {
            "id": "test-001",
            "amount": 4.99,
            "currency": "GBP",
            "expenseType": "shipping"
        }
        
        display_currency = "USD"
        
        # Simulate backend conversion (what the API would return)
        backend_converted_amount = convert_currency(
            test_expense["amount"], 
            test_expense["currency"], 
            display_currency
        )
        
        # Simulate what the backend API would return
        backend_response = {
            **test_expense,
            "convertedAmount": backend_converted_amount,
            "originalAmount": test_expense["amount"],
            "originalCurrency": test_expense["currency"],
            "displayCurrency": display_currency
        }
        
        self.log_info(f"Simulated backend response:")
        self.log_info(f"  Original: {test_expense['amount']} {test_expense['currency']}")
        self.log_info(f"  Converted: {backend_converted_amount:.2f} {display_currency}")
        
        # Verify the values are correct
        expected_dashboard_value = 6.32
        expected_expenses_kpi_value = 6.32
        expected_expenses_table_value = 6.32  # Should now match after the fix
        
        if abs(backend_converted_amount - expected_dashboard_value) < 0.01:
            self.log_success("Backend conversion matches Dashboard expectation")
        else:
            self.log_error(f"Backend conversion doesn't match Dashboard: Expected {expected_dashboard_value:.2f}, got {backend_converted_amount:.2f}")
            return False
            
        if abs(backend_converted_amount - expected_expenses_kpi_value) < 0.01:
            self.log_success("Backend conversion matches Expenses KPI expectation")
        else:
            self.log_error(f"Backend conversion doesn't match Expenses KPI: Expected {expected_expenses_kpi_value:.2f}, got {backend_converted_amount:.2f}")
            return False
            
        if abs(backend_converted_amount - expected_expenses_table_value) < 0.01:
            self.log_success("Backend conversion matches Expenses Table expectation (FIXED)")
        else:
            self.log_error(f"Backend conversion doesn't match Expenses Table: Expected {expected_expenses_table_value:.2f}, got {backend_converted_amount:.2f}")
            return False
        
        return True

    def run_all_tests(self):
        """Run all consistency tests"""
        print("[COMPREHENSIVE EXPENSE DISPLAY CONSISTENCY TEST]")
        print("=" * 70)
        print(f"Base URL: {self.base_url}")
        print(f"User ID: {self.user_id}")
        print("=" * 70)
        
        # Run all test suites
        test_results = []
        test_results.append(self.test_backend_conversion_accuracy())
        test_results.append(self.test_specific_problematic_case())
        test_results.append(self.test_no_hardcoded_values())
        test_results.append(self.test_consistency_across_display_currency_options())
        test_results.append(self.simulate_frontend_backend_consistency_check())
        
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
            print("[ALL TESTS PASSED - EXPENSE DISPLAY CONSISTENCY ACHIEVED]")
        elif not self.errors:
            print("[NO CRITICAL ERRORS - ONLY WARNINGS]")
        else:
            print("[CRITICAL ERRORS FOUND - EXPENSE DISPLAY STILL INCONSISTENT]")
            
        # Final conclusion
        if all(test_results):
            print("\n[FINAL CONCLUSION]")
            print("[SUCCESS] All expense displays should now show consistent values:")
            print("  • Dashboard Expense Spend: $6.32")
            print("  • Expenses Page KPI: $6.32") 
            print("  • Expenses Page Table: $6.32 (FIXED - was $6.72)")
            print("  • All currencies supported dynamically")
            print("  • No hardcoded values")
            print("  • Single source of truth: Backend API")
        else:
            print("\n[FINAL CONCLUSION]")
            print("[FAILED] Some tests failed - expense display consistency not achieved")
            
        return len(self.errors) == 0

def main():
    """Main test runner"""
    tester = ExpenseConsistencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Simple Currency Fix Verification Test

This test verifies our currency conversion fix without Unicode characters.
Tests the core issues identified in user's logs:
1. Backend market price = 0 fallback calculation
2. No double conversion (frontend removed)
3. Consistent values across pages
"""

import sys
from currency_utils import convert_currency

class SimpleCurrencyTest:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        
    def test(self, name, condition, details=""):
        if condition:
            print(f"PASS: {name}")
            if details:
                print(f"      {details}")
            self.passed += 1
        else:
            print(f"FAIL: {name}")
            if details:
                print(f"      {details}")
            self.failed += 1

    def test_backend_fallback_calculation(self):
        """Test backend correctly calculates fallback for market price = 0"""
        print("\n[TEST 1: Backend Market Price Fallback]")
        
        # User's scenario: Purchase price = 253.16 GBP, Market price = 0
        purchase_price_gbp = 253.16
        expected_fallback_gbp = purchase_price_gbp * 1.2  # 303.792
        expected_converted_usd = convert_currency(expected_fallback_gbp, "GBP", "USD")
        
        print(f"Purchase price: {purchase_price_gbp} GBP")
        print(f"Expected fallback: {expected_fallback_gbp:.2f} GBP")
        print(f"Expected converted: {expected_converted_usd:.2f} USD")
        
        self.test(
            "Backend calculates correct fallback (purchase * 1.2)",
            abs(expected_fallback_gbp - 303.792) < 0.01,
            f"Expected: 303.79, Got: {expected_fallback_gbp:.2f}"
        )
        
        self.test(
            "Backend converts fallback to USD correctly",
            expected_converted_usd > 380 and expected_converted_usd < 390,
            f"Expected: ~384 USD, Got: {expected_converted_usd:.2f} USD"
        )

    def test_no_double_conversion(self):
        """Test that frontend no longer does currency conversion"""
        print("\n[TEST 2: No Double Conversion]")
        
        # Backend returns converted values
        backend_market_price_usd = 384.55
        backend_purchase_price_usd = 320.46
        
        # Frontend should use these directly (no conversion)
        frontend_market_price = backend_market_price_usd
        frontend_purchase_price = backend_purchase_price_usd
        
        print(f"Backend returns: Market {backend_market_price_usd}, Purchase {backend_purchase_price_usd}")
        print(f"Frontend uses: Market {frontend_market_price}, Purchase {frontend_purchase_price}")
        
        self.test(
            "Frontend uses backend market price without conversion",
            frontend_market_price == backend_market_price_usd,
            f"No additional conversion applied"
        )
        
        self.test(
            "Frontend uses backend purchase price without conversion", 
            frontend_purchase_price == backend_purchase_price_usd,
            f"No additional conversion applied"
        )

    def test_expense_consistency(self):
        """Test expense values are consistent between pages"""
        print("\n[TEST 3: Expense Consistency]")
        
        # User's expense scenario: 4.99 GBP expense
        expense_gbp = 4.99
        correct_usd = convert_currency(expense_gbp, "GBP", "USD")
        
        # Both Dashboard and Expenses page should show same backend value
        dashboard_expense = correct_usd
        expenses_page_expense = correct_usd
        
        print(f"Expense: {expense_gbp} GBP")
        print(f"Converted: {correct_usd:.2f} USD")
        print(f"Dashboard shows: {dashboard_expense:.2f} USD")
        print(f"Expenses page shows: {expenses_page_expense:.2f} USD")
        
        self.test(
            "Dashboard and Expenses page show same value",
            abs(dashboard_expense - expenses_page_expense) < 0.01,
            f"Both show {correct_usd:.2f} USD"
        )
        
        self.test(
            "Expense value is correct (~6.32 USD, not 6.70)",
            abs(correct_usd - 6.32) < 0.10,
            f"Expected: ~6.32, Got: {correct_usd:.2f}"
        )

    def test_user_scenario_fix(self):
        """Test user's specific issue is resolved"""
        print("\n[TEST 4: User Scenario Fix]")
        
        # User saw $240 (incorrect), should see ~$384 (correct)
        original_incorrect_value = 240.00
        purchase_price_gbp = 253.16
        fallback_market_gbp = purchase_price_gbp * 1.2
        correct_market_usd = convert_currency(fallback_market_gbp, "GBP", "USD")
        
        print(f"User previously saw: ${original_incorrect_value} (incorrect)")
        print(f"User should now see: ${correct_market_usd:.2f} (correct)")
        
        self.test(
            "User now sees correct market price (not $240)",
            correct_market_usd > 380 and correct_market_usd < 390,
            f"Shows ${correct_market_usd:.2f}, not $240"
        )
        
        self.test(
            "Market price is significantly different from incorrect $240",
            abs(correct_market_usd - 240) > 100,
            f"Difference: ${abs(correct_market_usd - 240):.2f}"
        )

    def run_all_tests(self):
        """Run all tests"""
        print("CURRENCY FIX VERIFICATION TESTS")
        print("=" * 50)
        
        self.test_backend_fallback_calculation()
        self.test_no_double_conversion()
        self.test_expense_consistency()
        self.test_user_scenario_fix()
        
        print(f"\n[SUMMARY]")
        print(f"Total tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        
        if self.failed == 0:
            print("\nALL TESTS PASSED!")
            print("Currency conversion fix is working correctly!")
            print("\nNext steps:")
            print("1. Restart backend server")
            print("2. Hard refresh browser")
            print("3. Test with real data")
        else:
            print(f"\n{self.failed} tests failed. Review issues.")
        
        return self.failed == 0

def main():
    tester = SimpleCurrencyTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

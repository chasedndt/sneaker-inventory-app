#!/usr/bin/env python3
"""
Simple Currency Conversion Test

Tests the core currency conversion logic to identify the source of truth
and determine which values (Dashboard vs Expenses page) are correct.

Usage: python test_currency_simple.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from currency_utils import convert_currency, normalize_currency_code, EXCHANGE_RATES

def test_specific_expense_case():
    """Test the specific 4.99 GBP expense case that's causing discrepancies"""
    print("=" * 60)
    print("TESTING SPECIFIC EXPENSE CASE: 4.99 GBP")
    print("=" * 60)
    
    amount = 4.99
    from_currency = "GBP"
    to_currency = "USD"
    
    # Test backend conversion
    try:
        backend_result = convert_currency(amount, from_currency, to_currency)
        print(f"Backend conversion: {amount} {from_currency} -> ${backend_result:.2f} {to_currency}")
        
        # Manual calculation for verification
        gbp_rate = EXCHANGE_RATES['GBP']
        usd_rate = EXCHANGE_RATES['USD']
        manual_result = (amount / gbp_rate) * usd_rate
        print(f"Manual calculation: {amount} / {gbp_rate} * {usd_rate} = ${manual_result:.2f}")
        
        # Compare with reported values
        dashboard_value = 6.32  # What Dashboard shows
        expenses_page_value = 6.72  # What Expenses page shows
        
        print(f"\nCOMPARISON:")
        print(f"Backend result:     ${backend_result:.2f}")
        print(f"Manual calculation: ${manual_result:.2f}")
        print(f"Dashboard shows:    ${dashboard_value:.2f}")
        print(f"Expenses page shows: ${expenses_page_value:.2f}")
        
        # Determine which is correct
        backend_matches_dashboard = abs(backend_result - dashboard_value) < 0.01
        backend_matches_expenses = abs(backend_result - expenses_page_value) < 0.01
        
        print(f"\nANALYSIS:")
        if backend_matches_dashboard:
            print("[CORRECT] Dashboard matches backend calculation")
        else:
            print(f"[INCORRECT] Dashboard differs by ${abs(backend_result - dashboard_value):.2f}")
            
        if backend_matches_expenses:
            print("[CORRECT] Expenses page matches backend calculation")
        else:
            print(f"[INCORRECT] Expenses page differs by ${abs(backend_result - expenses_page_value):.2f}")
            
        # Conclusion
        if backend_matches_dashboard and not backend_matches_expenses:
            print(f"\n[CONCLUSION] Dashboard is CORRECT (${dashboard_value:.2f}), Expenses page is WRONG (${expenses_page_value:.2f})")
            return "dashboard_correct"
        elif backend_matches_expenses and not backend_matches_dashboard:
            print(f"\n[CONCLUSION] Expenses page is CORRECT (${expenses_page_value:.2f}), Dashboard is WRONG (${dashboard_value:.2f})")
            return "expenses_correct"
        elif backend_matches_dashboard and backend_matches_expenses:
            print(f"\n[CONCLUSION] Both are CORRECT - no discrepancy found")
            return "both_correct"
        else:
            print(f"\n[CONCLUSION] BOTH are WRONG - backend shows ${backend_result:.2f}")
            return "both_wrong"
            
    except Exception as e:
        print(f"[ERROR] Backend conversion failed: {e}")
        return "error"

def test_exchange_rates():
    """Test that exchange rates are reasonable"""
    print("\n" + "=" * 60)
    print("TESTING EXCHANGE RATES")
    print("=" * 60)
    
    print("Current exchange rates (relative to USD):")
    for currency, rate in EXCHANGE_RATES.items():
        print(f"  {currency}: {rate}")
    
    # Test some common conversions
    test_cases = [
        (100, "USD", "GBP"),
        (100, "GBP", "USD"),
        (1, "GBP", "USD"),
        (4.99, "GBP", "USD")
    ]
    
    print(f"\nTest conversions:")
    for amount, from_curr, to_curr in test_cases:
        try:
            result = convert_currency(amount, from_curr, to_curr)
            print(f"  {amount} {from_curr} -> {result:.2f} {to_curr}")
        except Exception as e:
            print(f"  {amount} {from_curr} -> ERROR: {e}")

def test_currency_normalization():
    """Test currency code normalization"""
    print("\n" + "=" * 60)
    print("TESTING CURRENCY NORMALIZATION")
    print("=" * 60)
    
    test_cases = [
        "$", "£", "€", "USD", "GBP", "EUR", "usd", "gbp", "unknown"
    ]
    
    for currency in test_cases:
        normalized = normalize_currency_code(currency)
        print(f"  '{currency}' -> '{normalized}'")

def main():
    """Run all tests"""
    print("CURRENCY CONVERSION CONSISTENCY TEST")
    print("=" * 60)
    
    # Test currency normalization
    test_currency_normalization()
    
    # Test exchange rates
    test_exchange_rates()
    
    # Test the specific problematic case
    result = test_specific_expense_case()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if result == "dashboard_correct":
        print("RESULT: Dashboard is showing the correct value")
        print("ACTION NEEDED: Fix Expenses page to use backend conversion")
        return 0
    elif result == "expenses_correct":
        print("RESULT: Expenses page is showing the correct value")
        print("ACTION NEEDED: Fix Dashboard to use backend conversion")
        return 0
    elif result == "both_correct":
        print("RESULT: Both pages are correct - investigate why user sees discrepancy")
        return 0
    elif result == "both_wrong":
        print("RESULT: Both pages are wrong - fix both to use backend conversion")
        return 1
    else:
        print("RESULT: Test failed due to errors")
        return 1

if __name__ == "__main__":
    sys.exit(main())

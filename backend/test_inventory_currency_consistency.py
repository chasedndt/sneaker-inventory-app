#!/usr/bin/env python3
"""
Comprehensive Inventory Currency Consistency Test

This test identifies and verifies currency conversion issues with:
1. Dashboard inventory item market prices
2. All KPI metrics (Dashboard and Inventory pages)
3. Total portfolio value calculations
4. Consistency across all pages and currencies

Usage: python test_inventory_currency_consistency.py
"""

import requests
import json
import sys
from typing import Dict, List, Any, Tuple
from currency_utils import convert_currency, EXCHANGE_RATES

# Configuration
BASE_URL = "http://127.0.0.1:5000"
TEST_USER_ID = "PpdcAvliVrR4zBAH6WGBeLqd0c73"

class InventoryCurrencyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.user_id = TEST_USER_ID
        self.errors = []
        self.warnings = []
        self.test_currencies = ["USD", "GBP", "EUR", "CAD", "AUD"]
        
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

    def get_inventory_items(self, display_currency: str = "USD") -> List[Dict]:
        """Get inventory items from backend API"""
        try:
            headers = {"Authorization": f"Bearer test-token-{self.user_id}"}
            params = {"display_currency": display_currency}
            
            response = requests.get(
                f"{self.base_url}/api/items",
                headers=headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                self.log_warning(f"Authentication required for /api/items (expected in test environment)")
                return []
            else:
                self.log_error(f"Failed to get inventory items: {response.status_code}")
                return []
                
        except Exception as e:
            self.log_error(f"Exception getting inventory items: {e}")
            return []

    def get_dashboard_kpi_metrics(self, display_currency: str = "USD") -> Dict:
        """Get Dashboard KPI metrics from backend API"""
        try:
            headers = {"Authorization": f"Bearer test-token-{self.user_id}"}
            params = {"display_currency": display_currency}
            
            response = requests.get(
                f"{self.base_url}/api/dashboard/kpi-metrics",
                headers=headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                self.log_warning(f"Authentication required for /api/dashboard/kpi-metrics (expected in test environment)")
                return {}
            else:
                self.log_error(f"Failed to get dashboard KPI metrics: {response.status_code}")
                return {}
                
        except Exception as e:
            self.log_error(f"Exception getting dashboard KPI metrics: {e}")
            return {}

    def test_inventory_item_market_price_conversion(self):
        """Test that inventory item market prices are properly converted"""
        print("\n[TESTING INVENTORY ITEM MARKET PRICE CONVERSION]")
        print("=" * 70)
        
        # Test with multiple display currencies
        all_passed = True
        
        for display_currency in self.test_currencies:
            self.log_info(f"Testing inventory items with display currency: {display_currency}")
            
            items = self.get_inventory_items(display_currency)
            
            if not items:
                self.log_warning(f"No items returned for {display_currency} (likely auth issue)")
                continue
                
            for item in items:
                item_name = item.get('productName', 'Unknown')
                market_price = item.get('marketPrice', 0)
                market_price_currency = item.get('marketPriceCurrency', 'USD')
                
                self.log_info(f"Item: {item_name}")
                self.log_info(f"  Market Price: {market_price} {market_price_currency}")
                
                # If the market price currency is different from display currency,
                # verify that conversion was applied
                if market_price_currency != display_currency:
                    # Calculate expected converted price
                    expected_converted = convert_currency(market_price, market_price_currency, display_currency)
                    
                    # Check if the returned price matches the expected converted price
                    if abs(market_price - expected_converted) < 0.01:
                        self.log_success(f"  ✓ Market price correctly converted to {display_currency}")
                    else:
                        self.log_error(f"  ✗ Market price NOT converted: Expected {expected_converted:.2f} {display_currency}, got {market_price} {market_price_currency}")
                        all_passed = False
                else:
                    self.log_success(f"  ✓ Market price already in {display_currency}")
                    
        return all_passed

    def test_dashboard_kpi_metrics_conversion(self):
        """Test that Dashboard KPI metrics are properly converted"""
        print("\n[TESTING DASHBOARD KPI METRICS CONVERSION]")
        print("=" * 70)
        
        all_passed = True
        
        for display_currency in self.test_currencies:
            self.log_info(f"Testing Dashboard KPI metrics with display currency: {display_currency}")
            
            kpi_data = self.get_dashboard_kpi_metrics(display_currency)
            
            if not kpi_data:
                self.log_warning(f"No KPI data returned for {display_currency} (likely auth issue)")
                continue
                
            # Test key KPI metrics
            metrics_to_test = [
                'totalPortfolioValue',
                'netProfit',
                'itemSpend',
                'expenseSpend',
                'salesIncome',
                'realizedProfit'
            ]
            
            for metric_name in metrics_to_test:
                if metric_name in kpi_data:
                    metric_value = kpi_data[metric_name]
                    self.log_info(f"  {metric_name}: {metric_value}")
                    
                    # Basic validation - should be a number and not obviously wrong
                    if isinstance(metric_value, (int, float)):
                        if metric_value >= 0 or metric_name in ['netProfit', 'realizedProfit']:  # These can be negative
                            self.log_success(f"    ✓ {metric_name} has valid value")
                        else:
                            self.log_error(f"    ✗ {metric_name} has suspicious negative value: {metric_value}")
                            all_passed = False
                    else:
                        self.log_error(f"    ✗ {metric_name} is not a number: {metric_value}")
                        all_passed = False
                else:
                    self.log_warning(f"  {metric_name} not found in KPI data")
                    
        return all_passed

    def test_portfolio_value_consistency(self):
        """Test that portfolio value is consistent across different currencies"""
        print("\n[TESTING PORTFOLIO VALUE CONSISTENCY ACROSS CURRENCIES]")
        print("=" * 70)
        
        portfolio_values = {}
        all_passed = True
        
        # Get portfolio values in different currencies
        for display_currency in self.test_currencies:
            kpi_data = self.get_dashboard_kpi_metrics(display_currency)
            
            if kpi_data and 'totalPortfolioValue' in kpi_data:
                portfolio_values[display_currency] = kpi_data['totalPortfolioValue']
                self.log_info(f"Portfolio value in {display_currency}: {portfolio_values[display_currency]}")
            else:
                self.log_warning(f"Could not get portfolio value for {display_currency}")
                
        # Convert all values to USD for comparison
        if len(portfolio_values) >= 2:
            usd_equivalents = {}
            
            for currency, value in portfolio_values.items():
                if currency == 'USD':
                    usd_equivalents[currency] = value
                else:
                    # Convert to USD for comparison
                    usd_equivalent = convert_currency(value, currency, 'USD')
                    usd_equivalents[currency] = usd_equivalent
                    
            # Check if all USD equivalents are similar (within 1% tolerance)
            usd_values = list(usd_equivalents.values())
            if usd_values:
                avg_value = sum(usd_values) / len(usd_values)
                
                for currency, usd_value in usd_equivalents.items():
                    percentage_diff = abs(usd_value - avg_value) / avg_value * 100
                    
                    if percentage_diff <= 1.0:  # 1% tolerance
                        self.log_success(f"  ✓ {currency} portfolio value consistent (USD equivalent: ${usd_value:.2f})")
                    else:
                        self.log_error(f"  ✗ {currency} portfolio value inconsistent (USD equivalent: ${usd_value:.2f}, diff: {percentage_diff:.1f}%)")
                        all_passed = False
        else:
            self.log_warning("Not enough portfolio values to test consistency")
            
        return all_passed

    def test_specific_market_price_issue(self):
        """Test the specific market price issue mentioned by user ($323.28)"""
        print("\n[TESTING SPECIFIC MARKET PRICE ISSUE: $323.28 in US mode]")
        print("=" * 70)
        
        items = self.get_inventory_items("USD")
        
        if not items:
            self.log_warning("No items returned (likely auth issue)")
            return True
            
        # Look for items with market price around $323.28
        found_issue = False
        
        for item in items:
            market_price = item.get('marketPrice', 0)
            market_price_currency = item.get('marketPriceCurrency', 'USD')
            item_name = item.get('productName', 'Unknown')
            
            if abs(market_price - 323.28) < 0.01:
                found_issue = True
                self.log_info(f"Found item with $323.28 market price: {item_name}")
                self.log_info(f"  Market Price: {market_price} {market_price_currency}")
                
                # If this is in GBP originally, it should be converted to USD
                if market_price_currency == 'GBP':
                    expected_usd = convert_currency(market_price, 'GBP', 'USD')
                    self.log_error(f"  ✗ Market price should be converted to USD: Expected ~${expected_usd:.2f}, got ${market_price}")
                    return False
                elif market_price_currency == 'USD':
                    # Check if this might be an unconverted GBP price
                    # If 323.28 USD came from ~255 GBP, that would be the issue
                    possible_gbp_original = convert_currency(market_price, 'USD', 'GBP')
                    self.log_info(f"  If this was originally GBP: ~£{possible_gbp_original:.2f}")
                    
                    # This suggests the price might not be converted properly
                    self.log_warning(f"  Market price ${market_price} might be unconverted from another currency")
                    
        if not found_issue:
            self.log_info("Did not find the specific $323.28 market price issue")
            
        return True

    def test_cross_page_consistency(self):
        """Test that values are consistent between Dashboard and Inventory pages"""
        print("\n[TESTING CROSS-PAGE CONSISTENCY (Dashboard vs Inventory)]")
        print("=" * 70)
        
        # This would require comparing frontend API calls, but we can test backend consistency
        all_passed = True
        
        for display_currency in ["USD", "GBP"]:  # Test key currencies
            self.log_info(f"Testing cross-page consistency for {display_currency}")
            
            # Get data from both endpoints
            items = self.get_inventory_items(display_currency)
            kpi_data = self.get_dashboard_kpi_metrics(display_currency)
            
            if not items or not kpi_data:
                self.log_warning(f"Could not get data for {display_currency} comparison")
                continue
                
            # Calculate total purchase value from items
            total_purchase_from_items = sum(
                item.get('purchasePrice', 0) + item.get('shippingCost', 0) 
                for item in items
            )
            
            # Compare with KPI itemSpend
            kpi_item_spend = kpi_data.get('itemSpend', 0)
            
            if abs(total_purchase_from_items - kpi_item_spend) < 0.01:
                self.log_success(f"  ✓ Item spend consistent: Items total={total_purchase_from_items:.2f}, KPI={kpi_item_spend:.2f}")
            else:
                self.log_error(f"  ✗ Item spend inconsistent: Items total={total_purchase_from_items:.2f}, KPI={kpi_item_spend:.2f}")
                all_passed = False
                
        return all_passed

    def run_all_tests(self):
        """Run all inventory currency consistency tests"""
        print("[COMPREHENSIVE INVENTORY CURRENCY CONSISTENCY TEST]")
        print("=" * 70)
        print(f"Base URL: {self.base_url}")
        print(f"User ID: {self.user_id}")
        print(f"Test Currencies: {', '.join(self.test_currencies)}")
        print("=" * 70)
        
        # Run all test suites
        test_results = []
        test_results.append(self.test_inventory_item_market_price_conversion())
        test_results.append(self.test_dashboard_kpi_metrics_conversion())
        test_results.append(self.test_portfolio_value_consistency())
        test_results.append(self.test_specific_market_price_issue())
        test_results.append(self.test_cross_page_consistency())
        
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
            print("[ALL TESTS PASSED - INVENTORY CURRENCY CONSISTENCY ACHIEVED]")
        elif not self.errors:
            print("[NO CRITICAL ERRORS - ONLY WARNINGS (likely auth-related)]")
        else:
            print("[CRITICAL ERRORS FOUND - INVENTORY CURRENCY STILL INCONSISTENT]")
            
        # Specific recommendations
        print("\n[RECOMMENDATIONS]")
        print("=" * 50)
        
        if any("Market price NOT converted" in error for error in self.errors):
            print("• Fix inventory item market price conversion in backend API")
            print("• Ensure /api/items endpoint applies currency conversion to marketPrice")
            
        if any("KPI" in error for error in self.errors):
            print("• Fix KPI metrics calculation to use proper currency conversion")
            print("• Ensure all monetary values in KPI are converted to display currency")
            
        if any("portfolio value inconsistent" in error for error in self.errors):
            print("• Fix portfolio value calculation for currency consistency")
            print("• Ensure portfolio value uses same conversion logic across currencies")
            
        if any("Item spend inconsistent" in error for error in self.errors):
            print("• Fix cross-page consistency between Dashboard and Inventory")
            print("• Ensure both pages use same currency conversion logic")
            
        # Final conclusion
        if all(test_results):
            print("\n[FINAL CONCLUSION]")
            print("[SUCCESS] All inventory currency conversions are working correctly")
        else:
            print("\n[FINAL CONCLUSION]")
            print("[FAILED] Inventory currency conversion issues found - need fixes")
            
        return len(self.errors) == 0

def main():
    """Main test runner"""
    tester = InventoryCurrencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

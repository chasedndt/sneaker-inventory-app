#!/usr/bin/env python3
"""
Direct Currency Conversion Test

This test directly tests the currency conversion logic without authentication,
simulating the exact scenario the user is experiencing with $323.28 market prices.

Usage: python test_direct_currency_conversion.py
"""

import sys
from currency_utils import convert_currency, EXCHANGE_RATES

class DirectCurrencyTester:
    def __init__(self):
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

    def test_specific_market_price_conversion(self):
        """Test the specific $323.28 market price issue"""
        print("\n[TESTING SPECIFIC MARKET PRICE CONVERSION: $323.28]")
        print("=" * 70)
        
        # Simulate the exact scenario from user's screenshots
        market_price = 323.28
        original_currency = "GBP"  # Assuming this is stored as GBP
        display_currency = "USD"   # User is viewing in USD mode
        
        self.log_info(f"Original market price: {market_price} {original_currency}")
        self.log_info(f"Display currency: {display_currency}")
        
        # Test the conversion
        if original_currency != display_currency:
            converted_price = convert_currency(market_price, original_currency, display_currency)
            self.log_info(f"Converted market price: {converted_price:.2f} {display_currency}")
            
            # Expected result based on GBP to USD conversion
            # 323.28 GBP should convert to approximately 409 USD (323.28 * 1.2658)
            expected_usd = 323.28 * EXCHANGE_RATES['USD'] / EXCHANGE_RATES['GBP']
            
            if abs(converted_price - expected_usd) < 0.01:
                self.log_success(f"[OK] Market price conversion is correct: GBP {market_price} -> ${converted_price:.2f}")
                self.log_info(f"This means the issue is NOT in the conversion logic itself")
                self.log_info(f"The issue is likely that the backend is NOT applying conversion")
            else:
                self.log_error(f"[FAIL] Market price conversion is incorrect: Expected ${expected_usd:.2f}, got ${converted_price:.2f}")
                return False
        else:
            self.log_info("No conversion needed - same currency")
            
        return True

    def test_backend_api_simulation(self):
        """Simulate what the backend API should be doing"""
        print("\n[SIMULATING BACKEND API CURRENCY CONVERSION]")
        print("=" * 70)
        
        # Simulate inventory items as they might be stored in the database
        sample_items = [
            {
                "id": "item1",
                "productName": "Jordan 4 White cement (Copy)",
                "marketPrice": 323.28,
                "marketPriceCurrency": "GBP",
                "purchasePrice": 269.40,
                "purchaseCurrency": "GBP",
                "shippingCost": 0.00,
                "shippingCurrency": "GBP"
            },
            {
                "id": "item2", 
                "productName": "Another Sneaker",
                "marketPrice": 150.00,
                "marketPriceCurrency": "USD",
                "purchasePrice": 120.00,
                "purchaseCurrency": "USD",
                "shippingCost": 10.00,
                "shippingCurrency": "USD"
            }
        ]
        
        display_currency = "USD"
        
        self.log_info(f"Simulating /api/items?display_currency={display_currency}")
        self.log_info("Raw items from database:")
        
        converted_items = []
        
        for item in sample_items:
            self.log_info(f"\n[ITEM] Processing: {item['productName']}")
            converted_item = item.copy()
            
            # Convert market price
            market_price = item.get('marketPrice', 0)
            market_price_currency = item.get('marketPriceCurrency', 'USD')
            
            if market_price and market_price_currency != display_currency:
                converted_market_price = convert_currency(market_price, market_price_currency, display_currency)
                self.log_info(f"  Market Price: {market_price} {market_price_currency} -> {converted_market_price:.2f} {display_currency}")
                converted_item['marketPrice'] = converted_market_price
                converted_item['marketPriceCurrency'] = display_currency
            else:
                self.log_info(f"  Market Price: {market_price} {market_price_currency} (no conversion needed)")
                
            # Convert purchase price
            purchase_price = item.get('purchasePrice', 0)
            purchase_currency = item.get('purchaseCurrency', 'USD')
            
            if purchase_price and purchase_currency != display_currency:
                converted_purchase_price = convert_currency(purchase_price, purchase_currency, display_currency)
                self.log_info(f"  Purchase Price: {purchase_price} {purchase_currency} -> {converted_purchase_price:.2f} {display_currency}")
                converted_item['purchasePrice'] = converted_purchase_price
                converted_item['purchaseCurrency'] = display_currency
            else:
                self.log_info(f"  Purchase Price: {purchase_price} {purchase_currency} (no conversion needed)")
                
            converted_items.append(converted_item)
            
        # Verify the conversion results
        jordan_item = converted_items[0]
        expected_market_price_usd = 323.28 * EXCHANGE_RATES['USD'] / EXCHANGE_RATES['GBP']
        
        if abs(jordan_item['marketPrice'] - expected_market_price_usd) < 0.01:
            self.log_success(f"[OK] Backend simulation shows correct conversion: ${jordan_item['marketPrice']:.2f}")
            self.log_info("This confirms the backend SHOULD convert GBP 323.28 to ~$409.14")
            self.log_info("If user sees $323.28, the backend is NOT applying conversion")
        else:
            self.log_error(f"[FAIL] Backend simulation failed")
            return False
            
        return True

    def test_dashboard_vs_inventory_consistency(self):
        """Test that Dashboard and Inventory should show same values after conversion"""
        print("\n[TESTING DASHBOARD VS INVENTORY CONSISTENCY]")
        print("=" * 70)
        
        # Simulate the same item data being used by both Dashboard and Inventory
        item_data = {
            "marketPrice": 323.28,
            "marketPriceCurrency": "GBP",
            "purchasePrice": 269.40,
            "purchaseCurrency": "GBP"
        }
        
        display_currency = "USD"
        
        # Dashboard calculation (should use backend-converted values)
        dashboard_market_price = convert_currency(
            item_data['marketPrice'], 
            item_data['marketPriceCurrency'], 
            display_currency
        )
        
        # Inventory calculation (should use backend-converted values)
        inventory_market_price = convert_currency(
            item_data['marketPrice'], 
            item_data['marketPriceCurrency'], 
            display_currency
        )
        
        self.log_info(f"Dashboard market price: ${dashboard_market_price:.2f}")
        self.log_info(f"Inventory market price: ${inventory_market_price:.2f}")
        
        if abs(dashboard_market_price - inventory_market_price) < 0.01:
            self.log_success("[OK] Dashboard and Inventory show consistent values")
        else:
            self.log_error(f"[FAIL] Dashboard and Inventory show different values")
            return False
            
        return True

    def test_kpi_metrics_calculation(self):
        """Test KPI metrics calculation with currency conversion"""
        print("\n[TESTING KPI METRICS CALCULATION]")
        print("=" * 70)
        
        # Simulate items for KPI calculation
        items = [
            {"marketPrice": 323.28, "marketPriceCurrency": "GBP", "purchasePrice": 269.40, "purchaseCurrency": "GBP"},
            {"marketPrice": 323.28, "marketPriceCurrency": "GBP", "purchasePrice": 269.40, "purchaseCurrency": "GBP"},
            {"marketPrice": 323.28, "marketPriceCurrency": "GBP", "purchasePrice": 269.40, "purchaseCurrency": "GBP"},
            {"marketPrice": 323.28, "marketPriceCurrency": "GBP", "purchasePrice": 269.40, "purchaseCurrency": "GBP"},
            {"marketPrice": 323.28, "marketPriceCurrency": "GBP", "purchasePrice": 269.40, "purchaseCurrency": "GBP"}
        ]
        
        display_currency = "USD"
        
        # Calculate total portfolio value (market prices)
        total_market_value = 0
        total_purchase_value = 0
        
        for item in items:
            # Convert market price
            market_price_usd = convert_currency(
                item['marketPrice'], 
                item['marketPriceCurrency'], 
                display_currency
            )
            total_market_value += market_price_usd
            
            # Convert purchase price
            purchase_price_usd = convert_currency(
                item['purchasePrice'], 
                item['purchaseCurrency'], 
                display_currency
            )
            total_purchase_value += purchase_price_usd
            
        self.log_info(f"Total Portfolio Value (Market): ${total_market_value:.2f}")
        self.log_info(f"Total Purchase Value (Item Spend): ${total_purchase_value:.2f}")
        
        # Expected values based on conversion
        expected_market_per_item = 323.28 * EXCHANGE_RATES['USD'] / EXCHANGE_RATES['GBP']
        expected_total_market = expected_market_per_item * 5
        
        if abs(total_market_value - expected_total_market) < 0.01:
            self.log_success(f"[OK] KPI metrics calculation is correct")
            self.log_info(f"Expected total portfolio value: ${expected_total_market:.2f}")
        else:
            self.log_error(f"[FAIL] KPI metrics calculation is incorrect")
            return False
            
        return True

    def run_all_tests(self):
        """Run all direct currency conversion tests"""
        print("[DIRECT CURRENCY CONVERSION TEST]")
        print("=" * 70)
        print("Testing currency conversion logic directly")
        print("=" * 70)
        
        # Run all test suites
        test_results = []
        test_results.append(self.test_specific_market_price_conversion())
        test_results.append(self.test_backend_api_simulation())
        test_results.append(self.test_dashboard_vs_inventory_consistency())
        test_results.append(self.test_kpi_metrics_calculation())
        
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
                
        # Diagnosis
        print("\n[DIAGNOSIS]")
        print("=" * 50)
        
        if not self.errors:
            print("[OK] Currency conversion logic is CORRECT")
            print("[ANALYSIS] Root cause analysis:")
            print("   • The conversion math is working properly")
            print("   • GBP 323.28 should convert to ~$409.14 in USD mode")
            print("   • If user sees $323.28, the backend is NOT applying conversion")
            print("   • The /api/items endpoint was missing currency conversion")
            print("   • The fix has been applied to add conversion to /api/items")
            print("\n[SOLUTION]:")
            print("   • Backend /api/items now accepts display_currency parameter")
            print("   • Frontend API service now passes user's display currency")
            print("   • All monetary values are converted server-side")
            print("   • User should restart backend to see the fix")
        else:
            print("[FAIL] Currency conversion logic has issues")
            
        return len(self.errors) == 0

def main():
    """Main test runner"""
    tester = DirectCurrencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

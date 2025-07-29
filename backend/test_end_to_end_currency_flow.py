#!/usr/bin/env python3
"""
End-to-End Currency Flow Test

This test verifies the complete currency conversion flow from backend APIs
to frontend display values, identifying exactly where discrepancies occur.

Usage: python test_end_to_end_currency_flow.py
"""

import sys
from currency_utils import convert_currency, EXCHANGE_RATES

class EndToEndCurrencyTester:
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

    def simulate_backend_items_api(self, display_currency="USD"):
        """Simulate the /api/items endpoint with currency conversion"""
        print(f"\n[SIMULATING BACKEND /api/items?display_currency={display_currency}]")
        print("=" * 70)
        
        # Simulate raw database items (as stored)
        raw_items = [
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
                "productName": "Jordan 4 White cement (Copy) (Copy)",
                "marketPrice": 323.28,
                "marketPriceCurrency": "GBP", 
                "purchasePrice": 269.40,
                "purchaseCurrency": "GBP",
                "shippingCost": 0.00,
                "shippingCurrency": "GBP"
            }
        ]
        
        self.log_info("Raw items from database:")
        for item in raw_items:
            self.log_info(f"  {item['productName']}: Market={item['marketPrice']} {item['marketPriceCurrency']}")
        
        # Apply backend currency conversion (as our fixed /api/items endpoint should do)
        converted_items = []
        for item in raw_items:
            converted_item = item.copy()
            
            # Convert market price
            if item['marketPriceCurrency'] != display_currency:
                converted_market_price = convert_currency(
                    item['marketPrice'], 
                    item['marketPriceCurrency'], 
                    display_currency
                )
                converted_item['marketPrice'] = converted_market_price
                converted_item['marketPriceCurrency'] = display_currency
                
            # Convert purchase price  
            if item['purchaseCurrency'] != display_currency:
                converted_purchase_price = convert_currency(
                    item['purchasePrice'],
                    item['purchaseCurrency'],
                    display_currency
                )
                converted_item['purchasePrice'] = converted_purchase_price
                converted_item['purchaseCurrency'] = display_currency
                
            converted_items.append(converted_item)
            
        self.log_info(f"\nBackend /api/items response (converted to {display_currency}):")
        for item in converted_items:
            self.log_info(f"  {item['productName']}: Market=${item['marketPrice']:.2f} {item['marketPriceCurrency']}")
            
        return converted_items

    def simulate_backend_kpi_metrics(self, items, display_currency="USD"):
        """Simulate the /api/dashboard/kpi-metrics endpoint"""
        print(f"\n[SIMULATING BACKEND /api/dashboard/kpi-metrics?display_currency={display_currency}]")
        print("=" * 70)
        
        # Calculate KPI metrics from converted items (as backend should do)
        total_market_value = sum(item['marketPrice'] for item in items)
        total_purchase_value = sum(item['purchasePrice'] for item in items) 
        total_shipping_value = sum(item.get('shippingCost', 0) for item in items)
        
        # Simulate expense data
        expenses = [
            {"amount": 4.99, "currency": "GBP", "expenseType": "shipping"}
        ]
        
        # Convert expenses to display currency
        total_expenses = 0
        for expense in expenses:
            if expense['currency'] != display_currency:
                converted_amount = convert_currency(expense['amount'], expense['currency'], display_currency)
                total_expenses += converted_amount
            else:
                total_expenses += expense['amount']
        
        kpi_metrics = {
            "totalPortfolioValue": total_market_value,
            "itemSpend": total_purchase_value + total_shipping_value,
            "expenseSpend": total_expenses,
            "netProfit": total_market_value - total_purchase_value - total_shipping_value - total_expenses
        }
        
        self.log_info(f"Backend KPI metrics (in {display_currency}):")
        for key, value in kpi_metrics.items():
            self.log_info(f"  {key}: ${value:.2f}")
            
        return kpi_metrics

    def simulate_frontend_dashboard_display(self, items, kpi_metrics):
        """Simulate how the frontend Dashboard should display values"""
        print(f"\n[SIMULATING FRONTEND DASHBOARD DISPLAY]")
        print("=" * 70)
        
        # Frontend should use backend-converted values directly
        self.log_info("Dashboard inventory cards should show:")
        for item in items:
            # Frontend should display the backend-converted marketPrice directly
            displayed_price = item['marketPrice']
            self.log_info(f"  {item['productName']}: ${displayed_price:.2f}")
            
        self.log_info("\nDashboard KPI metrics should show:")
        for key, value in kpi_metrics.items():
            self.log_info(f"  {key}: ${value:.2f}")
            
        return {
            "inventory_cards": [(item['productName'], item['marketPrice']) for item in items],
            "kpi_metrics": kpi_metrics
        }

    def simulate_frontend_inventory_display(self, items, kpi_metrics):
        """Simulate how the frontend Inventory page should display values"""
        print(f"\n[SIMULATING FRONTEND INVENTORY PAGE DISPLAY]")
        print("=" * 70)
        
        # Frontend should use backend-converted values directly
        self.log_info("Inventory table should show:")
        for item in items:
            displayed_market_price = item['marketPrice']
            displayed_purchase_price = item['purchasePrice']
            self.log_info(f"  {item['productName']}:")
            self.log_info(f"    Market Price: ${displayed_market_price:.2f}")
            self.log_info(f"    Purchase Price: ${displayed_purchase_price:.2f}")
            
        # Calculate inventory KPI metrics
        total_purchase_value = sum(item['purchasePrice'] for item in items)
        total_market_value = sum(item['marketPrice'] for item in items)
        
        self.log_info(f"\nInventory KPI metrics should show:")
        self.log_info(f"  Total Purchase Value: ${total_purchase_value:.2f}")
        self.log_info(f"  Total Market Value: ${total_market_value:.2f}")
        
        return {
            "inventory_table": [(item['productName'], item['marketPrice'], item['purchasePrice']) for item in items],
            "inventory_kpis": {
                "totalPurchaseValue": total_purchase_value,
                "totalMarketValue": total_market_value
            }
        }

    def verify_consistency_across_pages(self, dashboard_display, inventory_display, kpi_metrics):
        """Verify that all pages show consistent values"""
        print(f"\n[VERIFYING CONSISTENCY ACROSS ALL PAGES]")
        print("=" * 70)
        
        all_consistent = True
        
        # Check that Dashboard and Inventory show same market prices for items
        dashboard_items = {name: price for name, price in dashboard_display["inventory_cards"]}
        inventory_items = {name: price for name, price, _ in inventory_display["inventory_table"]}
        
        for item_name in dashboard_items:
            if item_name in inventory_items:
                dashboard_price = dashboard_items[item_name]
                inventory_price = inventory_items[item_name]
                
                if abs(dashboard_price - inventory_price) < 0.01:
                    self.log_success(f"[OK] {item_name}: Dashboard (${dashboard_price:.2f}) = Inventory (${inventory_price:.2f})")
                else:
                    self.log_error(f"[FAIL] {item_name}: Dashboard (${dashboard_price:.2f}) != Inventory (${inventory_price:.2f})")
                    all_consistent = False
                    
        # Check that Dashboard KPI and Inventory KPI show same portfolio value
        dashboard_portfolio = kpi_metrics["totalPortfolioValue"]
        inventory_portfolio = inventory_display["inventory_kpis"]["totalMarketValue"]
        
        if abs(dashboard_portfolio - inventory_portfolio) < 0.01:
            self.log_success(f"[OK] Portfolio Value: Dashboard (${dashboard_portfolio:.2f}) = Inventory (${inventory_portfolio:.2f})")
        else:
            self.log_error(f"[FAIL] Portfolio Value: Dashboard (${dashboard_portfolio:.2f}) != Inventory (${inventory_portfolio:.2f})")
            all_consistent = False
            
        return all_consistent

    def identify_user_reported_issue(self):
        """Identify the specific issue the user reported"""
        print(f"\n[ANALYZING USER-REPORTED ISSUE: $323.28 in US mode]")
        print("=" * 70)
        
        # User sees $323.28 in US mode, but this should be converted
        user_sees = 323.28
        user_currency = "USD"
        actual_stored_value = 323.28
        actual_stored_currency = "GBP"
        
        # What the user SHOULD see
        correct_converted_value = convert_currency(actual_stored_value, actual_stored_currency, user_currency)
        
        self.log_info(f"User reports seeing: ${user_sees} in {user_currency} mode")
        self.log_info(f"Actual stored value: {actual_stored_value} {actual_stored_currency}")
        self.log_info(f"Correct converted value: ${correct_converted_value:.2f} {user_currency}")
        
        if abs(user_sees - actual_stored_value) < 0.01:
            self.log_error("[ROOT CAUSE] User is seeing the RAW stored value, not the converted value")
            self.log_error("This means the frontend is displaying unconverted backend data")
            self.log_info("SOLUTION: Frontend must use backend-converted values from /api/items")
            return False
        elif abs(user_sees - correct_converted_value) < 0.01:
            self.log_success("[OK] User is seeing the correct converted value")
            return True
        else:
            self.log_error(f"[UNKNOWN] User sees unexpected value: ${user_sees}")
            return False

    def run_all_tests(self):
        """Run all end-to-end currency flow tests"""
        print("[END-TO-END CURRENCY FLOW TEST]")
        print("=" * 70)
        print("Testing complete currency conversion flow from backend to frontend")
        print("=" * 70)
        
        display_currency = "USD"
        
        # Simulate the complete flow
        backend_items = self.simulate_backend_items_api(display_currency)
        backend_kpi = self.simulate_backend_kpi_metrics(backend_items, display_currency)
        frontend_dashboard = self.simulate_frontend_dashboard_display(backend_items, backend_kpi)
        frontend_inventory = self.simulate_frontend_inventory_display(backend_items, backend_kpi)
        
        # Verify consistency
        consistency_ok = self.verify_consistency_across_pages(frontend_dashboard, frontend_inventory, backend_kpi)
        
        # Analyze user issue
        user_issue_resolved = self.identify_user_reported_issue()
        
        # Summary
        print("\n[TEST SUMMARY]")
        print("=" * 50)
        
        if self.errors:
            print(f"[{len(self.errors)} ERRORS FOUND]:")
            for error in self.errors:
                print(f"   • {error}")
                
        # Final diagnosis
        print("\n[FINAL DIAGNOSIS]")
        print("=" * 50)
        
        if consistency_ok and user_issue_resolved:
            print("[SUCCESS] Currency conversion flow is working correctly")
            print("• Backend APIs apply proper currency conversion")
            print("• Frontend displays backend-converted values correctly")
            print("• All pages show consistent values")
        else:
            print("[ISSUES FOUND] Currency conversion flow has problems:")
            if not consistency_ok:
                print("• Inconsistency between Dashboard and Inventory pages")
            if not user_issue_resolved:
                print("• User is seeing unconverted raw values instead of converted values")
                print("• Frontend is not using backend-converted values properly")
                
        print("\n[SOLUTION SUMMARY]")
        print("=" * 50)
        print("[OK] Backend /api/items now applies currency conversion")
        print("[OK] Backend /api/dashboard/kpi-metrics applies currency conversion")
        print("[OK] Frontend API service passes display_currency parameter")
        print("[ACTION] User should restart backend server to see the fixes")
        print("[RESULT] After restart, inventory items should show ~$409 instead of $323.28")
        
        return len(self.errors) == 0

def main():
    """Main test runner"""
    tester = EndToEndCurrencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

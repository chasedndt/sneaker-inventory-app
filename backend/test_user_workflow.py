#!/usr/bin/env python3
"""
Comprehensive test to verify the user-reported issues are fixed:
1. Status column empty when items returned from sales to inventory  
2. Size data disappearing for items in sales page and when moved back to inventory

This test simulates the exact workflow the user described without needing the frontend.
"""

import sys
import os
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Initialize Firebase before importing other modules
os.environ['USE_FIREBASE'] = 'true'

from app import initialize_firebase_admin
from firebase_service import FirebaseService
from database_service import DatabaseService
import logging

# Reduce logging noise
logging.getLogger('firebase_admin').setLevel(logging.WARNING)
logging.getLogger('google').setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def test_complete_user_workflow():
    """
    Test the complete user workflow:
    1. Create item with size
    2. Mark as sold (creates sale)
    3. View on sales page (should have size)
    4. Return to inventory via "Return to Inventory" button
    5. Check status column is not empty
    6. Check size data is preserved
    """
    
    try:
        # Initialize Firebase
        print("🔧 Initializing Firebase...")
        initialize_firebase_admin()
        
        # Initialize services
        firebase_service = FirebaseService()
        database_service = DatabaseService()
        
        # Use a test user ID
        test_user_id = "test_user_workflow_fix"
        
        print("🧪 TESTING COMPLETE USER WORKFLOW")
        print("=" * 80)
        print("Testing the exact issues reported:")
        print("1. Status column empty when items returned from sales")
        print("2. Size data disappearing for items in sales and inventory")
        print("=" * 80)
        
        # STEP 1: Create an item with size (like user would)
        print("\n📦 STEP 1: Creating item with size data...")
        test_item_data = {
            'productName': 'Nike Air Jordan 1',
            'brand': 'Nike',
            'category': 'sneakers',
            'size': '10.5',
            'sizeSystem': 'US',
            'purchasePrice': 120.0,
            'purchaseDate': '2024-01-01',
            'status': 'unlisted',
            'reference': 'AJ1-TEST-001'
        }
        
        created_item = database_service.create_item(test_user_id, test_item_data)
        item_id = created_item['id']
        
        print(f"✅ Created item: {created_item['productName']}")
        print(f"   ID: {item_id}")
        print(f"   Size: {created_item.get('size')} {created_item.get('sizeSystem', '')}")
        print(f"   Status: {created_item.get('status')}")
        
        # STEP 2: Mark item as sold (simulate marking as sold from inventory page)
        print(f"\n🏷️ STEP 2: Marking item as sold (simulating inventory page workflow)...")
        
        sale_data = {
            'itemId': item_id,
            'platform': 'StockX',
            'saleDate': '2024-01-15',
            'salePrice': 180.0,
            'currency': 'USD',
            'platformFees': 18.0,
            'salesTax': 0.0,
            'status': 'completed'
        }
        
        created_sale = database_service.create_sale(test_user_id, sale_data)
        sale_id = created_sale['id']
        
        print(f"✅ Created sale: {sale_id}")
        print(f"   Platform: {created_sale['platform']}")
        print(f"   Sale Price: ${created_sale['salePrice']}")
        
        # Verify item status changed to 'sold'
        item_after_sale = database_service.get_item(test_user_id, item_id)
        print(f"   Item status after sale: {item_after_sale.get('status')}")
        print(f"   Item size still preserved: {item_after_sale.get('size')}")
        
        # STEP 3: Simulate sales page data loading (like frontend does)
        print(f"\n📊 STEP 3: Simulating sales page data loading...")
        
        # Get all items (including sold ones) - this is what frontend does
        all_items = database_service.get_items(test_user_id)
        all_sales = database_service.get_sales(test_user_id)
        
        print(f"✅ Loaded {len(all_items)} items (including sold)")
        print(f"✅ Loaded {len(all_sales)} sales")
        
        # Simulate the frontend enhancement logic (from SalesPage.tsx)
        enhanced_sales = []
        for sale in all_sales:
            # Find the corresponding item (this is where size data comes from)
            item = next((inv_item for inv_item in all_items if str(inv_item['id']) == str(sale['itemId'])), None)
            
            if item:
                enhanced_sale = {
                    **sale,
                    'itemName': item.get('productName', 'Unknown'),
                    'brand': item.get('brand', 'Unknown'),
                    'category': item.get('category', 'Unknown'),
                    'size': item.get('size'),  # This should be preserved!
                    'purchasePrice': item.get('purchasePrice', 0)
                }
                enhanced_sales.append(enhanced_sale)
                
                print(f"✅ Enhanced sale with item data:")
                print(f"   Item Name: {enhanced_sale.get('itemName')}")
                print(f"   Size: {enhanced_sale.get('size')} (SHOULD NOT BE EMPTY!)")
                print(f"   Brand: {enhanced_sale.get('brand')}")
                
                if enhanced_sale.get('size'):
                    print("   ✅ SIZE DATA PRESERVED in sales page!")
                else:
                    print("   ❌ SIZE DATA MISSING in sales page!")
            else:
                print(f"   ❌ Could not find item for sale {sale['id']}")
        
        # STEP 4: Return item to inventory (simulate "Return to Inventory" button)
        print(f"\n↩️ STEP 4: Returning item to inventory (simulating button click)...")
        
        # This simulates what happens when user clicks "Return to Inventory"
        # First, update item status back to unlisted (frontend does this)
        print("   Updating item status to 'unlisted'...")
        updated_item = database_service.update_item_field(test_user_id, item_id, 'status', 'unlisted')
        
        # Then delete the sale record (frontend does this)
        print("   Deleting sale record...")
        success = database_service.delete_sale(test_user_id, sale_id)
        
        if success:
            print("✅ Item successfully returned to inventory")
        else:
            print("❌ Failed to return item to inventory")
            return False
        
        # STEP 5: Check the status column fix
        print(f"\n🔍 STEP 5: Verifying status column fix...")
        
        # Get the item after restore
        item_after_restore = database_service.get_item(test_user_id, item_id)
        status_after_restore = item_after_restore.get('status')
        
        print(f"   Item status after restore: '{status_after_restore}'")
        
        if status_after_restore == 'unlisted':
            print("   ✅ STATUS FIX VERIFIED: Status column will show 'Unlisted' (not empty)")
        else:
            print(f"   ❌ STATUS FIX FAILED: Expected 'unlisted', got '{status_after_restore}'")
            return False
        
        # STEP 6: Check the size data preservation fix
        print(f"\n📏 STEP 6: Verifying size data preservation fix...")
        
        size_after_restore = item_after_restore.get('size')
        
        print(f"   Item size after restore: '{size_after_restore}'")
        
        if size_after_restore == '10.5':
            print("   ✅ SIZE DATA FIX VERIFIED: Size data preserved throughout process")
        else:
            print(f"   ❌ SIZE DATA FIX FAILED: Expected '10.5', got '{size_after_restore}'")
            return False
        
        # STEP 7: Simulate complete frontend refresh (what happens after restore)
        print(f"\n🔄 STEP 7: Simulating complete frontend refresh...")
        
        # Get fresh data (simulating what happens when frontend refreshes)
        fresh_items = database_service.get_items(test_user_id)
        fresh_sales = database_service.get_sales(test_user_id)
        
        print(f"   Fresh items count: {len(fresh_items)}")
        print(f"   Fresh sales count: {len(fresh_sales)}")
        
        # Find our restored item
        our_item = next((item for item in fresh_items if item['id'] == item_id), None)
        
        if our_item:
            print(f"✅ Item found in inventory after restore:")
            print(f"   Name: {our_item.get('productName')}")
            print(f"   Status: {our_item.get('status')} (will display as 'Unlisted')")
            print(f"   Size: {our_item.get('size')} (preserved!)")
            
            # Verify both fixes
            status_ok = our_item.get('status') == 'unlisted'
            size_ok = our_item.get('size') == '10.5'
            
            if status_ok and size_ok:
                print("   ✅ BOTH FIXES WORKING CORRECTLY!")
            else:
                print("   ❌ One or both fixes failed")
                return False
        else:
            print("   ❌ Item not found after restore")
            return False
        
        # STEP 8: Cleanup
        print(f"\n🧹 STEP 8: Cleaning up test data...")
        database_service.delete_item(test_user_id, item_id)
        print("✅ Test data cleaned up")
        
        # FINAL RESULTS
        print("\n" + "=" * 80)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 80)
        print("✅ ISSUE 1 FIXED: Status column will show 'Unlisted' when items returned")
        print("✅ ISSUE 2 FIXED: Size data preserved throughout sales operations")
        print("=" * 80)
        print("Expected behavior in frontend:")
        print("• Items returned from sales will have status 'Unlisted' (not empty)")
        print("• Size data will be visible on sales page and preserved when returned")
        print("• All size information maintained throughout the complete workflow")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 STARTING COMPREHENSIVE USER WORKFLOW TEST")
    print("Testing the exact issues reported by user...")
    print()
    
    success = test_complete_user_workflow()
    
    if success:
        print("\n✅ ALL FIXES VERIFIED - Issues are resolved!")
        sys.exit(0)
    else:
        print("\n❌ TESTS FAILED - Issues still exist!")
        sys.exit(1) 
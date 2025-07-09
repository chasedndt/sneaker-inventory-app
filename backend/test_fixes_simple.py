#!/usr/bin/env python3
"""
Simple test to verify the status and size fixes work.
Tests the exact user-reported issues:
1. Status column empty when items returned from sales to inventory
2. Size data disappearing for items in sales page and when moved back to inventory
"""

import os
import sys

# Set Firebase environment
os.environ['USE_FIREBASE'] = 'true'

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

def test_fixes():
    try:
        # Import after setting environment
        from app import initialize_firebase_admin
        from database_service import DatabaseService
        
        print("🧪 TESTING USER-REPORTED FIXES")
        print("=" * 50)
        
        # Initialize
        print("Initializing Firebase...")
        initialize_firebase_admin()
        db = DatabaseService()
        
        user_id = "test_fixes_user"
        
        # Test 1: Create item with size
        print("\n1. Creating item with size...")
        item_data = {
            'productName': 'Test Sneaker',
            'brand': 'TestBrand',
            'category': 'sneakers',
            'size': '9.5',
            'purchasePrice': 100.0,
            'purchaseDate': '2024-01-01',
            'status': 'unlisted'
        }
        
        item = db.create_item(user_id, item_data)
        item_id = item['id']
        print(f"✅ Created item {item_id} with size {item.get('size')}")
        
        # Test 2: Create sale (marks item as sold)
        print("\n2. Creating sale (marking as sold)...")
        sale_data = {
            'itemId': item_id,
            'platform': 'Test',
            'saleDate': '2024-01-10',
            'salePrice': 150.0,
            'currency': 'USD',
            'status': 'completed'
        }
        
        sale = db.create_sale(user_id, sale_data)
        sale_id = sale['id']
        print(f"✅ Created sale {sale_id}")
        
        # Check item is sold and size preserved
        item_sold = db.get_item(user_id, item_id)
        print(f"   Item status: {item_sold.get('status')}")
        print(f"   Item size: {item_sold.get('size')}")
        
        # Test 3: Simulate sales page data (should have size)
        print("\n3. Testing sales page data...")
        all_items = db.get_items(user_id)  # Gets ALL items including sold
        all_sales = db.get_sales(user_id)
        
        print(f"   Total items (including sold): {len(all_items)}")
        print(f"   Total sales: {len(all_sales)}")
        
        # Find our item in all_items (should be there even though sold)
        our_item = next((item for item in all_items if item['id'] == item_id), None)
        if our_item and our_item.get('size'):
            print(f"✅ Size data available for sold item: {our_item.get('size')}")
        else:
            print("❌ Size data missing for sold item!")
            return False
        
        # Test 4: Return to inventory (the main fix)
        print("\n4. Returning item to inventory...")
        
        # Delete sale (this should set status to 'unlisted' now)
        success = db.delete_sale(user_id, sale_id)
        if not success:
            print("❌ Failed to delete sale")
            return False
        
        # Check item status after restore
        item_restored = db.get_item(user_id, item_id)
        status = item_restored.get('status')
        size = item_restored.get('size')
        
        print(f"   Status after restore: '{status}'")
        print(f"   Size after restore: '{size}'")
        
        # Test the fixes
        status_fixed = status == 'unlisted'
        size_fixed = size == '9.5'
        
        if status_fixed:
            print("✅ STATUS FIX: Will show 'Unlisted' not empty")
        else:
            print(f"❌ STATUS FIX FAILED: Expected 'unlisted', got '{status}'")
        
        if size_fixed:
            print("✅ SIZE FIX: Size data preserved")
        else:
            print(f"❌ SIZE FIX FAILED: Expected '9.5', got '{size}'")
        
        # Cleanup
        print("\n5. Cleaning up...")
        db.delete_item(user_id, item_id)
        
        # Final result
        if status_fixed and size_fixed:
            print("\n🎉 BOTH FIXES WORKING!")
            print("✅ Status column will show 'Unlisted' when items returned")
            print("✅ Size data preserved throughout sales operations")
            return True
        else:
            print("\n❌ One or both fixes failed")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_fixes()
    if success:
        print("\n✅ ALL TESTS PASSED - Issues are fixed!")
    else:
        print("\n❌ TESTS FAILED - Issues still exist!")
    sys.exit(0 if success else 1) 
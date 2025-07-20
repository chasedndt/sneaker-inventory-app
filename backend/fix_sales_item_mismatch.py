#!/usr/bin/env python3
"""
Fix sales-item data mismatch by cleaning up orphaned sales
"""

import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables
os.environ['USE_FIREBASE'] = 'true'

def fix_sales_item_mismatch():
    """Fix the mismatch between sales and items"""
    
    print("🔧 FIXING SALES-ITEM DATA MISMATCH")
    print("=" * 50)
    
    try:
        # Import and create Flask app to get proper context
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from database_service import DatabaseService
            db = DatabaseService()
            
            # Your user ID
            user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
            
            print(f"👤 User ID: {user_id}")
            
            # Step 1: Get current items and sales
            print("\n1️⃣ CURRENT DATA STATE:")
            items = db.get_items(user_id)
            sales = db.get_sales(user_id)
            
            print(f"   📦 Items found: {len(items)}")
            for item in items:
                print(f"      - {item.get('id')}: {item.get('name')} (status: {item.get('status')})")
            
            print(f"   💰 Sales found: {len(sales)}")
            for sale in sales:
                print(f"      - {sale.get('id')}: itemId={sale.get('itemId')} (platform: {sale.get('platform')})")
            
            # Step 2: Identify orphaned sales
            print("\n2️⃣ IDENTIFYING ORPHANED SALES:")
            item_ids = {item['id'] for item in items}
            orphaned_sales = []
            
            for sale in sales:
                item_id = sale.get('itemId')
                if item_id not in item_ids:
                    orphaned_sales.append(sale)
                    print(f"   ❌ Orphaned sale: {sale.get('id')} -> missing item {item_id}")
            
            if not orphaned_sales:
                print("   ✅ No orphaned sales found!")
                return
            
            # Step 3: Delete orphaned sales
            print(f"\n3️⃣ DELETING {len(orphaned_sales)} ORPHANED SALES:")
            deleted_count = 0
            
            for sale in orphaned_sales:
                try:
                    db.delete_sale(user_id, sale['id'])
                    print(f"   ✅ Deleted orphaned sale: {sale.get('id')}")
                    deleted_count += 1
                except Exception as e:
                    print(f"   ❌ Failed to delete sale {sale.get('id')}: {e}")
            
            # Step 4: Verify cleanup
            print(f"\n4️⃣ VERIFICATION:")
            updated_sales = db.get_sales(user_id)
            print(f"   Sales after cleanup: {len(updated_sales)}")
            
            for sale in updated_sales:
                item_id = sale.get('itemId')
                if item_id in item_ids:
                    print(f"   ✅ Valid sale: {sale.get('id')} -> item {item_id}")
                else:
                    print(f"   ❌ Still orphaned: {sale.get('id')} -> missing item {item_id}")
            
            print(f"\n🎉 CLEANUP COMPLETE!")
            print(f"   - Deleted {deleted_count} orphaned sales")
            print(f"   - Remaining sales: {len(updated_sales)}")
            print(f"   - Available items: {len(items)}")
            
            if len(updated_sales) == 0:
                print("\n💡 RESULT: Sales page should now be empty")
                print("💡 RESULT: Items should appear in inventory with their current status")
            
    except Exception as e:
        print(f"💥 Error fixing sales-item mismatch: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_sales_item_mismatch()

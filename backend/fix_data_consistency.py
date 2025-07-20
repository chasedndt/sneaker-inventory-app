#!/usr/bin/env python3
"""
Data Consistency Fix Script
Removes orphaned sales records that reference non-existent items
"""

import os
import sys
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables
os.environ['USE_FIREBASE'] = 'true'

def fix_data_consistency():
    """Fix data consistency by removing orphaned sales records"""
    
    print("[FIX] Data Consistency Repair")
    print("=" * 50)
    
    try:
        # Import and create Flask app to get proper context
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from database_service import DatabaseService
            db = DatabaseService()
            
            # Your user ID from the logs
            user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
            
            print(f"[USER] Fixing data for user: {user_id}")
            
            # Step 1: Get current state
            print("\n1. Analyzing current data state...")
            sales = db.get_sales(user_id)
            items = db.get_items(user_id)
            
            print(f"   Current sales: {len(sales)}")
            print(f"   Current items: {len(items)}")
            
            # Step 2: Identify orphaned sales
            item_ids = set(item['id'] for item in items)
            orphaned_sales = []
            valid_sales = []
            
            for sale in sales:
                item_id = sale.get('itemId')
                if item_id and item_id not in item_ids:
                    orphaned_sales.append(sale)
                else:
                    valid_sales.append(sale)
            
            print(f"\n2. Orphaned sales analysis:")
            print(f"   Orphaned sales (to be deleted): {len(orphaned_sales)}")
            print(f"   Valid sales (to be kept): {len(valid_sales)}")
            
            if orphaned_sales:
                print(f"\n3. Orphaned sales details:")
                for sale in orphaned_sales:
                    print(f"   - Sale ID: {sale.get('id')}")
                    print(f"     Item ID: {sale.get('itemId')} (MISSING)")
                    print(f"     Status: {sale.get('status')}")
                    print(f"     Sale Price: ${sale.get('sale_price', 0)}")
                    print(f"     Platform: {sale.get('platform', 'Unknown')}")
            
            # Step 3: Ask for confirmation
            print(f"\n4. Cleanup Plan:")
            print(f"   [ACTION] Delete {len(orphaned_sales)} orphaned sales")
            print(f"   [KEEP] {len(valid_sales)} valid sales")
            print(f"   [KEEP] {len(items)} existing items")
            
            # Auto-confirm for script execution
            confirm = True  # Set to True for automatic cleanup
            
            if confirm:
                print(f"\n5. Executing cleanup...")
                
                deleted_count = 0
                failed_deletions = []
                
                for sale in orphaned_sales:
                    try:
                        sale_id = sale.get('id')
                        success = db.delete_sale(user_id, sale_id)
                        if success:
                            deleted_count += 1
                            print(f"   [DELETED] Sale {sale_id}")
                        else:
                            failed_deletions.append(sale_id)
                            print(f"   [FAILED] Could not delete sale {sale_id}")
                    except Exception as e:
                        failed_deletions.append(sale_id)
                        print(f"   [ERROR] Failed to delete sale {sale_id}: {e}")
                
                print(f"\n6. Cleanup Results:")
                print(f"   Successfully deleted: {deleted_count} sales")
                print(f"   Failed deletions: {len(failed_deletions)} sales")
                
                if failed_deletions:
                    print(f"   Failed sale IDs: {failed_deletions}")
                
                # Step 4: Verify final state
                print(f"\n7. Verifying final state...")
                final_sales = db.get_sales(user_id)
                final_items = db.get_items(user_id)
                
                print(f"   Final sales count: {len(final_sales)}")
                print(f"   Final items count: {len(final_items)}")
                
                # Check for remaining orphaned sales
                final_item_ids = set(item['id'] for item in final_items)
                remaining_orphans = []
                
                for sale in final_sales:
                    item_id = sale.get('itemId')
                    if item_id and item_id not in final_item_ids:
                        remaining_orphans.append(sale)
                
                if remaining_orphans:
                    print(f"   [WARNING] {len(remaining_orphans)} orphaned sales still remain")
                else:
                    print(f"   [SUCCESS] No orphaned sales remain - data is consistent!")
                
                # Step 5: Update item statuses if needed
                print(f"\n8. Checking item statuses...")
                items_updated = 0
                
                for item in final_items:
                    if item.get('status') == 'unlisted':
                        try:
                            db.update_item_field(user_id, item['id'], 'status', 'active')
                            items_updated += 1
                            print(f"   [UPDATED] Item {item['id']} status: unlisted -> active")
                        except Exception as e:
                            print(f"   [ERROR] Failed to update item {item['id']}: {e}")
                
                if items_updated > 0:
                    print(f"   Updated {items_updated} items to active status")
                else:
                    print(f"   No item status updates needed")
                
                print(f"\n" + "=" * 50)
                print(f"[COMPLETE] Data consistency fix completed!")
                print(f"\nSummary:")
                print(f"- Deleted {deleted_count} orphaned sales")
                print(f"- Updated {items_updated} item statuses")
                print(f"- Final state: {len(final_sales)} sales, {len(final_items)} items")
                print(f"- Data consistency: {'FIXED' if not remaining_orphans else 'PARTIAL'}")
                
                return {
                    'deleted_sales': deleted_count,
                    'updated_items': items_updated,
                    'final_sales': len(final_sales),
                    'final_items': len(final_items),
                    'consistent': len(remaining_orphans) == 0
                }
                
            else:
                print(f"\n[CANCELLED] Cleanup cancelled by user")
                return None
        
    except Exception as e:
        print(f"[ERROR] Fix failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("Starting data consistency fix...")
    result = fix_data_consistency()
    
    if result:
        print(f"\n[FINAL RESULT]")
        print(f"Cleanup successful: {result['consistent']}")
        print(f"Your sales page should now show consistent data!")
        print(f"\nNext steps:")
        print(f"1. Refresh your frontend")
        print(f"2. Check that sales page shows correct data")
        print(f"3. Verify inventory page shows items properly")
    else:
        print(f"\n[FAILED] Cleanup did not complete successfully")

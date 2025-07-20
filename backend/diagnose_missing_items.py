#!/usr/bin/env python3
"""
Diagnostic script to find and potentially recover missing items
that are referenced in sales but not showing up in inventory
"""

import os
import sys
from typing import Dict, List, Any

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables
os.environ['USE_FIREBASE'] = 'true'

def diagnose_missing_items():
    """Diagnose and potentially fix missing items"""
    
    print("[DIAGNOSTIC] Missing Items Analysis")
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
            
            print(f"[USER] Analyzing data for user: {user_id}")
            
            # Get all sales
            print("\n1. Fetching all sales...")
            sales = db.get_sales(user_id)
            print(f"   Found {len(sales)} sales")
            
            # Get all items
            print("\n2. Fetching all items...")
            items = db.get_items(user_id)
            print(f"   Found {len(items)} items")
            
            # Extract item IDs from sales and items
            sales_item_ids = set()
            for sale in sales:
                item_id = sale.get('itemId')
                if item_id:
                    sales_item_ids.add(item_id)
            
            item_ids = set(item['id'] for item in items)
            
            print(f"\n3. Item ID Analysis:")
            print(f"   Item IDs referenced in sales: {len(sales_item_ids)}")
            print(f"   Item IDs that exist in items: {len(item_ids)}")
            
            # Find missing items (referenced in sales but don't exist)
            missing_item_ids = sales_item_ids - item_ids
            print(f"   Missing item IDs: {len(missing_item_ids)}")
        
        if missing_item_ids:
            print(f"\n4. Missing Items Details:")
            for item_id in missing_item_ids:
                print(f"   - Missing Item ID: {item_id}")
                # Find sales that reference this item
                related_sales = [s for s in sales if s.get('itemId') == item_id]
                print(f"     Referenced in {len(related_sales)} sales:")
                for sale in related_sales:
                    print(f"       * Sale ID: {sale.get('id')}, Status: {sale.get('status')}")
        
        # Find orphaned items (exist but not referenced in any sales)
        orphaned_item_ids = item_ids - sales_item_ids
        if orphaned_item_ids:
            print(f"\n5. Orphaned Items (exist but no sales):")
            for item_id in orphaned_item_ids:
                item = next((i for i in items if i['id'] == item_id), None)
                if item:
                    print(f"   - Item ID: {item_id}")
                    print(f"     Name: {item.get('productName', 'Unknown')}")
                    print(f"     Status: {item.get('status', 'Unknown')}")
        
        # Check item statuses
        print(f"\n6. Item Status Breakdown:")
        status_counts = {}
        for item in items:
            status = item.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in status_counts.items():
            print(f"   {status}: {count} items")
        
        # Suggest recovery actions
        print(f"\n7. Recovery Suggestions:")
        
        if missing_item_ids:
            print(f"   [ACTION NEEDED] {len(missing_item_ids)} items are missing from database")
            print(f"   These items were likely deleted or corrupted during previous operations")
            print(f"   You may need to:")
            print(f"   - Check Firebase console for these item IDs")
            print(f"   - Restore from backup if available")
            print(f"   - Manually recreate these items")
            
            # Try to get item data from Firebase directly
            print(f"\n8. Attempting direct Firebase lookup...")
            try:
                from firebase_service import FirebaseService
                firebase_service = FirebaseService()
                
                for item_id in list(missing_item_ids)[:3]:  # Check first 3
                    print(f"   Checking Firebase for item {item_id}...")
                    try:
                        # Try to get item directly from Firebase
                        item_data = firebase_service.get_item(user_id, item_id)
                        if item_data:
                            print(f"     [FOUND] Item exists in Firebase: {item_data.get('productName', 'Unknown')}")
                            print(f"     Status: {item_data.get('status', 'Unknown')}")
                        else:
                            print(f"     [NOT FOUND] Item does not exist in Firebase")
                    except Exception as e:
                        print(f"     [ERROR] Failed to check Firebase: {e}")
                        
            except Exception as e:
                print(f"   [ERROR] Could not access Firebase directly: {e}")
        
        else:
            print(f"   [OK] No missing items detected")
            print(f"   All sales reference valid items")
        
        print(f"\n" + "=" * 50)
        print(f"[COMPLETE] Diagnostic complete")
        
        return {
            'total_sales': len(sales),
            'total_items': len(items),
            'missing_items': len(missing_item_ids),
            'missing_item_ids': list(missing_item_ids),
            'status_counts': status_counts
        }
        
    except Exception as e:
        print(f"[ERROR] Diagnostic failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = diagnose_missing_items()
    if result:
        print(f"\n[SUMMARY]")
        print(f"Sales: {result['total_sales']}")
        print(f"Items: {result['total_items']}")
        print(f"Missing: {result['missing_items']}")

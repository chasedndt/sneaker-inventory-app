#!/usr/bin/env python3
"""
Recovery script for orphaned sold items in Firebase.
This script will help you find and restore items that were marked as sold but have no sales records.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:5000"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "cd66b065-2119-4ea5-b360-4c31ebd1cc02"  # Replace with your actual token
}

def check_orphaned_items():
    """Check for orphaned sold items"""
    try:
        print("🔍 Checking for orphaned sold items...")
        response = requests.get(f"{BASE_URL}/api/recovery/orphaned-sold-items", headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['orphaned_count']} orphaned items out of {data['total_items']} total items")
            print(f"📊 Total sales: {data['total_sales']}")
            
            if data['orphaned_items']:
                print("\n🔴 Orphaned Items:")
                for item in data['orphaned_items']:
                    print(f"  - ID: {item['id']}")
                    print(f"    Name: {item['product_name']}")
                    print(f"    Brand: {item['brand']}")
                    print(f"    Category: {item['category']}")
                    print(f"    Purchase Price: ${item['purchase_price']}")
                    print(f"    Status: {item['status']}")
                    print()
                
                return [item['id'] for item in data['orphaned_items']]
            else:
                print("✅ No orphaned items found!")
                return []
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"💥 Error checking orphaned items: {e}")
        return []

def restore_orphaned_items(item_ids):
    """Restore orphaned items to active status"""
    if not item_ids:
        print("ℹ️ No items to restore")
        return
    
    try:
        print(f"🔧 Restoring {len(item_ids)} orphaned items...")
        
        payload = {"item_ids": item_ids}
        response = requests.post(
            f"{BASE_URL}/api/recovery/restore-orphaned-items", 
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Restoration complete!")
            print(f"   Restored: {data['restored_count']} items")
            print(f"   Failed: {data['failed_count']} items")
            
            if data['restored_items']:
                print("\n🎉 Successfully Restored Items:")
                for item in data['restored_items']:
                    print(f"  - {item['product_name']} (ID: {item['id']}) -> Status: {item['status']}")
            
            if data['failed_items']:
                print("\n❌ Failed to Restore:")
                for item_id in data['failed_items']:
                    print(f"  - ID: {item_id}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"💥 Error restoring items: {e}")

def main():
    """Main recovery process"""
    print("🚀 Starting Item Recovery Process...")
    print("=" * 50)
    
    # Step 1: Check for orphaned items
    orphaned_item_ids = check_orphaned_items()
    
    if orphaned_item_ids:
        print(f"\n🤔 Found {len(orphaned_item_ids)} orphaned items.")
        
        # Ask user for confirmation
        choice = input("\n❓ Do you want to restore these items to 'active' status? (y/n): ").strip().lower()
        
        if choice in ['y', 'yes']:
            # Step 2: Restore the items
            restore_orphaned_items(orphaned_item_ids)
            print("\n✅ Recovery process completed!")
            print("🔄 Please refresh your frontend to see the restored items.")
        else:
            print("❌ Recovery cancelled by user.")
    else:
        print("\n✅ No orphaned items found. All items are properly managed!")

if __name__ == "__main__":
    print("📋 Item Recovery Script")
    print("=" * 50)
    print("⚠️  IMPORTANT: Make sure to replace 'YOUR_TOKEN_HERE' with your actual Firebase auth token")
    print("🔗 You can get your token from the browser's developer tools (Application > Local Storage)")
    print("=" * 50)
    
    main() 
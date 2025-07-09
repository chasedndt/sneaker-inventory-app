#!/usr/bin/env python3
"""
Migration script to add missing currency fields to existing Firebase items.
This script will add 'purchaseCurrency' and 'shippingCurrency' fields to items that don't have them.
"""

import os
import sys
import logging
from typing import Dict, Any
from firebase_service import FirebaseService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_currency_fields(user_id: str, default_currency: str = 'GBP'):
    """
    Add missing currency fields to existing items for a specific user.
    
    Args:
        user_id: The user ID to migrate items for
        default_currency: The default currency to use for items without currency info
    """
    try:
        # Initialize Firebase service
        firebase_service = FirebaseService()
        
        # Get all items for the user
        items = firebase_service.get_items(user_id)
        logger.info(f"Found {len(items)} items for user {user_id}")
        
        updated_count = 0
        
        for item in items:
            item_id = item.get('id')
            needs_update = False
            update_data = {}
            
            # Check if purchaseCurrency is missing
            if 'purchaseCurrency' not in item or not item.get('purchaseCurrency'):
                update_data['purchaseCurrency'] = default_currency
                needs_update = True
                logger.info(f"Adding purchaseCurrency={default_currency} to item {item_id}")
            
            # Check if shippingCurrency is missing
            if 'shippingCurrency' not in item or not item.get('shippingCurrency'):
                update_data['shippingCurrency'] = default_currency
                needs_update = True
                logger.info(f"Adding shippingCurrency={default_currency} to item {item_id}")
            
            # Update the item if needed
            if needs_update:
                try:
                    firebase_service.update_item(user_id, item_id, update_data)
                    updated_count += 1
                    logger.info(f"✅ Updated item {item_id} with currency fields")
                except Exception as e:
                    logger.error(f"❌ Failed to update item {item_id}: {e}")
            else:
                logger.info(f"⏭️ Item {item_id} already has currency fields")
        
        logger.info(f"Migration complete! Updated {updated_count} out of {len(items)} items")
        return updated_count
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

def main():
    """Main function to run the migration"""
    if len(sys.argv) != 2:
        print("Usage: python migrate_currency_fields.py <user_id>")
        print("Example: python migrate_currency_fields.py PpdcAvliVrR4zBAH6WGBeLqd0c73")
        sys.exit(1)
    
    user_id = sys.argv[1]
    
    print(f"Starting currency fields migration for user: {user_id}")
    print("This will add 'purchaseCurrency' and 'shippingCurrency' fields to items that don't have them.")
    print("Default currency will be set to 'GBP'.")
    
    # Confirm before proceeding
    confirm = input("Do you want to continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    try:
        updated_count = migrate_currency_fields(user_id, default_currency='GBP')
        print(f"\n✅ Migration completed successfully!")
        print(f"Updated {updated_count} items with currency fields.")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
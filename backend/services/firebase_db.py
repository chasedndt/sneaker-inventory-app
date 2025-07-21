# backend/services/firebase_db.py
import firebase_admin
from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
import traceback

logger = logging.getLogger(__name__)

class FirebaseDBService:
    """Service for Firebase Firestore operations"""
    
    def __init__(self):
        self.db = firestore.client()
    
    # === ITEMS OPERATIONS ===
    
    def create_item(self, user_id: str, item_data: Dict[str, Any]) -> str:
        """Create a new item in Firestore"""
        try:
            # Add metadata
            item_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            # Create in users/{user_id}/items collection
            doc_ref = self.db.collection('users').document(user_id).collection('items').add(item_data)
            return doc_ref[1].id  # Return the document ID
        except Exception as e:
            logger.error(f"Error creating item: {e}")
            raise
    
    def get_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all items for a user"""
        try:
            items_ref = self.db.collection('users').document(user_id).collection('items')
            docs = items_ref.stream()
            
            items = []
            for doc in docs:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                items.append(item_data)
            
            return items
        except Exception as e:
            logger.error(f"Error getting items: {e}")
            raise
    
    def get_item(self, user_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific item"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc = doc_ref.get()
            
            if doc.exists:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                return item_data
            return None
        except Exception as e:
            logger.error(f"Error getting item: {e}")
            raise
    
    def update_item(self, user_id: str, item_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an item"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc_ref.update(update_data)
            return True
        except Exception as e:
            logger.error(f"Error updating item: {e}")
            raise
    
    def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
            raise
    
    # === SALES OPERATIONS ===
    
    def create_sale(self, user_id: str, sale_data: Dict[str, Any]) -> str:
        """Create a new sale"""
        try:
            sale_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            doc_ref = self.db.collection('users').document(user_id).collection('sales').add(sale_data)
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error creating sale: {e}")
            raise
    
    def get_sales(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sales for a user"""
        try:
            sales_ref = self.db.collection('users').document(user_id).collection('sales')
            docs = sales_ref.stream()
            
            sales = []
            for doc in docs:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                sales.append(sale_data)
            
            return sales
        except Exception as e:
            logger.error(f"Error getting sales: {e}")
            raise
    
    # === EXPENSES OPERATIONS ===
    
    def create_expense(self, user_id: str, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new expense"""
        try:
            expense_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            doc_ref = self.db.collection('users').document(user_id).collection('expenses').add(expense_data)
            expense_id = doc_ref[1].id
            
            # Return the full expense object with the ID
            expense_data['id'] = expense_id
            logger.info(f"Created expense {expense_id} for user {user_id}")
            return expense_data
        except Exception as e:
            logger.error(f"Error creating expense: {e}")
            raise
    
    def get_expenses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all expenses for a user"""
        try:
            logger.info(f"🔍 [Firebase] Getting expenses for user_id: {user_id}")
            expenses_ref = self.db.collection('users').document(user_id).collection('expenses')
            logger.info(f"🔍 [Firebase] Querying path: users/{user_id}/expenses")
            
            docs = expenses_ref.stream()
            
            expenses = []
            doc_count = 0
            for doc in docs:
                doc_count += 1
                expense_data = doc.to_dict()
                expense_data['id'] = doc.id
                expenses.append(expense_data)
                logger.info(f"🔍 [Firebase] Found expense doc {doc.id}: {expense_data}")
        
            logger.info(f"🔍 [Firebase] Total documents found: {doc_count}")
            logger.info(f"🔍 [Firebase] Total expenses returned: {len(expenses)}")
            
            # Also check if there are any documents in the users collection
            user_doc = self.db.collection('users').document(user_id).get()
            logger.info(f"🔍 [Firebase] User document exists: {user_doc.exists}")
            if user_doc.exists:
                logger.info(f"🔍 [Firebase] User document data: {user_doc.to_dict()}")
            
            return expenses
        except Exception as e:
            logger.error(f"💥 Error getting expenses: {e}")
            logger.error(f"💥 Exception details: {traceback.format_exc()}")
            raise
    
    def get_expense(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific expense"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('expenses').document(expense_id)
            doc = doc_ref.get()
            if doc.exists:
                expense_data = doc.to_dict()
                expense_data['id'] = doc.id
                return expense_data
            return None
        except Exception as e:
            logger.error(f"Error getting expense {expense_id} for user {user_id}: {e}")
            raise
    
    def update_expense(self, user_id: str, expense_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing expense"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            doc_ref = self.db.collection('users').document(user_id).collection('expenses').document(expense_id)
            doc_ref.update(update_data)
            
            # Return updated expense
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                expense_data = updated_doc.to_dict()
                expense_data['id'] = updated_doc.id
                return expense_data
            else:
                raise Exception(f"Expense {expense_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating expense {expense_id} for user {user_id}: {e}")
            raise
    
    def delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('expenses').document(expense_id)
            doc_ref.delete()
            logger.info(f"Deleted expense {expense_id} for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting expense {expense_id} for user {user_id}: {e}")
            raise
    
    # === USER SETTINGS ===
    
    def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        """Get user settings"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('settings').document('preferences')
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                # Return default settings
                default_settings = {
                    'currency': '$',
                    'dark_mode': False,
                    'date_format': 'MM/DD/YYYY'
                }
                # Create default settings
                doc_ref.set(default_settings)
                return default_settings
        except Exception as e:
            logger.error(f"Error getting user settings: {e}")
            raise
    
    def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> bool:
        """Update user settings"""
        try:
            settings_data['updated_at'] = datetime.utcnow()
            
            doc_ref = self.db.collection('users').document(user_id).collection('settings').document('preferences')
            doc_ref.set(settings_data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Error updating user settings: {e}")
            raise
    
    # Tags methods
    def get_tags(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tags for a user"""
        try:
            logger.info(f"🔍 [Firebase] Getting tags for user_id: {user_id}")
            tags_ref = self.db.collection('users').document(user_id).collection('tags')
            docs = tags_ref.stream()
            tags = []
            for doc in docs:
                tag_data = doc.to_dict()
                tag_data['id'] = doc.id
                tags.append(tag_data)
                logger.info(f"🔍 [Firebase] Found tag doc {doc.id}: {tag_data}")
            logger.info(f"🔍 [Firebase] Retrieved {len(tags)} tags for user {user_id}")
            return tags
        except Exception as e:
            logger.error(f"Error getting tags for user {user_id}: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def get_tag(self, user_id: str, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific tag"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('tags').document(tag_id)
            doc = doc_ref.get()
            if doc.exists:
                tag_data = doc.to_dict()
                tag_data['id'] = doc.id
                return tag_data
            return None
        except Exception as e:
            logger.error(f"Error getting tag {tag_id} for user {user_id}: {e}")
            raise
    
    def create_tag(self, user_id: str, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tag"""
        try:
            tag_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            doc_ref = self.db.collection('users').document(user_id).collection('tags').add(tag_data)
            tag_id = doc_ref[1].id
            tag_data['id'] = tag_id
            logger.info(f"Created tag {tag_id} for user {user_id}")
            return tag_data
        except Exception as e:
            logger.error(f"Error creating tag for user {user_id}: {e}")
            raise
    
    def update_tag(self, user_id: str, tag_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing tag"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            doc_ref = self.db.collection('users').document(user_id).collection('tags').document(tag_id)
            doc_ref.update(update_data)
            
            # Return updated tag
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                tag_data = updated_doc.to_dict()
                tag_data['id'] = updated_doc.id
                return tag_data
            else:
                raise Exception(f"Tag {tag_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating tag {tag_id} for user {user_id}: {e}")
            raise
    
    def delete_tag(self, user_id: str, tag_id: str) -> bool:
        """Delete a tag"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('tags').document(tag_id)
            doc_ref.delete()
            logger.info(f"Deleted tag {tag_id} for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting tag {tag_id} for user {user_id}: {e}")
            raise
    
    def get_tag_by_name(self, user_id: str, tag_name: str) -> Optional[Dict[str, Any]]:
        """Get a tag by name for duplicate checking"""
        try:
            tags_ref = self.db.collection('users').document(user_id).collection('tags')
            query = tags_ref.where('name', '==', tag_name).limit(1)
            docs = query.stream()
            for doc in docs:
                tag_data = doc.to_dict()
                tag_data['id'] = doc.id
                return tag_data
            return None
        except Exception as e:
            logger.error(f"Error getting tag by name '{tag_name}' for user {user_id}: {e}")
            raise
    
    # Items methods
    def get_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all items for a user"""
        try:
            logger.info(f"🔍 [Firebase] Getting items for user_id: {user_id}")
            items_ref = self.db.collection('users').document(user_id).collection('items')
            docs = items_ref.stream()
            items = []
            for doc in docs:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                items.append(item_data)
            logger.info(f"🔍 [Firebase] Retrieved {len(items)} items for user {user_id}")
            return items
        except Exception as e:
            logger.error(f"Error getting items for user {user_id}: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def create_item(self, user_id: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item"""
        try:
            item_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            doc_ref = self.db.collection('users').document(user_id).collection('items').add(item_data)
            item_id = doc_ref[1].id
            item_data['id'] = item_id
            logger.info(f"Created item {item_id} for user {user_id}")
            return item_data
        except Exception as e:
            logger.error(f"Error creating item for user {user_id}: {e}")
            raise
    
    def update_item(self, user_id: str, item_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing item"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc_ref.update(update_data)
            
            # Return updated item
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                item_data = updated_doc.to_dict()
                item_data['id'] = updated_doc.id
                return item_data
            else:
                raise Exception(f"Item {item_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating item {item_id} for user {user_id}: {e}")
            raise
    
    def update_item_field(self, user_id: str, item_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of an item"""
        try:
            update_data = {
                field: value,
                'updated_at': datetime.utcnow()
            }
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc_ref.update(update_data)
            
            # Return updated item
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                item_data = updated_doc.to_dict()
                item_data['id'] = updated_doc.id
                return item_data
            else:
                raise Exception(f"Item {item_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating item field {field} for item {item_id}, user {user_id}: {e}")
            raise
    
    def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('items').document(item_id)
            doc_ref.delete()
            logger.info(f"Deleted item {item_id} for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting item {item_id} for user {user_id}: {e}")
            raise
    
    # Sales methods
    def get_sales(self, user_id: str, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get all sales for a user with optional filters"""
        try:
            logger.info(f"🔍 [Firebase] Getting sales for user_id: {user_id}")
            sales_ref = self.db.collection('users').document(user_id).collection('sales')
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    sales_ref = sales_ref.where(field, '==', value)
            
            docs = sales_ref.stream()
            sales = []
            for doc in docs:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                sales.append(sale_data)
            logger.info(f"🔍 [Firebase] Retrieved {len(sales)} sales for user {user_id}")
            return sales
        except Exception as e:
            logger.error(f"Error getting sales for user {user_id}: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def get_sale(self, user_id: str, sale_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific sale"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('sales').document(sale_id)
            doc = doc_ref.get()
            if doc.exists:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                return sale_data
            return None
        except Exception as e:
            logger.error(f"Error getting sale {sale_id} for user {user_id}: {e}")
            raise
    
    def create_sale(self, user_id: str, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sale"""
        try:
            sale_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            doc_ref = self.db.collection('users').document(user_id).collection('sales').add(sale_data)
            sale_id = doc_ref[1].id
            sale_data['id'] = sale_id
            logger.info(f"Created sale {sale_id} for user {user_id}")
            return sale_data
        except Exception as e:
            logger.error(f"Error creating sale for user {user_id}: {e}")
            raise
    
    def update_sale(self, user_id: str, sale_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing sale"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            doc_ref = self.db.collection('users').document(user_id).collection('sales').document(sale_id)
            doc_ref.update(update_data)
            
            # Return updated sale
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                sale_data = updated_doc.to_dict()
                sale_data['id'] = updated_doc.id
                return sale_data
            else:
                raise Exception(f"Sale {sale_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating sale {sale_id} for user {user_id}: {e}")
            raise
    
    def update_sale_field(self, user_id: str, sale_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of a sale"""
        try:
            update_data = {
                field: value,
                'updated_at': datetime.utcnow()
            }
            doc_ref = self.db.collection('users').document(user_id).collection('sales').document(sale_id)
            doc_ref.update(update_data)
            
            # Return updated sale
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                sale_data = updated_doc.to_dict()
                sale_data['id'] = updated_doc.id
                return sale_data
            else:
                raise Exception(f"Sale {sale_id} not found after update")
        except Exception as e:
            logger.error(f"Error updating sale field {field} for sale {sale_id}, user {user_id}: {e}")
            raise
    
    def delete_sale(self, user_id: str, sale_id: str) -> bool:
        """Delete a sale"""
        try:
            doc_ref = self.db.collection('users').document(user_id).collection('sales').document(sale_id)
            doc_ref.delete()
            logger.info(f"Deleted sale {sale_id} for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting sale {sale_id} for user {user_id}: {e}")
            raise
    
    def bulk_delete_sales(self, user_id: str, sale_ids: List[str]) -> Dict[str, Any]:
        """Delete multiple sales and restore their items to active status"""
        try:
            success_count = 0
            failed_count = 0
            
            for sale_id in sale_ids:
                try:
                    # Get sale data first to get item info
                    sale_data = self.get_sale(user_id, sale_id)
                    if sale_data and 'itemId' in sale_data:
                        # Restore item status to active
                        self.update_item_field(user_id, sale_data['itemId'], 'status', 'active')
                    
                    # Delete the sale
                    self.delete_sale(user_id, sale_id)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Error deleting sale {sale_id}: {e}")
                    failed_count += 1
            
            return {
                'success_count': success_count,
                'failed_count': failed_count,
                'total': len(sale_ids)
            }
        except Exception as e:
            logger.error(f"Error in bulk delete sales for user {user_id}: {e}")
            raise
    
    def bulk_return_sales_to_inventory(self, user_id: str, sale_ids: List[str]) -> Dict[str, Any]:
        """Return multiple sales to inventory by updating item status back to active"""
        try:
            success_count = 0
            failed_count = 0
            
            for sale_id in sale_ids:
                try:
                    # Get sale data first to get item info
                    sale_data = self.get_sale(user_id, sale_id)
                    if sale_data and 'itemId' in sale_data:
                        # Update sale status to returned
                        self.update_sale_field(user_id, sale_id, 'status', 'returned')
                        # Restore item status to active
                        self.update_item_field(user_id, sale_data['itemId'], 'status', 'active')
                        success_count += 1
                    else:
                        failed_count += 1
                except Exception as e:
                    logger.error(f"Error returning sale {sale_id} to inventory: {e}")
                    failed_count += 1
            
            return {
                'success_count': success_count,
                'failed_count': failed_count,
                'total': len(sale_ids)
            }
        except Exception as e:
            logger.error(f"Error in bulk return sales to inventory for user {user_id}: {e}")
            raise

# Global instance - lazy initialization
firebase_db = None

def get_firebase_db():
    """Get or create the Firebase DB service instance"""
    global firebase_db
    if firebase_db is None:
        firebase_db = FirebaseDBService()
    return firebase_db 
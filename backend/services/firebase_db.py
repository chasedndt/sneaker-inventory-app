# backend/services/firebase_db.py
import firebase_admin
from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

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
    
    def create_expense(self, user_id: str, expense_data: Dict[str, Any]) -> str:
        """Create a new expense"""
        try:
            expense_data.update({
                'user_id': user_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            doc_ref = self.db.collection('users').document(user_id).collection('expenses').add(expense_data)
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error creating expense: {e}")
            raise
    
    def get_expenses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all expenses for a user"""
        try:
            expenses_ref = self.db.collection('users').document(user_id).collection('expenses')
            docs = expenses_ref.stream()
            
            expenses = []
            for doc in docs:
                expense_data = doc.to_dict()
                expense_data['id'] = doc.id
                expenses.append(expense_data)
            
            return expenses
        except Exception as e:
            logger.error(f"Error getting expenses: {e}")
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

# Global instance
firebase_db = FirebaseDBService() 
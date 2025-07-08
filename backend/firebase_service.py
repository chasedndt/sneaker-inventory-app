"""
Firebase Firestore service for sneaker inventory app.
Handles all Firestore database operations for items, sales, expenses, and user settings.
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from google.cloud import firestore
from google.cloud.firestore import DocumentReference, CollectionReference
from firebase_admin import firestore as admin_firestore
import json

logger = logging.getLogger(__name__)

class FirebaseService:
    """
    Service class for managing Firestore operations.
    Provides methods for CRUD operations on all data types.
    """
    
    def __init__(self):
        """Initialize Firestore client"""
        try:
            # Check if Firebase Admin is already initialized
            import firebase_admin
            if not firebase_admin._apps:
                logger.warning("Firebase Admin not initialized - client will be created when needed")
                self.db = None
            else:
                self.db = admin_firestore.client()
                logger.info("Firebase Firestore client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {e}")
            self.db = None
    
    def _ensure_client(self):
        """Ensure Firestore client is available"""
        if self.db is None:
            try:
                import firebase_admin
                if firebase_admin._apps:
                    self.db = admin_firestore.client()
                    logger.info("Firebase Firestore client initialized (delayed)")
                else:
                    raise ValueError("Firebase Admin not initialized")
            except Exception as e:
                logger.error(f"Failed to initialize delayed Firestore client: {e}")
                raise
        return self.db
    
    # ==================== UTILITY METHODS ====================
    
    def _serialize_datetime(self, obj: Any) -> Any:
        """Convert datetime objects to ISO format strings for Firestore storage"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._serialize_datetime(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_datetime(item) for item in obj]
        return obj
    
    def _deserialize_datetime(self, obj: Any, datetime_fields: List[str] = None) -> Any:
        """Convert ISO format strings back to datetime objects"""
        if datetime_fields is None:
            datetime_fields = ['created_at', 'updated_at', 'purchase_date', 'sale_date', 'expense_date']
        
        if isinstance(obj, dict):
            result = {}
            for k, v in obj.items():
                if k in datetime_fields and isinstance(v, str):
                    try:
                        result[k] = datetime.fromisoformat(v.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        result[k] = v
                else:
                    result[k] = self._deserialize_datetime(v, datetime_fields)
            return result
        elif isinstance(obj, list):
            return [self._deserialize_datetime(item, datetime_fields) for item in obj]
        return obj
    
    def _get_user_collection(self, user_id: str, collection_name: str) -> CollectionReference:
        """Get a user-specific collection reference"""
        db = self._ensure_client()
        return db.collection('users').document(user_id).collection(collection_name)
    
    def _add_timestamps(self, data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
        """Add created_at and updated_at timestamps to data"""
        now = datetime.utcnow()
        if not is_update:
            data['created_at'] = now
        data['updated_at'] = now
        return data
    
    # ==================== ITEMS METHODS ====================
    
    def create_item(self, user_id: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item in Firestore"""
        try:
            # Add timestamps and user_id
            item_data = self._add_timestamps(item_data)
            item_data['user_id'] = user_id
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(item_data)
            
            # Add to Firestore
            collection_ref = self._get_user_collection(user_id, 'items')
            _, doc_ref = collection_ref.add(serialized_data)
            
            # Return the created item with Firestore document ID
            created_item = serialized_data.copy()
            created_item['id'] = doc_ref.id
            
            logger.info(f"Created item {doc_ref.id} for user {user_id}")
            return self._deserialize_datetime(created_item)
            
        except Exception as e:
            logger.error(f"Error creating item for user {user_id}: {e}")
            raise
    
    def get_items(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all items for a user with optional filters"""
        try:
            collection_ref = self._get_user_collection(user_id, 'items')
            query = collection_ref
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if value is not None:
                        query = query.where(field, '==', value)
            
            # Order by created_at descending
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
            
            # Execute query
            docs = query.stream()
            items = []
            
            for doc in docs:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                items.append(self._deserialize_datetime(item_data))
            
            logger.info(f"Retrieved {len(items)} items for user {user_id}")
            return items
            
        except Exception as e:
            logger.error(f"Error getting items for user {user_id}: {e}")
            raise
    
    def get_item(self, user_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific item by ID"""
        try:
            doc_ref = self._get_user_collection(user_id, 'items').document(item_id)
            doc = doc_ref.get()
            
            if doc.exists:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                logger.info(f"Retrieved item {item_id} for user {user_id}")
                return self._deserialize_datetime(item_data)
            else:
                logger.warning(f"Item {item_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting item {item_id} for user {user_id}: {e}")
            raise
    
    def update_item(self, user_id: str, item_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing item"""
        try:
            # Add updated timestamp
            update_data = self._add_timestamps(update_data, is_update=True)
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(update_data)
            
            # Update in Firestore
            doc_ref = self._get_user_collection(user_id, 'items').document(item_id)
            doc_ref.update(serialized_data)
            
            # Get and return updated item
            updated_item = self.get_item(user_id, item_id)
            if updated_item:
                logger.info(f"Updated item {item_id} for user {user_id}")
                return updated_item
            else:
                raise ValueError(f"Item {item_id} not found after update")
                
        except Exception as e:
            logger.error(f"Error updating item {item_id} for user {user_id}: {e}")
            raise
    
    def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        try:
            doc_ref = self._get_user_collection(user_id, 'items').document(item_id)
            doc_ref.delete()
            logger.info(f"Deleted item {item_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting item {item_id} for user {user_id}: {e}")
            raise

    def update_item_field(self, user_id: str, item_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of an item"""
        try:
            # Prepare the update data
            update_data = {field: value}
            return self.update_item(user_id, item_id, update_data)
            
        except Exception as e:
            logger.error(f"Error updating field {field} for item {item_id} for user {user_id}: {e}")
            raise

    # ==================== SALES METHODS ====================
    
    def create_sale(self, user_id: str, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sale in Firestore"""
        try:
            # Add timestamps and user_id
            sale_data = self._add_timestamps(sale_data)
            sale_data['user_id'] = user_id
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(sale_data)
            
            # Add to Firestore
            collection_ref = self._get_user_collection(user_id, 'sales')
            _, doc_ref = collection_ref.add(serialized_data)
            
            # Return the created sale with Firestore document ID
            created_sale = serialized_data.copy()
            created_sale['id'] = doc_ref.id
            
            logger.info(f"Created sale {doc_ref.id} for user {user_id}")
            return self._deserialize_datetime(created_sale)
            
        except Exception as e:
            logger.error(f"Error creating sale for user {user_id}: {e}")
            raise
    
    def get_sales(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all sales for a user with optional filters"""
        try:
            collection_ref = self._get_user_collection(user_id, 'sales')
            query = collection_ref
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if value is not None:
                        query = query.where(field, '==', value)
            
            # Order by sale_date descending
            query = query.order_by('sale_date', direction=firestore.Query.DESCENDING)
            
            # Execute query
            docs = query.stream()
            sales = []
            
            for doc in docs:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                sales.append(self._deserialize_datetime(sale_data))
            
            logger.info(f"Retrieved {len(sales)} sales for user {user_id}")
            return sales
            
        except Exception as e:
            logger.error(f"Error getting sales for user {user_id}: {e}")
            raise
    
    def get_sale(self, user_id: str, sale_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific sale by ID"""
        try:
            doc_ref = self._get_user_collection(user_id, 'sales').document(sale_id)
            doc = doc_ref.get()
            
            if doc.exists:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                logger.info(f"Retrieved sale {sale_id} for user {user_id}")
                return self._deserialize_datetime(sale_data)
            else:
                logger.warning(f"Sale {sale_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting sale {sale_id} for user {user_id}: {e}")
            raise
    
    def update_sale(self, user_id: str, sale_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing sale"""
        try:
            # Add updated timestamp
            update_data = self._add_timestamps(update_data, is_update=True)
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(update_data)
            
            # Update in Firestore
            doc_ref = self._get_user_collection(user_id, 'sales').document(sale_id)
            doc_ref.update(serialized_data)
            
            # Get and return updated sale
            updated_sale = self.get_sale(user_id, sale_id)
            if updated_sale:
                logger.info(f"Updated sale {sale_id} for user {user_id}")
                return updated_sale
            else:
                raise ValueError(f"Sale {sale_id} not found after update")
                
        except Exception as e:
            logger.error(f"Error updating sale {sale_id} for user {user_id}: {e}")
            raise
    
    def delete_sale(self, user_id: str, sale_id: str) -> bool:
        """Delete a sale"""
        try:
            doc_ref = self._get_user_collection(user_id, 'sales').document(sale_id)
            doc_ref.delete()
            logger.info(f"Deleted sale {sale_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting sale {sale_id} for user {user_id}: {e}")
            raise

    def update_sale_field(self, user_id: str, sale_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of a sale"""
        try:
            # Prepare the update data
            update_data = {field: value}
            return self.update_sale(user_id, sale_id, update_data)
            
        except Exception as e:
            logger.error(f"Error updating field {field} for sale {sale_id} for user {user_id}: {e}")
            raise

    # ==================== EXPENSES METHODS ====================
    
    def create_expense(self, user_id: str, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new expense in Firestore"""
        try:
            # Add timestamps and user_id
            expense_data = self._add_timestamps(expense_data)
            expense_data['user_id'] = user_id
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(expense_data)
            
            # Add to Firestore
            collection_ref = self._get_user_collection(user_id, 'expenses')
            _, doc_ref = collection_ref.add(serialized_data)
            
            # Return the created expense with Firestore document ID
            created_expense = serialized_data.copy()
            created_expense['id'] = doc_ref.id
            
            logger.info(f"Created expense {doc_ref.id} for user {user_id}")
            return self._deserialize_datetime(created_expense)
            
        except Exception as e:
            logger.error(f"Error creating expense for user {user_id}: {e}")
            raise
    
    def get_expenses(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all expenses for a user with optional filters"""
        try:
            collection_ref = self._get_user_collection(user_id, 'expenses')
            query = collection_ref
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if value is not None:
                        query = query.where(field, '==', value)
            
            # Order by expense_date descending
            query = query.order_by('expense_date', direction=firestore.Query.DESCENDING)
            
            # Execute query
            docs = query.stream()
            expenses = []
            
            for doc in docs:
                expense_data = doc.to_dict()
                expense_data['id'] = doc.id
                expenses.append(self._deserialize_datetime(expense_data))
            
            logger.info(f"Retrieved {len(expenses)} expenses for user {user_id}")
            return expenses
            
        except Exception as e:
            logger.error(f"Error getting expenses for user {user_id}: {e}")
            raise
    
    def get_expense(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific expense by ID"""
        try:
            doc_ref = self._get_user_collection(user_id, 'expenses').document(expense_id)
            doc = doc_ref.get()
            
            if doc.exists:
                expense_data = doc.to_dict()
                expense_data['id'] = doc.id
                logger.info(f"Retrieved expense {expense_id} for user {user_id}")
                return self._deserialize_datetime(expense_data)
            else:
                logger.warning(f"Expense {expense_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting expense {expense_id} for user {user_id}: {e}")
            raise
    
    def update_expense(self, user_id: str, expense_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing expense"""
        try:
            # Add updated timestamp
            update_data = self._add_timestamps(update_data, is_update=True)
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(update_data)
            
            # Update in Firestore
            doc_ref = self._get_user_collection(user_id, 'expenses').document(expense_id)
            doc_ref.update(serialized_data)
            
            # Get and return updated expense
            updated_expense = self.get_expense(user_id, expense_id)
            if updated_expense:
                logger.info(f"Updated expense {expense_id} for user {user_id}")
                return updated_expense
            else:
                raise ValueError(f"Expense {expense_id} not found after update")
                
        except Exception as e:
            logger.error(f"Error updating expense {expense_id} for user {user_id}: {e}")
            raise
    
    def delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense"""
        try:
            doc_ref = self._get_user_collection(user_id, 'expenses').document(expense_id)
            doc_ref.delete()
            
            logger.info(f"Deleted expense {expense_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting expense {expense_id} for user {user_id}: {e}")
            raise
    
    # ==================== USER SETTINGS METHODS ====================
    
    def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user settings"""
        try:
            db = self._ensure_client()
            doc_ref = db.collection('users').document(user_id).collection('settings').document('preferences')
            doc = doc_ref.get()
            
            if doc.exists:
                settings = doc.to_dict()
                settings['user_id'] = user_id
                logger.info(f"Retrieved settings for user {user_id}")
                return self._deserialize_datetime(settings)
            else:
                # Return default settings if none exist
                default_settings = {
                    'user_id': user_id,
                    'dark_mode': False,
                    'currency': 'USD',
                    'date_format': 'MM/DD/YYYY',
                    'items_quota': 0,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                logger.info(f"No settings found for user {user_id}, returning defaults")
                return default_settings
                
        except Exception as e:
            logger.error(f"Error getting settings for user {user_id}: {e}")
            raise
    
    def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user settings"""
        try:
            # Add updated timestamp
            settings_data = self._add_timestamps(settings_data, is_update=True)
            settings_data['user_id'] = user_id
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(settings_data)
            
            # Update in Firestore (using set with merge to create if doesn't exist)
            db = self._ensure_client()
            doc_ref = db.collection('users').document(user_id).collection('settings').document('preferences')
            doc_ref.set(serialized_data, merge=True)
            
            # Get and return updated settings
            updated_settings = self.get_user_settings(user_id)
            logger.info(f"Updated settings for user {user_id}")
            return updated_settings
            
        except Exception as e:
            logger.error(f"Error updating settings for user {user_id}: {e}")
            raise
    
    # ==================== ANALYTICS AND AGGREGATION METHODS ====================
    
    def get_user_item_count(self, user_id: str) -> int:
        """Get the total number of items for a user"""
        try:
            collection_ref = self._get_user_collection(user_id, 'items')
            docs = collection_ref.stream()
            count = sum(1 for _ in docs)
            
            logger.info(f"User {user_id} has {count} items")
            return count
            
        except Exception as e:
            logger.error(f"Error getting item count for user {user_id}: {e}")
            raise
    
    def get_dashboard_metrics(self, user_id: str) -> Dict[str, Any]:
        """Get aggregated metrics for dashboard"""
        try:
            # Get items, sales, and expenses
            items = self.get_items(user_id)
            sales = self.get_sales(user_id)
            expenses = self.get_expenses(user_id)
            
            # Calculate metrics
            total_items = len(items)
            total_sales = len(sales)
            total_revenue = sum(sale.get('sale_price', 0) for sale in sales)
            total_expenses = sum(expense.get('amount', 0) for expense in expenses)
            total_investment = sum(item.get('purchase_price', 0) for item in items)
            
            metrics = {
                'total_items': total_items,
                'total_sales': total_sales,
                'total_revenue': total_revenue,
                'total_expenses': total_expenses,
                'total_investment': total_investment,
                'net_profit': total_revenue - total_investment - total_expenses
            }
            
            logger.info(f"Retrieved dashboard metrics for user {user_id}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting dashboard metrics for user {user_id}: {e}")
            raise

    def get_sales_by_item(self, user_id: str, item_id: str) -> List[Dict[str, Any]]:
        """Get all sales for a specific item"""
        try:
            collection_ref = self._get_user_collection(user_id, 'sales')
            query = collection_ref.where('item_id', '==', item_id)
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
            
            docs = query.stream()
            sales = []
            
            for doc in docs:
                sale_data = doc.to_dict()
                sale_data['id'] = doc.id
                sales.append(self._deserialize_datetime(sale_data))
            
            logger.info(f"Retrieved {len(sales)} sales for item {item_id} for user {user_id}")
            return sales
            
        except Exception as e:
            logger.error(f"Error getting sales for item {item_id} for user {user_id}: {e}")
            raise

    # ==================== TAGS METHODS ====================
    
    def create_tag(self, user_id: str, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tag in Firestore"""
        try:
            # Add timestamps and user_id
            tag_data = self._add_timestamps(tag_data)
            tag_data['user_id'] = user_id
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(tag_data)
            
            # Add to Firestore
            collection_ref = self._get_user_collection(user_id, 'tags')
            _, doc_ref = collection_ref.add(serialized_data)
            
            # Return the created tag with Firestore document ID
            created_tag = serialized_data.copy()
            created_tag['id'] = doc_ref.id
            
            logger.info(f"Created tag {doc_ref.id} for user {user_id}")
            return self._deserialize_datetime(created_tag)
            
        except Exception as e:
            logger.error(f"Error creating tag for user {user_id}: {e}")
            raise
    
    def get_tags(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tags for a user"""
        try:
            collection_ref = self._get_user_collection(user_id, 'tags')
            query = collection_ref.order_by('created_at', direction=firestore.Query.DESCENDING)
            
            docs = query.stream()
            tags = []
            
            for doc in docs:
                tag_data = doc.to_dict()
                tag_data['id'] = doc.id
                tags.append(self._deserialize_datetime(tag_data))
            
            logger.info(f"Retrieved {len(tags)} tags for user {user_id}")
            return tags
            
        except Exception as e:
            logger.error(f"Error getting tags for user {user_id}: {e}")
            raise
    
    def get_tag(self, user_id: str, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific tag by ID"""
        try:
            doc_ref = self._get_user_collection(user_id, 'tags').document(tag_id)
            doc = doc_ref.get()
            
            if doc.exists:
                tag_data = doc.to_dict()
                tag_data['id'] = doc.id
                logger.info(f"Retrieved tag {tag_id} for user {user_id}")
                return self._deserialize_datetime(tag_data)
            else:
                logger.warning(f"Tag {tag_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting tag {tag_id} for user {user_id}: {e}")
            raise
    
    def update_tag(self, user_id: str, tag_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing tag"""
        try:
            # Add updated timestamp
            update_data = self._add_timestamps(update_data, is_update=True)
            
            # Serialize datetime objects
            serialized_data = self._serialize_datetime(update_data)
            
            # Update in Firestore
            doc_ref = self._get_user_collection(user_id, 'tags').document(tag_id)
            doc_ref.update(serialized_data)
            
            # Get and return updated tag
            updated_tag = self.get_tag(user_id, tag_id)
            if updated_tag:
                logger.info(f"Updated tag {tag_id} for user {user_id}")
                return updated_tag
            else:
                raise ValueError(f"Tag {tag_id} not found after update")
                
        except Exception as e:
            logger.error(f"Error updating tag {tag_id} for user {user_id}: {e}")
            raise
    
    def delete_tag(self, user_id: str, tag_id: str) -> bool:
        """Delete a tag from Firestore"""
        try:
            doc_ref = self._get_user_collection(user_id, 'tags').document(tag_id)
            doc_ref.delete()
            
            logger.info(f"Deleted tag {tag_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting tag {tag_id} for user {user_id}: {e}")
            raise
    
    def get_tag_by_name(self, user_id: str, tag_name: str) -> Optional[Dict[str, Any]]:
        """Get a tag by name for duplicate checking"""
        try:
            collection_ref = self._get_user_collection(user_id, 'tags')
            query = collection_ref.where('name', '==', tag_name).limit(1)
            
            docs = list(query.stream())
            
            if docs:
                tag_data = docs[0].to_dict()
                tag_data['id'] = docs[0].id
                logger.info(f"Retrieved tag '{tag_name}' for user {user_id}")
                return self._deserialize_datetime(tag_data)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting tag by name '{tag_name}' for user {user_id}: {e}")
            raise

    def get_expense_receipt_url(self, user_id: str, expense_id: str) -> Optional[str]:
        """Get the receipt URL for an expense"""
        try:
            # Get the expense to check if it has a receipt
            expense = self.get_expense(user_id, expense_id)
            if not expense:
                logger.warning(f"Expense {expense_id} not found for user {user_id}")
                return None
            
            # Check if receipt exists
            receipt_filename = expense.get('receipt_filename')
            if not receipt_filename:
                logger.warning(f"No receipt attached to expense {expense_id}")
                return None
            
            # For Firebase, we'll use the same URL pattern as SQLite for now
            # This assumes the receipt files are still stored in the local filesystem
            # In a full Firebase implementation, receipts would be stored in Firebase Storage
            receipt_url = f"/api/uploads/{user_id}/receipts/{receipt_filename}"
            
            logger.info(f"Generated receipt URL for expense {expense_id}: {receipt_url}")
            return receipt_url
            
        except Exception as e:
            logger.error(f"Error getting receipt URL for expense {expense_id} for user {user_id}: {e}")
            raise

# Global instance
firebase_service = FirebaseService() 
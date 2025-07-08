"""
Simple database service that can switch between SQLite and Firebase
based on the USE_FIREBASE environment variable.
"""

import os
import logging
from typing import Dict, List, Optional, Any
from config import Config

logger = logging.getLogger(__name__)

class DatabaseService:
    """
    Simple database service that routes operations to either SQLite or Firebase
    based on the USE_FIREBASE configuration.
    """
    
    def __init__(self):
        self.use_firebase = Config.USE_FIREBASE
        
        if self.use_firebase:
            try:
                from firebase_service import FirebaseService
                self.firebase_service = FirebaseService()
                logger.info("Database service initialized with Firebase")
            except ImportError as e:
                logger.error(f"Firebase service not available: {e}")
                raise
        else:
            # SQLite is handled by the existing Flask-SQLAlchemy setup
            logger.info("Database service initialized with SQLite")
    
    def is_using_firebase(self) -> bool:
        """Check if we're using Firebase"""
        return self.use_firebase
    
    # Items methods
    def get_items(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all items for a user"""
        if self.use_firebase:
            return self.firebase_service.get_items(user_id)
        else:
            # Return empty list for SQLite - existing endpoints will handle this
            return []
    
    def get_item(self, user_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific item"""
        if self.use_firebase:
            return self.firebase_service.get_item(user_id, item_id)
        else:
            return None
    
    def create_item(self, user_id: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item"""
        if self.use_firebase:
            return self.firebase_service.create_item(user_id, item_data)
        else:
            raise NotImplementedError("SQLite item creation handled by existing endpoints")
    
    def update_item(self, user_id: str, item_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing item"""
        if self.use_firebase:
            return self.firebase_service.update_item(user_id, item_id, update_data)
        else:
            raise NotImplementedError("SQLite item update handled by existing endpoints")
    
    def update_item_field(self, user_id: str, item_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of an item"""
        if self.use_firebase:
            return self.firebase_service.update_item_field(user_id, item_id, field, value)
        else:
            raise NotImplementedError("SQLite item field update handled by existing endpoints")
    
    def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete an item"""
        if self.use_firebase:
            return self.firebase_service.delete_item(user_id, item_id)
        else:
            raise NotImplementedError("SQLite item deletion handled by existing endpoints")
    
    # Sales methods
    def get_sales(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sales for a user"""
        if self.use_firebase:
            return self.firebase_service.get_sales(user_id)
        else:
            return []
    
    def get_sale(self, user_id: str, sale_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific sale"""
        if self.use_firebase:
            return self.firebase_service.get_sale(user_id, sale_id)
        else:
            return None
    
    def create_sale(self, user_id: str, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sale"""
        if self.use_firebase:
            return self.firebase_service.create_sale(user_id, sale_data)
        else:
            raise NotImplementedError("SQLite sale creation handled by existing endpoints")
    
    def update_sale(self, user_id: str, sale_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing sale"""
        if self.use_firebase:
            return self.firebase_service.update_sale(user_id, sale_id, update_data)
        else:
            raise NotImplementedError("SQLite sale update handled by existing endpoints")
    
    def update_sale_field(self, user_id: str, sale_id: str, field: str, value: Any) -> Dict[str, Any]:
        """Update a specific field of a sale"""
        if self.use_firebase:
            return self.firebase_service.update_sale_field(user_id, sale_id, field, value)
        else:
            raise NotImplementedError("SQLite sale field update handled by existing endpoints")
    
    def delete_sale(self, user_id: str, sale_id: str) -> bool:
        """Delete a sale"""
        if self.use_firebase:
            return self.firebase_service.delete_sale(user_id, sale_id)
        else:
            raise NotImplementedError("SQLite sale deletion handled by existing endpoints")
    
    def get_sales_by_item(self, user_id: str, item_id: str) -> List[Dict[str, Any]]:
        """Get all sales for a specific item"""
        if self.use_firebase:
            return self.firebase_service.get_sales_by_item(user_id, item_id)
        else:
            return []
    
    # Expenses methods
    def get_expenses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all expenses for a user"""
        if self.use_firebase:
            return self.firebase_service.get_expenses(user_id)
        else:
            return []
    
    def get_expense(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific expense"""
        if self.use_firebase:
            return self.firebase_service.get_expense(user_id, expense_id)
        else:
            return None
    
    def create_expense(self, user_id: str, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new expense"""
        if self.use_firebase:
            return self.firebase_service.create_expense(user_id, expense_data)
        else:
            raise NotImplementedError("SQLite expense creation handled by existing endpoints")
    
    def update_expense(self, user_id: str, expense_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing expense"""
        if self.use_firebase:
            return self.firebase_service.update_expense(user_id, expense_id, update_data)
        else:
            raise NotImplementedError("SQLite expense update handled by existing endpoints")
    
    def delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense"""
        if self.use_firebase:
            return self.firebase_service.delete_expense(user_id, expense_id)
        else:
            raise NotImplementedError("SQLite expense deletion handled by existing endpoints")
    
    # Settings methods
    def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user settings"""
        if self.use_firebase:
            return self.firebase_service.get_user_settings(user_id)
        else:
            return None
    
    def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user settings"""
        if self.use_firebase:
            return self.firebase_service.update_user_settings(user_id, settings_data)
        else:
            raise NotImplementedError("SQLite settings update handled by existing endpoints")

    # Tags methods
    def get_tags(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tags for a user"""
        if self.use_firebase:
            return self.firebase_service.get_tags(user_id)
        else:
            return []
    
    def get_tag(self, user_id: str, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific tag"""
        if self.use_firebase:
            return self.firebase_service.get_tag(user_id, tag_id)
        else:
            return None
    
    def create_tag(self, user_id: str, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tag"""
        if self.use_firebase:
            return self.firebase_service.create_tag(user_id, tag_data)
        else:
            raise NotImplementedError("SQLite tag creation handled by existing endpoints")
    
    def update_tag(self, user_id: str, tag_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing tag"""
        if self.use_firebase:
            return self.firebase_service.update_tag(user_id, tag_id, update_data)
        else:
            raise NotImplementedError("SQLite tag update handled by existing endpoints")
    
    def delete_tag(self, user_id: str, tag_id: str) -> bool:
        """Delete a tag"""
        if self.use_firebase:
            return self.firebase_service.delete_tag(user_id, tag_id)
        else:
            raise NotImplementedError("SQLite tag deletion handled by existing endpoints")
    
    def get_tag_by_name(self, user_id: str, tag_name: str) -> Optional[Dict[str, Any]]:
        """Get a tag by name for duplicate checking"""
        if self.use_firebase:
            return self.firebase_service.get_tag_by_name(user_id, tag_name)
        else:
            return None

    def get_expense_receipt_url(self, user_id: str, expense_id: str) -> Optional[str]:
        """Get the receipt URL for an expense"""
        if self.use_firebase:
            return self.firebase_service.get_expense_receipt_url(user_id, expense_id)
        else:
            return None 
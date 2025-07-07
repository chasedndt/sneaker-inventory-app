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
    
    def create_sale(self, user_id: str, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sale"""
        if self.use_firebase:
            return self.firebase_service.create_sale(user_id, sale_data)
        else:
            raise NotImplementedError("SQLite sale creation handled by existing endpoints")
    
    # Expenses methods
    def get_expenses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all expenses for a user"""
        if self.use_firebase:
            return self.firebase_service.get_expenses(user_id)
        else:
            return []
    
    def create_expense(self, user_id: str, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new expense"""
        if self.use_firebase:
            return self.firebase_service.create_expense(user_id, expense_data)
        else:
            raise NotImplementedError("SQLite expense creation handled by existing endpoints")
    
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
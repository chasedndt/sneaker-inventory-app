# backend/services/firebase_storage.py
import firebase_admin
from firebase_admin import storage
from werkzeug.utils import secure_filename
import os
import time
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

class FirebaseStorageService:
    """Service for Firebase Storage operations"""
    
    def __init__(self):
        self.bucket = storage.bucket()
    
    def upload_file(self, file, user_id: str, folder: str = 'items') -> Optional[str]:
        """
        Upload a file to Firebase Storage
        
        Args:
            file: The file object to upload
            user_id: The user's ID for organizing files
            folder: The folder to store the file in (items, receipts, etc.)
            
        Returns:
            The filename if successful, None if failed
        """
        try:
            if not file or not file.filename:
                return None
            
            # Generate secure filename with timestamp
            original_filename = secure_filename(file.filename)
            filename_parts = original_filename.rsplit('.', 1)
            timestamped_filename = f"{filename_parts[0]}_{int(time.time())}_{user_id}.{filename_parts[1]}"
            
            # Create the storage path: users/{user_id}/{folder}/{filename}
            storage_path = f"users/{user_id}/{folder}/{timestamped_filename}"
            
            # Upload to Firebase Storage
            blob = self.bucket.blob(storage_path)
            blob.upload_from_file(file, content_type=file.content_type)
            
            # Make the file publicly readable (optional - you can control this with rules)
            blob.make_public()
            
            logger.info(f"Uploaded file {timestamped_filename} to {storage_path}")
            return timestamped_filename
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return None
    
    def get_file_url(self, user_id: str, filename: str, folder: str = 'items') -> Optional[str]:
        """
        Get the public URL for a file
        
        Args:
            user_id: The user's ID
            filename: The filename
            folder: The folder the file is in
            
        Returns:
            The public URL if the file exists, None otherwise
        """
        try:
            storage_path = f"users/{user_id}/{folder}/{filename}"
            blob = self.bucket.blob(storage_path)
            
            if blob.exists():
                return blob.public_url
            return None
            
        except Exception as e:
            logger.error(f"Error getting file URL: {e}")
            return None
    
    def delete_file(self, user_id: str, filename: str, folder: str = 'items') -> bool:
        """
        Delete a file from Firebase Storage
        
        Args:
            user_id: The user's ID
            filename: The filename to delete
            folder: The folder the file is in
            
        Returns:
            True if successful, False otherwise
        """
        try:
            storage_path = f"users/{user_id}/{folder}/{filename}"
            blob = self.bucket.blob(storage_path)
            
            if blob.exists():
                blob.delete()
                logger.info(f"Deleted file {storage_path}")
                return True
            else:
                logger.warning(f"File {storage_path} does not exist")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    def list_user_files(self, user_id: str, folder: str = 'items') -> List[str]:
        """
        List all files for a user in a specific folder
        
        Args:
            user_id: The user's ID
            folder: The folder to list files from
            
        Returns:
            List of filenames
        """
        try:
            prefix = f"users/{user_id}/{folder}/"
            blobs = self.bucket.list_blobs(prefix=prefix)
            
            filenames = []
            for blob in blobs:
                # Extract just the filename from the full path
                filename = blob.name.split('/')[-1]
                filenames.append(filename)
            
            return filenames
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    def file_exists(self, user_id: str, filename: str, folder: str = 'items') -> bool:
        """
        Check if a file exists in Firebase Storage
        
        Args:
            user_id: The user's ID
            filename: The filename to check
            folder: The folder to check in
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            storage_path = f"users/{user_id}/{folder}/{filename}"
            blob = self.bucket.blob(storage_path)
            return blob.exists()
            
        except Exception as e:
            logger.error(f"Error checking file existence: {e}")
            return False

# Global instance
firebase_storage = FirebaseStorageService() 
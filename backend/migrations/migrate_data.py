# backend/migrations/migrate_data.py
import os
import sys
import logging
from datetime import datetime

# Add parent directory to path to import app-related modules
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(parent_dir)

from app import create_app
from models import db, Item, Size, Image, Tag, Sale, Expense, Coplist, UserSettings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(parent_dir, 'migration.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Default user ID to assign to existing data
DEFAULT_USER_ID = "PpdcAvliVrR4zBAH6WGBeLqd0c73"

def migrate_data():
    """
    Migrate existing data to add user_id field.
    This function adds the DEFAULT_USER_ID to all existing records.
    """
    app = create_app()
    with app.app_context():
        try:
            # Start transaction
            db.session.begin()
            
            # Migration timestamp
            migration_time = datetime.utcnow()
            logger.info(f"Starting data migration at {migration_time}")
            logger.info(f"Assigning user_id '{DEFAULT_USER_ID}' to all existing records")
            
            # 1. Migrate Items
            items_count = Item.query.filter(Item.user_id.is_(None)).count()
            logger.info(f"Found {items_count} items without user_id")
            
            if items_count > 0:
                db.session.execute(
                    'UPDATE item SET user_id = :user_id WHERE user_id IS NULL',
                    {'user_id': DEFAULT_USER_ID}
                )
                logger.info(f"✅ Updated {items_count} items with user_id")
            
            # 2. Migrate Tags
            tags_count = Tag.query.filter(Tag.user_id.is_(None)).count()
            logger.info(f"Found {tags_count} tags without user_id")
            
            if tags_count > 0:
                db.session.execute(
                    'UPDATE tag SET user_id = :user_id WHERE user_id IS NULL',
                    {'user_id': DEFAULT_USER_ID}
                )
                logger.info(f"✅ Updated {tags_count} tags with user_id")
            
            # 3. Migrate Sales
            sales_count = Sale.query.filter(Sale.user_id.is_(None)).count()
            logger.info(f"Found {sales_count} sales without user_id")
            
            if sales_count > 0:
                db.session.execute(
                    'UPDATE sale SET user_id = :user_id WHERE user_id IS NULL',
                    {'user_id': DEFAULT_USER_ID}
                )
                logger.info(f"✅ Updated {sales_count} sales with user_id")
            
            # 4. Migrate Expenses
            expenses_count = Expense.query.filter(Expense.user_id.is_(None)).count()
            logger.info(f"Found {expenses_count} expenses without user_id")
            
            if expenses_count > 0:
                db.session.execute(
                    'UPDATE expense SET user_id = :user_id WHERE user_id IS NULL',
                    {'user_id': DEFAULT_USER_ID}
                )
                logger.info(f"✅ Updated {expenses_count} expenses with user_id")
            
            # 5. Migrate Coplists
            coplists_count = Coplist.query.filter(Coplist.user_id.is_(None)).count()
            logger.info(f"Found {coplists_count} coplists without user_id")
            
            if coplists_count > 0:
                db.session.execute(
                    'UPDATE coplist SET user_id = :user_id WHERE user_id IS NULL',
                    {'user_id': DEFAULT_USER_ID}
                )
                logger.info(f"✅ Updated {coplists_count} coplists with user_id")
            
            # 6. Check for existing user settings
            user_settings = UserSettings.query.filter_by(user_id=DEFAULT_USER_ID).first()
            if not user_settings:
                # Create default settings for the user
                user_settings = UserSettings(
                    user_id=DEFAULT_USER_ID,
                    dark_mode=False,
                    currency='USD',
                    date_format='MM/DD/YYYY',
                    created_at=migration_time,
                    updated_at=migration_time
                )
                db.session.add(user_settings)
                logger.info(f"✅ Created default settings for user {DEFAULT_USER_ID}")
            
            # 7. Migrate image files into user-specific subdirectories
            logger.info("Moving image files to user-specific directories")
            
            # Get all images
            images = Image.query.all()
            upload_folder = app.config['UPLOAD_FOLDER']
            user_upload_folder = os.path.join(upload_folder, DEFAULT_USER_ID)
            
            # Create user upload folder if it doesn't exist
            if not os.path.exists(user_upload_folder):
                os.makedirs(user_upload_folder)
                logger.info(f"✅ Created user upload directory: {user_upload_folder}")
            
            # Track moved files
            moved_files = 0
            for image in images:
                source_path = os.path.join(upload_folder, image.filename)
                target_path = os.path.join(user_upload_folder, image.filename)
                
                # Check if file exists in source path
                if os.path.exists(source_path) and not os.path.exists(target_path):
                    try:
                        # Read source file
                        with open(source_path, 'rb') as src_file:
                            file_data = src_file.read()
                        
                        # Write to target path
                        with open(target_path, 'wb') as tgt_file:
                            tgt_file.write(file_data)
                        
                        # Don't delete original for safety
                        moved_files += 1
                    except Exception as file_err:
                        logger.error(f"❌ Error moving file {image.filename}: {str(file_err)}")
            
            logger.info(f"✅ Copied {moved_files} image files to user directory")
            
            # Commit all changes
            db.session.commit()
            logger.info("✅ Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    # Execute the migration script
    migrate_data()
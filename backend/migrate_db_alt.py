# backend/migrate_db_alt.py
from app import create_app, db
from models import Item, Tag
import json
import sqlite3
import os

def migrate_db():
    app = create_app()
    
    with app.app_context():
        # Get the database file path
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        
        # Connect directly to the SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add the color column to the Tag table if it doesn't exist
        try:
            cursor.execute("PRAGMA table_info(tag)")
            columns = [info[1] for info in cursor.fetchall()]
            
            if 'color' not in columns:
                cursor.execute("ALTER TABLE tag ADD COLUMN color TEXT DEFAULT '#8884d8'")
                print("✅ Added color column to the Tag table")
            else:
                print("✅ Color column already exists in the Tag table")
        except Exception as e:
            print(f"⚠️ Error adding color column: {str(e)}")
        
        # Add the listings column to the Item table if it doesn't exist
        try:
            cursor.execute("PRAGMA table_info(item)")
            columns = [info[1] for info in cursor.fetchall()]
            
            if 'listings' not in columns:
                cursor.execute("ALTER TABLE item ADD COLUMN listings TEXT")
                print("✅ Added listings column to the Item table")
            else:
                print("✅ Listings column already exists in the Item table")
        except Exception as e:
            print(f"⚠️ Error adding listings column: {str(e)}")
        
        # Commit the direct SQLite changes
        conn.commit()
        conn.close()
        
        print("✅ Direct database schema changes completed!")
        
        # Now use the ORM to update data
        try:
            # Update existing tags with default color
            # Since the column was already added with a default value, this is just a safety check
            for tag in Tag.query.all():
                if not tag.color:
                    tag.color = '#8884d8'
                    print(f"Updated tag '{tag.name}' with default color")
                    
            # Update existing items with empty listings array if needed
            for item in Item.query.all():
                if not hasattr(item, '_listings') or item._listings is None:
                    item._listings = json.dumps([])
                    print(f"Updated item '{item.product_name}' with empty listings array")
            
            # Commit ORM changes
            db.session.commit()
            print("✅ Data migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Error during data migration: {str(e)}")
            
        print("✅ Migration process completed!")

if __name__ == "__main__":
    migrate_db()
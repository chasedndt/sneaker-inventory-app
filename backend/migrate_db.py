# backend/migrate_db.py
from app import create_app, db
from models import Item, Tag
import json

def migrate_db():
    app = create_app()
    
    with app.app_context():
        # Add the color column to the Tag table if it doesn't exist
        try:
            db.engine.execute('ALTER TABLE tag ADD COLUMN color VARCHAR(20) DEFAULT "#8884d8"')
            print("✅ Added color column to the Tag table")
        except Exception as e:
            print(f"⚠️ Color column may already exist or another error occurred: {str(e)}")
        
        # Add the listings column to the Item table if it doesn't exist
        try:
            db.engine.execute('ALTER TABLE item ADD COLUMN listings TEXT')
            print("✅ Added listings column to the Item table")
        except Exception as e:
            print(f"⚠️ Listings column may already exist or another error occurred: {str(e)}")
        
        # Update existing tags with default color
        tags = Tag.query.all()
        for tag in tags:
            if not hasattr(tag, 'color') or tag.color is None:
                tag.color = '#8884d8'
        
        # Update existing items with empty listings array
        items = Item.query.all()
        for item in items:
            if not hasattr(item, '_listings') or item._listings is None:
                item._listings = json.dumps([])
        
        # Commit changes
        db.session.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate_db()
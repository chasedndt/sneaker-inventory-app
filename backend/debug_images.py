#!/usr/bin/env python3

from models import db, Item, Image
from app import create_app
import os

app = create_app()

with app.app_context():
    print("=== DATABASE DEBUG ===")
    items = Item.query.limit(5).all()
    print(f"Found {len(items)} items in database")
    
    for item in items:
        print(f"\n--- Item: {item.product_name} ---")
        print(f"Category: {item.category}")
        print(f"User ID: {item.user_id}")
        
        # Get images
        images = Image.query.filter_by(item_id=item.id).all()
        print(f"Images in DB: {len(images)}")
        for img in images:
            print(f"  - Filename: {img.filename}")
            print(f"  - Path: {img.path}")
            # Check if file exists
            file_exists = os.path.exists(img.path)
            print(f"  - File exists: {file_exists}")
        
        # Get to_dict output
        item_dict = item.to_dict()
        print(f"to_dict imageUrl: {item_dict.get('imageUrl')}")
        print(f"to_dict images: {item_dict.get('images')}")
        
        print("-" * 50)

    print("\n=== UPLOAD FOLDER CONTENTS ===")
    upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
    print(f"Upload folder: {upload_folder}")
    
    if os.path.exists(upload_folder):
        for root, dirs, files in os.walk(upload_folder):
            level = root.replace(upload_folder, '').count(os.sep)
            indent = ' ' * 2 * level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 2 * (level + 1)
            for file in files[:5]:  # Show first 5 files
                print(f"{subindent}{file}")
            if len(files) > 5:
                print(f"{subindent}... and {len(files) - 5} more files")
    else:
        print("Upload folder does not exist!") 
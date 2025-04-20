# backend/app.py
from flask import Flask, request, jsonify, send_from_directory, current_app
from flask_cors import CORS
from flask_migrate import Migrate
import os
import json
import time
import traceback
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from models import db, Item, Size, Image, Tag, Sale, Expense, Coplist, UserSettings
from config import Config
from datetime import datetime, timedelta
from tag_routes import tag_routes
import re
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
import uuid
import calendar
from middleware.auth import require_auth, get_user_id_from_token, get_current_user_info
from admin.admin_routes import admin_routes


def convert_to_snake_case(name):
    """Convert a string from camelCase to snake_case."""
    pattern = re.compile(r'(?<!^)(?=[A-Z])')
    return pattern.sub('_', name).lower()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],  # Added Authorization header
            "max_age": 3600,
            "supports_credentials": True
        }
    })

    db.init_app(app)
    Migrate(app, db)

    # Register the tag routes blueprint
    app.register_blueprint(tag_routes, url_prefix='/api')

    # Register the admin routes blueprint (add this line)
    app.register_blueprint(admin_routes, url_prefix='/api')

    # Set up standard application logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    # Set up detailed logging for image requests
    image_logger = logging.getLogger('image_requests')
    image_logger.setLevel(logging.DEBUG)
    handler = logging.FileHandler('image_requests.log')
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    image_logger.addHandler(handler)

    # Create upload directory if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
        logger.info(f"Created upload directory at: {app.config['UPLOAD_FOLDER']}")

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    @app.route('/api/test', methods=['GET'])
    def test_connection():
        logger.info("Test endpoint hit")
        return jsonify({'status': 'connected'}), 200
    
    # Get user info endpoint
    @app.route('/api/user', methods=['GET'])
    @require_auth
    def get_user(user_id):
        """
        Get current user information.
        """
        try:
            logger.info(f"🔍 Fetching user info for user_id: {user_id}")
            
            # Get user settings
            settings = UserSettings.query.filter_by(user_id=user_id).first()
            
            # If settings don't exist, create default settings
            if not settings:
                settings = UserSettings(user_id=user_id)
                db.session.add(settings)
                db.session.commit()
                logger.info(f"✅ Created default settings for user_id: {user_id}")
            
            # Get user details from Firebase (optional)
            user_info = get_current_user_info() or {'uid': user_id}
            
            # Combine settings with user info
            response = {
                **user_info,
                'settings': settings.to_dict()
            }
            
            return jsonify(response), 200
        except Exception as e:
            logger.error(f"💥 Error fetching user info: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    # Update user settings endpoint
    @app.route('/api/settings', methods=['PUT'])
    @require_auth
    def update_settings(user_id):
        """
        Update user settings.
        """
        try:
            logger.info(f"🔄 Updating settings for user_id: {user_id}")
            data = request.json
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Get existing settings or create new
            settings = UserSettings.query.filter_by(user_id=user_id).first()
            if not settings:
                settings = UserSettings(user_id=user_id)
                db.session.add(settings)
            
            # Update settings
            if 'dark_mode' in data:
                settings.dark_mode = data['dark_mode']
            if 'currency' in data:
                settings.currency = data['currency']
            if 'date_format' in data:
                settings.date_format = data['date_format']
            
            db.session.commit()
            
            logger.info(f"✅ Settings updated for user_id: {user_id}")
            return jsonify(settings.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating settings: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Modified to include user_id from authentication
    @app.route('/api/items', methods=['GET'])
    @require_auth
    def get_items(user_id):
        """
        Get all items with their images for current user.
        """
        try:
            logger.info(f"📊 Fetching items for user_id: {user_id}")
            items = Item.query.filter_by(user_id=user_id).all()
            
            # Convert items to dictionary format with image URLs
            items_data = []
            for item in items:
                item_dict = item.to_dict()
                items_data.append(item_dict)
            
            logger.info(f"✅ Retrieved {len(items_data)} items for user_id: {user_id}")
            return jsonify(items_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get a single item by ID - verify ownership
    @app.route('/api/items/<int:item_id>', methods=['GET'])
    @require_auth
    def get_item(user_id, item_id):
        """
        Get a single item by ID with its images.
        """
        try:
            item = Item.query.get(item_id)
            if not item:
                logger.warning(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': 'Item not found'}), 404
            
            # Check if item belongs to the requesting user
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to access item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            logger.info(f"✅ Retrieved item {item_id} from database for user_id: {user_id}")
            
            # Get the item's images
            images = Image.query.filter_by(item_id=item.id).all()
            image_filenames = [img.filename for img in images]
            
            # Create a detailed response with images
            item_data = item.to_dict()
            item_data['images'] = image_filenames
            
            logger.info(f"📸 Item {item_id} has {len(image_filenames)} images: {image_filenames}")
            
            return jsonify(item_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Add a new item with current user_id
    @app.route('/api/items', methods=['POST'])
    @require_auth
    def add_item(user_id):
        try:
            logger.info(f"Receiving item creation request for user_id: {user_id}")
            
            # Check if the post request has the file part
            if 'images' not in request.files and 'data' not in request.form:
                logger.error("No images or data part in the request")
                return jsonify({'error': 'No images or data part'}), 400
            
            # Parse the JSON data
            form_data = json.loads(request.form.get('data'))
            
            # Extract data from the form
            product_details = form_data.get('productDetails', {})
            sizes_quantity = form_data.get('sizesQuantity', {})
            purchase_details = form_data.get('purchaseDetails', {})
            
            # Create a new item with user_id
            new_item = Item(
                user_id=user_id,  # Set the user_id from auth
                category=product_details.get('category', ''),
                product_name=product_details.get('productName', ''),
                reference=product_details.get('reference', ''),
                colorway=product_details.get('colorway', ''),
                brand=product_details.get('brand', ''),
                purchase_price=float(purchase_details.get('purchasePrice', 0)),
                purchase_currency=purchase_details.get('purchaseCurrency', '$'),
                shipping_price=float(purchase_details.get('shippingPrice', 0) or 0),
                shipping_currency=purchase_details.get('shippingCurrency', '$'),
                market_price=float(purchase_details.get('marketPrice', 0) or 0),
                purchase_date=datetime.fromisoformat(purchase_details.get('purchaseDate').replace('Z', '+00:00')) if purchase_details.get('purchaseDate') else datetime.utcnow(),
                purchase_location=purchase_details.get('purchaseLocation', ''),
                condition=purchase_details.get('condition', ''),
                notes=purchase_details.get('notes', ''),
                order_id=purchase_details.get('orderID', ''),
                tax_type=purchase_details.get('taxType', 'none'),
                vat_percentage=float(purchase_details.get('vatPercentage', 0) or 0),
                sales_tax_percentage=float(purchase_details.get('salesTaxPercentage', 0) or 0),
                status='unlisted'  # Default status for new items
            )
            
            db.session.add(new_item)
            db.session.flush()  # Get the item ID before committing
            
            # Add sizes
            selected_sizes = sizes_quantity.get('selectedSizes', [])
            for size_entry in selected_sizes:
                new_size = Size(
                    item_id=new_item.id,
                    system=size_entry.get('system', ''),
                    size=size_entry.get('size', ''),
                    quantity=int(size_entry.get('quantity', 1))
                )
                db.session.add(new_size)
            
            # Add tags if provided
            if purchase_details.get('tags'):
                for tag_name in purchase_details.get('tags', []):
                    # Check if tag already exists for this user
                    tag = Tag.query.filter_by(name=tag_name, user_id=user_id).first()
                    if not tag:
                        tag = Tag(name=tag_name, user_id=user_id)
                        db.session.add(tag)
                        db.session.flush()
                    
                    # Add tag to item's tags
                    new_item.tags.append(tag)
            
            # Process and save images
            files = request.files.getlist('images')
            image_filenames = []
            
            for file in files:
                if file and allowed_file(file.filename):
                    # Generate a secure filename with timestamp to avoid duplicates
                    filename = secure_filename(file.filename)
                    filename_parts = filename.rsplit('.', 1)
                    timestamped_filename = f"{filename_parts[0]}_{int(time.time())}_{user_id}.{filename_parts[1]}"
                    
                    # Create user-specific subfolder
                    user_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
                    if not os.path.exists(user_upload_folder):
                        os.makedirs(user_upload_folder)
                    
                    # Save the file
                    file_path = os.path.join(user_upload_folder, timestamped_filename)
                    file.save(file_path)
                    
                    # Create image record in database
                    new_image = Image(
                        item_id=new_item.id,
                        filename=timestamped_filename,
                        path=file_path
                    )
                    db.session.add(new_image)
                    image_filenames.append(timestamped_filename)
            
            # Commit changes to database
            db.session.commit()
            
            logger.info(f"✅ Item created with ID: {new_item.id} for user_id: {user_id}")
            
            # Return the created item with its images
            return jsonify({
                'message': 'Item created successfully',
                'item': {
                    'id': new_item.id,
                    'productName': new_item.product_name,
                    'category': new_item.category,
                    'brand': new_item.brand,
                    'images': image_filenames
                }
            }), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating item for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update an existing item - verify ownership
    @app.route('/api/items/<int:item_id>', methods=['PUT'])
    @require_auth
    def update_item(user_id, item_id):
        """
        Update an existing item, ensuring it belongs to the current user.
        """
        try:
            logger.info(f"🔄 Updating item {item_id} for user {user_id}")
            
            # Check if item exists and belongs to user
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Verify ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Check if the request has data
            if 'data' not in request.form:
                logger.error("No data part in the request")
                return jsonify({'error': 'No data provided'}), 400
            
            # Parse the JSON data
            form_data = json.loads(request.form.get('data'))
            
            # Extract data from the form
            product_details = form_data.get('productDetails', {})
            sizes_quantity = form_data.get('sizesQuantity', {})
            purchase_details = form_data.get('purchaseDetails', {})
            status = form_data.get('status')  # Get status if provided
            
            # Update item fields
            if product_details:
                item.category = product_details.get('category', item.category)
                item.product_name = product_details.get('productName', item.product_name)
                item.reference = product_details.get('reference', item.reference)
                item.colorway = product_details.get('colorway', item.colorway)
                item.brand = product_details.get('brand', item.brand)
            
            if purchase_details:
                item.purchase_price = float(purchase_details.get('purchasePrice', item.purchase_price))
                item.purchase_currency = purchase_details.get('purchaseCurrency', item.purchase_currency)
                item.shipping_price = float(purchase_details.get('shippingPrice', item.shipping_price or 0))
                item.shipping_currency = purchase_details.get('shippingCurrency', item.shipping_currency)
                item.market_price = float(purchase_details.get('marketPrice', item.market_price or 0))
                
                if purchase_details.get('purchaseDate'):
                    try:
                        item.purchase_date = datetime.fromisoformat(purchase_details.get('purchaseDate').replace('Z', '+00:00'))
                    except ValueError:
                        logger.warning(f"Invalid date format: {purchase_details.get('purchaseDate')}")
                
                item.purchase_location = purchase_details.get('purchaseLocation', item.purchase_location)
                item.condition = purchase_details.get('condition', item.condition)
                item.notes = purchase_details.get('notes', item.notes)
                item.order_id = purchase_details.get('orderID', item.order_id)
                item.tax_type = purchase_details.get('taxType', item.tax_type)
                item.vat_percentage = float(purchase_details.get('vatPercentage', item.vat_percentage or 0))
                item.sales_tax_percentage = float(purchase_details.get('salesTaxPercentage', item.sales_tax_percentage or 0))
            
            # Update status if provided
            if status:
                item.status = status
            
            # Update sizes if provided
            if sizes_quantity and 'selectedSizes' in sizes_quantity:
                # First, remove existing sizes
                Size.query.filter_by(item_id=item.id).delete()
                
                # Then add new sizes
                for size_entry in sizes_quantity.get('selectedSizes', []):
                    new_size = Size(
                        item_id=item.id,
                        system=size_entry.get('system', ''),
                        size=size_entry.get('size', ''),
                        quantity=int(size_entry.get('quantity', 1))
                    )
                    db.session.add(new_size)
            
            # Process new images if provided
            if 'images' in request.files:
                files = request.files.getlist('images')
                image_filenames = []
                
                for file in files:
                    if file and allowed_file(file.filename):
                        # Generate a secure filename with timestamp to avoid duplicates
                        filename = secure_filename(file.filename)
                        filename_parts = filename.rsplit('.', 1)
                        timestamped_filename = f"{filename_parts[0]}_{int(time.time())}_{user_id}.{filename_parts[1]}"
                        
                        # Create user-specific subfolder
                        user_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
                        if not os.path.exists(user_upload_folder):
                            os.makedirs(user_upload_folder)
                        
                        # Save the file
                        file_path = os.path.join(user_upload_folder, timestamped_filename)
                        file.save(file_path)
                        
                        # Create image record in database
                        new_image = Image(
                            item_id=item.id,
                            filename=timestamped_filename,
                            path=file_path
                        )
                        db.session.add(new_image)
                        image_filenames.append(timestamped_filename)
            
            # Update the modified timestamp
            item.updated_at = datetime.utcnow()
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Item {item_id} updated successfully for user {user_id}")
            
            # Return the updated item
            return jsonify({
                'message': 'Item updated successfully',
                'item': item.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating item {item_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update a specific field of an item
    @app.route('/api/items/<int:item_id>/field', methods=['PATCH'])
    @require_auth
    def update_item_field(user_id, item_id):
        """
        Update a specific field of an item, verifying user ownership.
        """
        try:
            logger.info(f"🔄 Updating field for item {item_id}, user {user_id}")
            
            # Check if item exists and belongs to user
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Verify ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Log request data for debugging
            logger.info(f"Request data: {request.data}")
            
            # Parse request data and handle potential JSON errors
            try:
                data = request.json
                if not data:
                    logger.error("Empty request data")
                    return jsonify({'error': 'Empty request data'}), 400
            except Exception as json_err:
                logger.error(f"Invalid JSON in request: {str(json_err)}")
                return jsonify({'error': f'Invalid JSON in request: {str(json_err)}'}), 400
            
            # Validate request
            if 'field' not in data or 'value' not in data:
                logger.error("❌ Missing required fields: field and value")
                return jsonify({'error': 'Missing required fields: field and value'}), 400
            
            field = data['field']
            value = data['value']
            
            logger.info(f"Field: {field}, Value: {value}")
            
            # Special handling for tags field
            if field == 'tags':
                try:
                    # Validate that value is a list
                    if not isinstance(value, list):
                        logger.error(f"❌ Tags value must be a list, got: {type(value)}")
                        return jsonify({'error': 'Tags value must be a list'}), 400
                    
                    # Clear existing tags
                    item.tags = []
                    db.session.flush()
                    
                    # Find and add each tag
                    for tag_id in value:
                        # Try to convert to int if it's a numeric string
                        tag_id_to_use = tag_id
                        if isinstance(tag_id, str) and tag_id.isdigit():
                            tag_id_to_use = int(tag_id)
                        
                        # Try to find the tag
                        tag = Tag.query.get(tag_id_to_use)
                        
                        # Verify the tag belongs to the user
                        if tag and tag.user_id == user_id:
                            item.tags.append(tag)
                            logger.info(f"Added tag {tag.id} to item {item_id}")
                        else:
                            logger.warning(f"Tag with ID {tag_id} not found or doesn't belong to user {user_id}")
                    
                    # Log the updated tags
                    logger.info(f"Updated tags for item {item_id}: {[t.id for t in item.tags]}")
                except Exception as tag_err:
                    db.session.rollback()
                    logger.error(f"❌ Error updating tags: {str(tag_err)}")
                    return jsonify({'error': f'Error updating tags: {str(tag_err)}'}), 500
            
            # Special handling for listings field
            elif field == 'listings':
                try:
                    # Validate listings format
                    if not isinstance(value, list):
                        logger.error(f"❌ Listings value must be a list, got: {type(value)}")
                        return jsonify({'error': 'Listings value must be a list'}), 400
                    
                    # Store listings as JSON string
                    item._listings = json.dumps(value)
                    logger.info(f"Updated listings for item {item_id}")
                except Exception as listings_err:
                    db.session.rollback()
                    logger.error(f"❌ Error updating listings: {str(listings_err)}")
                    return jsonify({'error': f'Error updating listings: {str(listings_err)}'}), 500
            
            # Update the standard fields
            elif field == 'status':
                # Validate status
                valid_statuses = ['unlisted', 'listed', 'sold']
                if value not in valid_statuses:
                    logger.error(f"❌ Invalid status value: {value}")
                    return jsonify({'error': f'Invalid status value. Must be one of: {", ".join(valid_statuses)}'}), 400
                item.status = value
            elif field == 'marketPrice':
                try:
                    item.market_price = float(value)
                except (ValueError, TypeError):
                    return jsonify({'error': 'Invalid market price value'}), 400
            else:
                # Handle standard field updates
                try:
                    if hasattr(item, field):
                        setattr(item, field, value)
                    elif hasattr(item, convert_to_snake_case(field)):
                        # Convert camelCase to snake_case for database fields
                        snake_field = convert_to_snake_case(field)
                        setattr(item, snake_field, value)
                    else:
                        logger.error(f"❌ Invalid field name: {field}")
                        return jsonify({'error': f'Invalid field name: {field}'}), 400
                except Exception as field_err:
                    logger.error(f"❌ Error setting field {field}: {str(field_err)}")
                    return jsonify({'error': f'Error setting field {field}: {str(field_err)}'}), 400
            
            # Update the updated_at timestamp
            item.updated_at = datetime.utcnow()
            
            # Commit changes
            try:
                db.session.commit()
                logger.info(f"✅ Updated {field} for item {item_id}")
                
                # Get the updated item data for response
                updated_item = Item.query.get(item_id)
                if field == 'tags':
                    updated_value = [tag.id for tag in updated_item.tags]
                elif field == 'listings':
                    updated_value = updated_item.listings
                else:
                    updated_value = getattr(updated_item, field, None)
                
                # Return success message
                return jsonify({
                    'message': f'Field {field} updated successfully',
                    'id': item_id,
                    'field': field,
                    'value': updated_value
                }), 200
            except Exception as commit_err:
                db.session.rollback()
                logger.error(f"❌ Error committing changes: {str(commit_err)}")
                return jsonify({'error': f'Error committing changes: {str(commit_err)}'}), 500
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating field for item {item_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500

    # Delete an item - verify ownership
    @app.route('/api/items/<int:item_id>', methods=['DELETE'])
    @require_auth
    def delete_item(user_id, item_id):
        """
        Delete an item and its associated data, verifying user ownership.
        """
        try:
            logger.info(f"🗑️ Deleting item {item_id} for user {user_id}")
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Verify ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to delete item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Delete associated sales records
            sales = Sale.query.filter_by(item_id=item_id, user_id=user_id).all()
            for sale in sales:
                db.session.delete(sale)
                logger.info(f"🗑️ Deleted associated sale {sale.id} for item {item_id}")
            
            # Delete associated images from storage
            images = Image.query.filter_by(item_id=item_id).all()
            for image in images:
                try:
                    # Construct path based on user_id subfolder
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_id, image.filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"✅ Deleted image file: {file_path}")
                except Exception as img_err:
                    logger.error(f"❌ Failed to delete image file: {str(img_err)}")
            
            # First remove the item from the many-to-many relationship
            # This prevents the error about the tag.color column during deletion
            item.tags = []
            db.session.flush()
            
            # Delete the item (cascade should handle associated records)
            db.session.delete(item)
            db.session.commit()
            
            logger.info(f"✅ Item {item_id} deleted successfully for user {user_id}")
            
            return jsonify({
                'message': f'Item {item_id} deleted successfully'
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting item {item_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Sales Endpoints - all with user_id verification
    @app.route('/api/sales', methods=['GET'])
    @require_auth
    def get_sales(user_id):
        """
        Get all sales for the current user.
        """
        try:
            logger.info(f"📊 Fetching sales for user_id: {user_id}")
            sales = Sale.query.filter_by(user_id=user_id).all()
            
            # Convert sales to dictionary format with item details
            sales_data = []
            for sale in sales:
                sale_dict = sale.to_dict()
                
                # Get associated item for additional info
                item = Item.query.get(sale.item_id)
                if item and item.user_id == user_id:  # Additional ownership check
                    # Add item details to sale data
                    images = Image.query.filter_by(item_id=item.id).all()
                    image_filenames = [img.filename for img in images]
                    
                    # Get size information
                    size_info = Size.query.filter_by(item_id=item.id).first()
                    size = size_info.size if size_info else None
                    size_system = size_info.system if size_info else None
                    
                    # Add item details to sale dict
                    sale_dict.update({
                        'itemName': item.product_name,
                        'brand': item.brand,
                        'category': item.category,
                        'purchasePrice': item.purchase_price,
                        'purchaseDate': item.purchase_date.isoformat() if item.purchase_date else None,
                        'images': image_filenames,
                        'size': size,
                        'sizeSystem': size_system
                    })
                else:
                    # Item not found or not owned by user - add minimal info
                    sale_dict.update({
                        'itemName': 'Unknown Item',
                        'brand': 'Unknown',
                        'category': 'Unknown',
                        'purchasePrice': 0,
                        'images': []
                    })
                
                sales_data.append(sale_dict)
            
            logger.info(f"✅ Retrieved {len(sales_data)} sales for user_id: {user_id}")
            return jsonify(sales_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sales: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Create a new sale record
    @app.route('/api/sales', methods=['POST'])
    @require_auth
    def create_sale(user_id):
        """
        Create a new sale record and update item status to 'sold'.
        """
        try:
            logger.info(f"📝 Creating new sale record for user_id: {user_id}")
            data = request.json
            
            # Validate required fields
            required_fields = ['itemId', 'platform', 'saleDate', 'salePrice', 'status']
            for field in required_fields:
                if field not in data:
                    logger.error(f"❌ Missing required field: {field}")
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Check if item exists and belongs to user
            item = Item.query.get(data['itemId'])
            if not item:
                logger.error(f"❌ Item with ID {data['itemId']} not found")
                return jsonify({'error': f'Item with ID {data["itemId"]} not found'}), 404
            
            # Verify ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to create sale for item {item.id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Parse the date string
            try:
                sale_date = datetime.fromisoformat(data['saleDate'].replace('Z', '+00:00'))
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Invalid date format: {data['saleDate']}")
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Create new sale record with user_id
            new_sale = Sale(
                user_id=user_id,
                item_id=data['itemId'],
                platform=data['platform'],
                sale_date=sale_date,
                sale_price=float(data['salePrice']),
                currency=data.get('currency', '$'),
                sales_tax=float(data.get('salesTax', 0) or 0),
                platform_fees=float(data.get('platformFees', 0) or 0),
                status=data['status'],
                sale_id=data.get('saleId', '')
            )
            
            db.session.add(new_sale)
            
            # Update item status to 'sold'
            item.status = 'sold'
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Created new sale record with ID {new_sale.id} for user {user_id}")
            
            # Return the created sale with item details
            sale_dict = new_sale.to_dict()
            sale_dict.update({
                'itemName': item.product_name,
                'brand': item.brand,
                'category': item.category,
                'purchasePrice': item.purchase_price
            })
            
            return jsonify(sale_dict), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating sale for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get single sale with ownership verification
    @app.route('/api/sales/<int:sale_id>', methods=['GET'])
    @require_auth
    def get_sale(user_id, sale_id):
        """
        Get a single sale by ID with ownership verification.
        """
        try:
            logger.info(f"🔍 Fetching sale {sale_id} for user {user_id}")
            
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.warning(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': 'Sale not found'}), 404
            
            # Verify ownership
            if sale.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to access sale {sale_id} belonging to user {sale.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Convert sale to dictionary
            sale_dict = sale.to_dict()
            
            # Get associated item for additional info
            item = Item.query.get(sale.item_id)
            if item and item.user_id == user_id:  # Additional ownership check
                # Add item details
                images = Image.query.filter_by(item_id=item.id).all()
                image_filenames = [img.filename for img in images]
                
                # Get size information
                size_info = Size.query.filter_by(item_id=item.id).first()
                size = size_info.size if size_info else None
                size_system = size_info.system if size_info else None
                
                # Add item details to sale data
                sale_dict.update({
                    'itemName': item.product_name,
                    'brand': item.brand,
                    'category': item.category,
                    'purchasePrice': item.purchase_price,
                    'purchaseDate': item.purchase_date.isoformat() if item.purchase_date else None,
                    'images': image_filenames,
                    'size': size,
                    'sizeSystem': size_system
                })
            
            logger.info(f"✅ Retrieved sale {sale_id} for user {user_id}")
            return jsonify(sale_dict), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update a sale with ownership verification (continued)
    @app.route('/api/sales/<int:sale_id>', methods=['PUT'])
    @require_auth
    def update_sale(user_id, sale_id):
        """
        Update an existing sale record with ownership verification.
        """
        try:
            logger.info(f"📝 Updating sale {sale_id} for user {user_id}")
            data = request.json
            
            # Check if sale exists
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Verify ownership
            if sale.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update sale {sale_id} belonging to user {sale.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Update sale fields if provided
            if 'platform' in data:
                sale.platform = data['platform']
            
            if 'saleDate' in data:
                try:
                    sale_date = datetime.fromisoformat(data['saleDate'].replace('Z', '+00:00'))
                    sale.sale_date = sale_date
                except (ValueError, TypeError) as e:
                    logger.error(f"❌ Invalid date format: {data['saleDate']}")
                    return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            if 'salePrice' in data:
                sale.sale_price = float(data['salePrice'])
            
            if 'currency' in data:
                sale.currency = data['currency']
            
            if 'salesTax' in data:
                sale.sales_tax = float(data['salesTax'] or 0)
            
            if 'platformFees' in data:
                sale.platform_fees = float(data['platformFees'] or 0)
            
            if 'status' in data:
                sale.status = data['status']
            
            if 'saleId' in data:
                sale.sale_id = data['saleId']
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Updated sale {sale_id} for user {user_id}")
            
            # Return the updated sale
            return jsonify(sale.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update a specific field of a sale
    @app.route('/api/sales/<int:sale_id>/field', methods=['PATCH'])
    @require_auth
    def update_sale_field(user_id, sale_id):
        """
        Update a specific field of a sale, verifying user ownership.
        """
        try:
            logger.info(f"🔄 Updating field for sale {sale_id}, user {user_id}")
            data = request.json
            
            # Validate request
            if 'field' not in data or 'value' not in data:
                logger.error("❌ Missing required fields: field and value")
                return jsonify({'error': 'Missing required fields: field and value'}), 400
            
            field = data['field']
            value = data['value']
            
            # Check if sale exists
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Verify ownership
            if sale.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update sale {sale_id} belonging to user {sale.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Update the specific field
            if field == 'status':
                # Validate status
                valid_statuses = ['pending', 'needsShipping', 'completed']
                if value not in valid_statuses:
                    logger.error(f"❌ Invalid status value: {value}")
                    return jsonify({'error': f'Invalid status value. Must be one of: {", ".join(valid_statuses)}'}), 400
                sale.status = value
            elif field == 'platform':
                sale.platform = value
            elif field == 'salePrice':
                try:
                    sale.sale_price = float(value)
                except ValueError:
                    return jsonify({'error': 'Invalid sale price value'}), 400
            elif field == 'currency':
                sale.currency = value
            elif field == 'salesTax':
                try:
                    sale.sales_tax = float(value or 0)
                except ValueError:
                    return jsonify({'error': 'Invalid sales tax value'}), 400
            elif field == 'platformFees':
                try:
                    sale.platform_fees = float(value or 0)
                except ValueError:
                    return jsonify({'error': 'Invalid platform fees value'}), 400
            elif field == 'saleId':
                sale.sale_id = value
            elif field == 'saleDate':
                try:
                    sale_date = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    sale.sale_date = sale_date
                except (ValueError, TypeError):
                    return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            else:
                logger.error(f"❌ Invalid field name: {field}")
                return jsonify({'error': f'Invalid field name: {field}'}), 400
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Updated {field} for sale {sale_id} for user {user_id}")
            
            # Return success message
            return jsonify({
                'message': f'Field {field} updated successfully',
                'id': sale_id,
                'field': field,
                'value': value
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating field for sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Delete a sale with ownership verification
    @app.route('/api/sales/<int:sale_id>', methods=['DELETE'])
    @require_auth
    def delete_sale(user_id, sale_id):
        """
        Delete a sale record with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting sale {sale_id} for user {user_id}")
            
            # Check if sale exists
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Verify ownership
            if sale.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to delete sale {sale_id} belonging to user {sale.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Get the item ID for potential status update
            item_id = sale.item_id
            
            # Delete the sale
            db.session.delete(sale)
            
            # Check if this was the only sale for the item
            remaining_sales = Sale.query.filter_by(item_id=item_id, user_id=user_id).count()
            
            # If no other sales for this item, update item status back to 'unlisted'
            if remaining_sales == 0:
                item = Item.query.get(item_id)
                if item and item.user_id == user_id and item.status == 'sold':
                    item.status = 'unlisted'
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Deleted sale {sale_id} for user {user_id}")
            
            return jsonify({
                'message': f'Sale {sale_id} deleted successfully',
                'item_id': item_id
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get sales by item ID with user ownership verification
    @app.route('/api/items/<int:item_id>/sales', methods=['GET'])
    @require_auth
    def get_sales_by_item(user_id, item_id):
        """
        Get all sales for a specific item with ownership verification.
        """
        try:
            logger.info(f"📊 Fetching sales for item {item_id}, user {user_id}")
            
            # Check if the item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Verify ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to access sales for item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Get all sales for this item
            sales = Sale.query.filter_by(item_id=item_id, user_id=user_id).all()
            
            # Convert to dictionary format
            sales_data = [sale.to_dict() for sale in sales]
            
            logger.info(f"✅ Retrieved {len(sales_data)} sales for item {item_id}, user {user_id}")
            return jsonify(sales_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sales for item {item_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # EXPENSES API ENDPOINTS
    @app.route('/api/expenses', methods=['GET'])
    @require_auth
    def get_expenses(user_id):
        """
        Get all expenses for the current user.
        """
        try:
            logger.info(f"📋 Fetching expenses for user {user_id}")
            expenses = Expense.query.filter_by(user_id=user_id).order_by(Expense.expense_date.desc()).all()
            return jsonify([expense.to_dict() for expense in expenses])
        except Exception as e:
            logger.error(f"💥 Error fetching expenses for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses', methods=['POST'])
    @require_auth
    def create_expense(user_id):
        """
        Create a new expense record for the current user.
        """
        try:
            logger.info(f"📝 Creating new expense record for user {user_id}")
            
            # Check if we have file data and form data
            has_receipt = 'receipt' in request.files
            has_data = 'data' in request.form
            
            if not has_data:
                logger.error("❌ No expense data provided")
                return jsonify({'error': 'Missing expense data'}), 400
            
            # Parse the JSON data
            expense_data = json.loads(request.form.get('data'))
            
            # Validate required fields
            required_fields = ['expenseType', 'amount', 'expenseDate']
            for field in required_fields:
                if field not in expense_data:
                    logger.error(f"❌ Missing required field: {field}")
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Parse date
            try:
                expense_date = datetime.fromisoformat(expense_data['expenseDate'].replace('Z', '+00:00'))
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Invalid date format: {expense_data['expenseDate']}")
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Handle receipt file if provided
            receipt_filename = None
            if has_receipt:
                receipt_file = request.files['receipt']
                if receipt_file and allowed_file(receipt_file.filename):
                    # Generate a secure filename with timestamp and user_id
                    filename = secure_filename(receipt_file.filename)
                    filename_parts = filename.rsplit('.', 1)
                    timestamped_filename = f"receipt_{int(time.time())}_{user_id}_{filename_parts[0]}.{filename_parts[1]}"
                    
                    # Create user-specific directory
                    user_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
                    if not os.path.exists(user_upload_folder):
                        os.makedirs(user_upload_folder)
                    
                    # Save the file
                    file_path = os.path.join(user_upload_folder, timestamped_filename)
                    receipt_file.save(file_path)
                    receipt_filename = timestamped_filename
                    logger.info(f"📄 Saved receipt: {timestamped_filename} for user {user_id}")
            
            # Create the expense record with user_id
            new_expense = Expense(
                user_id=user_id,
                expense_type=expense_data['expenseType'],
                amount=float(expense_data['amount']),
                currency=expense_data.get('currency', '$'),
                expense_date=expense_date,
                vendor=expense_data.get('vendor', ''),
                notes=expense_data.get('notes', ''),
                receipt_filename=receipt_filename,
                is_recurring=expense_data.get('isRecurring', False),
                recurrence_period=expense_data.get('recurrencePeriod', None)
            )
            
            db.session.add(new_expense)
            db.session.flush()  # Get the ID without committing
            
            # Commit the transaction
            db.session.commit()
            
            logger.info(f"✅ Created expense with ID {new_expense.id} for user {user_id}")
            return jsonify(new_expense.to_dict()), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating expense for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['GET'])
    @require_auth
    def get_expense(user_id, expense_id):
        """
        Get a single expense by ID with ownership verification.
        """
        try:
            logger.info(f"🔍 Fetching expense {expense_id} for user {user_id}")
            
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.warning(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': 'Expense not found'}), 404
            
            # Verify ownership
            if expense.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to access expense {expense_id} belonging to user {expense.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            logger.info(f"✅ Retrieved expense {expense_id} for user {user_id}")
            return jsonify(expense.to_dict()), 200
        except Exception as e:
            logger.error(f"💥 Error fetching expense {expense_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
    @require_auth
    def update_expense(user_id, expense_id):
        """
        Update an existing expense with ownership verification.
        """
        try:
            logger.info(f"🔄 Updating expense {expense_id} for user {user_id}")
            
            # Check if expense exists
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
            # Verify ownership
            if expense.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update expense {expense_id} belonging to user {expense.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Check if we have file data and form data
            has_receipt = 'receipt' in request.files
            has_data = 'data' in request.form
            
            if not has_data:
                logger.error("❌ No expense data provided")
                return jsonify({'error': 'Missing expense data'}), 400
            
            # Parse the JSON data
            expense_data = json.loads(request.form.get('data'))
            
            # Update expense fields
            if 'expenseType' in expense_data:
                expense.expense_type = expense_data['expenseType']
            
            if 'amount' in expense_data:
                expense.amount = float(expense_data['amount'])
            
            if 'currency' in expense_data:
                expense.currency = expense_data['currency']
            
            if 'expenseDate' in expense_data:
                try:
                    expense_date = datetime.fromisoformat(expense_data['expenseDate'].replace('Z', '+00:00'))
                    expense.expense_date = expense_date
                except (ValueError, TypeError) as e:
                    logger.error(f"❌ Invalid date format: {expense_data['expenseDate']}")
                    return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            if 'vendor' in expense_data:
                expense.vendor = expense_data['vendor']
            
            if 'notes' in expense_data:
                expense.notes = expense_data['notes']
            
            if 'isRecurring' in expense_data:
                expense.is_recurring = expense_data['isRecurring']
            
            if 'recurrencePeriod' in expense_data:
                expense.recurrence_period = expense_data['recurrencePeriod']
            
            # Handle receipt file if provided
            if has_receipt:
                receipt_file = request.files['receipt']
                if receipt_file and allowed_file(receipt_file.filename):
                    # Delete old receipt if it exists
                    if expense.receipt_filename:
                        old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_id, expense.receipt_filename)
                        if os.path.exists(old_file_path):
                            os.remove(old_file_path)
                            logger.info(f"🗑️ Deleted old receipt: {expense.receipt_filename} for user {user_id}")
                    
                    # Generate a secure filename with timestamp and user_id
                    filename = secure_filename(receipt_file.filename)
                    filename_parts = filename.rsplit('.', 1)
                    timestamped_filename = f"receipt_{int(time.time())}_{user_id}_{filename_parts[0]}.{filename_parts[1]}"
                    
                    # Create user-specific directory
                    user_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
                    if not os.path.exists(user_upload_folder):
                        os.makedirs(user_upload_folder)
                    
                    # Save the file
                    file_path = os.path.join(user_upload_folder, timestamped_filename)
                    receipt_file.save(file_path)
                    expense.receipt_filename = timestamped_filename
                    logger.info(f"📄 Updated receipt: {timestamped_filename} for user {user_id}")
            
            # Update timestamp
            expense.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"✅ Updated expense {expense_id} for user {user_id}")
            return jsonify(expense.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating expense {expense_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
    @require_auth
    def delete_expense(user_id, expense_id):
        """
        Delete an expense record with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting expense {expense_id} for user {user_id}")
            
            # Check if expense exists
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
            # Verify ownership
            if expense.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to delete expense {expense_id} belonging to user {expense.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Delete receipt file if it exists
            if expense.receipt_filename:
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_id, expense.receipt_filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ Deleted receipt file: {expense.receipt_filename} for user {user_id}")
            
            # Delete the expense record
            db.session.delete(expense)
            db.session.commit()
            
            logger.info(f"✅ Deleted expense {expense_id} for user {user_id}")
            return jsonify({'message': f'Expense {expense_id} deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting expense {expense_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/summary', methods=['GET'])
    @require_auth
    def get_expense_summary(user_id):
        """
        Get expense summary statistics for the current user.
        """
        try:
            logger.info(f"📊 Generating expense summary for user {user_id}")
            
            # Get query parameters for date filtering
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            # Base query for user's expenses
            query = Expense.query.filter_by(user_id=user_id)
            
            # Apply date filters if provided
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date >= start_date)
                except ValueError:
                    logger.warning(f"❌ Invalid start date format: {start_date_str}")
            
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date <= end_date)
                except ValueError:
                    logger.warning(f"❌ Invalid end date format: {end_date_str}")
            
            # Get all expenses matching the query
            expenses = query.all()
            
            # Calculate summary statistics
            total_amount = sum(expense.amount for expense in expenses)
            expense_count = len(expenses)
            
            # Group expenses by type
            expense_by_type = {}
            for expense in expenses:
                expense_type = expense.expense_type
                if expense_type not in expense_by_type:
                    expense_by_type[expense_type] = 0
                expense_by_type[expense_type] += expense.amount
            
            # Calculate month-over-month change if possible
            current_month_total = 0
            previous_month_total = 0
            
            if start_date_str and end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    
                    # Calculate current period expenses
                    current_month_expenses = Expense.query.filter(
                        Expense.user_id == user_id,
                        Expense.expense_date >= start_date,
                        Expense.expense_date <= end_date
                    ).all()
                    current_month_total = sum(expense.amount for expense in current_month_expenses)
                    
                    # Calculate previous period range
                    month_diff = (end_date - start_date).days
                    prev_end_date = start_date
                    prev_start_date = prev_end_date - timedelta(days=month_diff)
                    
                    # Calculate previous period expenses
                    previous_month_expenses = Expense.query.filter(
                        Expense.user_id == user_id,
                        Expense.expense_date >= prev_start_date,
                        Expense.expense_date < prev_end_date
                    ).all()
                    previous_month_total = sum(expense.amount for expense in previous_month_expenses)
                except ValueError:
                    logger.warning("❌ Invalid date format for month-over-month calculation")
            
            # Calculate month-over-month percentage change
            mom_change = 0
            if previous_month_total > 0:
                mom_change = ((current_month_total - previous_month_total) / previous_month_total) * 100
            
            # Prepare the summary response
            summary = {
                'totalAmount': total_amount,
                'expenseCount': expense_count,
                'expenseByType': expense_by_type,
                'monthOverMonthChange': mom_change
            }
            
            logger.info(f"✅ Generated expense summary with {expense_count} expenses for user {user_id}")
            return jsonify(summary), 200
        except Exception as e:
            logger.error(f"💥 Error generating expense summary for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # COPLISTS API ENDPOINTS
    @app.route('/api/coplists', methods=['GET'])
    @require_auth
    def get_coplists(user_id):
        """
        Get all coplists for the current user.
        """
        try:
            logger.info(f"📋 Fetching coplists for user {user_id}")
            coplists = Coplist.query.filter_by(user_id=user_id).all()
            return jsonify([coplist.to_dict() for coplist in coplists]), 200
        except Exception as e:
            logger.error(f"💥 Error fetching coplists for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists', methods=['POST'])
    @require_auth
    def create_coplist(user_id):
        """
        Create a new coplist for the current user.
        """
        try:
            logger.info(f"📝 Creating new coplist for user {user_id}")
            data = request.json
            
            # Validate required fields
            if not data or 'name' not in data:
                logger.error("❌ Missing required field: name")
                return jsonify({'error': 'Missing required field: name'}), 400
            
            # Create new coplist
            new_coplist = Coplist(
                user_id=user_id,
                name=data['name'],
                description=data.get('description', ''),
                is_private=data.get('is_private', True)
            )
            
            db.session.add(new_coplist)
            db.session.commit()
            
            logger.info(f"✅ Created coplist with ID {new_coplist.id} for user {user_id}")
            return jsonify(new_coplist.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating coplist for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists/<int:coplist_id>', methods=['GET'])
    @require_auth
    def get_coplist(user_id, coplist_id):
        """
        Get a single coplist by ID with ownership verification.
        """
        try:
            logger.info(f"🔍 Fetching coplist {coplist_id} for user {user_id}")
            
            coplist = Coplist.query.get(coplist_id)
            if not coplist:
                logger.warning(f"❌ Coplist with ID {coplist_id} not found")
                return jsonify({'error': 'Coplist not found'}), 404
            
            # Verify ownership or public access
            if coplist.user_id != user_id and coplist.is_private:
                logger.warning(f"🚫 User {user_id} attempted to access private coplist {coplist_id} belonging to user {coplist.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Get detailed coplist with items
            coplist_data = coplist.to_dict()
            
            # Add items details
            items_data = []
            for item in coplist.items:
                # Only include basic item details
                item_data = {
                    'id': item.id,
                    'productName': item.product_name,
                    'brand': item.brand,
                    'category': item.category,
                    'status': item.status
                }
                
                # Include image if available
                images = Image.query.filter_by(item_id=item.id).all()
                if images:
                    item_data['imageUrl'] = images[0].filename
                    
                items_data.append(item_data)
                
            coplist_data['items'] = items_data
            
            logger.info(f"✅ Retrieved coplist {coplist_id} with {len(items_data)} items")
            return jsonify(coplist_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching coplist {coplist_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists/<int:coplist_id>', methods=['PUT'])
    @require_auth
    def update_coplist(user_id, coplist_id):
        """
        Update an existing coplist with ownership verification.
        """
        try:
            logger.info(f"🔄 Updating coplist {coplist_id} for user {user_id}")
            data = request.json
            
            # Validate request
            if not data:
                logger.error("❌ No data provided")
                return jsonify({'error': 'No data provided'}), 400
            
            # Check if coplist exists
            coplist = Coplist.query.get(coplist_id)
            if not coplist:
                logger.error(f"❌ Coplist with ID {coplist_id} not found")
                return jsonify({'error': 'Coplist not found'}), 404
            
            # Verify ownership
            if coplist.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update coplist {coplist_id} belonging to user {coplist.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Update coplist fields
            if 'name' in data:
                coplist.name = data['name']
            
            if 'description' in data:
                coplist.description = data['description']
            
            if 'is_private' in data:
                coplist.is_private = data['is_private']
            
            # Update items if provided
            if 'items' in data and isinstance(data['items'], list):
                # Clear existing items
                coplist.items = []
                
                # Add each item, verifying ownership
                for item_id in data['items']:
                    item = Item.query.get(item_id)
                    if item and item.user_id == user_id:
                        coplist.items.append(item)
                    else:
                        logger.warning(f"⚠️ Item {item_id} not found or not owned by user {user_id}, skipping")
            
            # Update timestamps
            coplist.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"✅ Updated coplist {coplist_id} for user {user_id}")
            return jsonify(coplist.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating coplist {coplist_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists/<int:coplist_id>/items/<int:item_id>', methods=['POST'])
    @require_auth
    def add_item_to_coplist(user_id, coplist_id, item_id):
        """
        Add an item to a coplist with ownership verification for both.
        """
        try:
            logger.info(f"🔄 Adding item {item_id} to coplist {coplist_id} for user {user_id}")
            
            # Check if coplist exists
            coplist = Coplist.query.get(coplist_id)
            if not coplist:
                logger.error(f"❌ Coplist with ID {coplist_id} not found")
                return jsonify({'error': 'Coplist not found'}), 404
            
            # Verify coplist ownership
            if coplist.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to modify coplist {coplist_id} belonging to user {coplist.user_id}")
                return jsonify({'error': 'Unauthorized access to coplist'}), 403
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': 'Item not found'}), 404
            
            # Verify item ownership
            if item.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to add item {item_id} belonging to user {item.user_id}")
                return jsonify({'error': 'Unauthorized access to item'}), 403
            
            # Check if item is already in the coplist
            if item in coplist.items:
                logger.info(f"⚠️ Item {item_id} is already in coplist {coplist_id}")
                return jsonify({'message': 'Item is already in the coplist'}), 200
            
            # Add item to coplist
            coplist.items.append(item)
            db.session.commit()
            
            logger.info(f"✅ Added item {item_id} to coplist {coplist_id}")
            return jsonify({'message': f'Item {item_id} added to coplist {coplist_id}'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error adding item to coplist: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists/<int:coplist_id>/items/<int:item_id>', methods=['DELETE'])
    @require_auth
    def remove_item_from_coplist(user_id, coplist_id, item_id):
        """
        Remove an item from a coplist with ownership verification.
        """
        try:
            logger.info(f"🔄 Removing item {item_id} from coplist {coplist_id} for user {user_id}")
            
            # Check if coplist exists
            coplist = Coplist.query.get(coplist_id)
            if not coplist:
                logger.error(f"❌ Coplist with ID {coplist_id} not found")
                return jsonify({'error': 'Coplist not found'}), 404
            
            # Verify coplist ownership
            if coplist.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to modify coplist {coplist_id} belonging to user {coplist.user_id}")
                return jsonify({'error': 'Unauthorized access to coplist'}), 403
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': 'Item not found'}), 404
            
            # Check if item is in the coplist
            if item not in coplist.items:
                logger.info(f"⚠️ Item {item_id} is not in coplist {coplist_id}")
                return jsonify({'message': 'Item is not in the coplist'}), 200
            
            # Remove item from coplist
            coplist.items.remove(item)
            db.session.commit()
            
            logger.info(f"✅ Removed item {item_id} from coplist {coplist_id}")
            return jsonify({'message': f'Item {item_id} removed from coplist {coplist_id}'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error removing item from coplist: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/coplists/<int:coplist_id>', methods=['DELETE'])
    @require_auth
    def delete_coplist(user_id, coplist_id):
        """
        Delete a coplist with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting coplist {coplist_id} for user {user_id}")
            
            # Check if coplist exists
            coplist = Coplist.query.get(coplist_id)
            if not coplist:
                logger.error(f"❌ Coplist with ID {coplist_id} not found")
                return jsonify({'error': 'Coplist not found'}), 404
            
            # Verify ownership
            if coplist.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to delete coplist {coplist_id} belonging to user {coplist.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Delete the coplist (association table entries are deleted automatically)
            db.session.delete(coplist)
            db.session.commit()
            
            logger.info(f"✅ Deleted coplist {coplist_id}")
            return jsonify({'message': f'Coplist {coplist_id} deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting coplist {coplist_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # TAGS API WITH USER OWNERSHIP
    @app.route('/api/user-tags', methods=['GET'])
    @require_auth
    def get_user_tags(user_id):
        """
        Get all tags for the current user.
        """
        try:
            logger.info(f"📋 Fetching tags for user {user_id}")
            tags = Tag.query.filter_by(user_id=user_id).all()
            
            logger.info(f"✅ Retrieved {len(tags)} tags for user {user_id}")
            return jsonify([tag.to_dict() for tag in tags]), 200
        except Exception as e:
            logger.error(f"💥 Error fetching tags for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags', methods=['POST'])
    @require_auth
    def create_user_tag(user_id):
        """
        Create a new tag for the current user.
        """
        try:
            logger.info(f"🏷️ Creating new tag for user {user_id}")
            data = request.json
            
            # Validate request
            if not data or 'name' not in data:
                logger.error("❌ Missing required field: name")
                return jsonify({'error': 'Missing required field: name'}), 400
            
            # Check for duplicate tag name for this user
            existing_tag = Tag.query.filter_by(user_id=user_id, name=data['name']).first()
            if existing_tag:
                logger.error(f"❌ Tag with name '{data['name']}' already exists for user {user_id}")
                return jsonify({'error': f"Tag with name '{data['name']}' already exists"}), 400
            
            # Create new tag with user_id
            new_tag = Tag(
                name=data['name'],
                color=data.get('color', '#8884d8'),  # Default color if not provided
                user_id=user_id
            )
            
            db.session.add(new_tag)
            db.session.commit()
            
            logger.info(f"✅ Created tag '{data['name']}' with ID {new_tag.id} for user {user_id}")
            return jsonify(new_tag.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating tag for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags/<int:tag_id>', methods=['PUT'])
    @require_auth
    def update_user_tag(user_id, tag_id):
        """
        Update an existing tag with ownership verification.
        """
        try:
            logger.info(f"🔄 Updating tag {tag_id} for user {user_id}")
            data = request.json
            
            # Validate request
            if not data or ('name' not in data and 'color' not in data):
                logger.error("❌ Missing required fields: name or color")
                return jsonify({'error': 'Missing required fields: name or color'}), 400
            
            # Check if tag exists
            tag = Tag.query.get(tag_id)
            if not tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': 'Tag not found'}), 404
            
            # Verify ownership
            if tag.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to update tag {tag_id} belonging to user {tag.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Check for duplicate tag name if name is being changed
            if 'name' in data and data['name'] != tag.name:
                existing_tag = Tag.query.filter_by(user_id=user_id, name=data['name']).first()
                if existing_tag:
                    logger.error(f"❌ Tag with name '{data['name']}' already exists for user {user_id}")
                    return jsonify({'error': f"Tag with name '{data['name']}' already exists"}), 400
            
            # Update tag fields
            if 'name' in data:
                tag.name = data['name']
            
            if 'color' in data:
                tag.color = data['color']
            
            db.session.commit()
            
            logger.info(f"✅ Updated tag {tag_id} for user {user_id}")
            return jsonify(tag.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating tag {tag_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags/<int:tag_id>', methods=['DELETE'])
    @require_auth
    def delete_user_tag(user_id, tag_id):
        """
        Delete a tag with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting tag {tag_id} for user {user_id}")
            
            # Check if tag exists
            tag = Tag.query.get(tag_id)
            if not tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': 'Tag not found'}), 404
            
            # Verify ownership
            if tag.user_id != user_id:
                logger.warning(f"🚫 User {user_id} attempted to delete tag {tag_id} belonging to user {tag.user_id}")
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Remove tag from all items first
            for item in tag.items:
                if tag in item.tags:
                    item.tags.remove(tag)
            
            # Flush the session to ensure the item-tag relationships are updated
            db.session.flush()
            
            # Delete tag
            db.session.delete(tag)
            db.session.commit()
            
            logger.info(f"✅ Deleted tag {tag_id} for user {user_id}")
            return jsonify({'message': f'Tag {tag_id} deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting tag {tag_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # DASHBOARD API ENDPOINTS
    @app.route('/api/dashboard/kpi-metrics', methods=['GET'])
    @require_auth
    def get_dashboard_kpi_metrics(user_id):
        """
        Get comprehensive dashboard KPI metrics for the current user.
        """
        try:
            logger.info(f"📊 Generating comprehensive dashboard KPI metrics for user {user_id}")
            
            # Get query parameters for date filtering
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            # Initialize date objects to None
            start_date = None
            end_date = None
            
            # Parse start date if provided
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                except ValueError:
                    logger.warning(f"⚠️ Invalid start date format: {start_date_str}")
            
            # Parse end date if provided
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                except ValueError:
                    logger.warning(f"⚠️ Invalid end date format: {end_date_str}")
            
            # ---- ITEM METRICS ----
            # Get active items (not sold)
            active_items_query = Item.query.filter(Item.status != 'sold', Item.user_id == user_id)
            
            # Apply date filters if provided
            if start_date:
                active_items_query = active_items_query.filter(Item.purchase_date >= start_date)
            if end_date:
                active_items_query = active_items_query.filter(Item.purchase_date <= end_date)
            
            active_items = active_items_query.all()
            
            # Count items by status
            total_inventory = len(active_items)
            unlisted_items = len([item for item in active_items if item.status == 'unlisted'])
            listed_items = len([item for item in active_items if item.status == 'listed'])
            
            # Calculate inventory values
            total_inventory_cost = sum(item.purchase_price for item in active_items)
            total_shipping_cost = sum(item.shipping_price or 0 for item in active_items)
            
            # Estimate market value
            total_market_value = sum(
                item.market_price if item.market_price else (item.purchase_price * 1.2)
                for item in active_items
            )
            
            # Estimate potential profit
            potential_profit = total_market_value - total_inventory_cost - total_shipping_cost
            
            # ---- SALES METRICS ----
            # Get completed sales for this user
            sales_query = Sale.query.filter(Sale.status == 'completed', Sale.user_id == user_id)
            
            # Apply date filters if provided
            if start_date:
                sales_query = sales_query.filter(Sale.sale_date >= start_date)
            if end_date:
                sales_query = sales_query.filter(Sale.sale_date <= end_date)
            
            sales = sales_query.all()
            
            # Calculate sales metrics
            total_sales = len(sales)
            total_sales_revenue = sum(sale.sale_price for sale in sales)
            total_platform_fees = sum(sale.platform_fees or 0 for sale in sales)
            total_sales_tax = sum(sale.sales_tax or 0 for sale in sales)
            
            # Calculate cost basis of sold items
            cost_of_goods_sold = 0
            sold_items_shipping_cost = 0
            
            for sale in sales:
                item = Item.query.get(sale.item_id)
                if item and item.user_id == user_id:  # Verify ownership
                    cost_of_goods_sold += item.purchase_price
                    sold_items_shipping_cost += (item.shipping_price or 0)
            
            # Calculate gross profit from sales
            gross_profit = (
                total_sales_revenue 
                - cost_of_goods_sold 
                - total_platform_fees 
                - total_sales_tax 
                - sold_items_shipping_cost
            )
            
            # ---- EXPENSE METRICS ----
            # Get expenses for this user
            expense_query = Expense.query.filter_by(user_id=user_id)
            
            # Apply date filters if provided
            if start_date:
                expense_query = expense_query.filter(Expense.expense_date >= start_date)
            if end_date:
                expense_query = expense_query.filter(Expense.expense_date <= end_date)
            
            expenses = expense_query.all()
            
            # Calculate expense metrics
            total_expenses = sum(expense.amount for expense in expenses)
            
            # Group expenses by type
            expense_by_type = {}
            for expense in expenses:
                expense_type = expense.expense_type
                if expense_type not in expense_by_type:
                    expense_by_type[expense_type] = 0
                expense_by_type[expense_type] += expense.amount
            
            # ---- NET PROFIT AND ROI ----
            # Net profit from sold items (realized profit)
            net_profit_sold = gross_profit - total_expenses
            
            # Calculate ROI for sold items
            roi_sold = (net_profit_sold / cost_of_goods_sold * 100) if cost_of_goods_sold > 0 else 0
            
            # Calculate ROI for potential profit (inventory)
            roi_inventory = (potential_profit / total_inventory_cost * 100) if total_inventory_cost > 0 else 0
            
            # Calculate overall ROI
            total_investment = total_inventory_cost + cost_of_goods_sold
            total_profit = potential_profit + net_profit_sold
            overall_roi = (total_profit / total_investment * 100) if total_investment > 0 else 0
            
            # ---- PERIOD COMPARISON ----
            # Variables for comparison metrics
            net_profit_change = 0
            roi_change = 0
            expense_change = 0
            revenue_change = 0
            
            if start_date and end_date:
                # Calculate the duration of the current period
                period_duration = (end_date - start_date).days
                
                # Define previous period date range
                prev_end_date = start_date
                prev_start_date = prev_end_date - timedelta(days=period_duration)
                
                logger.info(f"🗓️ Previous period: {prev_start_date} to {prev_end_date}")
                
                # --- PREVIOUS PERIOD SALES ---
                prev_sales_query = Sale.query.filter(
                    Sale.status == 'completed',
                    Sale.user_id == user_id,
                    Sale.sale_date >= prev_start_date,
                    Sale.sale_date < prev_end_date
                )
                prev_sales = prev_sales_query.all()
                
                prev_total_sales_revenue = sum(sale.sale_price for sale in prev_sales)
                prev_total_platform_fees = sum(sale.platform_fees or 0 for sale in prev_sales)
                prev_total_sales_tax = sum(sale.sales_tax or 0 for sale in prev_sales)
                
                prev_cost_of_goods_sold = 0
                prev_sold_items_shipping_cost = 0
                
                for sale in prev_sales:
                    item = Item.query.get(sale.item_id)
                    if item and item.user_id == user_id:  # Verify ownership
                        prev_cost_of_goods_sold += item.purchase_price
                        prev_sold_items_shipping_cost += (item.shipping_price or 0)
                
                prev_gross_profit = (
                    prev_total_sales_revenue 
                    - prev_cost_of_goods_sold 
                    - prev_total_platform_fees 
                    - prev_total_sales_tax 
                    - prev_sold_items_shipping_cost
                )
                
                # --- PREVIOUS PERIOD EXPENSES ---
                prev_expense_query = Expense.query.filter(
                    Expense.user_id == user_id,
                    Expense.expense_date >= prev_start_date,
                    Expense.expense_date < prev_end_date
                )
                prev_expenses = prev_expense_query.all()
                
                prev_total_expenses = sum(expense.amount for expense in prev_expenses)
                
                # --- PREVIOUS PERIOD NET PROFIT ---
                prev_net_profit_sold = prev_gross_profit - prev_total_expenses
                
                # --- PREVIOUS PERIOD ROI ---
                prev_roi_sold = (prev_net_profit_sold / prev_cost_of_goods_sold * 100) if prev_cost_of_goods_sold > 0 else 0
                
                # --- CALCULATE CHANGES ---
                # Net profit change
                if prev_net_profit_sold != 0:
                    net_profit_change = ((net_profit_sold - prev_net_profit_sold) / abs(prev_net_profit_sold)) * 100
                else:
                    net_profit_change = 100 if net_profit_sold > 0 else -100 if net_profit_sold < 0 else 0
                
                # ROI change
                if prev_roi_sold != 0:
                    roi_change = roi_sold - prev_roi_sold
                else:
                    roi_change = roi_sold
                
                # Expense change
                if prev_total_expenses != 0:
                    expense_change = ((total_expenses - prev_total_expenses) / prev_total_expenses) * 100
                else:
                    expense_change = 100 if total_expenses > 0 else 0
                
                # Revenue change
                if prev_total_sales_revenue != 0:
                    revenue_change = ((total_sales_revenue - prev_total_sales_revenue) / prev_total_sales_revenue) * 100
                else:
                    revenue_change = 100 if total_sales_revenue > 0 else 0
            
            # Compile the comprehensive metrics response
            metrics = {
                # Inventory metrics
                'inventoryMetrics': {
                    'totalInventory': total_inventory,
                    'unlistedItems': unlisted_items,
                    'listedItems': listed_items,
                    'totalInventoryCost': total_inventory_cost,
                    'totalShippingCost': total_shipping_cost,
                    'totalMarketValue': total_market_value,
                    'potentialProfit': potential_profit
                },
                
                # Sales metrics
                'salesMetrics': {
                    'totalSales': total_sales,
                    'totalSalesRevenue': total_sales_revenue,
                    'totalPlatformFees': total_platform_fees,
                    'totalSalesTax': total_sales_tax,
                    'costOfGoodsSold': cost_of_goods_sold,
                    'grossProfit': gross_profit,
                    'revenueChange': revenue_change
                },
                
                # Expense metrics
                'expenseMetrics': {
                    'totalExpenses': total_expenses,
                    'expenseByType': expense_by_type,
                    'expenseChange': expense_change
                },
                
                # Profit and ROI metrics
                'profitMetrics': {
                    'netProfitSold': net_profit_sold,
                    'netProfitChange': net_profit_change,
                    'potentialProfit': potential_profit,
                    'roiSold': roi_sold,
                    'roiInventory': roi_inventory,
                    'overallRoi': overall_roi,
                    'roiChange': roi_change
                }
            }
            
            logger.info(f"✅ Generated comprehensive dashboard KPI metrics for user {user_id}")
            return jsonify(metrics), 200
        except Exception as e:
            logger.error(f"💥 Error generating dashboard KPI metrics for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Serve uploaded images with user verification
    @app.route('/api/uploads/<path:filename>')
    @require_auth
    def serve_user_image(user_id, filename):
        """
        Serve uploaded images with ownership verification.
        """
        try:
            image_logger.info(f"📷 Image request for: {filename} by user {user_id}")
            
            # Check if it's a receipt file (which will have user_id in the filename)
            if filename.startswith('receipt_'):
                # Extract user_id from filename (format: receipt_timestamp_user_id_filename.ext)
                parts = filename.split('_')
                if len(parts) >= 3:
                    file_user_id = parts[2]
                    
                    # Verify ownership
                    if file_user_id != user_id:
                        image_logger.warning(f"🚫 User {user_id} attempted to access receipt {filename} belonging to user {file_user_id}")
                        return jsonify({'error': 'Unauthorized access'}), 403
                    
                    # Serve the file from user's subfolder
                    image_logger.info(f"✅ Serving receipt: {filename} for user {user_id}")
                    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], user_id), filename)
            
            # Get the user's subfolder
            user_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)
            
            # Check if file exists in user's folder
            if os.path.exists(os.path.join(user_upload_folder, filename)):
                image_logger.info(f"✅ Serving image: {filename} from user {user_id}'s folder")
                return send_from_directory(user_upload_folder, filename)
            
            # If not found in user's folder, check if this is an older image before migration
            if os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], filename)):
                # For backward compatibility - allow access to files in root uploads folder
                image_logger.info(f"✅ Serving image: {filename} from root uploads folder (legacy)")
                return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
            
            # File not found in either location
            image_logger.warning(f"🔍 Requested image not found: {filename}")
            return jsonify({'error': 'Image not found'}), 404
        except Exception as e:
            image_logger.error(f"💥 Error serving image {filename}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Check if image exists (continued)
    @app.route('/api/check-image/<filename>')
    @require_auth
    def check_user_image(user_id, filename):
        """
        Check if an image exists in the user's uploads directory.
        """
        try:
            image_logger.info(f"Image check request for: {filename} by user {user_id}")
            
            # Check user's subfolder first
            user_filepath = os.path.join(app.config['UPLOAD_FOLDER'], user_id, filename)
            if os.path.exists(user_filepath):
                stats = os.stat(user_filepath)
                image_logger.info(f"✅ Image check: {filename} exists in user {user_id}'s folder, size: {stats.st_size} bytes")
                return jsonify({
                    'exists': True,
                    'filename': filename,
                    'filepath': user_filepath,
                    'size': stats.st_size,
                    'created': stats.st_ctime,
                    'permissions': oct(stats.st_mode)[-3:]
                }), 200
            
            # For backward compatibility, check root uploads folder
            root_filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(root_filepath):
                stats = os.stat(root_filepath)
                image_logger.info(f"✅ Image check: {filename} exists in root folder (legacy), size: {stats.st_size} bytes")
                return jsonify({
                    'exists': True,
                    'filename': filename,
                    'filepath': root_filepath,
                    'size': stats.st_size,
                    'created': stats.st_ctime,
                    'permissions': oct(stats.st_mode)[-3:]
                }), 200
            
            # File not found in either location
            # Log the complete uploads directory to help troubleshoot
            try:
                user_files = os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], user_id)) if os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], user_id)) else []
                root_files = os.listdir(app.config['UPLOAD_FOLDER'])
                image_logger.warning(f"❌ File not found: {filename}, available files in user dir: {user_files[:10]}, root dir: {root_files[:10]}")
            except Exception as dir_err:
                image_logger.error(f"🚫 Error listing directory: {str(dir_err)}")
            
            return jsonify({
                'exists': False,
                'filename': filename,
                'attempted_paths': [user_filepath, root_filepath]
            }), 404
        except Exception as e:
            image_logger.error(f"💥 Error checking image {filename}: {str(e)}")
            return jsonify({'error': str(e)}), 500

        @app.before_request
        def log_request_info():
            logger.debug('Headers: %s', request.headers)
            logger.debug('Body: %s', request.get_data())

        return app


    app = create_app()

    @app.shell_context_processor
    def make_shell_context():
        return {
            'db': db, 
            'Item': Item, 
            'Size': Size, 
            'Image': Image, 
            'Tag': Tag, 
            'Sale': Sale, 
            'Expense': Expense,
            'Coplist': Coplist,
            'UserSettings': UserSettings
        }

    if __name__ == '__main__':
        logger = logging.getLogger(__name__)
        logger.info(f"🚀 Starting Flask application on http://127.0.0.1:5000")
        logger.info(f"📁 Upload directory: {app.config['UPLOAD_FOLDER']}")
        app.run(debug=True, host='127.0.0.1', port=5000)
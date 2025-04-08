# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
import os
import json
import time
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from models import db, Item, Size, Image, Tag, Sale, Expense
from config import Config
from datetime import datetime, timedelta
from tag_routes import tag_routes



def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "max_age": 3600,
            "supports_credentials": True
        }
    })

    db.init_app(app)
    Migrate(app, db)

    # Register the tag routes blueprint
    app.register_blueprint(tag_routes, url_prefix='/api')

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
    
    # NEW ENDPOINT: Get all items
    @app.route('/api/items', methods=['GET'])
    def get_items():
        """
        Get all items with their images.
        """
        try:
            logger.info("📊 Fetching all items")
            items = Item.query.all()
            
            # Convert items to dictionary format with image URLs
            items_data = []
            for item in items:
                item_dict = item.to_dict()
                items_data.append(item_dict)
            
            logger.info(f"✅ Retrieved {len(items_data)} items")
            return jsonify(items_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get a single item by ID
    @app.route('/api/items/<int:item_id>', methods=['GET'])
    def get_item(item_id):
        """
        Get a single item by ID with its images.
        """
        try:
            item = Item.query.get(item_id)
            if not item:
                logger.warning(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': 'Item not found'}), 404
            
            logger.info(f"✅ Retrieved item {item_id} from database")
            
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

    # Add a new item
    @app.route('/api/items', methods=['POST'])
    def add_item():
        try:
            logger.info("Receiving item creation request")
            
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
            
            # Create a new item
            new_item = Item(
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
                    # Check if tag already exists
                    tag = Tag.query.filter_by(name=tag_name).first()
                    if not tag:
                        tag = Tag(name=tag_name)
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
                    timestamped_filename = f"{filename_parts[0]}_{int(time.time())}.{filename_parts[1]}"
                    
                    # Save the file
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], timestamped_filename)
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
            
            logger.info(f"✅ Item created with ID: {new_item.id}")
            
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
            logger.error(f"💥 Error creating item: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update an existing item
    @app.route('/api/items/<int:item_id>', methods=['PUT'])
    def update_item(item_id):
        """
        Update an existing item.
        """
        try:
            logger.info(f"🔄 Updating item {item_id}")
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
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
                        timestamped_filename = f"{filename_parts[0]}_{int(time.time())}.{filename_parts[1]}"
                        
                        # Save the file
                        file_path = os.path.join(app.config['UPLOAD_FOLDER'], timestamped_filename)
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
            
            logger.info(f"✅ Item {item_id} updated successfully")
            
            # Return the updated item
            return jsonify({
                'message': 'Item updated successfully',
                'item': item.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update an item field
    @app.route('/api/items/<int:item_id>/field', methods=['PATCH'])
    def update_item_field(item_id):
        """
        Update a specific field of an item.
        """
        try:
            logger.info(f"🔄 Updating field for item {item_id}")
            data = request.json
            
            # Validate request
            if 'field' not in data or 'value' not in data:
                logger.error("❌ Missing required fields: field and value")
                return jsonify({'error': 'Missing required fields: field and value'}), 400
            
            field = data['field']
            value = data['value']
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Update the specific field
            if field == 'status':
                # Validate status
                valid_statuses = ['unlisted', 'listed', 'sold']
                if value not in valid_statuses:
                    logger.error(f"❌ Invalid status value: {value}")
                    return jsonify({'error': f'Invalid status value. Must be one of: {", ".join(valid_statuses)}'}), 400
                item.status = value
            elif field == 'marketPrice':
                try:
                    item.market_price = float(value)
                except ValueError:
                    return jsonify({'error': 'Invalid market price value'}), 400
            elif field == 'tags':
                # Handle tags updates - value should be an array of tag IDs
                if not isinstance(value, list):
                    logger.error(f"❌ Invalid tags value: {value}")
                    return jsonify({'error': 'Tags value must be an array'}), 400
                
                # Clear existing tags
                item.tags = []
                
                # Add new tags
                for tag_id in value:
                    tag = Tag.query.get(tag_id)
                    if tag:
                        item.tags.append(tag)
            elif field == 'listings':
                # Handle listings updates
                if not isinstance(value, list):
                    logger.error(f"❌ Invalid listings value: {value}")
                    return jsonify({'error': 'Listings value must be an array'}), 400
                
                # Store listings as JSON
                item.listings = value
                
                # If there are listings, ensure the item is marked as listed
                if value and len(value) > 0 and item.status != 'sold':
                    item.status = 'listed'
            else:
                logger.error(f"❌ Invalid field name: {field}")
                return jsonify({'error': f'Invalid field name: {field}'}), 400
            
            # Update the updated_at timestamp
            item.updated_at = datetime.utcnow()
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Updated {field} for item {item_id}")
            
            # Return success message
            return jsonify({
                'message': f'Field {field} updated successfully',
                'id': item_id,
                'field': field,
                'value': value
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating field for item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Delete an item
    @app.route('/api/items/<int:item_id>', methods=['DELETE'])
    def delete_item(item_id):
        """
        Delete an item and its associated data.
        """
        try:
            logger.info(f"🗑️ Deleting item {item_id}")
            
            # Check if item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Delete associated sales records
            sales = Sale.query.filter_by(item_id=item_id).all()
            for sale in sales:
                db.session.delete(sale)
                logger.info(f"🗑️ Deleted associated sale {sale.id} for item {item_id}")
            
            # Delete associated images from storage
            images = Image.query.filter_by(item_id=item_id).all()
            for image in images:
                try:
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
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
            
            logger.info(f"✅ Item {item_id} deleted successfully")
            
            return jsonify({
                'message': f'Item {item_id} deleted successfully'
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/check-image/<filename>')
    def check_image(filename):
        """
        Check if an image exists in the uploads directory and return metadata
        """
        try:
            image_logger.info(f"Image check request for: {filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            exists = os.path.exists(filepath)
            
            if exists:
                stats = os.stat(filepath)
                image_logger.info(f"✅ Image check: {filename} exists, size: {stats.st_size} bytes")
                return jsonify({
                    'exists': True,
                    'filename': filename,
                    'filepath': filepath,
                    'size': stats.st_size,
                    'created': stats.st_ctime,
                    'permissions': oct(stats.st_mode)[-3:]
                }), 200
            else:
                # Log the complete uploads directory to help troubleshoot
                try:
                    files_in_directory = os.listdir(app.config['UPLOAD_FOLDER'])
                    image_logger.warning(f"❌ File not found: {filename}, available files: {files_in_directory}")
                except Exception as dir_err:
                    image_logger.error(f"🚫 Error listing directory: {str(dir_err)}")
                    files_in_directory = []
                
                return jsonify({
                    'exists': False,
                    'filename': filename,
                    'attempted_path': filepath,
                    'directory': app.config['UPLOAD_FOLDER'],
                    'files_in_directory': files_in_directory[:10]  # Limit to first 10 files
                }), 404
        except Exception as e:
            image_logger.error(f"💥 Error checking image {filename}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/uploads/<filename>')
    def serve_image(filename):
        """
        Serve uploaded images with detailed logging
        """
        try:
            image_logger.info(f"📷 Image request for: {filename}")
            # Check if file exists before serving
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if not os.path.exists(filepath):
                image_logger.warning(f"🔍 Requested image not found: {filename}")
                return jsonify({'error': 'Image not found'}), 404
                
            # Log successful request
            image_logger.info(f"✅ Serving image: {filename}")
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        except Exception as e:
            image_logger.error(f"💥 Error serving image {filename}: {str(e)}")
            return jsonify({'error': str(e)}), 500
        
    

    # SALES API ENDPOINTS
    @app.route('/api/sales', methods=['GET'])
    def get_sales():
        """
        Get all sales with associated item details.
        """
        try:
            logger.info("📊 Fetching all sales")
            sales = Sale.query.all()
            
            # Convert sales to dictionary format with item details
            sales_data = []
            for sale in sales:
                sale_dict = sale.to_dict()
                
                # Get associated item for additional info
                item = Item.query.get(sale.item_id)
                if item:
                    # Add item details that would be useful for the sales display
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
                
                sales_data.append(sale_dict)
            
            logger.info(f"✅ Retrieved {len(sales_data)} sales")
            return jsonify(sales_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sales: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/sales/<int:sale_id>', methods=['GET'])
    def get_sale(sale_id):
        """
        Get a single sale by ID with associated item details.
        """
        try:
            logger.info(f"🔍 Fetching sale {sale_id}")
            sale = Sale.query.get(sale_id)
            
            if not sale:
                logger.warning(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': 'Sale not found'}), 404
            
            # Convert sale to dictionary
            sale_dict = sale.to_dict()
            
            # Get associated item for additional info
            item = Item.query.get(sale.item_id)
            if item:
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
            
            logger.info(f"✅ Retrieved sale {sale_id}")
            return jsonify(sale_dict), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/sales', methods=['POST'])
    def create_sale():
        """
        Create a new sale record and update item status to 'sold'.
        """
        try:
            logger.info("📝 Creating new sale record")
            data = request.json
            
            # Validate required fields
            required_fields = ['itemId', 'platform', 'saleDate', 'salePrice', 'status']
            for field in required_fields:
                if field not in data:
                    logger.error(f"❌ Missing required field: {field}")
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Check if item exists
            item = Item.query.get(data['itemId'])
            if not item:
                logger.error(f"❌ Item with ID {data['itemId']} not found")
                return jsonify({'error': f'Item with ID {data["itemId"]} not found'}), 404
            
            # Parse the date string
            try:
                sale_date = datetime.fromisoformat(data['saleDate'].replace('Z', '+00:00'))
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Invalid date format: {data['saleDate']}")
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Create new sale record
            new_sale = Sale(
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
            
            logger.info(f"✅ Created new sale record with ID {new_sale.id}")
            
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
            logger.error(f"💥 Error creating sale: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/sales/<int:sale_id>', methods=['PUT'])
    def update_sale(sale_id):
        """
        Update an existing sale record.
        """
        try:
            logger.info(f"📝 Updating sale {sale_id}")
            data = request.json
            
            # Check if sale exists
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
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
            
            logger.info(f"✅ Updated sale {sale_id}")
            
            # Return the updated sale
            return jsonify(sale.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/sales/<int:sale_id>/field', methods=['PATCH'])
    def update_sale_field(sale_id):
        """
        Update a specific field of a sale.
        """
        try:
            logger.info(f"🔄 Updating field for sale {sale_id}")
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
            
            logger.info(f"✅ Updated {field} for sale {sale_id}")
            
            # Return success message
            return jsonify({
                'message': f'Field {field} updated successfully',
                'id': sale_id,
                'field': field,
                'value': value
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating field for sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/sales/<int:sale_id>', methods=['DELETE'])
    def delete_sale(sale_id):
        """
        Delete a sale record.
        """
        try:
            logger.info(f"🗑️ Deleting sale {sale_id}")
            
            # Check if sale exists
            sale = Sale.query.get(sale_id)
            if not sale:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Get the item ID for potential status update
            item_id = sale.item_id
            
            # Delete the sale
            db.session.delete(sale)
            
            # Check if this was the only sale for the item
            remaining_sales = Sale.query.filter_by(item_id=item_id).count()
            
            # If no other sales for this item, update item status back to 'unlisted'
            if remaining_sales == 0:
                item = Item.query.get(item_id)
                if item and item.status == 'sold':
                    item.status = 'unlisted'
            
            # Commit changes
            db.session.commit()
            
            logger.info(f"✅ Deleted sale {sale_id}")
            
            return jsonify({
                'message': f'Sale {sale_id} deleted successfully',
                'item_id': item_id
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    # Endpoint to get sales by item
    @app.route('/api/items/<int:item_id>/sales', methods=['GET'])
    def get_sales_by_item(item_id):
        """
        Get all sales for a specific item.
        """
        try:
            logger.info(f"📊 Fetching sales for item {item_id}")
            
            # Check if the item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Get all sales for this item
            sales = Sale.query.filter_by(item_id=item_id).all()
            
            # Convert to dictionary format
            sales_data = [sale.to_dict() for sale in sales]
            
            logger.info(f"✅ Retrieved {len(sales_data)} sales for item {item_id}")
            return jsonify(sales_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sales for item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Save custom platforms to database
    @app.route('/api/platforms', methods=['GET'])
    def get_platforms():
        """
        Get all custom platforms from the database.
        """
        try:
            # In a real app, you would have a Platform model
            # For now, we'll use a simple file-based approach
            platforms_file = os.path.join(app.config['BASEDIR'], 'platforms.json')
            
            if os.path.exists(platforms_file):
                with open(platforms_file, 'r') as f:
                    try:
                        platforms = json.load(f)
                    except json.JSONDecodeError:
                        platforms = {"platforms": []}
            else:
                platforms = {"platforms": []}
            
            return jsonify(platforms), 200
        except Exception as e:
            logger.error(f"💥 Error fetching platforms: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/platforms', methods=['POST'])
    def add_platform():
        """
        Add a new custom platform.
        """
        try:
            data = request.json
            
            if 'name' not in data:
                return jsonify({'error': 'Platform name is required'}), 400
            
            platform_name = data['name']
            
            # In a real app, you would save this to a Platform model
            # For now, we'll use a simple file-based approach
            platforms_file = os.path.join(app.config['BASEDIR'], 'platforms.json')
            
            if os.path.exists(platforms_file):
                with open(platforms_file, 'r') as f:
                    try:
                        platforms = json.load(f)
                    except json.JSONDecodeError:
                        platforms = {"platforms": []}
            else:
                platforms = {"platforms": []}
            
            # Add the new platform if it doesn't already exist
            if platform_name not in platforms["platforms"]:
                platforms["platforms"].append(platform_name)
                
                # Save the updated platforms
                with open(platforms_file, 'w') as f:
                    json.dump(platforms, f)
                
                logger.info(f"✅ Added new platform: {platform_name}")
                return jsonify({'message': 'Platform added successfully'}), 201
            else:
                return jsonify({'message': 'Platform already exists'}), 200
            
        except Exception as e:
            logger.error(f"💥 Error adding platform: {str(e)}")
            return jsonify({'error': str(e)}), 500
        

# EXPENSES API ENDPOINTS
    @app.route('/api/expenses', methods=['GET'])
    def get_expenses():
        """
        Get all expenses with optional date filtering.
        """
        try:
            logger.info("📊 Fetching all expenses")
            
            # Get query parameters for date filtering
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            # Base query
            query = Expense.query
            
            # Apply date filters if provided
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date >= start_date)
                    logger.info(f"🗓️ Filtering expenses after {start_date}")
                except ValueError:
                    logger.warning(f"❌ Invalid start date format: {start_date_str}")
            
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date <= end_date)
                    logger.info(f"🗓️ Filtering expenses before {end_date}")
                except ValueError:
                    logger.warning(f"❌ Invalid end date format: {end_date_str}")
            
            # Get all expenses matching the query
            expenses = query.order_by(Expense.expense_date.desc()).all()
            
            # Convert to dictionary format
            expenses_data = [expense.to_dict() for expense in expenses]
            
            logger.info(f"✅ Retrieved {len(expenses_data)} expenses")
            return jsonify(expenses_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching expenses: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['GET'])
    def get_expense(expense_id):
        """
        Get a single expense by ID.
        """
        try:
            logger.info(f"🔍 Fetching expense {expense_id}")
            
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.warning(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': 'Expense not found'}), 404
            
            logger.info(f"✅ Retrieved expense {expense_id}")
            return jsonify(expense.to_dict()), 200
        except Exception as e:
            logger.error(f"💥 Error fetching expense {expense_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses', methods=['POST'])
    def create_expense():
        """
        Create a new expense record.
        """
        try:
            logger.info("📝 Creating new expense record")
            
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
                    # Generate a secure filename with timestamp
                    filename = secure_filename(receipt_file.filename)
                    filename_parts = filename.rsplit('.', 1)
                    timestamped_filename = f"receipt_{int(time.time())}_{filename_parts[0]}.{filename_parts[1]}"
                    
                    # Save the file
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], timestamped_filename)
                    receipt_file.save(file_path)
                    receipt_filename = timestamped_filename
                    logger.info(f"📄 Saved receipt: {timestamped_filename}")
            
            # Create the expense record
            new_expense = Expense(
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
            db.session.commit()
            
            logger.info(f"✅ Created expense with ID {new_expense.id}")
            return jsonify(new_expense.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error creating expense: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
    def update_expense(expense_id):
        """
        Update an existing expense.
        """
        try:
            logger.info(f"🔄 Updating expense {expense_id}")
            
            # Check if expense exists
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
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
                        old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], expense.receipt_filename)
                        if os.path.exists(old_file_path):
                            os.remove(old_file_path)
                            logger.info(f"🗑️ Deleted old receipt: {expense.receipt_filename}")
                    
                    # Generate a secure filename with timestamp
                    filename = secure_filename(receipt_file.filename)
                    filename_parts = filename.rsplit('.', 1)
                    timestamped_filename = f"receipt_{int(time.time())}_{filename_parts[0]}.{filename_parts[1]}"
                    
                    # Save the file
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], timestamped_filename)
                    receipt_file.save(file_path)
                    expense.receipt_filename = timestamped_filename
                    logger.info(f"📄 Updated receipt: {timestamped_filename}")
            
            # Update timestamp
            expense.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"✅ Updated expense {expense_id}")
            return jsonify(expense.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating expense {expense_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
    def delete_expense(expense_id):
        """
        Delete an expense record.
        """
        try:
            logger.info(f"🗑️ Deleting expense {expense_id}")
            
            # Check if expense exists
            expense = Expense.query.get(expense_id)
            if not expense:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
            # Delete receipt file if it exists
            if expense.receipt_filename:
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], expense.receipt_filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ Deleted receipt file: {expense.receipt_filename}")
            
            # Delete the expense record
            db.session.delete(expense)
            db.session.commit()
            
            logger.info(f"✅ Deleted expense {expense_id}")
            return jsonify({'message': f'Expense {expense_id} deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting expense {expense_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/summary', methods=['GET'])
    def get_expense_summary():
        """
        Get expense summary statistics.
        """
        try:
            logger.info("📊 Generating expense summary")
            
            # Get query parameters for date filtering
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            # Base query
            query = Expense.query
            
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
                    
                    # Calculate current month expenses
                    current_month_expenses = Expense.query.filter(
                        Expense.expense_date >= start_date,
                        Expense.expense_date <= end_date
                    ).all()
                    current_month_total = sum(expense.amount for expense in current_month_expenses)
                    
                    # Calculate previous month range
                    month_diff = (end_date - start_date).days
                    prev_end_date = start_date
                    prev_start_date = prev_end_date - timedelta(days=month_diff)
                    
                    # Calculate previous month expenses
                    previous_month_expenses = Expense.query.filter(
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
            
            logger.info(f"✅ Generated expense summary with {expense_count} expenses")
            return jsonify(summary), 200
        except Exception as e:
            logger.error(f"💥 Error generating expense summary: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/types', methods=['GET'])
    def get_expense_types():
        """
        Get list of valid expense types.
        """
        try:
            logger.info("📋 Fetching expense types")
            
            # Define standard expense types
            expense_types = [
                'Shipping',
                'Packaging',
                'Platform Fees',
                'Storage',
                'Supplies',
                'Software',
                'Marketing',
                'Travel',
                'Utilities',
                'Rent',
                'Insurance',
                'Taxes',
                'Other'
            ]
            
            # Get custom expense types from the database
            custom_types = db.session.query(Expense.expense_type).distinct().all()
            for custom_type in custom_types:
                if custom_type[0] not in expense_types:
                    expense_types.append(custom_type[0])
            
            logger.info(f"✅ Retrieved {len(expense_types)} expense types")
            return jsonify(expense_types), 200
        except Exception as e:
            logger.error(f"💥 Error fetching expense types: {str(e)}")
            return jsonify({'error': str(e)}), 500    
    
    # net Profit from sold items Dashboard KPI Metric 

    @app.route('/api/sales/net-profit', methods=['GET'])
    def get_sales_net_profit():
        """
        Calculate the total net profit from all completed sales,
        properly accounting for all expenses.
        """
        try:
            logger.info("📊 Calculating net profit from sold items with expenses")
            
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
                    logger.info(f"🗓️ Filtering sales and expenses after {start_date}")
                except ValueError:
                    logger.warning(f"⚠️ Invalid start date format: {start_date_str}")
            
            # Parse end date if provided
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    logger.info(f"🗓️ Filtering sales and expenses before {end_date}")
                except ValueError:
                    logger.warning(f"⚠️ Invalid end date format: {end_date_str}")
            
            # -- Sales calculations --
            # Base query for completed sales
            sales_query = Sale.query.filter(Sale.status == 'completed')
            
            # Apply date filters to sales if provided
            if start_date:
                sales_query = sales_query.filter(Sale.sale_date >= start_date)
            if end_date:
                sales_query = sales_query.filter(Sale.sale_date <= end_date)
            
            # Get all sales matching the query
            sales = sales_query.all()
            
            # Calculate gross profit from completed sales
            gross_profit = 0
            total_sales_revenue = 0
            total_costs_of_goods = 0
            
            for sale in sales:
                # Get the item details
                item = Item.query.get(sale.item_id)
                if item:
                    # Calculate revenue and costs
                    sale_price = sale.sale_price
                    purchase_price = item.purchase_price
                    sales_tax = sale.sales_tax or 0
                    platform_fees = sale.platform_fees or 0
                    shipping_cost = item.shipping_price or 0
                    
                    # Add to totals
                    total_sales_revenue += sale_price
                    total_costs_of_goods += purchase_price
                    
                    # Calculate profit for this sale
                    item_profit = sale_price - purchase_price - sales_tax - platform_fees - shipping_cost
                    gross_profit += item_profit
            
            # -- Expense calculations --
            # Base query for expenses
            expense_query = Expense.query
            
            # Apply date filters to expenses if provided
            if start_date:
                expense_query = expense_query.filter(Expense.expense_date >= start_date)
            if end_date:
                expense_query = expense_query.filter(Expense.expense_date <= end_date)
            
            # Get all expenses matching the query
            expenses = expense_query.all()
            
            # Calculate total expenses
            total_expenses = sum(expense.amount for expense in expenses)
            
            # Calculate net profit (gross profit minus expenses)
            net_profit = gross_profit - total_expenses
            
            # Calculate average profit per sale
            avg_profit_per_sale = net_profit / len(sales) if len(sales) > 0 else 0
            
            # Calculate previous period metrics for comparison
            previous_period_net_profit = 0
            net_profit_change = 0
            
            if start_date and end_date:
                # Calculate the duration of the current period
                period_duration = (end_date - start_date).days
                
                # Define previous period date range
                prev_end_date = start_date
                prev_start_date = prev_end_date - timedelta(days=period_duration)
                
                logger.info(f"🗓️ Previous period: {prev_start_date} to {prev_end_date}")
                
                # Get previous period sales
                prev_sales_query = Sale.query.filter(
                    Sale.status == 'completed',
                    Sale.sale_date >= prev_start_date,
                    Sale.sale_date < prev_end_date
                )
                prev_sales = prev_sales_query.all()
                
                # Get previous period expenses
                prev_expense_query = Expense.query.filter(
                    Expense.expense_date >= prev_start_date,
                    Expense.expense_date < prev_end_date
                )
                prev_expenses = prev_expense_query.all()
                
                # Calculate previous period profits
                prev_gross_profit = 0
                
                for prev_sale in prev_sales:
                    prev_item = Item.query.get(prev_sale.item_id)
                    if prev_item:
                        prev_item_profit = (
                            prev_sale.sale_price 
                            - prev_item.purchase_price 
                            - (prev_sale.sales_tax or 0) 
                            - (prev_sale.platform_fees or 0) 
                            - (prev_item.shipping_price or 0)
                        )
                        prev_gross_profit += prev_item_profit
                
                # Calculate previous period total expenses
                prev_total_expenses = sum(expense.amount for expense in prev_expenses)
                
                # Calculate previous period net profit
                previous_period_net_profit = prev_gross_profit - prev_total_expenses
                
                # Calculate percentage change
                if previous_period_net_profit != 0:
                    net_profit_change = ((net_profit - previous_period_net_profit) / abs(previous_period_net_profit)) * 100
                else:
                    # If previous period profit was 0, use current profit to determine direction
                    net_profit_change = 100 if net_profit > 0 else -100 if net_profit < 0 else 0
            
            # Prepare comprehensive response
            response = {
                'netProfitSold': net_profit,
                'salesCount': len(sales),
                'grossProfit': gross_profit,
                'totalExpenses': total_expenses,
                'totalSalesRevenue': total_sales_revenue,
                'totalCostsOfGoods': total_costs_of_goods,
                'avgProfitPerSale': avg_profit_per_sale,
                'previousPeriodNetProfit': previous_period_net_profit,
                'netProfitChange': net_profit_change
            }
            
            logger.info(f"✅ Calculated net profit metrics from {len(sales)} sales and {len(expenses)} expenses")
            logger.info(f"📊 Net profit: ${net_profit:.2f}, Change: {net_profit_change:.2f}%")
            
            return jsonify(response), 200
        except Exception as e:
            logger.error(f"💥 Error calculating net profit metrics: {str(e)}")
            return jsonify({'error': str(e)}), 500
        
   # Expense Data Dashboard KPI Metric
    @app.route('/api/expenses/total', methods=['GET'])
    def get_total_expenses():
        """
        Calculate the total amount of all expenses with optional date filtering.
        """
        try:
            logger.info("Calculating total expenses")
            
            # Get query parameters for date filtering
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            # Base query
            query = Expense.query
            
            # Apply date filters if provided
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date >= start_date)
                    logger.info(f"Filtering expenses after {start_date}")
                except ValueError:
                    logger.warning(f"Invalid start date format: {start_date_str}")
            
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    query = query.filter(Expense.expense_date <= end_date)
                    logger.info(f"Filtering expenses before {end_date}")
                except ValueError:
                    logger.warning(f"Invalid end date format: {end_date_str}")
            
            # Get all expenses matching the query
            expenses = query.all()
            
            # Calculate total expenses
            total_amount = sum(expense.amount for expense in expenses)
            
            # Calculate previous period's total for percentage change
            prev_period_total = 0
            percentage_change = 0
            
            if start_date_str and end_date_str:
                try:
                    # Convert to datetime objects
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    
                    # Calculate period length in days
                    period_length = (end_date - start_date).days
                    
                    # Calculate previous period date range
                    prev_period_end = start_date - timedelta(days=1)
                    prev_period_start = prev_period_end - timedelta(days=period_length)
                    
                    # Query for previous period expenses
                    prev_period_expenses = Expense.query.filter(
                        Expense.expense_date >= prev_period_start,
                        Expense.expense_date <= prev_period_end
                    ).all()
                    
                    # Calculate previous period total
                    prev_period_total = sum(expense.amount for expense in prev_period_expenses)
                    
                    # Calculate percentage change
                    if prev_period_total > 0:
                        percentage_change = ((total_amount - prev_period_total) / prev_period_total) * 100
                except Exception as e:
                    logger.error(f"Error calculating previous period data: {str(e)}")
            
            logger.info(f"Calculated total expenses: ${total_amount:.2f} with {percentage_change:.2f}% change from previous period")
            
            # Return the results
            return jsonify({
                'totalExpenses': total_amount,
                'expenseCount': len(expenses),
                'percentageChange': percentage_change,
                'previousPeriodTotal': prev_period_total
            }), 200
        except Exception as e:
            logger.error(f"Error calculating total expenses: {str(e)}")
            return jsonify({'error': str(e)}), 500 

        ## Comprehensive endpoint for all dashboard KPI metrics. Ensures consistent calculation methods across all metrics.         
    
    @app.route('/api/dashboard/kpi-metrics', methods=['GET'])
    def get_dashboard_kpi_metrics():
        """
        Comprehensive endpoint for all dashboard KPI metrics.
        Ensures consistent calculation methods across all metrics.
        """
        try:
            logger.info("📊 Generating comprehensive dashboard KPI metrics")
            
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
            active_items_query = Item.query.filter(Item.status != 'sold')
            
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
            # Get completed sales
            sales_query = Sale.query.filter(Sale.status == 'completed')
            
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
                if item:
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
            # Get expenses
            expense_query = Expense.query
            
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
                    if item:
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
            
            logger.info("✅ Generated comprehensive dashboard KPI metrics")
            return jsonify(metrics), 200
        except Exception as e:
            logger.error(f"💥 Error generating dashboard KPI metrics: {str(e)}")
            return jsonify({'error': str(e)}), 500
# end of sales  KPI metrics
    @app.before_request
    def log_request_info():
        logger.debug('Headers: %s', request.headers)
        logger.debug('Body: %s', request.get_data())

    return app


app = create_app()






@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Item': Item, 'Size': Size, 'Image': Image, 'Tag': Tag, 'Sale': Sale}

if __name__ == '__main__':
    logger = logging.getLogger(__name__)
    logger.info(f"🚀 Starting Flask application on http://127.0.0.1:5000")
    logger.info(f"📁 Upload directory: {app.config['UPLOAD_FOLDER']}")
    app.run(debug=True, host='127.0.0.1', port=5000)
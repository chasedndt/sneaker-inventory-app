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
from models import db, Item, Size, Image, Tag, Sale
from config import Config

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
            # Add other fields as needed
            else:
                logger.error(f"❌ Invalid field name: {field}")
                return jsonify({'error': f'Invalid field name: {field}'}), 400
            
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
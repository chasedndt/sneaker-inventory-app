from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
import os
import json
import time
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from models import db, Item, Size, Image, Tag
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

    @app.route('/api/check-image/<filename>', methods=['GET'])
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

    @app.route('/api/items/<int:item_id>', methods=['PUT'])
    def update_item(item_id):
        """
        Update an existing inventory item with new data and possibly new images.
        """
        try:
            logger.info(f"📝 Update item endpoint hit for item {item_id}")
            
            # Check if the item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found for update")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
                
            # Check if JSON data is provided in the 'data' field
            if 'data' not in request.form:
                logger.error("❌ No 'data' field in request.form for update")
                return jsonify({'error': 'Missing item data'}), 400
                
            data = json.loads(request.form['data'])
            logger.info(f"📦 Received update data: {data}")
            
            # Extract updated details
            product_details = data.get('productDetails', {})
            purchase_details = data.get('purchaseDetails', {})
            sizes_quantity = data.get('sizesQuantity', {})
            status = data.get('status')
            
            try:
                # Convert date string to datetime object if provided
                purchase_date_str = purchase_details.get('purchaseDate')
                if purchase_date_str:
                    purchase_date = datetime.fromisoformat(purchase_date_str.replace('Z', '+00:00'))
                    logger.info(f"📅 Converted purchase date: {purchase_date}")
                else:
                    purchase_date = item.purchase_date  # Keep existing date
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Purchase date error: {str(e)}")
                return jsonify({'error': 'Invalid purchase date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Update item fields
            item.category = product_details.get('category', item.category)
            item.product_name = product_details.get('productName', item.product_name)
            item.reference = product_details.get('reference', item.reference)
            item.colorway = product_details.get('colorway', item.colorway)
            item.brand = product_details.get('brand', item.brand)
            
            # Update purchase details
            if purchase_details.get('purchasePrice'):
                item.purchase_price = float(purchase_details.get('purchasePrice', item.purchase_price))
            if purchase_details.get('purchaseCurrency'):
                item.purchase_currency = purchase_details.get('purchaseCurrency', item.purchase_currency)
            if purchase_details.get('shippingPrice'):
                item.shipping_price = float(purchase_details.get('shippingPrice', item.shipping_price or 0))
            if purchase_details.get('shippingCurrency'):
                item.shipping_currency = purchase_details.get('shippingCurrency', item.shipping_currency)
            if purchase_details.get('marketPrice'):
                item.market_price = float(purchase_details.get('marketPrice', item.market_price or 0))
            
            item.purchase_date = purchase_date
            item.purchase_location = purchase_details.get('purchaseLocation', item.purchase_location)
            item.condition = purchase_details.get('condition', item.condition)
            item.notes = purchase_details.get('notes', item.notes)
            item.order_id = purchase_details.get('orderID', item.order_id)
            
            # Update tax information if provided
            if 'taxType' in purchase_details:
                item.tax_type = purchase_details.get('taxType')
                if item.tax_type == 'vat' and 'vatPercentage' in purchase_details:
                    item.vat_percentage = float(purchase_details.get('vatPercentage', 0))
                elif item.tax_type == 'salesTax' and 'salesTaxPercentage' in purchase_details:
                    item.sales_tax_percentage = float(purchase_details.get('salesTaxPercentage', 0))
            
            # Update item status if provided
            if status:
                logger.info(f"🔄 Updating item status to: {status}")
                item.status = status
            
            # Handle sizes update
            if sizes_quantity and 'selectedSizes' in sizes_quantity:
                # Remove existing sizes
                Size.query.filter_by(item_id=item.id).delete()
                
                # Add updated sizes
                for size_entry in sizes_quantity.get('selectedSizes', []):
                    size = Size(
                        item_id=item.id,
                        system=size_entry.get('system', ''),
                        size=size_entry.get('size', ''),
                        quantity=int(size_entry.get('quantity', 1))
                    )
                    db.session.add(size)
            
            # Process new image files if they were included in the request
            uploaded_images = []
            if 'images' in request.files:
                files = request.files.getlist('images')
                
                if files and len(files) > 0 and files[0].filename:
                    logger.info(f"📸 Processing {len(files)} new images for item {item.id}")
                    
                    # Consider removing old images if requested
                    # Image.query.filter_by(item_id=item.id).delete()
                    
                    for file in files:
                        if file and allowed_file(file.filename):
                            # Generate unique filename to avoid collisions
                            original_filename = secure_filename(file.filename)
                            filename = f"{item.id}_{int(time.time())}_{original_filename}"
                            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                            
                            # Save the file to disk
                            file.save(filepath)
                            
                            # Create image record
                            new_image = Image(
                                filename=filename,
                                path=filepath,
                                item_id=item.id
                            )
                            db.session.add(new_image)
                            uploaded_images.append(filename)
                            logger.info(f"📸 Saved new image: {filename} for item {item.id}")
            
            # Commit all changes to the database
            db.session.commit()
            
            # Return the updated item
            updated_item = item.to_dict()
            # Add images to the response
            images = Image.query.filter_by(item_id=item.id).all()
            updated_item['images'] = [img.filename for img in images]
            
            logger.info(f"✅ Item {item_id} updated successfully")
            return jsonify({
                'message': 'Item updated successfully', 
                'id': item.id,
                'new_images': uploaded_images,
                'item': updated_item
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items/<int:item_id>/field', methods=['PATCH'])
    def update_item_field(item_id):
        """
        Update a single field of an item (e.g., marketPrice, status).
        """
        try:
            logger.info(f"🔄 Update field endpoint hit for item {item_id}")
            
            # Check if the item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found for field update")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Parse the request data
            data = request.json
            if not data or 'field' not in data or 'value' not in data:
                logger.error("❌ Missing required fields in request")
                return jsonify({'error': 'Missing required fields: field and value'}), 400
            
            field = data['field']
            value = data['value']
            
            logger.info(f"📝 Updating field '{field}' to value '{value}' for item {item_id}")
            
            # Handle different field types
            try:
                if field == 'marketPrice':
                    item.market_price = float(value)
                elif field == 'status':
                    valid_statuses = ['unlisted', 'listed', 'sold']
                    if value not in valid_statuses:
                        return jsonify({'error': f'Invalid status value. Must be one of: {", ".join(valid_statuses)}'}), 400
                    item.status = value
                else:
                    # For other fields, use dynamic attribute setting
                    snake_case_field = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
                    if hasattr(item, snake_case_field):
                        setattr(item, snake_case_field, value)
                    else:
                        logger.error(f"❌ Invalid field name: {field}")
                        return jsonify({'error': f'Invalid field name: {field}'}), 400
                
                db.session.commit()
                logger.info(f"✅ Successfully updated {field} for item {item_id}")
                
                # Return the updated item
                return jsonify({
                    'message': f'Field {field} updated successfully',
                    'id': item.id,
                    'field': field,
                    'value': value
                }), 200
            except ValueError as e:
                logger.error(f"❌ Value error: {str(e)}")
                return jsonify({'error': f'Invalid value for field {field}: {str(e)}'}), 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error updating field for item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items/<int:item_id>', methods=['DELETE'])
    def delete_item(item_id):
        """
        Delete an item and its associated data (sizes, images).
        """
        try:
            logger.info(f"🔄 Delete item endpoint hit for item {item_id}")
            
            # Check if the item exists
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"❌ Item with ID {item_id} not found for deletion")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Get associated images to delete files
            images = Image.query.filter_by(item_id=item.id).all()
            
            # Delete the item (cascade will handle related records)
            db.session.delete(item)
            db.session.commit()
            
            # Delete image files from disk
            for image in images:
                try:
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        logger.info(f"🗑️ Deleted image file: {filepath}")
                except Exception as e:
                    logger.error(f"❌ Error deleting image file {image.filename}: {str(e)}")
            
            logger.info(f"✅ Item {item_id} deleted successfully")
            return jsonify({
                'message': f'Item {item_id} deleted successfully'
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error deleting item {item_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items', methods=['POST'])
    def add_item():
        """
        Create a new inventory item and save its associated images.
        
        This updated function now handles both item creation and image association in a single step.
        It first creates the item record, then processes any images included in the multipart form.
        """
        try:
            # Get the form data and files from the multipart request
            logger.info("📝 Add item endpoint hit")
            
            # Check if JSON data is provided in the 'data' field
            if 'data' not in request.form:
                logger.error("❌ No 'data' field in request.form")
                return jsonify({'error': 'Missing item data'}), 400
                
            data = json.loads(request.form['data'])
            logger.info(f"📦 Received data: {data}")
            
            # Extract product details
            product_details = data.get('productDetails', {})
            purchase_details = data.get('purchaseDetails', {})
            sizes_quantity = data.get('sizesQuantity', {})
            
            try:
                # Convert date string to datetime object
                purchase_date_str = purchase_details.get('purchaseDate')
                if purchase_date_str:
                    purchase_date = datetime.fromisoformat(purchase_date_str.replace('Z', '+00:00'))
                else:
                    purchase_date = datetime.now()
                    
                logger.info(f"📅 Converted purchase date: {purchase_date}")
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Purchase date error: {str(e)}")
                return jsonify({'error': 'Invalid purchase date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Create new item with default status 'unlisted'
            new_item = Item(
                category=product_details.get('category', ''),
                product_name=product_details.get('productName', ''),
                reference=product_details.get('reference', ''),
                colorway=product_details.get('colorway', ''),
                brand=product_details.get('brand', ''),
                purchase_price=float(purchase_details.get('purchasePrice', 0)),
                purchase_currency=purchase_details.get('purchaseCurrency', ''),
                shipping_price=float(purchase_details.get('shippingPrice', 0) or 0),
                shipping_currency=purchase_details.get('shippingCurrency', ''),
                market_price=float(purchase_details.get('marketPrice', 0) or 0),
                purchase_date=purchase_date,
                purchase_location=purchase_details.get('purchaseLocation', ''),
                condition=purchase_details.get('condition', ''),
                notes=purchase_details.get('notes', ''),
                order_id=purchase_details.get('orderID', ''),
                tax_type=purchase_details.get('taxType', ''),
                vat_percentage=float(purchase_details.get('vatPercentage', 0) or 0),
                sales_tax_percentage=float(purchase_details.get('salesTaxPercentage', 0) or 0),
                status='unlisted'  # Default status
            )
            
            db.session.add(new_item)
            db.session.flush()  # Get the ID without committing
            
            # Add sizes if provided
            if sizes_quantity:
                for size_entry in sizes_quantity.get('selectedSizes', []):
                    size = Size(
                        item_id=new_item.id,
                        system=size_entry.get('system', ''),
                        size=size_entry.get('size', ''),
                        quantity=int(size_entry.get('quantity', 1))
                    )
                    db.session.add(size)
            
            # Process image files if they were included in the request
            uploaded_images = []
            if 'images' in request.files:
                files = request.files.getlist('images')
                
                for file in files:
                    if file and allowed_file(file.filename):
                        # Generate unique filename to avoid collisions
                        original_filename = secure_filename(file.filename)
                        filename = f"{new_item.id}_{int(time.time())}_{original_filename}"
                        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        
                        # Save the file to disk
                        file.save(filepath)
                        
                        # Create image record
                        new_image = Image(
                            filename=filename,
                            path=filepath,
                            item_id=new_item.id
                        )
                        db.session.add(new_image)
                        uploaded_images.append(filename)
                        logger.info(f"📸 Saved image: {filename} for item {new_item.id}")
            
            # Commit all changes to the database
            db.session.commit()
            
            logger.info(f"✅ Item added successfully with ID: {new_item.id}")
            return jsonify({
                'message': 'Item added successfully', 
                'id': new_item.id,
                'images': uploaded_images,
                'item': new_item.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"💥 Error processing request: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items', methods=['GET'])
    def get_items():
        try:
            items = Item.query.all()
            logger.info(f"📋 Retrieved {len(items)} items from database")
            
            # Create response with all item data including images
            item_list = []
            for item in items:
                item_data = item.to_dict()
                
                # Include size information
                sizes = Size.query.filter_by(item_id=item.id).all()
                if sizes:
                    # Just using the first size for now - could be expanded to include all sizes
                    first_size = sizes[0]
                    item_data['size'] = first_size.size
                    item_data['sizeSystem'] = first_size.system
                
                # Get the item's images
                images = Image.query.filter_by(item_id=item.id).all()
                item_data['images'] = [img.filename for img in images]
                
                # Log info about the first few items
                if len(item_list) < 3:
                    logger.info(f"📦 Item {item.id} details: {item_data}")
                    
                    # Log image info
                    if 'images' in item_data and item_data['images']:
                        logger.info(f"📸 Item {item.id} has {len(item_data['images'])} images: {item_data['images']}")
                    else:
                        logger.info(f"🖼️ Item {item.id} has no images")
                
                item_list.append(item_data)
                
            return jsonify(item_list), 200
        except Exception as e:
            logger.error(f"💥 Error fetching items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.before_request
    def log_request_info():
        logger.debug('Headers: %s', request.headers)
        logger.debug('Body: %s', request.get_data())

    return app

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Item': Item, 'Size': Size, 'Image': Image, 'Tag': Tag}

if __name__ == '__main__':
    logger = logging.getLogger(__name__)
    logger.info(f"🚀 Starting Flask application on http://127.0.0.1:5000")
    logger.info(f"📁 Upload directory: {app.config['UPLOAD_FOLDER']}")
    app.run(debug=True, host='127.0.0.1', port=5000)
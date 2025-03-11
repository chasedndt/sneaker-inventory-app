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
            "methods": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
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
                image_logger.info(f"Image check: {filename} exists, size: {stats.st_size} bytes")
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
                    image_logger.warning(f"File not found: {filename}, available files: {files_in_directory}")
                except Exception as dir_err:
                    image_logger.error(f"Error listing directory: {str(dir_err)}")
                    files_in_directory = []
                
                return jsonify({
                    'exists': False,
                    'filename': filename,
                    'attempted_path': filepath,
                    'directory': app.config['UPLOAD_FOLDER'],
                    'files_in_directory': files_in_directory[:10]  # Limit to first 10 files
                }), 404
        except Exception as e:
            image_logger.error(f"Error checking image {filename}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/uploads/<filename>')
    def serve_image(filename):
        """
        Serve uploaded images with detailed logging
        """
        try:
            image_logger.info(f"Image request for: {filename}")
            # Check if file exists before serving
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if not os.path.exists(filepath):
                image_logger.warning(f"Requested image not found: {filename}")
                return jsonify({'error': 'Image not found'}), 404
                
            # Log successful request
            image_logger.info(f"Serving image: {filename}")
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        except Exception as e:
            image_logger.error(f"Error serving image {filename}: {str(e)}")
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
            logger.info("Add item endpoint hit")
            
            # Check if JSON data is provided in the 'data' field
            if 'data' not in request.form:
                logger.error("No 'data' field in request.form")
                return jsonify({'error': 'Missing item data'}), 400
                
            data = json.loads(request.form['data'])
            logger.info(f"Received data: {data}")
            
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
                    
                logger.info(f"Converted purchase date: {purchase_date}")
            except (ValueError, TypeError) as e:
                logger.error(f"Purchase date error: {str(e)}")
                return jsonify({'error': 'Invalid purchase date format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)'}), 400
            
            # Create new item
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
                sales_tax_percentage=float(purchase_details.get('salesTaxPercentage', 0) or 0)
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
            
            # Commit all changes to the database
            db.session.commit()
            
            logger.info(f"Item added successfully with ID: {new_item.id}")
            return jsonify({
                'message': 'Item added successfully', 
                'id': new_item.id,
                'images': uploaded_images,
                'item': new_item.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing request: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items', methods=['GET'])
    def get_items():
        try:
            items = Item.query.all()
            logger.info(f"Retrieved {len(items)} items from database")
            
            # Log some detailed info about the first few items for debugging
            for i, item in enumerate(items[:3]):
                if i == 0:  # Only log details for the first item
                    logger.info(f"Sample item: {item.to_dict()}")
                    # Check if this item has images
                    images = Image.query.filter_by(item_id=item.id).all()
                    logger.info(f"Item {item.id} has {len(images)} images")
                    for img in images:
                        logger.info(f"  Image {img.id}: {img.filename} at {img.path}")
                
            return jsonify([item.to_dict() for item in items]), 200
        except Exception as e:
            logger.error(f"Error fetching items: {str(e)}")
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
    logger.info(f"Starting Flask application on http://127.0.0.1:5000")
    logger.info(f"Upload directory: {app.config['UPLOAD_FOLDER']}")
    app.run(debug=True, host='127.0.0.1', port=5000)
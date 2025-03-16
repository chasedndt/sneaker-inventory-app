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

    # Existing inventory endpoints here...

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
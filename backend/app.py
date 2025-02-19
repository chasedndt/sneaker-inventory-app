from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
import os
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
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"],
            "max_age": 3600,
            "supports_credentials": True
        }
    })

    db.init_app(app)
    Migrate(app, db)

    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
        logger.info(f"Created upload directory at: {app.config['UPLOAD_FOLDER']}")

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    @app.route('/api/test', methods=['GET'])
    def test_connection():
        logger.info("Test endpoint hit")
        return jsonify({'status': 'connected'}), 200

    @app.route('/api/items', methods=['POST'])
    def add_item():
        try:
            if not request.is_json:
                logger.error("Request is not JSON")
                return jsonify({'error': 'Content-Type must be application/json'}), 400
                
            data = request.get_json()
            logger.info(f"Received data: {data}")
            
            try:
                purchase_date = datetime.strptime(data['purchaseDetails']['purchaseDate'], '%Y-%m-%dT%H:%M:%S.%fZ')
                logger.info(f"Converted purchase date: {purchase_date}")
            except (KeyError, ValueError) as e:
                logger.error(f"Purchase date error: {str(e)}")
                return jsonify({'error': 'Invalid purchase date format. Use ISO format'}), 400
            
            new_item = Item(
                category=data['productDetails']['category'],
                product_name=data['productDetails']['productName'],
                reference=data['productDetails'].get('reference', ''),
                colorway=data['productDetails'].get('colorway', ''),
                brand=data['productDetails']['brand'],
                purchase_price=float(data['purchaseDetails']['purchasePrice']),
                purchase_currency=data['purchaseDetails']['purchaseCurrency'],
                shipping_price=float(data['purchaseDetails'].get('shippingPrice', 0)),
                shipping_currency=data['purchaseDetails'].get('shippingCurrency', ''),
                market_price=float(data['purchaseDetails'].get('marketPrice', 0)),
                purchase_date=purchase_date,
                purchase_location=data['purchaseDetails'].get('purchaseLocation', ''),
                condition=data['purchaseDetails'].get('condition', ''),
                notes=data['purchaseDetails'].get('notes', ''),
                order_id=data['purchaseDetails'].get('orderID', ''),
                tax_type=data['purchaseDetails'].get('taxType', ''),
                vat_percentage=float(data['purchaseDetails'].get('vatPercentage', 0)),
                sales_tax_percentage=float(data['purchaseDetails'].get('salesTaxPercentage', 0))
            )
            
            # Handle sizes and quantities
            for size_entry in data['sizesQuantity']['selectedSizes']:
                size = Size(
                    system=data['sizesQuantity']['sizeSystem'],
                    size=size_entry['size'],
                    quantity=int(size_entry['quantity'])
                )
                new_item.sizes.append(size)

            db.session.add(new_item)
            db.session.commit()
            
            logger.info(f"Item added successfully with id: {new_item.id}")
            return jsonify({'message': 'Item added successfully', 'id': new_item.id}), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing request: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/upload', methods=['POST'])
    def upload_images():
        try:
            logger.info("Upload endpoint hit")
            if 'images' not in request.files:
                logger.error("No 'images' field in request.files")
                return jsonify({'error': 'No files provided'}), 400

            files = request.files.getlist('images')
            item_id = request.form.get('item_id')
            
            if not item_id:
                logger.error("Missing item_id in form data")
                return jsonify({'error': 'Missing item_id'}), 400
                
            item = Item.query.get(item_id)
            if not item:
                logger.error(f"Item with id {item_id} not found")
                return jsonify({'error': 'Item not found'}), 404

            uploaded_files = []
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    
                    new_image = Image(
                        filename=filename,
                        path=filepath,
                        item_id=item.id
                    )
                    db.session.add(new_image)
                    uploaded_files.append(filename)
                else:
                    logger.warning(f"Skipped file: {file.filename} (not allowed)")
            
            db.session.commit()
            logger.info(f"Successfully uploaded {len(uploaded_files)} images for item {item_id}")
            return jsonify({'uploaded_files': uploaded_files}), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing upload: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items', methods=['GET'])
    def get_items():
        try:
            items = Item.query.all()
            return jsonify([item.to_dict() for item in items]), 200
        except Exception as e:
            logger.error(f"Error fetching items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/uploads/<filename>')
    def serve_image(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
import os
from werkzeug.utils import secure_filename
import logging
from models import db, Item, Size, Image, Tag
from config import Config
from datetime import datetime  # Added this import

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
            
            # Convert purchase_date string to datetime
            try:
                purchase_date = datetime.strptime(data['purchaseDate'], '%Y-%m-%d')
                logger.info(f"Converted purchase date: {purchase_date}")
            except (KeyError, ValueError) as e:
                logger.error(f"Purchase date error: {str(e)}")
                return jsonify({'error': 'Invalid purchase date format. Use YYYY-MM-DD'}), 400
            
            new_item = Item(
                category=data['category'],
                product_name=data['productName'],
                reference=data.get('reference', ''),
                colorway=data.get('colorway', ''),
                brand=data['brand'],
                purchase_price=data['purchasePrice'],
                purchase_currency=data['purchaseCurrency'],
                shipping_price=data.get('shippingPrice', 0),
                shipping_currency=data.get('shippingCurrency', ''),
                market_price=data.get('marketPrice', 0),
                purchase_date=purchase_date,
                purchase_location=data.get('purchaseLocation', ''),
                condition=data.get('condition', ''),
                notes=data.get('notes', ''),
                order_id=data.get('orderID', ''),
                tax_type=data.get('taxType', ''),
                vat_percentage=data.get('vatPercentage', 0),
                sales_tax_percentage=data.get('salesTaxPercentage', 0)
            )
            
            db.session.add(new_item)
            db.session.commit()
            
            logger.info("Item added successfully")
            return jsonify({'message': 'Item added successfully', 'id': new_item.id}), 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing request: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/items', methods=['GET'])
    def get_items():
        try:
            items = Item.query.all()
            items_data = []
            for item in items:
                items_data.append({
                    'id': item.id,
                    'category': item.category,
                    'productName': item.product_name,
                    'brand': item.brand,
                    'purchasePrice': item.purchase_price,
                    'purchaseDate': item.purchase_date.strftime('%Y-%m-%d') if item.purchase_date else None
                })
            return jsonify(items_data), 200
        except Exception as e:
            logger.error(f"Error fetching items: {str(e)}")
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
                return jsonify({'error': 'Missing item_id'}), 400
                
            item = Item.query.get(item_id)
            if not item:
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
                    
            db.session.commit()
            return jsonify({'uploaded_files': uploaded_files}), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing upload: {str(e)}")
            return jsonify({'error': str(e)}), 500

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

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

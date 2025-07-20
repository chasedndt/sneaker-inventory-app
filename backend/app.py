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
from datetime import datetime, timedelta
from config import Config
from tag_routes import tag_routes
import re
import calendar
from auth_helpers import require_auth
from middleware.auth import get_user_id_from_token, get_current_user_info
from admin.admin_routes import admin_routes

# Import database service for Firebase operations
from database_service import DatabaseService

# Unicode console fix
import sys
import codecs
if os.name == "nt" and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# ── Firebase Admin initialisation ───────────────────────────────────
import firebase_admin
from firebase_admin import credentials

def initialize_firebase_admin():
    """Initialize Firebase Admin SDK with secure credential handling"""
    if firebase_admin._apps:
        return  # Already initialized
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Try multiple credential sources in order of preference
    cred_sources = [
        os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH'),
        os.getenv('GOOGLE_APPLICATION_CREDENTIALS'), 
        os.path.join(BASE_DIR, "firebase-credentials.json")
    ]
    
    cred = None
    for cred_path in cred_sources:
        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                print(f"Firebase credentials loaded from: {cred_path}")
                break
            except Exception as e:
                print(f"Failed to load Firebase credentials from {cred_path}: {e}")
                continue
    
    if not cred:
        raise ValueError("Firebase credentials not found. Please check your configuration.")
    
    # Initialize with storage bucket - use the correct project ID
    try:
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'hypelist-99a07.appspot.com'  # Fixed storage bucket name
        })
        print("Firebase Admin SDK initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Firebase Admin SDK: {e}")
        raise

# Initialize Firebase Admin SDK
initialize_firebase_admin()
# ────────────────────────────────────────────────────────────────────

# Define a module-level logger
logger = logging.getLogger(__name__)

def convert_to_snake_case(name):
    """Convert a string from camelCase to snake_case."""
    pattern = re.compile(r'(?<!^)(?=[A-Z])')
    return pattern.sub('_', name).lower()

def safe_error_response(error, message="An error occurred", status_code=500):
    """Return a safe error response that doesn't leak sensitive information"""
    # Log the full error for debugging
    logger.error(f"Error occurred: {str(error)}")
    
    # In development, return detailed error info
    if current_app.config.get('DEBUG'):
        return jsonify({
            'error': str(error),
            'message': message,
            'debug': True
        }), status_code
    else:
        # In production, return generic error message
        return jsonify({
            'error': message,
            'debug': False
        }), status_code

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Secure CORS for frontend authentication
    CORS(app,
         origins=["http://localhost:3000"],
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
         # Removed the 'resources' dictionary to simplify and rely on route-specific handlers for OPTIONS
         max_age=3600)

    # Initialize Firebase database service (required for Phase 3)
    try:
        database_service = DatabaseService()
        if not database_service.is_using_firebase():
            raise RuntimeError("Firebase is required for Phase 3. Please set USE_FIREBASE=true in your environment.")
        logger.info("Firebase database service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase database service: {e}")
        logger.error("Make sure Firebase Admin SDK is properly initialized and credentials are available")
        raise RuntimeError(f"Firebase initialization failed: {e}")

    # Register the tag routes blueprint
    app.register_blueprint(tag_routes, url_prefix='/api')

    # Register the admin routes blueprint (add this line)
    app.register_blueprint(admin_routes, url_prefix='/api')

    # Register the Stripe routes blueprint
    from stripe_routes import stripe_bp
    app.register_blueprint(stripe_bp)

    # Add security headers
    @app.after_request
    def after_request(response):
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Updated CSP policy for React app and Firebase
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://api.stripe.com https://apis.google.com https://www.googleapis.com "
            "https://firebaseinstallations.googleapis.com https://firebase.googleapis.com "
            "https://firestore.googleapis.com https://identitytoolkit.googleapis.com "
            "https://securetoken.googleapis.com wss: ws:; "
            "frame-src https://js.stripe.com; "
            "object-src 'none';"
        )
        response.headers['Content-Security-Policy'] = csp_policy
        
        return response

    # Set up standard application logging
    # Reduced log level from DEBUG to INFO to prevent excessive log spamming in production
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # --- Logging Refinement Start ---
    # Ensure the root logger does not have a FileHandler for 'image_requests.log'
    # This prevents app.logger (if it propagates to root) from writing general logs there.
    root_logger = logging.getLogger() 
    image_log_path = os.path.join(os.path.dirname(__file__), 'image_requests.log')
    for handler in root_logger.handlers[:]: # Iterate over a copy of the handlers list
        if isinstance(handler, logging.FileHandler):
            # Check if the handler's baseFilename matches our target log file path
            if os.path.abspath(handler.baseFilename) == os.path.abspath(image_log_path):
                root_logger.removeHandler(handler)
                # Optional: log that we removed a handler from root, to app.logger if already configured, or print
                # print(f"Removed lingering FileHandler for {image_log_path} from root logger.") 
    # --- Logging Refinement End ---

    # Configure a dedicated logger for image requests (disabled to reduce memory usage)
    # Only enable when debugging image issues
    if app.config.get('DEBUG_IMAGE_REQUESTS', False):
        img_req_logger = logging.getLogger('sneaker_app.image_requests') 
        img_req_logger.setLevel(logging.WARNING)  # Only log warnings/errors
        img_req_logger.propagate = False 
        
        if not img_req_logger.handlers:
            img_file_handler = logging.FileHandler('image_requests.log')
            img_file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            img_req_logger.addHandler(img_file_handler)

    # Create upload directory if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
        logger.info(f"Created upload directory at: {app.config['UPLOAD_FOLDER']}")

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    @app.route('/api/test-connection', methods=['GET', 'OPTIONS'])
    def test_connection():
        """Test if the API is reachable and CORS is working properly"""
        logger.info("Test connection endpoint hit with method: %s", request.method)
        if request.method == 'OPTIONS':
            # Handle preflight request
            response = current_app.make_default_options_response()
            return response
            
        return jsonify({"status": "success", "message": "API connection successful"})

    @app.route('/api/database/status', methods=['GET'])
    @require_auth
    def get_database_status(user_id):
        """Get current database configuration status"""
        try:
            status = {
                "database_type": "firebase",
                "status": "active",
                "description": "Using Firebase Firestore for all data operations",
                "firebase_enabled": True
            }
            
            logger.info(f"Database status requested for user {user_id}")
            return jsonify(status), 200
            
        except Exception as e:
            logger.error(f"Error getting database status: {str(e)}")
            return safe_error_response(e, "Failed to get database status")

    # Health check endpoint
    @app.route('/api/ping', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok'}), 200
    
    # Alternative health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check_alt():
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200
    
    # Get user info endpoint
    @app.route('/api/user', methods=['GET'])
    @require_auth
    def get_user(user_id):
        """
        Get current user information using database service.
        """
        try:
            logger.info(f"🔍 Fetching user info for user_id: {user_id}")
            
            # Use Firebase via database service
            settings_data = database_service.get_user_settings(user_id)
            
            # If settings don't exist, create default settings
            if not settings_data:
                default_settings = {
                    'dark_mode': False,
                    'currency': '$',
                    'date_format': 'MM/DD/YYYY'
                }
                settings_data = database_service.update_user_settings(user_id, default_settings)
                logger.info(f"✅ Created default settings via Firebase for user_id: {user_id}")
            
            # Get user details from Firebase (optional)
            user_info = get_current_user_info() or {'uid': user_id}
            
            # Combine settings with user info
            response = {
                **user_info,
                'settings': settings_data
            }
            
            return jsonify(response), 200
        except Exception as e:
            logger.error(f"💥 Error fetching user info: {str(e)}")
            return safe_error_response(e, "Failed to fetch user information")
    
    # Update user settings endpoint - uses database service
    @app.route('/api/settings', methods=['PUT'])
    @require_auth
    def update_settings(user_id):
        """
        Update user settings - uses database service for data routing.
        """
        try:
            logger.info(f"🔄 Updating settings for user_id: {user_id}")
            data = request.json
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Use Firebase via database service
            updated_settings = database_service.update_user_settings(user_id, data)
            logger.info(f"✅ Settings updated via Firebase for user_id: {user_id}")
            return jsonify(updated_settings), 200
        except Exception as e:
            logger.error(f"💥 Error updating settings: {str(e)}")
            return safe_error_response(e, "Failed to update settings")

    # Modified to include user_id from authentication - now uses hybrid router
    @app.route('/api/items', methods=['GET'])
    @require_auth
    def get_items(user_id):
        """
        Get all items with their images for current user.
        Uses database service to fetch from appropriate data source (SQLite or Firebase).
        """
        try:
            logger.debug(f"📊 Fetching items for user_id: {user_id}")
            
            # Use Firebase via database service
            items_data = database_service.get_items(user_id)
            logger.debug(f"✅ Retrieved {len(items_data)} items via Firebase for user_id: {user_id}")
            
            # Process items to convert sizes array to individual size fields for frontend compatibility
            processed_items = []
            for item in items_data:
                processed_item = item.copy()
                
                # Convert sizes array to individual size and sizeSystem fields
                sizes = item.get('sizes', [])
                if sizes and len(sizes) > 0:
                    # Take the first size entry (most common use case)
                    first_size = sizes[0]
                    if isinstance(first_size, dict):
                        processed_item['size'] = first_size.get('size', '')
                        processed_item['sizeSystem'] = first_size.get('system', '')
                    else:
                        # Handle legacy format where size might be a string
                        processed_item['size'] = str(first_size)
                        processed_item['sizeSystem'] = ''
                else:
                    # No size data available
                    processed_item['size'] = ''
                    processed_item['sizeSystem'] = ''
                
                processed_items.append(processed_item)
            
            logger.debug(f"✅ Processed {len(processed_items)} items with size data for user_id: {user_id}")
            return jsonify(processed_items), 200
        except Exception as e:
            logger.error(f"💥 Error fetching items: {str(e)}")
            return safe_error_response(e, "Failed to fetch items")

    # Get a single item by ID - verify ownership
    @app.route('/api/items/<item_id>', methods=['GET'])
    @require_auth
    def get_item(user_id, item_id):
        """
        Get a single item by ID with its images.
        Uses database service to fetch from appropriate data source (SQLite or Firebase).
        """
        try:
            # Use Firebase via database service
            item_data = database_service.get_item(user_id, item_id)
            if not item_data:
                logger.warning(f"❌ Item with ID {item_id} not found in Firebase")
                return jsonify({'error': 'Item not found'}), 404
            
            # Process item to convert sizes array to individual size fields for frontend compatibility
            processed_item = item_data.copy()
            
            # Convert sizes array to individual size and sizeSystem fields
            sizes = item_data.get('sizes', [])
            if sizes and len(sizes) > 0:
                # Take the first size entry (most common use case)
                first_size = sizes[0]
                if isinstance(first_size, dict):
                    processed_item['size'] = first_size.get('size', '')
                    processed_item['sizeSystem'] = first_size.get('system', '')
                else:
                    # Handle legacy format where size might be a string
                    processed_item['size'] = str(first_size)
                    processed_item['sizeSystem'] = ''
            else:
                # No size data available
                processed_item['size'] = ''
                processed_item['sizeSystem'] = ''
            
            logger.info(f"✅ Retrieved item {item_id} from Firebase for user_id: {user_id}")
            return jsonify(processed_item), 200
        except Exception as e:
            logger.error(f"💥 Error fetching item {item_id}: {str(e)}")
            return safe_error_response(e, "Failed to fetch item")

    # Add a new item with current user_id - uses database service
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
            
            # Prepare item data for hybrid router
            item_data = {
                'category': product_details.get('category', ''),
                'productName': product_details.get('productName', ''),
                'reference': product_details.get('reference', ''),
                'colorway': product_details.get('colorway', ''),
                'brand': product_details.get('brand', ''),
                'purchasePrice': float(purchase_details.get('purchasePrice', 0)),
                'purchaseCurrency': purchase_details.get('purchaseCurrency', '$'),
                'shippingPrice': float(purchase_details.get('shippingPrice', 0) or 0),
                'shippingCurrency': purchase_details.get('shippingCurrency', '$'),
                'marketPrice': float(purchase_details.get('marketPrice', 0) or 0),
                'purchaseDate': purchase_details.get('purchaseDate'),
                'purchaseLocation': purchase_details.get('purchaseLocation', ''),
                'condition': purchase_details.get('condition', ''),
                'notes': purchase_details.get('notes', ''),
                'orderID': purchase_details.get('orderID', ''),
                'taxType': purchase_details.get('taxType', 'none'),
                'vatPercentage': float(purchase_details.get('vatPercentage', 0) or 0),
                'salesTaxPercentage': float(purchase_details.get('salesTaxPercentage', 0) or 0),
                'status': 'unlisted',
                'sizes': sizes_quantity.get('selectedSizes', []),
                'tags': purchase_details.get('tags', [])
            }
            
            # Handle images
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
                    image_filenames.append(timestamped_filename)
            
            item_data['images'] = image_filenames
            
            # Use Firebase via database service
            created_item = database_service.create_item(user_id, item_data)
            logger.info(f"✅ Item created via Firebase with ID: {created_item.get('id')} for user_id: {user_id}")
            
            return jsonify({
                'message': 'Item created successfully',
                'item': {
                    'id': created_item.get('id'),
                    'productName': created_item.get('productName'),
                    'category': created_item.get('category'),
                    'brand': created_item.get('brand'),
                    'images': image_filenames
                }
            }), 201
            
        except Exception as e:
            logger.error(f"💥 Error creating item for user {user_id}: {str(e)}")
            return safe_error_response(e, "Failed to create item")

    # Update an existing item - verify ownership
    @app.route('/api/items/<item_id>', methods=['PUT'])
    @require_auth
    def update_item(user_id, item_id):
        """
        Update an existing item, ensuring it belongs to the current user.
        Note: Complex file uploads and image processing are only supported in SQLite mode.
        """
        try:
            logger.info(f"🔄 Updating item {item_id} for user {user_id}")
            
            # Check if item exists and belongs to user
            item_data = database_service.get_item(user_id, item_id)
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # For Firebase mode, complex item updates with file uploads are not supported
            logger.warning(f"⚠️ Complex item update attempted in Firebase mode for item {item_id}")
            return jsonify({
                'error': 'Complex item updates with file uploads are not supported in Firebase mode. Please use individual field update endpoints (PATCH /api/items/<id>/field) instead.'
            }), 501
            
            # Get SQLite item for complex operations
            item = Item.query.get(item_id)
            if not item or item.user_id != user_id:
                logger.error(f"❌ Item with ID {item_id} not found in SQLite")
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
            
            # Log existing images for debugging
            existing_db_images = Image.query.filter_by(item_id=item.id).all()
            logger.info(f"📊 Current images in DB for item {item_id}: {[img.filename for img in existing_db_images]}")
            
            # ===== IMAGE PROCESSING - COMPLETE REDESIGN =====
            # Process existingImages array from frontend if provided
            existing_images = []
            
            # Flag to track if image processing was done
            image_processing_completed = False
            
            if 'existingImages' in request.form:
                try:
                    # This is a separate transaction for image processing only
                    existing_images = json.loads(request.form.get('existingImages'))
                    logger.info(f"📊 [IMAGE_HANDLER] Received existingImages from frontend: {existing_images}")
                    
                    # Get existing images for debugging
                    db_images_before = Image.query.filter_by(item_id=item.id).all()
                    logger.info(f"📚 [IMAGE_HANDLER] Current images BEFORE: {[img.filename for img in db_images_before]}")
                    
                    # Track which images should be physically deleted
                    images_to_physically_delete = []
                    
                    # === STEP 1: DELETE ALL EXISTING IMAGE RECORDS FROM DATABASE ===
                    # Create a backup dictionary of existing images first
                    db_image_dict = {}
                    for img in db_images_before:
                        db_image_dict[img.filename] = {
                            'path': img.path,
                            'filename': img.filename
                        }
                    
                    # Now delete all image records from the database
                    deletion_count = Image.query.filter_by(item_id=item.id).delete()
                    db.session.flush()  # Make sure deletion is processed
                    logger.info(f"🗑️ [IMAGE_HANDLER] Deleted {deletion_count} image records for item {item_id}")
                    
                    # === STEP 2: IDENTIFY IMAGES THAT WERE DELETED BY USER ===
                    all_filenames = set(db_image_dict.keys())
                    frontend_filenames = set(existing_images)
                    
                    # These are images that were in DB but not in the frontend request (user deleted them)
                    deleted_by_user = all_filenames - frontend_filenames
                    logger.info(f"🗑️ [IMAGE_HANDLER] User deleted these images: {deleted_by_user}")
                    
                    # Collect images to physically delete from filesystem
                    for filename in deleted_by_user:
                        images_to_physically_delete.append(db_image_dict[filename]['path'])
                    
                    # === STEP 3: INSERT NEW IMAGE RECORDS IN THE EXACT ORDER FROM FRONTEND ===
                    logger.info(f"🔄 [IMAGE_HANDLER] Inserting images in this order: {existing_images}")
                    
                    # Only attempt to add images that exist in our backup
                    for position, filename in enumerate(existing_images):
                        if filename in db_image_dict:
                            # Get the original path
                            path = db_image_dict[filename]['path']
                            
                            # Create a completely new image record
                            new_img = Image(
                                item_id=item.id,
                                filename=filename,
                                path=path
                            )
                            db.session.add(new_img)
                            logger.info(f"💾 [IMAGE_HANDLER] Added image {filename} at position {position}")
                        else:
                            logger.warning(f"⚠️ [IMAGE_HANDLER] Skipping unknown image: {filename}")
                    
                    # Flush to ensure all database operations are processed
                    db.session.flush()
                    
                    # === STEP 4: VERIFY THE IMAGE ORDER IS CORRECT ===
                    # Get the current images after our changes
                    db_images_after = Image.query.filter_by(item_id=item.id).all()
                    current_filenames = [img.filename for img in db_images_after]
                    logger.info(f"📚 [IMAGE_HANDLER] Current images AFTER: {current_filenames}")
                    
                    # Validate the order matches what the frontend sent
                    expected_order = [f for f in existing_images if f in db_image_dict]
                    if current_filenames != expected_order:
                        logger.error(f"⛔ [IMAGE_HANDLER] ORDER MISMATCH! Expected: {expected_order}, Got: {current_filenames}")
                        # Additional safety check
                        logger.warning(f"⚠️ [IMAGE_HANDLER] Will force correct order in response")
                    else:
                        logger.info(f"✅ [IMAGE_HANDLER] Order verification successful")
                    
                    # === STEP 5: PHYSICALLY DELETE FILES THAT WERE REMOVED ===
                    for file_path in images_to_physically_delete:
                        try:
                            if os.path.exists(file_path):
                                os.remove(file_path)
                                logger.info(f"🗑️ [IMAGE_HANDLER] Physically deleted: {file_path}")
                        except Exception as file_err:
                            logger.error(f"❌ [IMAGE_HANDLER] Failed to delete file {file_path}: {str(file_err)}")
                    
                    # Set flag to indicate successful processing
                    image_processing_completed = True
                    logger.info(f"✅ [IMAGE_HANDLER] Image processing completed successfully")
                    
                except Exception as img_err:
                    logger.error(f"❌ [IMAGE_HANDLER] Error processing images: {str(img_err)}")
                    logger.error(traceback.format_exc())
                    # Don't rollback here, continue with other updates
            
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
                        logger.info(f"📸 Added new image: {timestamped_filename}")
            
            # Update the modified timestamp
            item.updated_at = datetime.utcnow()
            
            # Commit changes
            db.session.commit()
            
            # Get the updated item for response
            updated_item = Item.query.get(item_id)
            
            # ===== FINAL IMAGE ORDER CHECK =====
            # This ensures the response to the frontend has the EXACT order the frontend requested
            # Get current database order
            current_db_images = [img.filename for img in updated_item.images]
            logger.info(f"📊 [FINAL CHECK] Current image order in DB: {current_db_images}")
            
            # If we processed images and the order doesn't match frontend's request, fix it in the response
            if image_processing_completed and 'existingImages' in request.form:
                # Create a clean response dictionary
                response_item_dict = updated_item.to_dict()
                
                # Get the order frontend requested
                frontend_order = json.loads(request.form.get('existingImages'))
                logger.info(f"📊 [FINAL CHECK] Frontend requested order: {frontend_order}")
                
                # Only include images that actually exist in both lists
                valid_images = [img for img in frontend_order if img in current_db_images]
                
                if set(valid_images) == set(current_db_images) and valid_images != current_db_images:
                    # Same images but different order - force the frontend's order in the response
                    logger.info(f"🔧 [FINAL CHECK] Forcing frontend image order in response")
                    response_item_dict['images'] = valid_images
                    
                    return jsonify({
                        'message': 'Item updated successfully',
                        'item': response_item_dict
                    }), 200
            
            logger.info(f"✅ Item {item_id} updated successfully.")
            
            # Return the updated item (normal case)
            return jsonify({
                'message': 'Item updated successfully',
                'item': updated_item.to_dict()
            }), 200
        except Exception as e:
            logger.error(f"💥 Error updating item {item_id} for user {user_id}: {str(e)}")
            # Include traceback for better debugging
            logger.error(traceback.format_exc())
            return safe_error_response(e, "Failed to update item")

    # Update a specific field of an item
    @app.route('/api/items/<item_id>/field', methods=['OPTIONS'])
    def update_item_field_options(item_id):
        """Handle preflight CORS requests for item field updates"""
        response = current_app.make_default_options_response()
        return response

    @app.route('/api/items/<item_id>/field', methods=['PATCH'])
    @require_auth
    def update_item_field(user_id, item_id):
        """
        Update a specific field of an item, verifying user ownership.
        """
        try:
            logger.info(f"🔄 Updating field for item {item_id}, user {user_id}")
            
            # Check if item exists and belongs to user
            item_data = database_service.get_item(user_id, item_id)
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
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
            
            # Use Firebase database service for field updates
            try:
                updated_item = database_service.update_item_field(user_id, item_id, field, value)
                logger.info(f"✅ Updated field {field} for item {item_id} via Firebase")
                return jsonify({
                    'message': f'Field {field} updated successfully',
                    'id': item_id,
                    'field': field,
                    'value': value
                }), 200
            except Exception as firebase_err:
                logger.error(f"❌ Firebase field update failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to update field: {str(firebase_err)}'}), 500
                
        except Exception as e:
            logger.error(f"💥 Error updating field for item {item_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return safe_error_response(e, "Failed to update item field")

    # Delete an item - verify ownership
    @app.route('/api/items/<item_id>', methods=['DELETE'])
    @require_auth
    def delete_item(user_id, item_id):
        """
        Delete an item and its associated data, verifying user ownership.
        """
        try:
            logger.info(f"🗑️ Deleting item {item_id} for user {user_id}")
            
            # Check if item exists and belongs to user
            item_data = database_service.get_item(user_id, item_id)
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Use Firebase database service for deletions
            try:
                success = database_service.delete_item(user_id, item_id)
                if success:
                    logger.info(f"✅ Deleted item {item_id} via Firebase for user {user_id}")
                    return jsonify({'message': f'Item {item_id} deleted successfully'}), 200
                else:
                    logger.error(f"❌ Failed to delete item {item_id} via Firebase")
                    return jsonify({'error': 'Failed to delete item'}), 500
            except Exception as firebase_err:
                logger.error(f"❌ Firebase delete failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to delete item: {str(firebase_err)}'}), 500
            
        except Exception as e:
            logger.error(f"💥 Error deleting item {item_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Sales Endpoints - all with user_id verification
    @app.route('/api/sales', methods=['GET'])
    @require_auth
    def get_sales(user_id):
        """
        Get all sales for the current user using database service.
        """
        try:
            logger.debug(f"📊 Fetching sales for user_id: {user_id}")
            
            # Use Firebase via database service
            sales_data = database_service.get_sales(user_id)
            logger.debug(f"✅ Retrieved {len(sales_data)} sales via Firebase for user_id: {user_id}")
            return jsonify(sales_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sales: {str(e)}")
            return safe_error_response(e, "Failed to fetch sales")

    # Create a new sale record
    @app.route('/api/sales', methods=['POST'])
    @require_auth
    def create_sale(user_id):
        """
        Create a new sale record and update item status to 'sold' using database service.
        """
        try:
            logger.info(f"📝 Creating new sale record for user_id: {user_id}")
            
            # Check if we have JSON data
            if not request.json:
                logger.error("❌ No sale data provided")
                return jsonify({'error': 'Missing sale data'}), 400
            
            data = request.json
            
            # Use Firebase via database service
            created_sale = database_service.create_sale(user_id, data)
            logger.info(f"✅ Sale created via Firebase with ID: {created_sale.get('id')} for user_id: {user_id}")
            return jsonify(created_sale), 201
            
        except Exception as e:
            logger.error(f"💥 Error creating sale for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get single sale with ownership verification
    @app.route('/api/sales/<sale_id>', methods=['GET'])
    @require_auth
    def get_sale(user_id, sale_id):
        """
        Get a single sale by ID with ownership verification.
        """
        try:
            logger.info(f"🔍 Fetching sale {sale_id} for user {user_id}")
            
            # Check if sale exists and belongs to user
            sale_data = database_service.get_sale(user_id, sale_id)
            if not sale_data:
                logger.warning(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': 'Sale not found'}), 404
            
            # Return the sale data directly from Firebase
            logger.info(f"✅ Retrieved sale {sale_id} from Firebase for user {user_id}")
            return jsonify(sale_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching sale {sale_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update a sale with ownership verification (continued)
    @app.route('/api/sales/<sale_id>', methods=['PUT'])
    @require_auth
    def update_sale(user_id, sale_id):
        """
        Update an existing sale record with ownership verification.
        """
        try:
            logger.info(f"📝 Updating sale {sale_id} for user {user_id}")
            data = request.json
            
            # Check if sale exists and belongs to user
            sale_data = database_service.get_sale(user_id, sale_id)
            if not sale_data:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Use Firebase database service for updates
            try:
                # Prepare update data
                update_data = {}
                if 'platform' in data:
                    update_data['platform'] = data['platform']
                if 'saleDate' in data:
                    update_data['saleDate'] = data['saleDate']
                if 'salePrice' in data:
                    update_data['salePrice'] = float(data['salePrice'])
                if 'currency' in data:
                    update_data['currency'] = data['currency']
                if 'salesTax' in data:
                    update_data['salesTax'] = float(data['salesTax'] or 0)
                if 'platformFees' in data:
                    update_data['platformFees'] = float(data['platformFees'] or 0)
                if 'status' in data:
                    update_data['status'] = data['status']
                if 'saleId' in data:
                    update_data['saleId'] = data['saleId']
                
                updated_sale = database_service.update_sale(user_id, sale_id, update_data)
                logger.info(f"✅ Updated sale {sale_id} via Firebase for user {user_id}")
                return jsonify(updated_sale), 200
            except Exception as firebase_err:
                logger.error(f"❌ Firebase sale update failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to update sale: {str(firebase_err)}'}), 500
            
        except Exception as e:
            logger.error(f"💥 Error updating sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Update a specific field of a sale
    @app.route('/api/sales/<sale_id>/field', methods=['OPTIONS'])
    def update_sale_field_options(sale_id):
        """Handle preflight CORS requests for sale field updates"""
        response = current_app.make_default_options_response()
        return response

    @app.route('/api/sales/<sale_id>/field', methods=['PATCH'])
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
            
            # Check if sale exists and belongs to user
            sale_data = database_service.get_sale(user_id, sale_id)
            if not sale_data:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Use Firebase database service for field updates
            try:
                updated_sale = database_service.update_sale_field(user_id, sale_id, field, value)
                logger.info(f"✅ Updated field {field} for sale {sale_id} via Firebase")
                return jsonify({
                    'message': f'Field {field} updated successfully',
                    'id': sale_id,
                    'field': field,
                    'value': value
                }), 200
            except Exception as firebase_err:
                logger.error(f"❌ Firebase field update failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to update field: {str(firebase_err)}'}), 500
            
        except Exception as e:
            logger.error(f"💥 Error updating field for sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Delete a sale with ownership verification
    @app.route('/api/sales/<sale_id>', methods=['DELETE'])
    @require_auth
    def delete_sale(user_id, sale_id):
        """
        Delete a sale record with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting sale {sale_id} for user {user_id}")
            
            # Check if sale exists and belongs to user
            sale_data = database_service.get_sale(user_id, sale_id)
            if not sale_data:
                logger.error(f"❌ Sale with ID {sale_id} not found")
                return jsonify({'error': f'Sale with ID {sale_id} not found'}), 404
            
            # Use Firebase database service for deletions
            try:
                success = database_service.delete_sale(user_id, sale_id)
                if success:
                    logger.info(f"✅ Deleted sale {sale_id} via Firebase for user {user_id}")
                    return jsonify({
                        'message': f'Sale {sale_id} deleted successfully',
                        'item_id': sale_data.get('itemId')
                    }), 200
                else:
                    logger.error(f"❌ Failed to delete sale {sale_id} via Firebase")
                    return jsonify({'error': 'Failed to delete sale'}), 500
            except Exception as firebase_err:
                logger.error(f"❌ Firebase delete failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to delete sale: {str(firebase_err)}'}), 500
            
        except Exception as e:
            logger.error(f"💥 Error deleting sale {sale_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Get sales by item ID with user ownership verification
    @app.route('/api/items/<item_id>/sales', methods=['GET'])
    @require_auth
    def get_sales_by_item(user_id, item_id):
        """
        Get all sales for a specific item with ownership verification.
        """
        try:
            logger.info(f"📊 Fetching sales for item {item_id}, user {user_id}")
            
            # Check if the item exists and belongs to user
            item_data = database_service.get_item(user_id, item_id)
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f'Item with ID {item_id} not found'}), 404
            
            # Use Firebase database service
            try:
                sales = database_service.get_sales_by_item(user_id, item_id)
                logger.info(f"✅ Fetched {len(sales)} sales for item {item_id} via Firebase")
                return jsonify(sales), 200
            except Exception as firebase_err:
                logger.error(f"❌ Firebase sales fetch failed: {str(firebase_err)}")
                return jsonify({'error': f'Failed to fetch sales: {str(firebase_err)}'}), 500
        except Exception as e:
            logger.error(f"💥 Error fetching sales for item {item_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # BULK SALES OPERATIONS
    # OPTIONS handler for bulk-delete (must be registered BEFORE the main route)
    @app.route('/api/sales/bulk-delete', methods=['OPTIONS'])
    def bulk_delete_sales_preflight():
        logger.info("🔄 Handling OPTIONS preflight for /api/sales/bulk-delete")
        response = current_app.response_class(status=200)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    @app.route('/api/sales/bulk-delete', methods=['POST'])
    @require_auth
    def bulk_delete_sales(user_id):
        """
        Delete multiple sales and restore their items to active status.
        """
        
        try:
            data = request.get_json()
            sale_ids = data.get('saleIds', [])
            
            if not sale_ids:
                return jsonify({'error': 'No sale IDs provided'}), 400
            
            logger.info(f"🗑️ Bulk deleting {len(sale_ids)} sales for user {user_id}")
            
            # Use database service for bulk delete
            result = database_service.bulk_delete_sales(user_id, sale_ids)
            
            if result.get('success'):
                logger.info(f"✅ Bulk deleted {result.get('deletedCount')} sales for user {user_id}")
                return jsonify({
                    'success': True,
                    'deletedCount': result.get('deletedCount'),
                    'failedSales': result.get('failedSales', [])
                }), 200
            else:
                logger.error(f"❌ Bulk delete failed for user {user_id}")
                return jsonify({'error': 'Bulk delete operation failed'}), 500
                
        except Exception as e:
            logger.error(f"💥 Error in bulk delete sales for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    # OPTIONS handler for bulk-return (must be registered BEFORE the main route)
    @app.route('/api/sales/bulk-return', methods=['OPTIONS'])
    def bulk_return_sales_preflight():
        logger.info("🔄 Handling OPTIONS preflight for /api/sales/bulk-return")
        response = current_app.response_class(status=200)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    @app.route('/api/sales/bulk-return', methods=['POST'])
    @require_auth
    def bulk_return_sales_to_inventory(user_id):
        """
        Return multiple sales to inventory by updating item status back to active.
        """
        
        try:
            data = request.get_json()
            sale_ids = data.get('saleIds', [])
            
            if not sale_ids:
                return jsonify({'error': 'No sale IDs provided'}), 400
            
            logger.info(f"🔄 Bulk returning {len(sale_ids)} sales to inventory for user {user_id}")
            
            # Use database service for bulk return
            result = database_service.bulk_return_sales_to_inventory(user_id, sale_ids)
            
            if result.get('success'):
                logger.info(f"✅ Bulk returned {result.get('returnedCount')} sales to inventory for user {user_id}")
                return jsonify({
                    'success': True,
                    'returnedCount': result.get('returnedCount'),
                    'failedSales': result.get('failedSales', [])
                }), 200
            else:
                logger.error(f"❌ Bulk return failed for user {user_id}")
                return jsonify({'error': 'Bulk return operation failed'}), 500
                
        except Exception as e:
            logger.error(f"💥 Error in bulk return sales to inventory for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # We'll handle OPTIONS requests at each specific endpoint instead of globally
    # This ensures that each endpoint can properly handle its own preflight requests

    # We don't need the cors_aware_auth decorator anymore since we're handling OPTIONS separately

    # EXPENSES API ENDPOINTS
    # Dedicated route for OPTIONS preflight requests - must be registered BEFORE the main route
    @app.route('/api/expenses/types', methods=['OPTIONS'])
    def expense_types_preflight():
        logger.info("🔄 Handling OPTIONS preflight for /api/expenses/types")
        try:
            response = current_app.response_class(status=200)
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            logger.info(f"✅ Successfully prepared preflight response for /api/expenses/types: status=200, headers={dict(response.headers)}")
            return response
        except Exception as e:
            logger.error(f"💥 ERROR in expense_types_preflight: {str(e)}", exc_info=True)
            # Fallback to a generic error response if something goes wrong internally
            return jsonify({'error': 'Preflight handler error'}), 500
        
    # Main GET route for expense types - requires authentication
    @app.route('/api/expenses/types', methods=['GET'])
    @require_auth
    def get_expense_types(user_id):
        """
        Get expense types for the current user.
        """
        try:
            logger.info(f"📋 Fetching expense types for user {user_id}")
            # Default expense types
            expense_types = [
                {"id": "shipping", "name": "Shipping"},
                {"id": "packaging", "name": "Packaging"},
                {"id": "platform_fees", "name": "Platform Fees"},
                {"id": "storage", "name": "Storage"},
                {"id": "supplies", "name": "Supplies"},
                {"id": "software", "name": "Software"},
                {"id": "marketing", "name": "Marketing"},
                {"id": "travel", "name": "Travel"},
                {"id": "utilities", "name": "Utilities"},
                {"id": "rent", "name": "Rent"},
                {"id": "insurance", "name": "Insurance"},
                {"id": "taxes", "name": "Taxes"},
                {"id": "other", "name": "Other"}
            ]
            response = jsonify(expense_types)
            # Add CORS headers to the response
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response
        except Exception as e:
            logger.error(f"💥 Error fetching expense types for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    
    @app.route('/api/expenses', methods=['GET'])
    @require_auth
    def get_expenses(user_id):
        """
        Get all expenses for the current user using database service.
        """
        try:
            logger.info(f"📋 Fetching expenses for user {user_id}")
            
            # Use Firebase via database service
            expenses_data = database_service.get_expenses(user_id)
            logger.info(f"✅ Retrieved {len(expenses_data)} expenses via Firebase for user_id: {user_id}")
            return jsonify(expenses_data)
        except Exception as e:
            logger.error(f"💥 Error fetching expenses for user {user_id}: {str(e)}")
            return safe_error_response(e, "Failed to fetch expenses")

    @app.route('/api/expenses', methods=['POST'])
    @require_auth
    def create_expense(user_id):
        """
        Create a new expense record for the current user using database service.
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
            
            # Use Firebase via database service
            created_expense = database_service.create_expense(user_id, expense_data)
            logger.info(f"✅ Expense created via Firebase with ID: {created_expense.get('id')} for user_id: {user_id}")
            return jsonify(created_expense), 201
            
        except Exception as e:
            logger.error(f"💥 Error creating expense for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<expense_id>', methods=['GET'])
    @require_auth
    def get_expense(user_id, expense_id):
        """
        Get a single expense by ID with ownership verification.
        """
        try:
            logger.info(f"🔍 Fetching expense {expense_id} for user {user_id}")
            
            # Check if expense exists and belongs to user
            expense_data = database_service.get_expense(user_id, expense_id)
            if not expense_data:
                logger.warning(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': 'Expense not found'}), 404
            
            logger.info(f"✅ Retrieved expense {expense_id} from Firebase for user {user_id}")
            return jsonify(expense_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching expense {expense_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<expense_id>', methods=['PUT'])
    @require_auth
    def update_expense(user_id, expense_id):
        """
        Update an existing expense with ownership verification.
        """
        try:
            logger.info(f"🔄 Updating expense {expense_id} for user {user_id}")
            
            # Check if expense exists and belongs to user
            expense_data = database_service.get_expense(user_id, expense_id)
            if not expense_data:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
            # Note: File uploads for Firebase are complex, return error for now
            if 'receipt' in request.files:
                logger.warning(f"⚠️ Receipt uploads not yet supported in Firebase mode for expense {expense_id}")
                return jsonify({'error': 'Receipt uploads not yet supported in Firebase mode'}), 501
            
            if 'data' not in request.form:
                logger.error("❌ No expense data provided")
                return jsonify({'error': 'Missing expense data'}), 400
            
            # Parse the JSON data
            form_data = json.loads(request.form.get('data'))
            
            # Prepare update data
            update_data = {}
            if 'expenseType' in form_data:
                update_data['expenseType'] = form_data['expenseType']
            if 'amount' in form_data:
                update_data['amount'] = float(form_data['amount'])
            if 'currency' in form_data:
                update_data['currency'] = form_data['currency']
            if 'expenseDate' in form_data:
                update_data['expenseDate'] = form_data['expenseDate']
            if 'vendor' in form_data:
                update_data['vendor'] = form_data['vendor']
            if 'notes' in form_data:
                update_data['notes'] = form_data['notes']
            if 'isRecurring' in form_data:
                update_data['isRecurring'] = form_data['isRecurring']
            if 'recurrencePeriod' in form_data:
                update_data['recurrencePeriod'] = form_data['recurrencePeriod']
            
            updated_expense = database_service.update_expense(user_id, expense_id, update_data)
            logger.info(f"✅ Updated expense {expense_id} via Firebase for user {user_id}")
            return jsonify(updated_expense), 200
        except Exception as e:
            logger.error(f"💥 Error updating expense {expense_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/expenses/<expense_id>/receipt-url', methods=['GET'])
    @require_auth
    def get_expense_receipt_url(user_id, expense_id):
        """
        Get the URL for a receipt associated with an expense using database service.
        """
        try:
            logger.info(f"🔍 Getting receipt URL for expense {expense_id} by user {user_id}")
            
            # Use Firebase via database service
            receipt_url = database_service.get_expense_receipt_url(user_id, str(expense_id))
            
            if not receipt_url:
                logger.error(f"❌ No receipt found for expense {expense_id}")
                return jsonify({'error': 'No receipt attached to this expense'}), 404
            
            logger.info(f"✅ Generated receipt URL via Firebase for expense {expense_id}: {receipt_url}")
            return jsonify(receipt_url), 200
            
        except Exception as e:
            logger.error(f"💥 Error getting receipt URL for expense {expense_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/expenses/<expense_id>', methods=['DELETE'])
    @require_auth
    def delete_expense(user_id, expense_id):
        """
        Delete an expense record with ownership verification.
        """
        try:
            logger.info(f"🗑️ Deleting expense {expense_id} for user {user_id}")
            
            # Check if expense exists and belongs to user
            expense_data = database_service.get_expense(user_id, expense_id)
            if not expense_data:
                logger.error(f"❌ Expense with ID {expense_id} not found")
                return jsonify({'error': f'Expense with ID {expense_id} not found'}), 404
            
            # Use database service for deletions
            success = database_service.delete_expense(user_id, expense_id)
            if success:
                logger.info(f"✅ Deleted expense {expense_id} via Firebase for user {user_id}")
                return jsonify({'message': f'Expense {expense_id} deleted successfully'}), 200
            else:
                logger.error(f"❌ Failed to delete expense {expense_id} via Firebase")
                return jsonify({'error': 'Failed to delete expense'}), 500
        except Exception as e:
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
            
            # Get all expenses for user
            all_expenses = database_service.get_expenses(user_id)
            
            # Apply date filters if provided
            expenses = []
            start_date = None
            end_date = None
            
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                except ValueError:
                    logger.warning(f"❌ Invalid start date format: {start_date_str}")
            
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                except ValueError:
                    logger.warning(f"❌ Invalid end date format: {end_date_str}")
            
            # Filter expenses by date
            for expense in all_expenses:
                expense_date = None
                if expense.get('expense_date'):
                    try:
                        expense_date = datetime.fromisoformat(str(expense['expense_date']).replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        continue
                
                # Apply date filters
                if start_date and expense_date and expense_date < start_date:
                    continue
                if end_date and expense_date and expense_date > end_date:
                    continue
                
                expenses.append(expense)
            
            # Calculate summary statistics
            total_amount = sum(expense.get('amount', 0) for expense in expenses)
            expense_count = len(expenses)
            
            # Group expenses by type
            expense_by_type = {}
            for expense in expenses:
                expense_type = expense.get('expense_type', 'other')
                if expense_type not in expense_by_type:
                    expense_by_type[expense_type] = 0
                expense_by_type[expense_type] += expense.get('amount', 0)
            
            # Calculate month-over-month change if possible
            current_month_total = 0
            previous_month_total = 0
            
            if start_date_str and end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    
                    # Calculate current period expenses (already done above)
                    current_month_total = total_amount
                    
                    # Calculate previous period range
                    month_diff = (end_date - start_date).days
                    prev_end_date = start_date
                    prev_start_date = prev_end_date - timedelta(days=month_diff)
                    
                    # Calculate previous period expenses
                    previous_month_expenses = []
                    for expense in all_expenses:
                        expense_date = None
                        if expense.get('expense_date'):
                            try:
                                expense_date = datetime.fromisoformat(str(expense['expense_date']).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                continue
                        
                        # Apply previous period date filters
                        if expense_date and expense_date >= prev_start_date and expense_date < prev_end_date:
                            previous_month_expenses.append(expense)
                    
                    previous_month_total = sum(expense.get('amount', 0) for expense in previous_month_expenses)
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



    # TAGS API WITH USER OWNERSHIP
    @app.route('/api/user-tags', methods=['GET'])
    @require_auth
    def get_user_tags(user_id):
        """
        Get all tags for the current user using database service.
        """
        try:
            logger.info(f"📋 Fetching tags for user {user_id}")
            # Use Firebase via database service
            tags_data = database_service.get_tags(user_id)
            logger.info(f"✅ Retrieved {len(tags_data)} tags via Firebase for user {user_id}")
            return jsonify(tags_data), 200
        except Exception as e:
            logger.error(f"💥 Error fetching tags for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags', methods=['POST'])
    @require_auth
    def create_user_tag(user_id):
        """
        Create a new tag for the current user using database service.
        """
        try:
            logger.info(f"🏷️ Creating new tag for user {user_id}")
            data = request.json
            
            # Validate request
            if not data or 'name' not in data:
                logger.error("❌ Missing required field: name")
                return jsonify({'error': 'Missing required field: name'}), 400
            
            # Use Firebase via database service
            # Check for duplicate tag name
            existing_tag = database_service.get_tag_by_name(user_id, data['name'])
            if existing_tag:
                logger.error(f"❌ Tag with name '{data['name']}' already exists for user {user_id}")
                return jsonify({'error': f"Tag with name '{data['name']}' already exists"}), 400
            
            # Create tag data
            tag_data = {
                'name': data['name'],
                'color': data.get('color', '#8884d8')  # Default color if not provided
            }
            
            created_tag = database_service.create_tag(user_id, tag_data)
            logger.info(f"✅ Created tag '{data['name']}' via Firebase with ID {created_tag.get('id')} for user {user_id}")
            return jsonify(created_tag), 201
        except Exception as e:
            logger.error(f"💥 Error creating tag for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags/<tag_id>', methods=['PUT'])
    @require_auth
    def update_user_tag(user_id, tag_id):
        """
        Update an existing tag with ownership verification using database service.
        """
        try:
            logger.info(f"🔄 Updating tag {tag_id} for user {user_id}")
            data = request.json
            
            # Validate request
            if not data or ('name' not in data and 'color' not in data):
                logger.error("❌ Missing required fields: name or color")
                return jsonify({'error': 'Missing required fields: name or color'}), 400
            
            # Use Firebase via database service
            # Check if tag exists and belongs to user
            tag_data = database_service.get_tag(user_id, str(tag_id))
            if not tag_data:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': 'Tag not found'}), 404
            
            # Check for duplicate tag name if name is being changed
            if 'name' in data and data['name'] != tag_data.get('name'):
                existing_tag = database_service.get_tag_by_name(user_id, data['name'])
                if existing_tag:
                    logger.error(f"❌ Tag with name '{data['name']}' already exists for user {user_id}")
                    return jsonify({'error': f"Tag with name '{data['name']}' already exists"}), 400
            
            # Update tag
            update_data = {}
            if 'name' in data:
                update_data['name'] = data['name']
            if 'color' in data:
                update_data['color'] = data['color']
            
            updated_tag = database_service.update_tag(user_id, str(tag_id), update_data)
            logger.info(f"✅ Updated tag {tag_id} via Firebase for user {user_id}")
            return jsonify(updated_tag), 200
        except Exception as e:
            logger.error(f"💥 Error updating tag {tag_id} for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-tags/<tag_id>', methods=['DELETE'])
    @require_auth
    def delete_user_tag(user_id, tag_id):
        """
        Delete a tag with ownership verification using database service.
        """
        try:
            logger.info(f"🗑️ Deleting tag {tag_id} for user {user_id}")
            
            # Use Firebase via database service
            # Check if tag exists and belongs to user
            tag_data = database_service.get_tag(user_id, str(tag_id))
            if not tag_data:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': 'Tag not found'}), 404
            
            # Note: Firebase doesn't have the complex item-tag relationships like SQLite
            # Tags are stored as simple arrays in items, so we don't need to handle relationships
            
            # Delete tag
            success = database_service.delete_tag(user_id, str(tag_id))
            if success:
                logger.info(f"✅ Deleted tag {tag_id} via Firebase for user {user_id}")
                return jsonify({'message': f'Tag {tag_id} deleted successfully'}), 200
            else:
                logger.error(f"❌ Failed to delete tag {tag_id} via Firebase")
                return jsonify({'error': 'Failed to delete tag'}), 500
        except Exception as e:
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
            logger.debug(f"📊 Generating comprehensive dashboard KPI metrics for user {user_id}")
            
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
            # Get all items for this user
            all_items = database_service.get_items(user_id)
            
            # Filter active items (not sold) and apply date filters
            active_items = []
            for item in all_items:
                if item.get('status') != 'sold':
                    # Apply date filters if provided
                    if start_date or end_date:
                        # Parse purchase_date from item - handle both field name formats
                        purchase_date = None
                        purchase_date_value = item.get('purchase_date') or item.get('purchaseDate')
                        if purchase_date_value:
                            try:
                                purchase_date = datetime.fromisoformat(str(purchase_date_value).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                logger.warning(f"⚠️ Invalid purchase date format: {purchase_date_value}")
                                continue
                        
                        # Apply date filters
                        if start_date and purchase_date and purchase_date < start_date:
                            continue
                        if end_date and purchase_date and purchase_date > end_date:
                            continue
                    
                    active_items.append(item)
            
            # Count items by status
            total_inventory = len(active_items)
            unlisted_items = len([item for item in active_items if item.get('status') == 'unlisted'])
            listed_items = len([item for item in active_items if item.get('status') == 'listed'])
            
            # Calculate inventory values - handle both camelCase (Firebase) and snake_case (SQLite) field names
            total_inventory_cost = sum(
                item.get('purchase_price', 0) or item.get('purchasePrice', 0) for item in active_items
            )
            total_shipping_cost = sum(
                item.get('shipping_price', 0) or item.get('shippingPrice', 0) for item in active_items
            )
            
            # Estimate market value
            total_market_value = sum(
                (item.get('market_price', 0) or item.get('marketPrice', 0)) if (item.get('market_price') or item.get('marketPrice')) 
                else ((item.get('purchase_price', 0) or item.get('purchasePrice', 0)) * 1.2)
                for item in active_items
            )
            
            # Estimate potential profit
            potential_profit = total_market_value - total_inventory_cost - total_shipping_cost
            
            # ---- SALES METRICS ----
            # Get all sales for this user
            all_sales = database_service.get_sales(user_id)
            
            # Filter completed sales and apply date filters
            sales = []
            for sale in all_sales:
                if sale.get('status') == 'completed':
                    # Apply date filters if provided
                    if start_date or end_date:
                        # Parse sale_date from sale - handle both field name formats
                        sale_date = None
                        sale_date_value = sale.get('sale_date') or sale.get('saleDate')
                        if sale_date_value:
                            try:
                                sale_date = datetime.fromisoformat(str(sale_date_value).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                logger.warning(f"⚠️ Invalid sale date format: {sale_date_value}")
                                continue
                        
                        # Apply date filters
                        if start_date and sale_date and sale_date < start_date:
                            continue
                        if end_date and sale_date and sale_date > end_date:
                            continue
                    
                    sales.append(sale)
            
            # Calculate sales metrics - handle both camelCase (Firebase) and snake_case (SQLite) field names
            total_sales = len(sales)
            total_sales_revenue = sum(
                sale.get('sale_price', 0) or sale.get('salePrice', 0) for sale in sales
            )
            total_platform_fees = sum(
                sale.get('platform_fees', 0) or sale.get('platformFees', 0) for sale in sales
            )
            total_sales_tax = sum(
                sale.get('sales_tax', 0) or sale.get('salesTax', 0) for sale in sales
            )
            
            # Calculate cost basis of sold items - handle both field name formats
            cost_of_goods_sold = 0
            sold_items_shipping_cost = 0
            
            for sale in sales:
                item_id = sale.get('item_id') or sale.get('itemId')
                if item_id:
                    item = database_service.get_item(user_id, item_id)
                    if item:
                        cost_of_goods_sold += item.get('purchase_price', 0) or item.get('purchasePrice', 0)
                        sold_items_shipping_cost += item.get('shipping_price', 0) or item.get('shippingPrice', 0)
            
            # Calculate gross profit from sales
            gross_profit = (
                total_sales_revenue 
                - cost_of_goods_sold 
                - total_platform_fees 
                - total_sales_tax 
                - sold_items_shipping_cost
            )
            
            # ---- EXPENSE METRICS ----
            # Get all expenses for this user
            all_expenses = database_service.get_expenses(user_id)
            
            # Filter expenses by date if provided
            expenses = []
            for expense in all_expenses:
                # Apply date filters if provided
                if start_date or end_date:
                    # Parse expense_date from expense - handle both field name formats
                    expense_date = None
                    expense_date_value = expense.get('expense_date') or expense.get('expenseDate')
                    if expense_date_value:
                        try:
                            expense_date = datetime.fromisoformat(str(expense_date_value).replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            logger.warning(f"⚠️ Invalid expense date format: {expense_date_value}")
                            continue
                    
                    # Apply date filters
                    if start_date and expense_date and expense_date < start_date:
                        continue
                    if end_date and expense_date and expense_date > end_date:
                        continue
                
                expenses.append(expense)
            
            # Calculate expense metrics - handle both field name formats
            total_expenses = sum(expense.get('amount', 0) for expense in expenses)
            
            # Group expenses by type
            expense_by_type = {}
            for expense in expenses:
                expense_type = expense.get('expense_type', 'other') or expense.get('expenseType', 'other')
                if expense_type not in expense_by_type:
                    expense_by_type[expense_type] = 0
                expense_by_type[expense_type] += expense.get('amount', 0)
            
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
                # Filter completed sales for previous period
                prev_sales = []
                for sale in all_sales:
                    if sale.get('status') == 'completed':
                        # Parse sale_date - handle both field name formats
                        sale_date = None
                        sale_date_value = sale.get('sale_date') or sale.get('saleDate')
                        if sale_date_value:
                            try:
                                sale_date = datetime.fromisoformat(str(sale_date_value).replace('Z', '+00:00'))
                            except (ValueError, TypeError):
                                continue
                        
                        # Apply previous period date filters
                        if sale_date and sale_date >= prev_start_date and sale_date < prev_end_date:
                            prev_sales.append(sale)
                
                prev_total_sales_revenue = sum(
                    sale.get('sale_price', 0) or sale.get('salePrice', 0) for sale in prev_sales
                )
                prev_total_platform_fees = sum(
                    sale.get('platform_fees', 0) or sale.get('platformFees', 0) for sale in prev_sales
                )
                prev_total_sales_tax = sum(
                    sale.get('sales_tax', 0) or sale.get('salesTax', 0) for sale in prev_sales
                )
                
                prev_cost_of_goods_sold = 0
                prev_sold_items_shipping_cost = 0
                
                for sale in prev_sales:
                    item_id = sale.get('item_id') or sale.get('itemId')
                    if item_id:
                        item = database_service.get_item(user_id, item_id)
                        if item:
                            prev_cost_of_goods_sold += item.get('purchase_price', 0) or item.get('purchasePrice', 0)
                            prev_sold_items_shipping_cost += item.get('shipping_price', 0) or item.get('shippingPrice', 0)
                
                prev_gross_profit = (
                    prev_total_sales_revenue 
                    - prev_cost_of_goods_sold 
                    - prev_total_platform_fees 
                    - prev_total_sales_tax 
                    - prev_sold_items_shipping_cost
                )
                
                # --- PREVIOUS PERIOD EXPENSES ---
                # Filter expenses for previous period
                prev_expenses = []
                for expense in all_expenses:
                    # Parse expense_date - handle both field name formats
                    expense_date = None
                    expense_date_value = expense.get('expense_date') or expense.get('expenseDate')
                    if expense_date_value:
                        try:
                            expense_date = datetime.fromisoformat(str(expense_date_value).replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            continue
                    
                    # Apply previous period date filters
                    if expense_date and expense_date >= prev_start_date and expense_date < prev_end_date:
                        prev_expenses.append(expense)
                
                prev_total_expenses = sum(expense.get('amount', 0) for expense in prev_expenses)
                
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
            
            logger.debug(f"✅ Generated comprehensive dashboard KPI metrics for user {user_id}")
            return jsonify(metrics), 200
        except Exception as e:
            logger.error(f"💥 Error generating dashboard KPI metrics for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Dedicated route for OPTIONS preflight requests for file uploads
    @app.route('/api/uploads/<path:filename>', methods=['OPTIONS'])
    def serve_user_image_options(filename):
        logger.info(f"🔄 Handling OPTIONS preflight for /api/uploads/{filename}")
        try:
            response = current_app.response_class(status=200)
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            logger.info(f"✅ Successfully prepared preflight response for /api/uploads/{filename}: status=200, headers={dict(response.headers)}")
            return response
        except Exception as e:
            logger.error(f"💥 ERROR in serve_user_image_options for {filename}: {str(e)}", exc_info=True)
            return jsonify({'error': 'Preflight handler error'}), 500
        
    # Serve uploaded images with user verification
    @app.route('/api/uploads/<path:filename>', methods=['GET', 'HEAD'])
    def serve_user_image(filename):
        """
        Serve uploaded files (images or receipts).
        The 'filename' path is expected to be 'user_id/actual_image_name.ext' or 'user_id/receipts/receipt_name.ext'.
        """
        # OPTIONS requests are now handled by the separate route
        
        # Always get the logger instance to avoid UnboundLocalError
        img_req_logger_instance = logging.getLogger('sneaker_app.image_requests')
        
        # Only log image requests when debugging is enabled
        if current_app.config.get('DEBUG_IMAGE_REQUESTS', False):
            img_req_logger_instance.info(f"Image request for: {filename}")
        
        # Basic security check: prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            img_req_logger_instance.warning(f"Potential directory traversal attempt: {filename}")
            return jsonify({"error": "Invalid path"}), 400

        try:
            # Extract user_id from the path to verify ownership
            parts = filename.split('/')
            if len(parts) >= 1:
                user_id = parts[0]
                img_req_logger_instance.info(f"User ID from path: {user_id}")
                
                # Optional: Verify the user has access to this file (from token or query param)
                # For now, we'll just log the info and proceed
            
            # Construct the full path to the image
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            img_req_logger_instance.info(f"Looking for file at: {image_path}")
            
            if os.path.exists(image_path):
                # Only log when debugging is enabled
                if current_app.config.get('DEBUG_IMAGE_REQUESTS', False):
                    img_req_logger_instance.info(f"✅ Serving file: {image_path}")
                response = send_from_directory(current_app.config['UPLOAD_FOLDER'], filename, as_attachment=False)
                
                # Add CORS headers to the response
                response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
                response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                
                return response
            else:
                # Try to find the file in alternative locations
                # 1. Check if it's in the receipts folder but path doesn't include it
                if 'receipts' not in filename and '/receipts/' not in filename:
                    alt_path = os.path.join(current_app.config['UPLOAD_FOLDER'], user_id, 'receipts', os.path.basename(filename))
                    if os.path.exists(alt_path):
                        img_req_logger_instance.info(f"Found file in receipts folder: {alt_path}")
                        new_filename = f"{user_id}/receipts/{os.path.basename(filename)}"
                        response = send_from_directory(current_app.config['UPLOAD_FOLDER'], new_filename, as_attachment=False)
                        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
                        return response
                
                # 2. Check if it's not in receipts folder but path includes it
                if 'receipts' in filename:
                    alt_path = os.path.join(current_app.config['UPLOAD_FOLDER'], user_id, os.path.basename(filename))
                    if os.path.exists(alt_path):
                        img_req_logger_instance.info(f"Found file in user folder: {alt_path}")
                        new_filename = f"{user_id}/{os.path.basename(filename)}"
                        response = send_from_directory(current_app.config['UPLOAD_FOLDER'], new_filename, as_attachment=False)
                        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
                        return response
                
                # Log that the image was not found, and serve a placeholder
                img_req_logger_instance.warning(f"❌ File not found: {image_path}. Tried alternative paths too.")
                static_folder_images = os.path.join(current_app.static_folder, 'images')
                placeholder_path = os.path.join(static_folder_images, 'placeholder.png')
            
            if os.path.exists(placeholder_path):
                img_req_logger_instance.info(f"Serving placeholder image for: {filename} from {static_folder_images}")
                response = send_from_directory(static_folder_images, 'placeholder.png', as_attachment=False)
                response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
                return response
            else:
                # If placeholder itself is not found, return a generic 404
                img_req_logger_instance.error(f"Placeholder image not found at: {placeholder_path}")
                return jsonify({"error": "Image and placeholder not found"}), 404
        except Exception as e:
            img_req_logger_instance.error(f"Error serving image {filename}: {e}", exc_info=True) # Log full traceback
            return jsonify({"error": "Server error while serving image"}), 500

    # Removed excessive request logging to reduce memory usage
    # @app.before_request
    # def log_request_info():
    #     logger.debug('Headers: %s', request.headers)
    #     logger.debug('Body: %s', request.get_data())

    # Recovery endpoint for orphaned sold items
    @app.route('/api/recovery/orphaned-sold-items', methods=['GET'])
    @require_auth
    def get_orphaned_sold_items(user_id):
        """
        Find items marked as 'sold' but have no corresponding sales records.
        These are likely items that got orphaned during the Firebase migration.
        """
        try:
            logger.info(f"🔍 Checking for orphaned sold items for user {user_id}")
            
            if not (database_service and database_service.is_using_firebase()):
                return jsonify({'error': 'This endpoint is only available in Firebase mode'}), 400
            
            # Get all items for the user
            items = database_service.get_items(user_id)
            
            # Get all sales for the user
            sales = database_service.get_sales(user_id)
            
            # Create a set of item IDs that have sales
            sold_item_ids = {str(sale.get('itemId')) for sale in sales if sale.get('itemId')}
            
            # Find items marked as 'sold' but have no sales record
            orphaned_items = []
            for item in items:
                if item.get('status') == 'sold' and str(item.get('id')) not in sold_item_ids:
                    orphaned_items.append({
                        'id': item.get('id'),
                        'product_name': item.get('product_name', 'Unknown'),
                        'brand': item.get('brand', 'Unknown'),
                        'category': item.get('category', 'Unknown'),
                        'purchase_price': item.get('purchase_price', 0),
                        'status': item.get('status'),
                        'created_at': item.get('created_at')
                    })
            
            logger.info(f"✅ Found {len(orphaned_items)} orphaned sold items for user {user_id}")
            return jsonify({
                'orphaned_items': orphaned_items,
                'total_items': len(items),
                'total_sales': len(sales),
                'orphaned_count': len(orphaned_items)
            }), 200
            
        except Exception as e:
            logger.error(f"💥 Error checking orphaned sold items for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Recovery endpoint to restore orphaned items to active status
    @app.route('/api/recovery/restore-orphaned-items', methods=['POST'])
    @require_auth
    def restore_orphaned_items(user_id):
        """
        Restore orphaned sold items back to 'active' status.
        """
        try:
            logger.info(f"🔧 Restoring orphaned sold items for user {user_id}")
            
            if not (database_service and database_service.is_using_firebase()):
                return jsonify({'error': 'This endpoint is only available in Firebase mode'}), 400
            
            data = request.json or {}
            item_ids = data.get('item_ids', [])
            
            if not item_ids:
                return jsonify({'error': 'No item IDs provided'}), 400
            
            restored_items = []
            failed_items = []
            
            for item_id in item_ids:
                try:
                    # Update the item status to 'active'
                    updated_item = database_service.update_item_field(user_id, str(item_id), 'status', 'active')
                    if updated_item:
                        restored_items.append({
                            'id': item_id,
                            'product_name': updated_item.get('product_name', 'Unknown'),
                            'status': updated_item.get('status')
                        })
                        logger.info(f"✅ Restored item {item_id} to active status")
                    else:
                        failed_items.append(item_id)
                        logger.error(f"❌ Failed to restore item {item_id} - item not found")
                except Exception as item_error:
                    failed_items.append(item_id)
                    logger.error(f"❌ Failed to restore item {item_id}: {str(item_error)}")
            
            logger.info(f"🎉 Restoration complete: {len(restored_items)} restored, {len(failed_items)} failed")
            return jsonify({
                'restored_items': restored_items,
                'failed_items': failed_items,
                'restored_count': len(restored_items),
                'failed_count': len(failed_items)
            }), 200
            
        except Exception as e:
            logger.error(f"💥 Error restoring orphaned items for user {user_id}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # TEMPORARY: No-auth recovery endpoints for debugging (remove in production)
    @app.route('/api/temp-recovery/orphaned-sold-items', methods=['GET'])
    def temp_get_orphaned_sold_items():
        """
        TEMPORARY: Find orphaned sold items without auth for debugging.
        Uses the known user ID from logs: PpdcAvliVrR4zBAH6WGBeLqd0c73
        """
        try:
            # HARDCODED USER ID for testing - REMOVE IN PRODUCTION
            user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
            
            logger.info(f"🔍 [TEMP] Checking for orphaned sold items for user {user_id}")
            
            if not (database_service and database_service.is_using_firebase()):
                return jsonify({'error': 'This endpoint is only available in Firebase mode'}), 400
            
            # Get all items for the user
            items = database_service.get_items(user_id)
            
            # Get all sales for the user
            sales = database_service.get_sales(user_id)
            
            # Create a set of item IDs that have sales
            sold_item_ids = {str(sale.get('itemId')) for sale in sales if sale.get('itemId')}
            
            # Find items marked as 'sold' but have no sales record
            orphaned_items = []
            active_items = []
            
            for item in items:
                item_summary = {
                    'id': item.get('id'),
                    'product_name': item.get('product_name', 'Unknown'),
                    'brand': item.get('brand', 'Unknown'),
                    'category': item.get('category', 'Unknown'),
                    'purchase_price': item.get('purchase_price', 0),
                    'status': item.get('status'),
                    'created_at': item.get('created_at')
                }
                
                if item.get('status') == 'sold' and str(item.get('id')) not in sold_item_ids:
                    orphaned_items.append(item_summary)
                elif item.get('status') in ['active', 'listed']:
                    active_items.append(item_summary)
            
            logger.info(f"✅ [TEMP] Found {len(orphaned_items)} orphaned items, {len(active_items)} active items")
            return jsonify({
                'orphaned_items': orphaned_items,
                'active_items': active_items,
                'total_items': len(items),
                'total_sales': len(sales),
                'orphaned_count': len(orphaned_items),
                'active_count': len(active_items),
                'sold_item_ids_with_sales': list(sold_item_ids)
            }), 200
            
        except Exception as e:
            logger.error(f"💥 [TEMP] Error checking orphaned sold items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # TEMPORARY: No-auth restore endpoint
    @app.route('/api/temp-recovery/restore-orphaned-items', methods=['POST'])
    def temp_restore_orphaned_items():
        """
        TEMPORARY: Restore orphaned sold items without auth for debugging.
        """
        try:
            # HARDCODED USER ID for testing - REMOVE IN PRODUCTION
            user_id = "PpdcAvliVrR4zBAH6WGBeLqd0c73"
            
            logger.info(f"🔧 [TEMP] Restoring orphaned sold items for user {user_id}")
            
            if not (database_service and database_service.is_using_firebase()):
                return jsonify({'error': 'This endpoint is only available in Firebase mode'}), 400
            
            data = request.json or {}
            item_ids = data.get('item_ids', [])
            
            if not item_ids:
                return jsonify({'error': 'No item IDs provided'}), 400
            
            restored_items = []
            failed_items = []
            
            for item_id in item_ids:
                try:
                    # Update the item status to 'active'
                    updated_item = database_service.update_item_field(user_id, str(item_id), 'status', 'active')
                    if updated_item:
                        restored_items.append({
                            'id': item_id,
                            'product_name': updated_item.get('product_name', 'Unknown'),
                            'status': updated_item.get('status')
                        })
                        logger.info(f"✅ [TEMP] Restored item {item_id} to active status")
                    else:
                        failed_items.append(item_id)
                        logger.error(f"❌ [TEMP] Failed to restore item {item_id} - item not found")
                except Exception as item_error:
                    failed_items.append(item_id)
                    logger.error(f"❌ [TEMP] Failed to restore item {item_id}: {str(item_error)}")
            
            logger.info(f"🎉 [TEMP] Restoration complete: {len(restored_items)} restored, {len(failed_items)} failed")
            return jsonify({
                'restored_items': restored_items,
                'failed_items': failed_items,
                'restored_count': len(restored_items),
                'failed_count': len(failed_items)
            }), 200
            
        except Exception as e:
            logger.error(f"💥 [TEMP] Error restoring orphaned items: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/dashboard/metrics', methods=['GET'])
    @require_auth
    def get_dashboard_metrics_general(user_id):
        """Get dashboard metrics for authenticated user"""
        try:
            # Get metrics from Firebase for the authenticated user
            metrics = database_service.firebase_service.get_dashboard_metrics(user_id)
            
            return jsonify(metrics), 200
            
        except Exception as e:
            logger.error(f"Error getting dashboard metrics for user {user_id}: {e}")
            return jsonify({'error': 'Failed to get dashboard metrics'}), 500

    @app.route('/api/dashboard/metrics/<requested_user_id>', methods=['GET'])
    @require_auth
    def get_dashboard_metrics_by_user(user_id, requested_user_id):
        """Get dashboard metrics for a specific user"""
        try:
            # Verify user access
            if user_id != requested_user_id:
                return jsonify({'error': 'Unauthorized access'}), 403
            
            # Get metrics from Firebase
            metrics = database_service.firebase_service.get_dashboard_metrics(requested_user_id)
            
            return jsonify(metrics), 200
            
        except Exception as e:
            logger.error(f"Error getting dashboard metrics for user {requested_user_id}: {e}")
            return jsonify({'error': 'Failed to get dashboard metrics'}), 500

    return app


app = create_app()

# Shell context processor removed - Phase 3 uses Firebase only

if __name__ == '__main__':
    app = create_app()

    # Use app.config.get() for startup messages. 
    # Provide string literal defaults for logging if the keys might not be in app.config yet.
    host_to_log = app.config.get('HOST', '127.0.0.1') 
    port_to_log = app.config.get('PORT', 5000)

    app.logger.info(f"Starting Flask application on http://{host_to_log}:{port_to_log}")
    app.logger.info(f"Upload directory: {app.config.get('UPLOAD_FOLDER', 'Not Set')}")
    app.logger.info(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not Set')}")
    app.logger.info(f"JWT Secret Key: {'Set' if app.config.get('JWT_SECRET_KEY') else 'Not Set'}")

    upload_folder = app.config.get('UPLOAD_FOLDER')
    if upload_folder and not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        app.logger.info(f"Created upload directory: {upload_folder}")

    # Let app.run() use its internal defaults if HOST/PORT are not in app.config
    # by passing None if the key is not found.
    run_host = app.config.get('HOST') 
    run_port = app.config.get('PORT')
    run_debug = app.config.get('DEBUG')

    app.run(host=run_host, port=run_port, debug=run_debug)

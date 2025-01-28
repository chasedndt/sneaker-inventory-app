from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enhanced CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600,
        "supports_credentials": True
    }
})

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['DEBUG'] = True

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload directory at: {UPLOAD_FOLDER}")

# Test endpoint
@app.route('/api/test', methods=['GET'])
def test_connection():
    app.logger.info("Test endpoint hit")
    return jsonify({'status': 'connected'}), 200

@app.route('/api/items', methods=['POST'])
def add_item():
    try:
        if not request.is_json:
            app.logger.error("Request is not JSON")
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.get_json()
        app.logger.info(f"Received data: {data}")
        
        if not data:
            app.logger.error("No JSON data received")
            return jsonify({'error': 'Invalid data'}), 400
        
        app.logger.info("Item added successfully")
        return jsonify({'message': 'Item added successfully'}), 201
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_images():
    try:
        app.logger.info("Upload endpoint hit")
        if 'images' not in request.files:
            app.logger.error("No 'images' field in request.files")
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('images')
        app.logger.info(f"Received {len(files)} files")
        
        uploaded_files = []
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                app.logger.info(f"Attempting to save file: {filepath}")
                
                try:
                    file.save(filepath)
                    uploaded_files.append(filename)
                    app.logger.info(f"Successfully saved file: {filename}")
                except Exception as e:
                    app.logger.error(f"Error saving file {filename}: {str(e)}")
                    return jsonify({'error': f'Error saving file: {str(e)}'}), 500
            else:
                app.logger.warning(f"Invalid file: {file.filename if file.filename else 'unnamed'}")

        if not uploaded_files:
            app.logger.error("No valid files were uploaded")
            return jsonify({'error': 'No valid files uploaded'}), 400

        app.logger.info(f"Successfully uploaded {len(uploaded_files)} files")
        return jsonify({'uploaded_files': uploaded_files}), 200
    except Exception as e:
        app.logger.error(f"Error processing upload: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.before_request
def log_request_info():
    logger.debug('Headers: %s', request.headers)
    logger.debug('Body: %s', request.get_data())

if __name__ == '__main__':
    logger.info(f"Starting Flask application on http://127.0.0.1:5000")
    logger.info(f"Upload directory: {UPLOAD_FOLDER}")
    app.run(debug=True, host='127.0.0.1', port=5000)

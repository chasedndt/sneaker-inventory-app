# backend/tag_routes.py
from flask import Blueprint, request, jsonify
import os
import json
import time
import logging
from database_service import DatabaseService
from auth_helpers import require_auth
import traceback

# Set up logging with more details
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

# Create blueprint
tag_routes = Blueprint('tag_routes', __name__)

# Database service - lazy initialization
database_service = None

def get_database_service():
    """Get or create the database service instance"""
    global database_service
    if database_service is None:
        database_service = DatabaseService()
    return database_service

# Tags JSON file path (for fallback only)
TAGS_FILE = os.path.join(os.path.dirname(__file__), 'instance', 'tags.json')

def ensure_tags_file_exists():
    """Ensure the tags file exists and is a valid JSON (fallback only)"""
    os.makedirs(os.path.dirname(TAGS_FILE), exist_ok=True)
    if not os.path.exists(TAGS_FILE):
        with open(TAGS_FILE, 'w') as f:
            json.dump([], f)
    else:
        try:
            with open(TAGS_FILE, 'r') as f:
                json.load(f)
        except json.JSONDecodeError:
            with open(TAGS_FILE, 'w') as f:
                json.dump([], f)


@tag_routes.route('/tags', methods=['GET'])
@require_auth
def get_tags(user_id):
    """Get all tags for authenticated user"""
    try:
        logger.info(f"📋 Fetching all tags for user {user_id}")
        
        if get_database_service().is_using_firebase():
            tags_list = get_database_service().get_tags(user_id)
            logger.info(f"✅ Retrieved {len(tags_list)} tags from Firebase")
            return jsonify(tags_list), 200
        else:
            # Fall back to file-based storage for SQLite mode
            ensure_tags_file_exists()
            with open(TAGS_FILE, 'r') as f:
                tags = json.load(f)
            
            logger.info(f"✅ Retrieved {len(tags)} tags from file")
            return jsonify(tags), 200
    except Exception as e:
        logger.error(f"💥 Error fetching tags: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags', methods=['POST'])
@require_auth
def create_tag(user_id):
    """Create a new tag for authenticated user"""
    try:
        logger.info(f"🏷️ Creating new tag for user {user_id}")
        data = request.json
        
        # Validate request
        if not data or 'name' not in data or 'color' not in data:
            logger.error("❌ Missing required fields: name and color")
            return jsonify({'error': 'Missing required fields: name and color'}), 400
        
        name = data['name']
        color = data['color']
        
        if get_database_service().is_using_firebase():
            # Check for duplicate name
            existing_tag = get_database_service().get_tag_by_name(user_id, name)
            if existing_tag:
                logger.error(f"❌ Tag with name '{name}' already exists")
                return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Create new tag
            tag_data = {
                'name': name,
                'color': color
            }
            created_tag = get_database_service().create_tag(user_id, tag_data)
            
            logger.info(f"✅ Tag created with ID: {created_tag['id']}")
            return jsonify(created_tag), 201
        else:
            # Fall back to file-based storage for SQLite mode
            ensure_tags_file_exists()
            with open(TAGS_FILE, 'r') as f:
                tags = json.load(f)
            
            # Check for duplicate name
            if any(tag['name'] == name for tag in tags):
                logger.error(f"❌ Tag with name '{name}' already exists")
                return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Create new tag
            new_tag = {
                'id': f"tag_{int(time.time())}",
                'name': name,
                'color': color
            }
            
            tags.append(new_tag)
            
            with open(TAGS_FILE, 'w') as f:
                json.dump(tags, f)
            
            logger.info(f"✅ Tag created with ID: {new_tag['id']}")
            return jsonify(new_tag), 201
    except Exception as e:
        logger.error(f"💥 Error creating tag: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags/<tag_id>', methods=['PUT'])
@require_auth
def update_tag(user_id, tag_id):
    """Update an existing tag for authenticated user"""
    try:
        logger.info(f"🔄 Updating tag {tag_id} for user {user_id}")
        data = request.json
        
        # Validate request
        if not data or 'name' not in data or 'color' not in data:
            logger.error("❌ Missing required fields: name and color")
            return jsonify({'error': 'Missing required fields: name and color'}), 400
        
        name = data['name']
        color = data['color']
        
        if get_database_service().is_using_firebase():
            # Check if tag exists
            existing_tag = get_database_service().get_tag(user_id, tag_id)
            if not existing_tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Check for duplicate name (excluding current tag)
            name_check = get_database_service().get_tag_by_name(user_id, name)
            if name_check and name_check['id'] != tag_id:
                logger.error(f"❌ Tag with name '{name}' already exists")
                return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Update tag
            update_data = {
                'name': name,
                'color': color
            }
            updated_tag = get_database_service().update_tag(user_id, tag_id, update_data)
            
            logger.info(f"✅ Tag {tag_id} updated successfully")
            return jsonify(updated_tag), 200
        else:
            # Fall back to file-based storage for SQLite mode
            ensure_tags_file_exists()
            with open(TAGS_FILE, 'r') as f:
                tags = json.load(f)
            
            # Find the tag
            tag_index = None
            for i, tag in enumerate(tags):
                if tag['id'] == tag_id:
                    tag_index = i
                    break
            
            if tag_index is None:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Check for duplicate name
            for i, tag in enumerate(tags):
                if i != tag_index and tag['name'] == name:
                    logger.error(f"❌ Tag with name '{name}' already exists")
                    return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Update tag
            tags[tag_index]['name'] = name
            tags[tag_index]['color'] = color
            
            with open(TAGS_FILE, 'w') as f:
                json.dump(tags, f)
            
            logger.info(f"✅ Tag {tag_id} updated successfully")
            return jsonify(tags[tag_index]), 200
    except Exception as e:
        logger.error(f"💥 Error updating tag: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags/<tag_id>', methods=['DELETE'])
@require_auth
def delete_tag(user_id, tag_id):
    """Delete a tag for authenticated user"""
    try:
        logger.info(f"🗑️ Deleting tag {tag_id} for user {user_id}")
        
        if get_database_service().is_using_firebase():
            # Check if tag exists
            existing_tag = get_database_service().get_tag(user_id, tag_id)
            if not existing_tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Delete tag
            success = get_database_service().delete_tag(user_id, tag_id)
            
            if success:
                logger.info(f"✅ Tag {tag_id} deleted successfully")
                return jsonify({'message': 'Tag deleted successfully'}), 200
            else:
                logger.error(f"❌ Failed to delete tag {tag_id}")
                return jsonify({'error': 'Failed to delete tag'}), 500
        else:
            # Fall back to file-based storage for SQLite mode
            ensure_tags_file_exists()
            with open(TAGS_FILE, 'r') as f:
                tags = json.load(f)
            
            # Find and remove the tag
            tag_index = None
            for i, tag in enumerate(tags):
                if tag['id'] == tag_id:
                    tag_index = i
                    break
            
            if tag_index is None:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Remove tag
            removed_tag = tags.pop(tag_index)
            
            with open(TAGS_FILE, 'w') as f:
                json.dump(tags, f)
            
            logger.info(f"✅ Tag {tag_id} deleted successfully")
            return jsonify({'message': 'Tag deleted successfully'}), 200
    except Exception as e:
        logger.error(f"💥 Error deleting tag: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/items/<int:item_id>/tags', methods=['POST'])
@require_auth
def apply_tags_to_item(user_id, item_id):
    """Apply tags to an item for authenticated user"""
    try:
        logger.info(f"🏷️ Applying tags to item {item_id} for user {user_id}")
        data = request.json
        
        # Validate request
        if not data or 'tag_ids' not in data:
            logger.error("❌ Missing required field: tag_ids")
            return jsonify({'error': 'Missing required field: tag_ids'}), 400
        
        tag_ids = data['tag_ids']
        
        if get_database_service().is_using_firebase():
            # Get the item
            item_data = get_database_service().get_item(user_id, str(item_id))
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f"Item with ID {item_id} not found"}), 404
            
            # Update item with new tags
            updated_item = get_database_service().update_item_field(user_id, str(item_id), 'tags', tag_ids)
            
            logger.info(f"✅ Tags applied to item {item_id} successfully")
            return jsonify({'message': 'Tags applied successfully', 'item': updated_item}), 200
        else:
            # SQLite mode - not implemented for now
            logger.error("❌ Tag application not implemented for SQLite mode")
            return jsonify({'error': 'Tag application not available in SQLite mode'}), 501
    except Exception as e:
        logger.error(f"💥 Error applying tags to item: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/items/<int:item_id>/tags/remove', methods=['POST'])
@require_auth
def remove_tags_from_item(user_id, item_id):
    """Remove tags from an item for authenticated user"""
    try:
        logger.info(f"🗑️ Removing tags from item {item_id} for user {user_id}")
        data = request.json
        
        # Validate request
        if not data or 'tag_ids' not in data:
            logger.error("❌ Missing required field: tag_ids")
            return jsonify({'error': 'Missing required field: tag_ids'}), 400
        
        tag_ids_to_remove = data['tag_ids']
        
        if get_database_service().is_using_firebase():
            # Get the item
            item_data = get_database_service().get_item(user_id, str(item_id))
            if not item_data:
                logger.error(f"❌ Item with ID {item_id} not found")
                return jsonify({'error': f"Item with ID {item_id} not found"}), 404
            
            # Get current tags and remove specified ones
            current_tags = item_data.get('tags', [])
            updated_tags = [tag_id for tag_id in current_tags if tag_id not in tag_ids_to_remove]
            
            # Update item with remaining tags
            updated_item = get_database_service().update_item_field(user_id, str(item_id), 'tags', updated_tags)
            
            logger.info(f"✅ Tags removed from item {item_id} successfully")
            return jsonify({'message': 'Tags removed successfully', 'item': updated_item}), 200
        else:
            # SQLite mode - not implemented for now
            logger.error("❌ Tag removal not implemented for SQLite mode")
            return jsonify({'error': 'Tag removal not available in SQLite mode'}), 501
    except Exception as e:
        logger.error(f"💥 Error removing tags from item: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
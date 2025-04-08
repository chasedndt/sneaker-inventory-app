# backend/tag_routes.py
from flask import Blueprint, request, jsonify
import os
import json
import time
import logging
from models import db, Tag, Item, item_tags

# Set up logging
logger = logging.getLogger(__name__)

# Create blueprint
tag_routes = Blueprint('tag_routes', __name__)

# Tags JSON file path (for simple persistence)
TAGS_FILE = os.path.join(os.path.dirname(__file__), 'instance', 'tags.json')

def ensure_tags_file_exists():
    """Ensure the tags file exists and is a valid JSON"""
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
def get_tags():
    """Get all tags"""
    try:
        logger.info("📋 Fetching all tags")
        
        # Try to use database first
        try:
            tags = Tag.query.all()
            tags_list = [tag.to_dict() for tag in tags]
            logger.info(f"✅ Retrieved {len(tags_list)} tags from database")
            return jsonify(tags_list), 200
        except Exception as db_err:
            logger.warning(f"⚠️ Failed to fetch tags from database: {str(db_err)}")
            
            # Fall back to file-based storage
            ensure_tags_file_exists()
            with open(TAGS_FILE, 'r') as f:
                tags = json.load(f)
            
            logger.info(f"✅ Retrieved {len(tags)} tags from file")
            return jsonify(tags), 200
    except Exception as e:
        logger.error(f"💥 Error fetching tags: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags', methods=['POST'])
def create_tag():
    """Create a new tag"""
    try:
        logger.info("🏷️ Creating new tag")
        data = request.json
        
        # Validate request
        if not data or 'name' not in data or 'color' not in data:
            logger.error("❌ Missing required fields: name and color")
            return jsonify({'error': 'Missing required fields: name and color'}), 400
        
        name = data['name']
        color = data['color']
        
        # Try to use database first
        try:
            # Check for duplicate name
            existing_tag = Tag.query.filter_by(name=name).first()
            if existing_tag:
                logger.error(f"❌ Tag with name '{name}' already exists")
                return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Create new tag
            new_tag = Tag(name=name, color=color)
            db.session.add(new_tag)
            db.session.commit()
            
            logger.info(f"✅ Tag created with ID: {new_tag.id}")
            return jsonify(new_tag.to_dict()), 201
        except Exception as db_err:
            logger.warning(f"⚠️ Failed to create tag in database: {str(db_err)}")
            
            # Fall back to file-based storage
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
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags/<tag_id>', methods=['PUT'])
def update_tag(tag_id):
    """Update an existing tag"""
    try:
        logger.info(f"🔄 Updating tag {tag_id}")
        data = request.json
        
        # Validate request
        if not data or 'name' not in data or 'color' not in data:
            logger.error("❌ Missing required fields: name and color")
            return jsonify({'error': 'Missing required fields: name and color'}), 400
        
        name = data['name']
        color = data['color']
        
        # Try to use database first
        try:
            # Find the tag
            tag = Tag.query.get(tag_id)
            if not tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Check for duplicate name
            existing_tag = Tag.query.filter_by(name=name).first()
            if existing_tag and str(existing_tag.id) != str(tag_id):
                logger.error(f"❌ Tag with name '{name}' already exists")
                return jsonify({'error': f"Tag with name '{name}' already exists"}), 400
            
            # Update tag
            tag.name = name
            tag.color = color
            db.session.commit()
            
            logger.info(f"✅ Tag {tag_id} updated successfully")
            return jsonify(tag.to_dict()), 200
        except Exception as db_err:
            logger.warning(f"⚠️ Failed to update tag in database: {str(db_err)}")
            
            # Fall back to file-based storage
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
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/tags/<tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    """Delete a tag"""
    try:
        logger.info(f"🗑️ Deleting tag {tag_id}")
        
        # Try to use database first
        try:
            # Find the tag
            tag = Tag.query.get(tag_id)
            if not tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Remove tag from all items first
            for item in tag.items:
                if tag in item.tags:
                    item.tags.remove(tag)
            
            # Flush the session to ensure the item-tag relationships are updated
            db.session.flush()
            
            # Delete tag
            db.session.delete(tag)
            db.session.commit()
            
            logger.info(f"✅ Tag {tag_id} deleted successfully")
            return jsonify({'message': f"Tag {tag_id} deleted successfully"}), 200
        except Exception as db_err:
            logger.warning(f"⚠️ Failed to delete tag from database: {str(db_err)}")
            
            # Fall back to file-based storage
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
            
            # Delete tag
            del tags[tag_index]
            
            with open(TAGS_FILE, 'w') as f:
                json.dump(tags, f)
            
            logger.info(f"✅ Tag {tag_id} deleted successfully")
            return jsonify({'message': f"Tag {tag_id} deleted successfully"}), 200
    except Exception as e:
        logger.error(f"💥 Error deleting tag: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/items/<int:item_id>/tags', methods=['POST'])
def apply_tags_to_item(item_id):
    """Apply tags to an item"""
    try:
        logger.info(f"🏷️ Applying tags to item {item_id}")
        data = request.json
        
        # Validate request
        if not data or 'tagIds' not in data:
            logger.error("❌ Missing required field: tagIds")
            return jsonify({'error': 'Missing required field: tagIds'}), 400
        
        tag_ids = data['tagIds']
        if not isinstance(tag_ids, list):
            logger.error("❌ tagIds must be a list")
            return jsonify({'error': 'tagIds must be a list'}), 400
        
        # Find the item
        item = Item.query.get(item_id)
        if not item:
            logger.error(f"❌ Item with ID {item_id} not found")
            return jsonify({'error': f"Item with ID {item_id} not found"}), 404
        
        # Remove existing tags
        item.tags = []
        db.session.flush()
        
        # Check if all tags exist and add them
        for tag_id in tag_ids:
            tag = Tag.query.get(tag_id)
            if not tag:
                logger.error(f"❌ Tag with ID {tag_id} not found")
                return jsonify({'error': f"Tag with ID {tag_id} not found"}), 404
            
            # Add tag to item
            item.tags.append(tag)
        
        db.session.commit()
        
        logger.info(f"✅ Tags applied to item {item_id}: {tag_ids}")
        return jsonify({'message': f"Tags applied to item {item_id}", 'tagIds': tag_ids}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"💥 Error applying tags to item: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tag_routes.route('/items/<int:item_id>/tags/remove', methods=['POST'])
def remove_tags_from_item(item_id):
    """Remove tags from an item"""
    try:
        logger.info(f"🗑️ Removing tags from item {item_id}")
        data = request.json
        
        # Validate request
        if not data or 'tagIds' not in data:
            logger.error("❌ Missing required field: tagIds")
            return jsonify({'error': 'Missing required field: tagIds'}), 400
        
        tag_ids = data['tagIds']
        if not isinstance(tag_ids, list):
            logger.error("❌ tagIds must be a list")
            return jsonify({'error': 'tagIds must be a list'}), 400
        
        # Find the item
        item = Item.query.get(item_id)
        if not item:
            logger.error(f"❌ Item with ID {item_id} not found")
            return jsonify({'error': f"Item with ID {item_id} not found"}), 404
        
        # Remove specified tags
        for tag_id in tag_ids:
            tag = Tag.query.get(tag_id)
            if tag and tag in item.tags:
                item.tags.remove(tag)
        
        db.session.commit()
        
        logger.info(f"✅ Tags removed from item {item_id}: {tag_ids}")
        return jsonify({'message': f"Tags removed from item {item_id}", 'tagIds': tag_ids}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"💥 Error removing tags from item: {str(e)}")
        return jsonify({'error': str(e)}), 500
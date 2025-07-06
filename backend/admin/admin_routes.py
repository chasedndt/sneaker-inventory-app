# backend/admin/admin_routes.py
from flask import Blueprint, request, jsonify, current_app
from models import db, Item, Size, Image, Tag, Sale, Expense, UserSettings
from middleware.auth import require_admin, is_admin, set_user_admin_status, get_all_users, create_user, delete_user, update_user, get_user_by_id
from firebase_admin import auth
import logging
import random
from datetime import datetime, timedelta

# Set up logger
logger = logging.getLogger(__name__)

# Create Blueprint for admin routes
admin_routes = Blueprint('admin_routes', __name__)

# User Management Routes

@admin_routes.route('/admin/users', methods=['GET'])
@require_admin
def get_users(user_id):
    """
    Get all users (admin only)
    """
    try:
        users = get_all_users()
        if users is None:
            return jsonify({'error': 'Failed to retrieve users'}), 500
        
        # Add plan tier information to each user
        for user in users:
            plan_tier = (user.get('custom_claims') or {}).get('planTier', 'free')
            user['planTier'] = plan_tier
            # Format creation date for display
            if user.get('created_at'):
                user['signup_date'] = user['created_at']
        
        return jsonify(users), 200
    except Exception as e:
        logger.error(f"Error in get_users: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users/<string:target_uid>', methods=['GET'])
@require_admin
def get_user(user_id, target_uid):
    """
    Get a specific user (admin only)
    """
    try:
        user = get_user_by_id(target_uid)
        if user is None:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user), 200
    except Exception as e:
        logger.error(f"Error in get_user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users', methods=['POST'])
@require_admin
def add_user(user_id):
    """
    Create a new user (admin only)
    """
    try:
        data = request.json
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        success, result = create_user(
            email=data['email'],
            password=data['password'],
            display_name=data.get('display_name'),
            is_admin=data.get('is_admin', False)
        )
        
        if not success:
            return jsonify({'error': result}), 400
        
        # If user creation succeeded, result contains the user record
        return jsonify({
            'message': 'User created successfully',
            'uid': result.uid
        }), 201
    except Exception as e:
        logger.error(f"Error in add_user: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users/<string:target_uid>', methods=['PUT'])
@require_admin
def update_user_route(user_id, target_uid):
    """
    Update a user (admin only)
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No update data provided'}), 400
        
        # Extract allowed properties for update
        allowed_props = ['email', 'password', 'display_name', 'disabled', 'email_verified']
        update_props = {k: v for k, v in data.items() if k in allowed_props}
        
        # Handle special case for admin status
        if 'is_admin' in data:
            # Get user email first
            user_data = get_user_by_id(target_uid)
            if not user_data:
                return jsonify({'error': 'User not found'}), 404
            
            # Set admin status
            admin_success, admin_message = set_user_admin_status(user_data['email'], data['is_admin'])
            if not admin_success:
                return jsonify({'error': f'Failed to update admin status: {admin_message}'}), 400
        
        # Update the user properties
        if update_props:
            success, result = update_user(target_uid, update_props)
            if not success:
                return jsonify({'error': result}), 400
        
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        logger.error(f"Error in update_user_route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users/<string:target_uid>', methods=['DELETE'])
@require_admin
def delete_user_route(user_id, target_uid):
    """
    Delete a user (admin only)
    """
    try:
        # Don't allow deleting yourself
        if user_id == target_uid:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        success, message = delete_user(target_uid)
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
    except Exception as e:
        logger.error(f"Error in delete_user_route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users/<string:email>/set-admin', methods=['POST'])
@require_admin
def set_admin_status_route(user_id, email):
    """
    Set admin status for a user by email (admin only)
    """
    try:
        data = request.json
        if not data or 'admin' not in data:
            return jsonify({'error': 'Admin status (true/false) is required'}), 400
        
        admin_status = bool(data['admin'])
        success, message = set_user_admin_status(email, admin_status)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
    except Exception as e:
        logger.error(f"Error in set_admin_status_route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/users/<string:target_uid>/plan-tier', methods=['PUT'])
@require_admin
def update_user_plan_tier(user_id, target_uid):
    """
    Update a user's plan tier (admin only)
    """
    try:
        data = request.json
        if not data or 'planTier' not in data:
            return jsonify({'error': 'planTier is required'}), 400
        
        plan_tier = data['planTier']
        valid_tiers = ['free', 'starter', 'professional']
        
        if plan_tier not in valid_tiers:
            return jsonify({'error': f'Invalid plan tier. Must be one of: {valid_tiers}'}), 400
        
        # Get the user to update their custom claims
        try:
            user_record = auth.get_user(target_uid)
        except auth.UserNotFoundError:
            return jsonify({'error': 'User not found'}), 404
        
        # Update custom claims with new plan tier
        current_claims = user_record.custom_claims or {}
        current_claims['planTier'] = plan_tier
        current_claims['planTierSet'] = True  # Flag to indicate tier was set by admin
        
        auth.set_custom_user_claims(target_uid, current_claims)
        
        logger.info(f"Admin {user_id} updated user {target_uid} plan tier to {plan_tier}")
        
        return jsonify({
            'message': f'User plan tier updated to {plan_tier}',
            'uid': target_uid,
            'planTier': plan_tier
        }), 200
        
    except Exception as e:
        logger.error(f"Error in update_user_plan_tier: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin Item Management Routes

@admin_routes.route('/admin/grant-items', methods=['POST'])
@require_admin
def grant_items(user_id):
    """
    Grant items to a user (admin only)
    """
    try:
        data = request.json
        if not data or 'userId' not in data or 'itemCount' not in data:
            return jsonify({'error': 'userId and itemCount are required'}), 400
        
        target_user_id = data['userId']
        item_count = int(data['itemCount'])
        
        if item_count <= 0:
            return jsonify({'error': 'itemCount must be positive'}), 400
        
        # Check if user exists
        try:
            user_record = auth.get_user(target_user_id)
        except auth.UserNotFoundError:
            return jsonify({'error': 'User not found'}), 404
        
        # Get or create user settings
        user_settings = UserSettings.query.filter_by(user_id=target_user_id).first()
        if not user_settings:
            user_settings = UserSettings(user_id=target_user_id)
            db.session.add(user_settings)
        
        # Grant items (add to their quota)
        if not hasattr(user_settings, 'items_quota'):
            user_settings.items_quota = 0
        user_settings.items_quota += item_count
        
        db.session.commit()
        
        logger.info(f"Admin {user_id} granted {item_count} items to user {target_user_id}")
        
        return jsonify({
            'message': f'Successfully granted {item_count} items to user {target_user_id}',
            'userId': target_user_id,
            'itemsGranted': item_count,
            'newQuota': user_settings.items_quota
        }), 200
        
    except Exception as e:
        logger.error(f"Error in grant_items: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/seed-data', methods=['POST'])
@require_admin
def seed_data(user_id):
    """
    Seed dummy data for testing (admin only)
    """
    try:
        data = request.json
        if not data or 'dataType' not in data or 'count' not in data:
            return jsonify({'error': 'dataType and count are required'}), 400
        
        data_type = data['dataType']
        count = int(data['count'])
        
        if count <= 0:
            return jsonify({'error': 'count must be positive'}), 400
        
        if count > 100:
            return jsonify({'error': 'count cannot exceed 100 for safety'}), 400
        
        created_items = []
        
        if data_type == 'items':
            # Create dummy items
            brands = ['Nike', 'Adidas', 'Jordan', 'Yeezy', 'New Balance', 'Converse']
            categories = ['Sneakers', 'Boots', 'Sandals', 'Dress Shoes']
            
            for i in range(count):
                item = Item(
                    user_id=user_id,  # Assign to the admin user
                    brand=random.choice(brands),
                    model=f'Test Model {i+1}',
                    colorway=f'Test Colorway {i+1}',
                    category=random.choice(categories),
                    purchase_price=round(random.uniform(50, 300), 2),
                    retail_price=round(random.uniform(100, 500), 2),
                    condition='New',
                    date_acquired=datetime.now() - timedelta(days=random.randint(1, 365))
                )
                db.session.add(item)
                created_items.append(f'{item.brand} {item.model}')
        
        elif data_type == 'sales':
            # Create dummy sales (need existing items)
            existing_items = Item.query.filter_by(user_id=user_id).limit(count).all()
            if not existing_items:
                return jsonify({'error': 'No items found to create sales for. Create items first.'}), 400
            
            for i in range(min(count, len(existing_items))):
                item = existing_items[i]
                sale = Sale(
                    user_id=user_id,
                    item_id=item.id,
                    sale_price=round(random.uniform(item.purchase_price, item.retail_price * 1.2), 2),
                    date_sold=datetime.now() - timedelta(days=random.randint(1, 180)),
                    platform=random.choice(['StockX', 'GOAT', 'eBay', 'Local']),
                    fees=round(random.uniform(5, 25), 2)
                )
                db.session.add(sale)
                created_items.append(f'Sale of {item.brand} {item.model}')
        
        elif data_type == 'expenses':
            # Create dummy expenses
            categories = ['Shipping', 'Storage', 'Cleaning', 'Authentication', 'Marketing']
            
            for i in range(count):
                expense = Expense(
                    user_id=user_id,
                    description=f'Test Expense {i+1}',
                    amount=round(random.uniform(5, 100), 2),
                    category=random.choice(categories),
                    date=datetime.now() - timedelta(days=random.randint(1, 365))
                )
                db.session.add(expense)
                created_items.append(f'{expense.category}: {expense.description}')
        
        else:
            return jsonify({'error': 'Invalid dataType. Must be items, sales, or expenses'}), 400
        
        db.session.commit()
        
        logger.info(f"Admin {user_id} seeded {count} dummy {data_type}")
        
        return jsonify({
            'message': f'Successfully created {count} dummy {data_type}',
            'dataType': data_type,
            'count': count,
            'items': created_items
        }), 200
        
    except Exception as e:
        logger.error(f"Error in seed_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin Data Management Routes

@admin_routes.route('/admin/stats', methods=['GET'])
@require_admin
def get_admin_stats(user_id):
    """
    Get system-wide statistics (admin only)
    """
    try:
        # Get counts of various entities
        item_count = Item.query.count()
        user_count = len(get_all_users() or [])
        sale_count = Sale.query.count()
        expense_count = Expense.query.count()
        
        # Get top categories
        top_categories = db.session.query(
            Item.category, 
            db.func.count(Item.id).label('count')
        ).group_by(Item.category).order_by(db.func.count(Item.id).desc()).limit(5).all()
        
        top_categories_data = [{'category': cat, 'count': count} for cat, count in top_categories]
        
        # Get top brands
        top_brands = db.session.query(
            Item.brand, 
            db.func.count(Item.id).label('count')
        ).group_by(Item.brand).order_by(db.func.count(Item.id).desc()).limit(5).all()
        
        top_brands_data = [{'brand': brand, 'count': count} for brand, count in top_brands]
        
        # Get recent users
        recent_users = get_all_users(limit=5) or []
        if recent_users:
            # Sort users by creation timestamp if available
            recent_users.sort(key=lambda u: u.get('created_at', 0) or 0, reverse=True)
            recent_users = recent_users[:5]
        
        return jsonify({
            'item_count': item_count,
            'user_count': user_count,
            'sale_count': sale_count,
            'expense_count': expense_count,
            'top_categories': top_categories_data,
            'top_brands': top_brands_data,
            'recent_users': recent_users
        }), 200
    except Exception as e:
        logger.error(f"Error in get_admin_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/all-items', methods=['GET'])
@require_admin
def get_all_items(user_id):
    """
    Get all items across all users (admin only)
    """
    try:
        # Optional user_id filter
        filter_user_id = request.args.get('user_id')
        
        query = Item.query
        if filter_user_id:
            query = query.filter_by(user_id=filter_user_id)
        
        items = query.all()
        
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        logger.error(f"Error in get_all_items: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/all-sales', methods=['GET'])
@require_admin
def get_all_sales(user_id):
    """
    Get all sales across all users (admin only)
    """
    try:
        # Optional user_id filter
        filter_user_id = request.args.get('user_id')
        
        query = Sale.query
        if filter_user_id:
            query = query.filter_by(user_id=filter_user_id)
        
        sales = query.all()
        
        return jsonify([sale.to_dict() for sale in sales]), 200
    except Exception as e:
        logger.error(f"Error in get_all_sales: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_routes.route('/admin/all-expenses', methods=['GET'])
@require_admin
def get_all_expenses(user_id):
    """
    Get all expenses across all users (admin only)
    """
    try:
        # Optional user_id filter
        filter_user_id = request.args.get('user_id')
        
        query = Expense.query
        if filter_user_id:
            query = query.filter_by(user_id=filter_user_id)
        
        expenses = query.all()
        
        return jsonify([expense.to_dict() for expense in expenses]), 200
    except Exception as e:
        logger.error(f"Error in get_all_expenses: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin check endpoint
@admin_routes.route('/admin/check', methods=['GET'])
@require_admin
def check_admin(user_id):
    """
    Check if the current user is an admin
    """
    try:
        # If we got this far, the user is an admin (due to @require_admin)
        return jsonify({
            'is_admin': True,
            'user_id': user_id
        }), 200
    except Exception as e:
        logger.error(f"Error in check_admin: {str(e)}")
        return jsonify({'error': str(e)}), 500
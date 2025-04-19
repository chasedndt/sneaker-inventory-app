# backend/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add user_id field to associate with Firebase UID
    user_id = db.Column(db.String(100), nullable=False, index=True)
    
    # Product Details
    category = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    reference = db.Column(db.String(100))
    colorway = db.Column(db.String(100))
    brand = db.Column(db.String(50), nullable=False)
    
    # Purchase Details
    purchase_price = db.Column(db.Float, nullable=False)
    purchase_currency = db.Column(db.String(10), nullable=False)
    shipping_price = db.Column(db.Float)
    shipping_currency = db.Column(db.String(10))
    market_price = db.Column(db.Float)
    purchase_date = db.Column(db.DateTime, nullable=False)
    purchase_location = db.Column(db.String(100))
    condition = db.Column(db.String(50))
    notes = db.Column(db.Text)
    order_id = db.Column(db.String(100))
    tax_type = db.Column(db.String(20))
    vat_percentage = db.Column(db.Float)
    sales_tax_percentage = db.Column(db.Float)
    
    # Status - field for tracking item status
    status = db.Column(db.String(20), default='unlisted')  # 'unlisted', 'listed', or 'sold'
    
    # Listings - stored as JSON string
    _listings = db.Column(db.Text, name='listings')
    
    # Relationships
    sizes = db.relationship('Size', backref='item', lazy=True, cascade="all, delete-orphan")
    images = db.relationship('Image', backref='item', lazy=True, cascade="all, delete-orphan")
    tags = db.relationship('Tag', secondary='item_tags', backref='items', lazy=True)
    sales = db.relationship('Sale', backref='item', lazy=True, cascade="all, delete-orphan")

    @property
    def listings(self):
        if self._listings:
            try:
                return json.loads(self._listings)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
        
    @listings.setter
    def listings(self, value):
        if value is not None:
            self._listings = json.dumps(value)
        else:
            self._listings = None

    def to_dict(self):
        """
        Create a dictionary representation of the item for API responses.
        Includes image filenames when available.
        """
        try:
            # Get image filenames for this item
            image_files = [img.filename for img in self.images] if self.images else []
            
            # Get the first size for this item
            size_info = self.sizes[0] if self.sizes else None
            size = size_info.size if size_info else None
            size_system = size_info.system if size_info else None
            
            # Get tags for this item
            item_tags = [tag.id for tag in self.tags] if self.tags else []
            
            return {
                'id': self.id,
                'user_id': self.user_id,  # Include user_id in API response
                'category': self.category,
                'productName': self.product_name,
                'reference': self.reference,
                'colorway': self.colorway,
                'brand': self.brand,
                'purchasePrice': self.purchase_price,
                'purchaseCurrency': self.purchase_currency,
                'shippingPrice': self.shipping_price,
                'marketPrice': self.market_price,
                'purchaseDate': self.purchase_date.isoformat() if self.purchase_date else None,
                'purchaseLocation': self.purchase_location,
                'condition': self.condition,
                'images': image_files,
                'size': size,
                'sizeSystem': size_system,
                'status': self.status,
                'tags': item_tags,
                'listings': self.listings,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            # Add emoji for error identification 🔍
            print(f"🔍 Error in Item.to_dict(): {str(e)}")
            # Return a minimal dict with error info
            return {
                'id': self.id if hasattr(self, 'id') else None,
                'user_id': self.user_id if hasattr(self, 'user_id') else None,
                'productName': self.product_name if hasattr(self, 'product_name') else 'Unknown Item',
                'error': f"Failed to serialize item: {str(e)}"
            }

class Size(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    system = db.Column(db.String(20))
    size = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    # No direct user_id since it's associated to Item

class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # No direct user_id since it's associated to Item

    def to_dict(self):
        try:
            return {
                'id': self.id,
                'filename': self.filename,
                'item_id': self.item_id,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
        except Exception as e:
            # Add emoji for error identification 📸
            print(f"📸 Error in Image.to_dict(): {str(e)}")
            return {
                'id': self.id if hasattr(self, 'id') else None,
                'error': f"Failed to serialize image: {str(e)}"
            }

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), nullable=False, default='#8884d8')  # Default color
    user_id = db.Column(db.String(100), nullable=False, index=True)  # Tags are user-specific
    
    # Add unique constraint for name+user_id instead of just name
    __table_args__ = (db.UniqueConstraint('name', 'user_id', name='unique_tag_per_user'),)
    
    def to_dict(self):
        """
        Create a dictionary representation of the tag for API responses.
        """
        try:
            return {
                'id': str(self.id),  # Convert to string for consistency with frontend
                'name': self.name,
                'color': self.color,
                'user_id': self.user_id
            }
        except Exception as e:
            print(f"🏷️ Error in Tag.to_dict(): {str(e)}")
            return {
                'id': str(self.id) if hasattr(self, 'id') else 'unknown',
                'error': f"Failed to serialize tag: {str(e)}"
            }

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add user_id field to associate with Firebase UID
    user_id = db.Column(db.String(100), nullable=False, index=True)
    
    # Foreign key to item
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    
    # Sale details
    platform = db.Column(db.String(50), nullable=False)
    sale_date = db.Column(db.DateTime, nullable=False)
    sale_price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='$')
    sales_tax = db.Column(db.Float, default=0.0)
    platform_fees = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'needsShipping', 'completed'
    sale_id = db.Column(db.String(100))  # External sale ID/reference

    def to_dict(self):
        """
        Create a dictionary representation of the sale for API responses.
        """
        try:
            return {
                'id': self.id,
                'user_id': self.user_id,
                'itemId': self.item_id,
                'platform': self.platform,
                'saleDate': self.sale_date.isoformat() if self.sale_date else None,
                'salePrice': self.sale_price,
                'currency': self.currency,
                'salesTax': self.sales_tax,
                'platformFees': self.platform_fees,
                'status': self.status,
                'saleId': self.sale_id,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            print(f"💰 Error in Sale.to_dict(): {str(e)}")
            return {
                'id': self.id if hasattr(self, 'id') else None,
                'error': f"Failed to serialize sale: {str(e)}"
            }

# New Expense model for the expenses page
class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add user_id field to associate with Firebase UID
    user_id = db.Column(db.String(100), nullable=False, index=True)
    
    # Expense details
    expense_type = db.Column(db.String(50), nullable=False)  # 'shipping', 'supplies', 'fees', 'storage', 'other'
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='$')
    expense_date = db.Column(db.DateTime, nullable=False)
    vendor = db.Column(db.String(100))
    notes = db.Column(db.Text)
    receipt_filename = db.Column(db.String(255))
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_period = db.Column(db.String(20))  # 'monthly', 'yearly', etc.
    
    def to_dict(self):
        """
        Create a dictionary representation of the expense for API responses.
        """
        try:
            return {
                'id': self.id,
                'user_id': self.user_id,
                'expenseType': self.expense_type,
                'amount': self.amount,
                'currency': self.currency,
                'expenseDate': self.expense_date.isoformat() if self.expense_date else None,
                'vendor': self.vendor,
                'notes': self.notes,
                'receiptFilename': self.receipt_filename,
                'isRecurring': self.is_recurring,
                'recurrencePeriod': self.recurrence_period,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            print(f"💸 Error in Expense.to_dict(): {str(e)}")
            return {
                'id': self.id if hasattr(self, 'id') else None,
                'error': f"Failed to serialize expense: {str(e)}"
            }

# Add a Coplist model for saving item collections
class Coplist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # User ID field
    user_id = db.Column(db.String(100), nullable=False, index=True)
    
    # Coplist details
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_private = db.Column(db.Boolean, default=True)
    
    # Relationship with items via join table
    items = db.relationship('Item', 
                           secondary='coplist_items',
                           backref=db.backref('coplists', lazy='dynamic'))
    
    def to_dict(self):
        """
        Create a dictionary representation of the coplist for API responses.
        """
        try:
            return {
                'id': self.id,
                'user_id': self.user_id,
                'name': self.name,
                'description': self.description,
                'is_private': self.is_private,
                'item_count': len(self.items),
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            print(f"📋 Error in Coplist.to_dict(): {str(e)}")
            return {
                'id': self.id if hasattr(self, 'id') else None,
                'error': f"Failed to serialize coplist: {str(e)}"
            }

# User Settings model to store user preferences
class UserSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, unique=True, index=True)
    dark_mode = db.Column(db.Boolean, default=False)
    currency = db.Column(db.String(10), default='USD')
    date_format = db.Column(db.String(20), default='MM/DD/YYYY')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """
        Create a dictionary representation of user settings for API responses.
        """
        try:
            return {
                'user_id': self.user_id,
                'dark_mode': self.dark_mode,
                'currency': self.currency,
                'date_format': self.date_format,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            print(f"⚙️ Error in UserSettings.to_dict(): {str(e)}")
            return {
                'user_id': self.user_id if hasattr(self, 'user_id') else None,
                'error': f"Failed to serialize user settings: {str(e)}"
            }

# Association table for many-to-many relationship between items and tags
item_tags = db.Table('item_tags',
    db.Column('item_id', db.Integer, db.ForeignKey('item.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

# Association table for Coplists and Items
coplist_items = db.Table('coplist_items',
    db.Column('coplist_id', db.Integer, db.ForeignKey('coplist.id'), primary_key=True),
    db.Column('item_id', db.Integer, db.ForeignKey('item.id'), primary_key=True)
)
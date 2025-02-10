from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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

    # Relationships
    sizes = db.relationship('Size', backref='item', lazy=True)
    images = db.relationship('Image', backref='item', lazy=True)
    tags = db.relationship('Tag', secondary='item_tags', backref='items', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'productName': self.product_name,
            'brand': self.brand,
            'purchasePrice': self.purchase_price,
            'purchaseDate': self.purchase_date.isoformat() if self.purchase_date else None
        }

class Size(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    system = db.Column(db.String(20))
    size = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'item_id': self.item_id
        }

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

item_tags = db.Table('item_tags',
    db.Column('item_id', db.Integer, db.ForeignKey('item.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

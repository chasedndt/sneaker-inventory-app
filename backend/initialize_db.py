# backend/initialize_db.py
from app import create_app, db
from models import Item, Size, Image, Tag, Sale, Expense  # Make sure all models are imported

app = create_app()

with app.app_context():
    print("Creating all missing tables...")
    db.create_all()
    print("Database tables created successfully!")
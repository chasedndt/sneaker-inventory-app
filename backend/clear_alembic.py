from app import create_app, db

app = create_app()
with app.app_context():
    # Drop alembic_version table if it exists
    db.engine.execute('DROP TABLE IF EXISTS alembic_version')
    print("Alembic version table cleared!")

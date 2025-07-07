import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=== Environment Variables Test ===")
print(f"STRIPE_SECRET_KEY: {os.getenv('STRIPE_SECRET_KEY')}")
print(f"STRIPE_PUBLISHABLE_KEY: {os.getenv('STRIPE_PUBLISHABLE_KEY')}")
print(f"STRIPE_STARTER_PRICE_ID: {os.getenv('STRIPE_STARTER_PRICE_ID')}")
print(f"STRIPE_PROFESSIONAL_PRICE_ID: {os.getenv('STRIPE_PROFESSIONAL_PRICE_ID')}")
print(f"STRIPE_WEBHOOK_SECRET: {os.getenv('STRIPE_WEBHOOK_SECRET')}")

# Test Stripe import
try:
    import stripe
    print("✅ Stripe package imported successfully")
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    print("✅ Stripe API key set")
except ImportError as e:
    print(f"❌ Failed to import stripe: {e}")
except Exception as e:
    print(f"❌ Error with stripe: {e}")

# Test stripe_config import
try:
    from stripe_config import validate_stripe_config
    validate_stripe_config()
    print("✅ Stripe config validation passed")
except Exception as e:
    print(f"❌ Stripe config validation failed: {e}") 
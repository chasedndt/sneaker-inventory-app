#!/usr/bin/env python3

print("Testing Stripe module imports...")

try:
    print("1. Testing basic imports...")
    import os
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Basic imports successful")
    
    print("2. Testing Stripe import...")
    import stripe
    print("✅ Stripe import successful")
    
    print("3. Testing stripe_config import...")
    from stripe_config import validate_stripe_config, STRIPE_PRODUCTS
    print("✅ stripe_config import successful")
    
    print("4. Testing stripe_service import...")
    from stripe_service import StripeService
    print("✅ stripe_service import successful")
    
    print("5. Testing middleware.auth import...")
    from middleware.auth import get_user_id_from_token
    print("✅ middleware.auth import successful")
    
    print("6. Testing stripe_routes import...")
    from stripe_routes import stripe_bp
    print("✅ stripe_routes import successful")
    
    print("7. Testing Stripe config validation...")
    validate_stripe_config()
    print("✅ Stripe config validation successful")
    
    print("\n🎉 All imports successful! The issue is likely elsewhere.")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("This is likely the cause of the 500 errors.")
except Exception as e:
    print(f"❌ Error: {e}")
    print("This error might be causing the 500 responses.") 
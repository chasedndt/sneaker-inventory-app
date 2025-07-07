#!/usr/bin/env python3

print("Testing Stripe routes directly...")

try:
    # Set up environment
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Test the route functions directly
    from stripe_routes import stripe_bp
    from stripe_service import StripeService
    
    print("✅ Imports successful")
    
    # Test StripeService methods directly
    print("\n=== Testing StripeService methods ===")
    
    print("1. Testing get_products_info()...")
    products = StripeService.get_products_info()
    print(f"✅ Products: {products}")
    
    print("\n2. Testing validate_price_id()...")
    starter_price_id = os.getenv('STRIPE_STARTER_PRICE_ID')
    is_valid = StripeService.validate_price_id(starter_price_id)
    print(f"✅ Price ID {starter_price_id} is valid: {is_valid}")
    
    print("\n3. Testing get_tier_from_price_id()...")
    tier = StripeService.get_tier_from_price_id(starter_price_id)
    print(f"✅ Tier for {starter_price_id}: {tier}")
    
    print("\n🎉 All StripeService methods working!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 
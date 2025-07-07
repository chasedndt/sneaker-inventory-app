import os
import stripe
from flask import current_app

# Initialize Stripe with secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Stripe configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Product and Price IDs (to be updated after creating products in Stripe Dashboard)
STRIPE_PRODUCTS = {
    'starter': {
        'name': 'Hypelist Starter',
        'price_id': os.getenv('STRIPE_STARTER_PRICE_ID', 'price_starter_placeholder'),
        'features': [
            'Up to 250 items',
            'Basic analytics',
            'Standard support'
        ],
        'monthly_price': 19.00
    },
    'professional': {
        'name': 'Hypelist Professional',
        'price_id': os.getenv('STRIPE_PROFESSIONAL_PRICE_ID', 'price_professional_placeholder'),
        'features': [
            'Unlimited items',
            'Advanced analytics',
            'ROI tracking',
            'Priority support',
            'Export capabilities'
        ],
        'monthly_price': 49.00
    }
}

# User tier mapping
TIER_TO_STRIPE_PRODUCT = {
    'starter': 'starter',
    'professional': 'professional'
}

STRIPE_PRODUCT_TO_TIER = {
    'starter': 'starter',
    'professional': 'professional'
}

def get_stripe_product_info(tier):
    """Get Stripe product information for a given tier"""
    if tier.lower() in STRIPE_PRODUCTS:
        return STRIPE_PRODUCTS[tier.lower()]
    return None

def get_tier_from_price_id(price_id):
    """Get user tier from Stripe price ID"""
    for tier, product_info in STRIPE_PRODUCTS.items():
        if product_info['price_id'] == price_id:
            return tier
    return None

def validate_stripe_config():
    """Validate that all required Stripe configuration is present"""
    missing_vars = []
    
    if not STRIPE_SECRET_KEY:
        missing_vars.append('STRIPE_SECRET_KEY')
    
    if not STRIPE_PUBLISHABLE_KEY:
        missing_vars.append('STRIPE_PUBLISHABLE_KEY')
    
    if missing_vars:
        raise ValueError(f"Missing required Stripe environment variables: {', '.join(missing_vars)}")
    
    return True

# Test Stripe connection
def test_stripe_connection():
    """Test Stripe API connection"""
    try:
        # Simple API call to test connection
        stripe.Account.retrieve()
        return True
    except stripe.error.AuthenticationError:
        current_app.logger.error("Stripe authentication failed. Check your secret key.")
        return False
    except Exception as e:
        current_app.logger.error(f"Stripe connection test failed: {str(e)}")
        return False 
from flask import Blueprint, request, jsonify, current_app
import stripe
import logging
from stripe_service import StripeService
from stripe_config import validate_stripe_config, STRIPE_PRODUCTS
from middleware.auth import get_user_id_from_token, get_current_user_info
from functools import wraps

logger = logging.getLogger(__name__)

def firebase_auth_required(f):
    """Decorator that requires Firebase authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.info(f"🔵 [AUTH] Checking authentication for {f.__name__}")
        try:
            # Get user info from Firebase token
            user_info = get_current_user_info()
            logger.info(f"🔵 [AUTH] User info: {user_info}")
            if not user_info:
                logger.warning("❌ [AUTH] No user info found")
                return jsonify({'error': 'Authentication required'}), 401
            
            user_id = user_info.get('uid')
            if not user_id:
                logger.warning("❌ [AUTH] No user ID found in user info")
                return jsonify({'error': 'Authentication required'}), 401
            
            # Add user_info to request object
            request.user_info = user_info
            
            # Pass user_id to the route handler
            kwargs['user_id'] = user_id
            logger.info(f"🔵 [AUTH] Authentication successful, calling {f.__name__}")
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"❌ [AUTH] Authentication error: {str(e)}")
            import traceback
            logger.error(f"❌ [AUTH] Traceback: {traceback.format_exc()}")
            return jsonify({'error': 'Authentication error'}), 500
    
    return decorated_function

# Create blueprint for Stripe routes
stripe_bp = Blueprint('stripe', __name__, url_prefix='/api/stripe')

@stripe_bp.before_request
def validate_config():
    """Validate Stripe configuration before processing requests"""
    try:
        validate_stripe_config()
    except ValueError as e:
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/products', methods=['GET'])
@firebase_auth_required
def get_products(user_id):
    """Get available subscription products"""
    try:
        logger.info(f"🔵 [STRIPE] /products route called for user: {user_id}")
        products = StripeService.get_products_info()
        logger.info(f"🔵 [STRIPE] Products retrieved: {products}")
        return jsonify({
            'success': True,
            'products': products
        })
    except Exception as e:
        logger.error(f"❌ [STRIPE] Failed to get products: {str(e)}")
        import traceback
        logger.error(f"❌ [STRIPE] Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to retrieve products'}), 500

@stripe_bp.route('/create-checkout-session', methods=['POST'])
@firebase_auth_required
def create_checkout_session(user_id):
    """Create a Stripe Checkout session for subscription"""
    try:
        data = request.get_json()
        price_id = data.get('price_id')
        success_url = data.get('success_url')
        cancel_url = data.get('cancel_url')
        
        if not price_id or not success_url or not cancel_url:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Validate price ID
        if not StripeService.validate_price_id(price_id):
            return jsonify({'error': 'Invalid price ID'}), 400
        
        # Get user info from Firebase token
        user_info = request.user_info
        email = user_info.get('email')
        name = user_info.get('name')
        firebase_uid = user_info.get('uid')
        
        if not email:
            return jsonify({'error': 'User email not found'}), 400
        
        # Get or create Stripe customer
        customer = StripeService.get_customer_by_email(email)
        if not customer:
            customer = StripeService.create_customer(
                email=email,
                name=name,
                firebase_uid=firebase_uid
            )
        
        # Create checkout session
        session = StripeService.create_checkout_session(
            customer_id=customer.id,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            firebase_uid=firebase_uid
        )
        
        return jsonify({
            'success': True,
            'checkout_url': session.url,
            'session_id': session.id
        })
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in checkout session: {str(e)}")
        return jsonify({'error': 'Payment processing error'}), 500
    except Exception as e:
        logger.error(f"Failed to create checkout session: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@stripe_bp.route('/create-billing-portal-session', methods=['POST'])
@firebase_auth_required
def create_billing_portal_session(user_id):
    """Create a Stripe billing portal session"""
    try:
        data = request.get_json()
        return_url = data.get('return_url')
        
        if not return_url:
            return jsonify({'error': 'Missing return URL'}), 400
        
        # Get user info from Firebase token
        user_info = request.user_info
        email = user_info.get('email')
        
        if not email:
            return jsonify({'error': 'User email not found'}), 400
        
        # Get Stripe customer
        customer = StripeService.get_customer_by_email(email)
        if not customer:
            return jsonify({'error': 'No subscription found'}), 404
        
        # Create billing portal session
        session = StripeService.create_billing_portal_session(
            customer_id=customer.id,
            return_url=return_url
        )
        
        return jsonify({
            'success': True,
            'portal_url': session.url
        })
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in billing portal: {str(e)}")
        return jsonify({'error': 'Payment processing error'}), 500
    except Exception as e:
        logger.error(f"Failed to create billing portal session: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@stripe_bp.route('/subscription-status', methods=['GET'])
@firebase_auth_required
def get_subscription_status(user_id):
    """Get user's subscription status"""
    try:
        # Get user info from Firebase token
        user_info = request.user_info
        email = user_info.get('email')
        
        if not email:
            return jsonify({'error': 'User email not found'}), 400
        
        # Get Stripe customer
        customer = StripeService.get_customer_by_email(email)
        if not customer:
            return jsonify({
                'success': True,
                'has_subscription': False,
                'tier': 'free'
            })
        
        # Get customer subscriptions
        subscriptions = StripeService.get_customer_subscriptions(customer.id)
        
        if not subscriptions:
            return jsonify({
                'success': True,
                'has_subscription': False,
                'tier': 'free'
            })
        
        # Find active subscription
        active_subscription = None
        for subscription in subscriptions:
            if subscription.status == 'active':
                active_subscription = subscription
                break
        
        if not active_subscription:
            return jsonify({
                'success': True,
                'has_subscription': False,
                'tier': 'free'
            })
        
        # Get tier from price ID
        price_id = active_subscription.items.data[0].price.id
        tier = StripeService.get_tier_from_price_id(price_id) or 'free'
        
        return jsonify({
            'success': True,
            'has_subscription': True,
            'tier': tier,
            'subscription': {
                'id': active_subscription.id,
                'status': active_subscription.status,
                'current_period_end': active_subscription.current_period_end,
                'cancel_at_period_end': active_subscription.cancel_at_period_end
            }
        })
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in subscription status: {str(e)}")
        return jsonify({'error': 'Payment processing error'}), 500
    except Exception as e:
        logger.error(f"Failed to get subscription status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = request.get_data()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            return jsonify({'error': 'Missing signature'}), 400
        
        # Verify webhook signature
        event = StripeService.verify_webhook_signature(payload, signature)
        
        logger.info(f"Received Stripe webhook event: {event['type']}")
        
        # Handle different event types
        if event['type'] in ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']:
            subscription_data = StripeService.process_subscription_event(event)
            
            if subscription_data:
                # TODO: Update Firebase user claims based on subscription
                # This will be implemented when we integrate with Firebase
                logger.info(f"Subscription event processed for user: {subscription_data['firebase_uid']}")
                
                # For now, just log the event
                logger.info(f"User {subscription_data['firebase_uid']} subscription status: {subscription_data['status']}, tier: {subscription_data['tier']}")
        
        elif event['type'] == 'invoice.payment_succeeded':
            # Handle successful payment
            invoice = event['data']['object']
            logger.info(f"Payment succeeded for invoice: {invoice['id']}")
        
        elif event['type'] == 'invoice.payment_failed':
            # Handle failed payment
            invoice = event['data']['object']
            logger.warning(f"Payment failed for invoice: {invoice['id']}")
        
        return jsonify({'success': True})
    
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500

@stripe_bp.route('/test-connection', methods=['GET'])
@firebase_auth_required
def test_stripe_connection(user_id):
    """Test Stripe API connection"""
    try:
        # Simple API call to test connection
        account = stripe.Account.retrieve()
        
        return jsonify({
            'success': True,
            'account_id': account.id,
            'business_profile': account.business_profile,
            'charges_enabled': account.charges_enabled,
            'payouts_enabled': account.payouts_enabled
        })
    
    except stripe.error.AuthenticationError:
        return jsonify({'error': 'Stripe authentication failed'}), 401
    except Exception as e:
        logger.error(f"Stripe connection test failed: {str(e)}")
        return jsonify({'error': 'Connection test failed'}), 500 
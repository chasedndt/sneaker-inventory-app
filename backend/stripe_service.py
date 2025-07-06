import stripe
import logging
from flask import current_app
from stripe_config import (
    STRIPE_PRODUCTS, 
    get_stripe_product_info, 
    get_tier_from_price_id,
    STRIPE_WEBHOOK_SECRET
)

logger = logging.getLogger(__name__)

class StripeService:
    """Service class for handling Stripe operations"""
    
    @staticmethod
    def create_customer(email, name=None, firebase_uid=None):
        """Create a new Stripe customer"""
        try:
            customer_data = {
                'email': email,
                'metadata': {
                    'firebase_uid': firebase_uid or ''
                }
            }
            
            if name:
                customer_data['name'] = name
            
            customer = stripe.Customer.create(**customer_data)
            logger.info(f"Created Stripe customer: {customer.id} for email: {email}")
            return customer
        
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {str(e)}")
            raise e
    
    @staticmethod
    def get_customer_by_email(email):
        """Get Stripe customer by email"""
        try:
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                return customers.data[0]
            return None
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get customer by email: {str(e)}")
            raise e
    
    @staticmethod
    def create_checkout_session(customer_id, price_id, success_url, cancel_url, firebase_uid=None):
        """Create a Stripe Checkout session for subscription"""
        try:
            session_data = {
                'customer': customer_id,
                'payment_method_types': ['card'],
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': {
                    'firebase_uid': firebase_uid or ''
                }
            }
            
            session = stripe.checkout.Session.create(**session_data)
            logger.info(f"Created checkout session: {session.id} for customer: {customer_id}")
            return session
        
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create checkout session: {str(e)}")
            raise e
    
    @staticmethod
    def create_billing_portal_session(customer_id, return_url):
        """Create a Stripe billing portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            logger.info(f"Created billing portal session for customer: {customer_id}")
            return session
        
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create billing portal session: {str(e)}")
            raise e
    
    @staticmethod
    def get_customer_subscriptions(customer_id):
        """Get all subscriptions for a customer"""
        try:
            subscriptions = stripe.Subscription.list(customer=customer_id)
            return subscriptions.data
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get customer subscriptions: {str(e)}")
            raise e
    
    @staticmethod
    def get_subscription(subscription_id):
        """Get a specific subscription"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get subscription: {str(e)}")
            raise e
    
    @staticmethod
    def cancel_subscription(subscription_id):
        """Cancel a subscription"""
        try:
            subscription = stripe.Subscription.delete(subscription_id)
            logger.info(f"Cancelled subscription: {subscription_id}")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription: {str(e)}")
            raise e
    
    @staticmethod
    def get_upcoming_invoice(customer_id):
        """Get upcoming invoice for a customer"""
        try:
            invoice = stripe.Invoice.upcoming(customer=customer_id)
            return invoice
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get upcoming invoice: {str(e)}")
            raise e
    
    @staticmethod
    def verify_webhook_signature(payload, signature):
        """Verify Stripe webhook signature"""
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload in webhook: {str(e)}")
            raise e
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature in webhook: {str(e)}")
            raise e
    
    @staticmethod
    def process_subscription_event(event):
        """Process subscription-related webhook events"""
        try:
            subscription = event['data']['object']
            customer_id = subscription['customer']
            
            # Get customer details
            customer = stripe.Customer.retrieve(customer_id)
            firebase_uid = customer.metadata.get('firebase_uid')
            
            if not firebase_uid:
                logger.warning(f"No Firebase UID found for customer: {customer_id}")
                return None
            
            # Determine user tier based on subscription
            tier = 'free'  # Default
            if subscription['status'] == 'active':
                # Get the price ID from the subscription
                if subscription['items']['data']:
                    price_id = subscription['items']['data'][0]['price']['id']
                    tier = get_tier_from_price_id(price_id) or 'free'
            
            return {
                'firebase_uid': firebase_uid,
                'customer_id': customer_id,
                'subscription_id': subscription['id'],
                'status': subscription['status'],
                'tier': tier,
                'current_period_end': subscription['current_period_end'],
                'current_period_start': subscription['current_period_start'],
                'cancel_at_period_end': subscription['cancel_at_period_end']
            }
        
        except Exception as e:
            logger.error(f"Failed to process subscription event: {str(e)}")
            raise e
    
    @staticmethod
    def get_products_info():
        """Get information about all available products"""
        return STRIPE_PRODUCTS
    
    @staticmethod
    def validate_price_id(price_id):
        """Validate if a price ID is valid for our products"""
        for product_info in STRIPE_PRODUCTS.values():
            if product_info['price_id'] == price_id:
                return True
        return False 
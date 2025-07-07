import { loadStripe, Stripe } from '@stripe/stripe-js';
import { api } from './api';

// Debug: Log the environment variable
console.log('STRIPE_PUBLISHABLE_KEY from env:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

// API Base URL
const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface StripeProduct {
  name: string;
  price_id: string;
  features: string[];
  monthly_price: number;
}

export interface StripeProducts {
  [key: string]: StripeProduct;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  tier: string;
  subscription?: {
    id: string;
    status: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };
}

export interface CheckoutSessionResponse {
  success: boolean;
  checkout_url: string;
  session_id: string;
}

export interface BillingPortalResponse {
  success: boolean;
  portal_url: string;
}

class StripeService {
  private stripe: Promise<Stripe | null>;

  constructor() {
    this.stripe = stripePromise;
  }

  /**
   * Get available subscription products
   */
  async getProducts(): Promise<StripeProducts> {
    try {
      const response = await api.authenticatedFetch(`${API_BASE_URL}/stripe/products`);
      const data = await response.json();
      return data.products;
    } catch (error) {
      console.error('Failed to get Stripe products:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResponse> {
    try {
      const response = await api.authenticatedFetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(returnUrl: string): Promise<BillingPortalResponse> {
    try {
      const response = await api.authenticatedFetch(`${API_BASE_URL}/stripe/create-billing-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: returnUrl
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      throw error;
    }
  }

  /**
   * Get user's subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await api.authenticatedFetch(`${API_BASE_URL}/stripe/subscription-status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  async redirectToCheckout(priceId: string): Promise<void> {
    try {
      const stripe = await this.stripe;
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const successUrl = `${window.location.origin}/settings/billing?success=true`;
      const cancelUrl = `${window.location.origin}/settings/billing?canceled=true`;

      const session = await this.createCheckoutSession(priceId, successUrl, cancelUrl);
      
      // Redirect to Stripe Checkout
      window.location.href = session.checkout_url;
    } catch (error) {
      console.error('Failed to redirect to checkout:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe Billing Portal
   */
  async redirectToBillingPortal(): Promise<void> {
    try {
      const returnUrl = `${window.location.origin}/settings/billing`;
      const session = await this.createBillingPortalSession(returnUrl);
      
      // Redirect to Stripe Billing Portal
      window.location.href = session.portal_url;
    } catch (error) {
      console.error('Failed to redirect to billing portal:', error);
      throw error;
    }
  }

  /**
   * Test Stripe connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await api.authenticatedFetch(`${API_BASE_URL}/stripe/test-connection`);
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Stripe connection test failed:', error);
      return false;
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  /**
   * Get tier display name
   */
  getTierDisplayName(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'starter':
        return 'Starter';
      case 'professional':
        return 'Professional';
      case 'free':
      default:
        return 'Free';
    }
  }

  /**
   * Get tier color for UI
   */
  getTierColor(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'starter':
        return '#2196F3'; // Blue
      case 'professional':
        return '#9C27B0'; // Purple
      case 'free':
      default:
        return '#757575'; // Gray
    }
  }

  /**
   * Check if user can upgrade to a specific tier
   */
  canUpgradeTo(currentTier: string, targetTier: string): boolean {
    const tierHierarchy = ['free', 'starter', 'professional'];
    const currentIndex = tierHierarchy.indexOf(currentTier.toLowerCase());
    const targetIndex = tierHierarchy.indexOf(targetTier.toLowerCase());
    
    return targetIndex > currentIndex;
  }

  /**
   * Format subscription period end date
   */
  formatPeriodEndDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

export const stripeService = new StripeService();
export default stripeService; 
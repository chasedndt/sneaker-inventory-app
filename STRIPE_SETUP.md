# Stripe Payment Integration Setup Guide

## Overview
This guide walks through setting up Stripe for the Hypelist sneaker inventory application, including subscription management and payment processing.

## Phase 2: Stripe Account Setup & Integration

### Step 1: Create Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a new account or log in to existing account
3. Complete account verification process
4. Enable your account for live payments (when ready for production)

### Step 2: Get API Keys
1. Navigate to **Developers > API Keys** in your Stripe Dashboard
2. Copy your **Publishable Key** (starts with `pk_test_` for test mode)
3. Copy your **Secret Key** (starts with `sk_test_` for test mode)
4. Store these securely - we'll add them to environment variables

### Step 3: Environment Variables Setup
Add these variables to your environment:

**Frontend (.env file in project root):**
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Backend (backend/.env file):**
```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 4: Create Products & Pricing in Stripe Dashboard

#### Products to Create:
1. **Hypelist Starter Plan**
   - Name: "Hypelist Starter"
   - Description: "Basic sneaker inventory tracking with essential features"
   - Price: $9.99/month (recurring)
   - Features: Up to 100 items, basic analytics

2. **Hypelist Professional Plan**
   - Name: "Hypelist Professional"
   - Description: "Advanced sneaker inventory management for serious collectors"
   - Price: $19.99/month (recurring)
   - Features: Unlimited items, advanced analytics, ROI tracking

#### How to Create Products:
1. Go to **Products** in your Stripe Dashboard
2. Click **+ Add Product**
3. Enter product details
4. Set pricing (recurring monthly)
5. Save and note down the **Price ID** for each product

### Step 5: Webhook Configuration
1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **+ Add Endpoint**
3. Set endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Save and copy the **Webhook Secret**

## Implementation Plan

### Frontend Components (React)
- [ ] Stripe Elements integration
- [ ] Subscription management interface
- [ ] Payment form components
- [ ] Billing settings page enhancement

### Backend Endpoints (Flask)
- [ ] Stripe webhook handler
- [ ] Subscription creation/management
- [ ] Payment processing
- [ ] Customer management

### Firebase Integration
- [ ] Store subscription data in Firestore
- [ ] Update user custom claims based on subscription
- [ ] Sync payment status with user tiers

## Pricing Structure

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | Limited features, basic inventory |
| Starter | $9.99/month | Up to 100 items, basic analytics |
| Professional | $19.99/month | Unlimited items, advanced analytics, ROI tracking |

## Security Considerations
- Never expose secret keys in frontend code
- Use HTTPS for all payment-related endpoints
- Validate webhook signatures
- Implement proper error handling
- Log payment events for debugging

## Testing
- Use Stripe's test mode for development
- Test card numbers available in Stripe documentation
- Test webhook delivery using Stripe CLI
- Verify subscription lifecycle events

## Next Steps
1. Complete Stripe account setup
2. Add environment variables
3. Create products and pricing
4. Implement frontend payment components
5. Build backend payment endpoints
6. Set up webhooks
7. Test end-to-end payment flow 
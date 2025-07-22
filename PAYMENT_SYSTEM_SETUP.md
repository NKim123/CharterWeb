# CharterAI Payment System Integration Guide

This document outlines the complete payment system implementation for CharterAI, including Stripe integration, subscription management, and usage tracking.

## Overview

The payment system implements a freemium model:
- **Free Tier**: 5 trip generations per month
- **Pro Tier**: Unlimited trip generations for $1/month (configurable)

## Architecture

### Database Schema
- `subscriptions`: Stripe subscription management
- `usage_tracking`: Track trip generations and token usage
- `billing_history`: Invoice and payment records
- `payment_methods`: Stored payment methods (optional)

### API Structure
- Client-side: Stripe.js for payment processing
- Server-side: Supabase Edge Functions for Stripe webhooks
- Usage validation: PostgreSQL functions for real-time checks

## Setup Instructions

### 1. Stripe Account Setup

1. **Create Stripe Account**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Create a new account or use existing
   - Switch to Test mode for development

2. **Create Products and Prices**
   ```bash
   # Using Stripe CLI (install from https://stripe.com/docs/stripe-cli)
   stripe login
   
   # Create product
   stripe products create \
     --name "CharterAI Pro" \
     --description "Unlimited fishing trip planning with AI"
   
   # Create monthly price (replace prod_xxx with your product ID)
   stripe prices create \
     --product prod_xxx \
     --unit-amount 100 \
     --currency usd \
     --recurring-interval month \
     --lookup-key monthly-pro
   
   # Create yearly price with discount
   stripe prices create \
     --product prod_xxx \
     --unit-amount 1000 \
     --currency usd \
     --recurring-interval year \
     --lookup-key yearly-pro
   ```

3. **Get API Keys**
   - Navigate to Developers > API keys
   - Copy your Publishable key (pk_test_...) and Secret key (sk_test_...)

4. **Configure Webhooks**
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Select these events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret (whsec_...)

### 2. Supabase Configuration

1. **Database Setup**
   ```sql
   -- Run the payment system schema
   -- Execute the contents of supabase/sql/ddl_payment_system.sql
   -- in your Supabase SQL editor
   ```

2. **Environment Variables**
   Set these in Supabase Dashboard > Settings > Edge Functions:
   ```
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

3. **Deploy Edge Functions**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Deploy functions
   supabase functions deploy create-checkout-session
   supabase functions deploy create-customer-portal
   supabase functions deploy stripe-webhook
   ```

### 3. Client Application Setup

1. **Environment Variables**
   Create `.env.local` file:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   VITE_STRIPE_PRICE_ID_MONTHLY=price_monthly_id
   VITE_STRIPE_PRICE_ID_YEARLY=price_yearly_id
   ```

2. **Update Dependencies**
   ```bash
   npm install stripe @stripe/stripe-js
   ```

## Usage Flow

### Free User Journey
1. User signs up and gets 5 free trip generations
2. Usage is tracked in `usage_tracking` table
3. When limit reached, user sees upgrade modal
4. User can continue with Pro subscription

### Subscription Flow
1. User clicks "Upgrade to Pro"
2. Redirected to Stripe Checkout
3. After payment, webhook updates database
4. User gets unlimited generations

### Billing Management
1. Users can view subscription status in Profile page
2. Manage billing through Stripe Customer Portal
3. View billing history and download invoices

## Key Features Implemented

### Frontend Components
- `PricingModal`: Subscription upgrade interface
- Enhanced `ProfilePage`: Account management with tabs
- `Header`: Usage indicator for free users
- Payment flow integration in main app

### Backend Functions
- `create-checkout-session`: Stripe checkout creation
- `create-customer-portal`: Billing management portal
- `stripe-webhook`: Subscription state synchronization
- Usage validation in `plan_trip` function

### Database Functions
- `get_user_current_usage()`: Real-time usage calculation
- `can_user_generate_trip()`: Permission checking
- Automatic billing period handling

## Testing

### Test Cards
Use Stripe test cards for testing:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

### Test Webhooks
```bash
# Forward webhooks to local development
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## Security Considerations

1. **API Keys**: Never expose secret keys in client code
2. **Webhooks**: Always verify webhook signatures
3. **RLS**: Row Level Security enabled on all tables
4. **Validation**: Server-side usage validation before AI requests

## Monitoring

### Key Metrics to Track
- Subscription conversion rate
- Usage patterns by tier
- Payment failures and retries
- Customer lifetime value

### Error Handling
- Payment failures logged to `error_logs` table
- Graceful degradation for Stripe service issues
- User-friendly error messages

## Customization

### Pricing Changes
Update the `STRIPE_CONFIG` object in `src/lib/stripe.ts`:
```typescript
export const STRIPE_CONFIG = {
  FREE_GENERATIONS_LIMIT: 5,
  MONTHLY_PRICE: 1.00,
  YEARLY_PRICE: 10.00
}
```

### Adding New Plans
1. Create new products/prices in Stripe
2. Add price IDs to environment variables
3. Update pricing modal components
4. Modify database schema if needed

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check endpoint URL is correct
   - Verify webhook signing secret
   - Ensure Edge Function is deployed

2. **Subscription not updating**
   - Check webhook event handling
   - Verify database permissions
   - Look for errors in function logs

3. **Payment flow failing**
   - Verify publishable key is correct
   - Check browser console for errors
   - Test with different cards

### Debugging
- Use Stripe Dashboard event logs
- Check Supabase function logs
- Enable client-side error reporting

## Next Steps

Consider implementing these additional features:
1. Email notifications for billing events
2. Usage analytics dashboard
3. Team/organization plans
4. Annual billing discounts
5. Granular usage limits
6. API rate limiting

---

## Support

For technical support:
1. Check Stripe documentation
2. Review Supabase Edge Function logs
3. Test with Stripe CLI
4. Verify environment variables

The payment system is now fully integrated and ready for production use with proper testing and monitoring.

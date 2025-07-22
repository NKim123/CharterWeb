import { loadStripe, Stripe } from '@stripe/stripe-js'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn('Stripe publishable key not found. Payment features will be disabled.')
}

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

export const STRIPE_CONFIG = {
  PRICE_ID_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY,
  PRICE_ID_YEARLY: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY,
  FREE_GENERATIONS_LIMIT: 5,
  MONTHLY_PRICE: 1.00, // $1/month as requested
  YEARLY_PRICE: 10.00  // $10/year (2 months free)
}

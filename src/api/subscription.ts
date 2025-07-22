import { supabase } from '../lib/supabaseClient'
import { getStripe } from '../lib/stripe'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete'
  plan_type: 'free' | 'pro'
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UsageInfo {
  trip_generations: number
  current_period_start: string
  current_period_end: string
  can_generate: boolean
  is_subscribed: boolean
}

export interface BillingHistory {
  id: string
  user_id: string
  stripe_invoice_id?: string
  amount_paid: number
  currency: string
  status: 'paid' | 'open' | 'void' | 'draft'
  invoice_pdf_url?: string
  billing_period_start?: string
  billing_period_end?: string
  created_at: string
}

/**
 * Get user's current subscription status
 */
export async function getUserSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }

  return data
}

/**
 * Get user's current usage information
 */
export async function getUserUsage(): Promise<UsageInfo> {
  const { data: usageData, error: usageError } = await supabase
    .rpc('get_user_current_usage', { 
      user_uuid: (await supabase.auth.getUser()).data.user?.id 
    })
    .single()

  if (usageError) {
    throw usageError
  }

  const { data: canGenerate, error: canGenerateError } = await supabase
    .rpc('can_user_generate_trip', { 
      user_uuid: (await supabase.auth.getUser()).data.user?.id 
    })

  if (canGenerateError) {
    throw canGenerateError
  }

  const subscription = await getUserSubscription()

  return {
    trip_generations: usageData.trip_generations || 0,
    current_period_start: usageData.current_period_start,
    current_period_end: usageData.current_period_end,
    can_generate: canGenerate,
    is_subscribed: subscription?.status === 'active'
  }
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { 
      priceId,
      successUrl: `${window.location.origin}/profile?success=true`,
      cancelUrl: `${window.location.origin}/profile?canceled=true`
    }
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Create a Stripe customer portal session
 */
export async function createCustomerPortalSession(): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-customer-portal', {
    body: { 
      returnUrl: `${window.location.origin}/profile`
    }
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Get user's billing history
 */
export async function getBillingHistory(): Promise<BillingHistory[]> {
  const { data, error } = await supabase
    .from('billing_history')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Record a trip generation for usage tracking
 */
export async function recordTripGeneration(planId: string): Promise<void> {
  const { error } = await supabase
    .from('usage_tracking')
    .insert({
      action_type: 'trip_generation',
      plan_id: planId
    })

  if (error) {
    throw error
  }
}

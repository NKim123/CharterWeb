// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@15.8.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing Stripe signature or webhook secret')
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )

    console.log('Received Stripe webhook:', event.type)

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(supabase, event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleSubscriptionChange(supabase, subscription) {
  const customerId = subscription.customer
  const subscriptionId = subscription.id

  // Get the Supabase user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId)
  const userId = customer.metadata?.supabase_user_id

  if (!userId) {
    console.error('No Supabase user ID found in customer metadata')
    return
  }

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status: subscription.status,
    plan_type: 'pro',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  // Upsert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    })

  if (error) {
    console.error('Error upserting subscription:', error)
    throw error
  }

  // Update user profile subscription status
  await supabase
    .from('profiles')
    .update({ subscription_status: subscription.status })
    .eq('id', userId)

  console.log('Subscription updated successfully')
}

async function handleSubscriptionDeleted(supabase, subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating canceled subscription:', error)
    throw error
  }

  // Update user profile
  const customerId = subscription.customer
  const customer = await stripe.customers.retrieve(customerId)
  const userId = customer.metadata?.supabase_user_id

  if (userId) {
    await supabase
      .from('profiles')
      .update({ subscription_status: 'canceled' })
      .eq('id', userId)
  }

  console.log('Subscription canceled successfully')
}

async function handleInvoicePaymentSucceeded(supabase, invoice) {
  const customerId = invoice.customer
  const customer = await stripe.customers.retrieve(customerId)
  const userId = customer.metadata?.supabase_user_id

  if (!userId) {
    console.error('No Supabase user ID found in customer metadata')
    return
  }

  const billingData = {
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount_paid: invoice.amount_paid / 100, // Convert from cents
    currency: invoice.currency,
    status: 'paid',
    invoice_pdf_url: invoice.invoice_pdf,
    billing_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    billing_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
  }

  const { error } = await supabase
    .from('billing_history')
    .insert(billingData)

  if (error) {
    console.error('Error inserting billing history:', error)
    throw error
  }

  console.log('Payment recorded successfully')
}

async function handleInvoicePaymentFailed(supabase, invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  // You might want to send a notification to the user here
  // or update their subscription status to 'past_due'
}

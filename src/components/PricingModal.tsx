import React, { useState } from 'react'
import { createCheckoutSession } from '../api/subscription'
import { STRIPE_CONFIG } from '../lib/stripe'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsage?: number
}

export function PricingModal({ isOpen, onClose, currentUsage = 0 }: PricingModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true)
      const { url } = await createCheckoutSession(priceId)
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const remainingGenerations = Math.max(0, STRIPE_CONFIG.FREE_GENERATIONS_LIMIT - currentUsage)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
          onClick={onClose}
          aria-label="Close pricing modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upgrade to CharterAI Pro</h2>
            <p className="text-gray-600 mb-2">
              You've used {currentUsage} of {STRIPE_CONFIG.FREE_GENERATIONS_LIMIT} free trip generations.
            </p>
            {remainingGenerations > 0 ? (
              <p className="text-green-600 font-medium">
                You have {remainingGenerations} free generations remaining.
              </p>
            ) : (
              <p className="text-red-600 font-medium">
                You've reached your free limit. Upgrade to continue planning trips!
              </p>
            )}
          </div>

          {/* Plan Selection Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedPlan === 'monthly'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setSelectedPlan('monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedPlan === 'yearly'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setSelectedPlan('yearly')}
              >
                Yearly
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="border-2 border-gray-200 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  $0<span className="text-sm font-normal text-gray-600">/month</span>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    5 trip generations per month
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Basic trip planning features
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    AI chat guide
                  </li>
                </ul>
                <div className="text-center">
                  <span className="text-gray-500">Current Plan</span>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-brand rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-brand text-white px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  ${selectedPlan === 'monthly' ? STRIPE_CONFIG.MONTHLY_PRICE.toFixed(0) : (STRIPE_CONFIG.YEARLY_PRICE / 12).toFixed(2)}
                  <span className="text-sm font-normal text-gray-600">
                    /{selectedPlan === 'monthly' ? 'month' : 'month, billed yearly'}
                  </span>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <strong>Unlimited</strong> trip generations
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Priority AI processing
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Advanced trip customization
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Email support
                  </li>
                </ul>
                <button
                  onClick={() => handleSubscribe(
                    selectedPlan === 'monthly' 
                      ? STRIPE_CONFIG.PRICE_ID_MONTHLY 
                      : STRIPE_CONFIG.PRICE_ID_YEARLY
                  )}
                  disabled={loading}
                  className="w-full bg-brand text-white py-3 px-6 rounded-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : 'Upgrade to Pro'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>✓ Cancel anytime • ✓ Secure payments by Stripe • ✓ No hidden fees</p>
          </div>
        </div>
      </div>
    </div>
  )
}

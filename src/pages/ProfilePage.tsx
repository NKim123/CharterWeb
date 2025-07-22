import React, { useEffect, useState } from 'react'
import { getProfile, upsertProfile, UserProfile } from '../api/profile'
import { getUserSubscription, getUserUsage, createCustomerPortalSession, getBillingHistory } from '../api/subscription'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/Header'
import { PricingModal } from '../components/PricingModal'
import { STRIPE_CONFIG } from '../lib/stripe'

export default function ProfilePage() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [form, setForm] = useState<{ display_name: string; avatar_url: string }>({ display_name: '', avatar_url: '' })
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [showPricing, setShowPricing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'billing'>('profile')

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const data = await getProfile(userId)
        setProfile(data)
        setForm({ display_name: data?.display_name ?? '', avatar_url: data?.avatar_url ?? '' })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const [subData, usageData, billingData] = await Promise.all([
          getUserSubscription(),
          getUserUsage(),
          getBillingHistory()
        ])
        setSubscription(subData)
        setUsage(usageData)
        setBillingHistory(billingData)
      } catch (err) {
        console.error('Error loading subscription data:', err)
      } finally {
        setSubscriptionLoading(false)
      }
    })()
  }, [userId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    try {
      await upsertProfile(form, userId)
      alert('Profile updated')
    } catch (err) {
      console.error(err)
      alert('Failed to save profile')
    }
  }

  const handleManageSubscription = async () => {
    try {
      const { url } = await createCustomerPortalSession()
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Failed to open billing portal')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading || subscriptionLoading) return <p className="p-8">Loading...</p>

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-6">My Account</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'billing', label: 'Billing' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-md">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <button type="submit" className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90">
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Subscription & Usage</h2>
            
            {/* Current Plan */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">Current Plan</h3>
                  <p className="text-2xl font-bold text-brand">
                    {subscription ? 'Pro' : 'Free'}
                  </p>
                </div>
                {subscription && (
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    subscription.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {subscription.status}
                  </span>
                )}
              </div>
              
              {subscription && (
                <div className="text-sm text-gray-600 mb-4">
                  <p>Billing period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}</p>
                  {subscription.cancel_at_period_end && (
                    <p className="text-red-600 mt-1">Will cancel at end of period</p>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                {!subscription ? (
                  <button
                    onClick={() => setShowPricing(true)}
                    className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90"
                  >
                    Upgrade to Pro
                  </button>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Usage This Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600">Trip Generations</div>
                  <div className="text-2xl font-bold">
                    {usage?.trip_generations || 0}
                    {!subscription && (
                      <span className="text-sm text-gray-500 ml-1">
                        / {STRIPE_CONFIG.FREE_GENERATIONS_LIMIT}
                      </span>
                    )}
                  </div>
                  {!subscription && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-brand h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, ((usage?.trip_generations || 0) / STRIPE_CONFIG.FREE_GENERATIONS_LIMIT) * 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600">Plan Status</div>
                  <div className={`text-2xl font-bold ${usage?.can_generate ? 'text-green-600' : 'text-red-600'}`}>
                    {usage?.can_generate ? 'Active' : 'Limit Reached'}
                  </div>
                  {!usage?.can_generate && !subscription && (
                    <button
                      onClick={() => setShowPricing(true)}
                      className="text-brand hover:underline text-sm mt-1"
                    >
                      Upgrade to continue →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold mb-4">Billing History</h2>
            
            {billingHistory.length === 0 ? (
              <div className="bg-gray-50 border rounded-lg p-8 text-center">
                <p className="text-gray-500">No billing history yet</p>
                {!subscription && (
                  <button
                    onClick={() => setShowPricing(true)}
                    className="mt-4 bg-brand text-white px-4 py-2 rounded hover:bg-brand/90"
                  >
                    Start Subscription
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingHistory.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${invoice.amount_paid.toFixed(2)} {invoice.currency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.invoice_pdf_url ? (
                            <a 
                              href={invoice.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:underline"
                            >
                              Download PDF
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <PricingModal 
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        currentUsage={usage?.trip_generations || 0}
      />
    </>
  )
} 
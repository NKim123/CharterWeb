import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isValidEmail, ClientRateLimit } from '../lib/security'

// Rate limiting: 5 login attempts per 15 minutes
const loginRateLimit = new ClientRateLimit('login', {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000
});

export function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrorMsg(null)
    
    // Validate email
    if (!email.trim()) {
      setErrorMsg('Email is required')
      return
    }
    
    if (!isValidEmail(email.trim())) {
      setErrorMsg('Please enter a valid email address')
      return
    }
    
    // Check rate limit
    const rateCheck = loginRateLimit.checkLimit()
    if (!rateCheck.allowed) {
      const resetDate = new Date(rateCheck.resetTime)
      setErrorMsg(`Too many login attempts. Try again after ${resetDate.toLocaleTimeString()}`)
      return
    }
    
    setStatus('sending')
    
    try {
      await signInWithEmail(email.trim().toLowerCase())
      setStatus('sent')
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Sanitize error message to prevent information disclosure
      let safeErrorMsg = 'Failed to send login link. Please try again.'
      
      // Allow specific known error messages
      const errorMessage = error.message?.toLowerCase() || ''
      if (errorMessage.includes('invalid email') || errorMessage.includes('email not confirmed')) {
        safeErrorMsg = 'Please check your email address and try again.'
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        safeErrorMsg = 'Too many requests. Please wait before trying again.'
      }
      
      setErrorMsg(safeErrorMsg)
      setStatus('error')
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Basic input sanitization
    const sanitized = value
      .replace(/[<>{}[\]\\]/g, '') // Remove potentially dangerous characters
      .slice(0, 254) // Limit email length
    
    setEmail(sanitized)
    
    // Clear error when user starts typing
    if (errorMsg) {
      setErrorMsg(null)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center mb-4">Sign In</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            disabled={status === 'sending'}
            maxLength={254}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
            autoComplete="email"
            spellCheck={false}
          />
          {email && !isValidEmail(email) && (
            <p className="mt-1 text-sm text-orange-600">Please enter a valid email address</p>
          )}
        </div>
        <button
          type="submit"
          disabled={status === 'sending' || !email.trim() || !isValidEmail(email.trim())}
          className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-50 hover:bg-brand/90 transition-colors"
        >
          {status === 'sending' ? 'Sending magic link...' : 'Send Magic Link'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        {status === 'sent' && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-green-700 text-sm">
              ✓ Check your email for the login link.
            </p>
          </div>
        )}
        
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          Remaining attempts: {loginRateLimit.checkLimit().remaining}/5 per 15 minutes
        </div>
      </div>
      
      <div className="mt-6 text-xs text-gray-500 text-center">
        We'll send you a secure link to sign in without a password.
      </div>
    </div>
  )
} 
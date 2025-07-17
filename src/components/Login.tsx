import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg(null)
    try {
      await signInWithEmail(email)
      setStatus('sent')
    } catch (error: any) {
      setErrorMsg(error.message)
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center mb-4">Sign In</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending magic link...' : 'Send Magic Link'}
        </button>
      </form>
      {status === 'sent' && (
        <p className="mt-4 text-green-600 text-center">Check your email for the login link.</p>
      )}
      {errorMsg && (
        <p className="mt-4 text-red-600 text-center">{errorMsg}</p>
      )}
    </div>
  )
} 
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  // Current auth method – magic link email
  signInWithEmail: (email: string) => Promise<void>
  // Placeholder for future password-based auth
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const currentSession = supabase.auth.getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(console.error)

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) throw error
  }

  // Future: migrate to username/password auth. For now this is a no-op throwing error.
  const signInWithPassword = async (_email: string, _password: string) => {
    throw new Error('Password sign-in not yet implemented')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value: AuthContextValue = {
    session,
    isAuthenticated: !!session,
    signInWithEmail,
    signInWithPassword,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
} 
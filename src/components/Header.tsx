import React, { useState, useEffect } from 'react'
import logo from '../assets/charterai-logo-notext.png'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserUsage } from '../api/subscription'
import { STRIPE_CONFIG } from '../lib/stripe'

interface HeaderProps {
  /** If provided, triggers a login modal. */
  onSignInClick?: () => void
  /** If provided, shows the pricing modal. */
  onUpgradeClick?: () => void
}

export function Header({ onSignInClick, onUpgradeClick }: HeaderProps) {
  const { session, signOut } = useAuth()
  // Prefer role from user_metadata (legacy) but fall back to app_metadata which is now the source of truth
  const role = ((session?.user.user_metadata as any)?.role ??
               (session?.user as any)?.app_metadata?.role) as string | undefined

  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    if (session) {
      getUserUsage().then(setUsage).catch(console.error)
    }
  }, [session])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm ${isActive ? 'text-brand font-semibold' : 'text-gray-700'} hover:text-brand`

  // Adds block display & full-width styling for stacked mobile menu links.
  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkClass({ isActive })} block w-full text-left`

  return (
    <header className="fixed top-0 inset-x-0 bg-white shadow z-20">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
        <NavLink to="/" className="flex items-center" aria-label="Home">
          <img src={logo} alt="CharterAI" className="h-10 md:h-12 w-auto" />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {/* Usage indicator for free users */}
          {session && usage && !usage.is_subscribed && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              <span>{usage.trip_generations}/{STRIPE_CONFIG.FREE_GENERATIONS_LIMIT} trips used</span>
              {!usage.can_generate && (
                <button 
                  onClick={onUpgradeClick}
                  className="text-brand hover:underline ml-1"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}

          {/* Authenticated links */}
          {session && (
            <>
              <NavLink to="/history" className={linkClass}>
                My Trips
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}
            </>
          )}

          {/* Auth action */}
          {session ? (
            <button onClick={() => signOut()} className="ml-2 text-sm text-gray-600 hover:text-brand">
              Sign Out
            </button>
          ) : (
            <button
              onClick={onSignInClick}
              className="ml-2 text-sm text-gray-600 hover:text-brand"
            >
              Sign In
            </button>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 focus:outline-none"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-gray-800 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-800 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-800" />
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="md:hidden bg-white border-t shadow-inner">
          {session && (
            <>
              <NavLink to="/history" className={mobileLinkClass} onClick={() => setOpen(false)}>
                My Trips
              </NavLink>
              <NavLink to="/profile" className={mobileLinkClass} onClick={() => setOpen(false)}>
                Profile
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/admin" className={mobileLinkClass} onClick={() => setOpen(false)}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          {session ? (
            <button
              onClick={() => {
                signOut()
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-brand"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => {
                onSignInClick?.()
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-brand"
            >
              Sign In
            </button>
          )}
        </nav>
      )}
    </header>
  )
} 
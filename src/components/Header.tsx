import React, { useState } from 'react'
import logo from '../assets/charterai-logo-notext.png'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { session, signOut } = useAuth()
  const role = (session?.user.user_metadata as any)?.role as string | undefined

  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm ${isActive ? 'text-brand font-semibold' : 'text-gray-700'} hover:text-brand`

  return (
    <header className="fixed top-0 inset-x-0 bg-white shadow z-20">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
        <NavLink to="/" className="flex items-center" aria-label="Home">
          <img src={logo} alt="CharterAI" className="h-10 md:h-12 w-auto" />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
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
          <button onClick={() => signOut()} className="ml-2 text-sm text-gray-600 hover:text-brand">
            Sign Out
          </button>
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
          <NavLink to="/history" className={linkClass} onClick={() => setOpen(false)}>
            My Trips
          </NavLink>
          <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>
            Profile
          </NavLink>
          {role === 'admin' && (
            <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
              Admin
            </NavLink>
          )}
          <button
            onClick={() => {
              signOut()
              setOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-brand"
          >
            Sign Out
          </button>
        </nav>
      )}
    </header>
  )
} 
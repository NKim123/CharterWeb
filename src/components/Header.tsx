import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { session, signOut } = useAuth()
  const role = (session?.user.user_metadata as any)?.role as string | undefined

  return (
    <header className="flex items-center justify-between py-4">
      <Link to="/" className="text-2xl font-bold text-brand">
        CharterAI
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/history" className="text-sm text-gray-700 underline">
          My Trips
        </Link>
        <Link to="/profile" className="text-sm text-gray-700 underline">
          Profile
        </Link>
        {role === 'admin' && (
          <Link to="/admin" className="text-sm text-gray-700 underline">
            Admin
          </Link>
        )}
        <button onClick={() => signOut()} className="text-sm text-gray-600 underline">
          Sign Out
        </button>
      </div>
    </header>
  )
} 
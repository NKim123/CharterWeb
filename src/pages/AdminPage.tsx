import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface TokenSpend {
  date: string
  tokens: number
}

export default function AdminPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [tokenSpend, setTokenSpend] = useState<TokenSpend[]>([])
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (!session) return

    // Simple role check – expects "role" in user metadata
    const role = (session.user.user_metadata as any)?.role as string | undefined
    if (role !== 'admin') {
      navigate('/')
      return
    }

    // Fetch stub data – replace with real Supabase table queries
    setTokenSpend([
      { date: '2025-07-15', tokens: 1234 },
      { date: '2025-07-16', tokens: 987 }
    ])
    setLogs(['Edge error: plan_trip timeout (2025-07-16 14:12)', 'Chat function 429 – rate limit'])
  }, [session, navigate])

  if (!session) {
    return <div className="text-center p-8">Loading...</div>
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Token Spend</h2>
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left border">Date</th>
              <th className="p-2 text-left border">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {tokenSpend.map((row) => (
              <tr key={row.date}>
                <td className="border p-2">{row.date}</td>
                <td className="border p-2">{row.tokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Error Logs</h2>
        <ul className="list-disc pl-6 space-y-1">
          {logs.map((l, i) => (
            <li key={i} className="text-sm text-gray-700">
              {l}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
} 
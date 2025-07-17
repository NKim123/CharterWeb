import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface TokenSpend {
  date: string
  tokens: number
}

interface UserSummary {
  id: string
  email: string
  role: string | null
  created_at: string
}

export default function AdminPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [tokenSpend, setTokenSpend] = useState<TokenSpend[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return

    const role = (session.user.user_metadata as any)?.role as string | undefined
    if (role !== 'admin') {
      navigate('/')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // 1) Token usage (raw rows → aggregate per day) ---------------------------------
        const { data: usageRows, error: usageErr } = await supabase
          .from('token_usage')
          .select('id, created_at, total_tokens')
          .order('created_at', { ascending: false })
          .limit(1000)
        if (usageErr) throw usageErr
        const aggregate: Record<string, number> = {}
        ;(usageRows ?? []).forEach((row: any) => {
          const day = row.created_at.slice(0, 10) // YYYY-MM-DD
          aggregate[day] = (aggregate[day] || 0) + (row.total_tokens || 0)
        })
        const tokenRows: TokenSpend[] = Object.entries(aggregate)
          .map(([date, tokens]) => ({ date, tokens }))
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        setTokenSpend(tokenRows)

        // 2) Error logs ------------------------------------------------------------------
        const { data: logRows, error: logErr } = await supabase
          .from('error_logs')
          .select('id, created_at, function_name, error_message')
          .order('created_at', { ascending: false })
          .limit(100)
        if (logErr) throw logErr
        setLogs(
          (logRows ?? []).map((l: any) =>
            `${l.function_name}: ${l.error_message} (${l.created_at.slice(0, 19)})`
          )
        )

        // 3) Users list ------------------------------------------------------------------
        const { data: userRows, error: userErr } = await supabase
          .from('admin_user_list')
          .select('*')
          .order('created_at', { ascending: false })
        if (userErr) throw userErr
        setUsers(userRows as UserSummary[])
      } catch (err) {
        console.error('Admin data fetch failed', err)
        alert('Failed to load admin data. Check console for details.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [session, navigate])

  if (!session || loading) {
    return <div className="text-center p-8">Loading...</div>
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Token Usage */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Token Usage (last 1k rows)</h2>
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left border">Date</th>
              <th className="p-2 text-left border">Total Tokens</th>
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

      {/* Error Logs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Recent Error Logs</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
          {logs.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>

      {/* Users */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Email</th>
              <th className="p-2 border text-left">Role</th>
              <th className="p-2 border text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border p-2">{u.email}</td>
                <td className="border p-2">{u.role ?? 'user'}</td>
                <td className="border p-2">{u.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
} 
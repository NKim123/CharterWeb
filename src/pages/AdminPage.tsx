import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
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

interface ErrorLog {
  id: string
  function_name: string
  error_message: string
  created_at: string
}

export default function AdminPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [tokenSpend, setTokenSpend] = useState<TokenSpend[]>([])
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!session) {
      navigate('/')
      return
    }

    // Comprehensive admin authorization check
    const checkAdminAccess = async () => {
      try {
        // Check user metadata for admin role
        const userRole = session.user.user_metadata?.role
        const appMetadataRole = (session.user as any).app_metadata?.role
        
        if (userRole !== 'admin' && appMetadataRole !== 'admin') {
          console.warn('Unauthorized admin access attempt:', session.user.id)
          navigate('/')
          return
        }

        // Additional server-side verification by trying to access admin data
        const { data: testData, error: testError } = await supabase
          .from('admin_user_list')
          .select('id')
          .limit(1)

        if (testError) {
          console.error('Admin access verification failed:', testError)
          setError('Access denied. Admin privileges required.')
          navigate('/')
          return
        }

        setIsAuthorized(true)
      } catch (err) {
        console.error('Admin authorization error:', err)
        setError('Authorization check failed')
        navigate('/')
      }
    }

    checkAdminAccess()
  }, [session, navigate])

  useEffect(() => {
    if (!isAuthorized) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Run all queries in parallel with error handling for each
        const [usageResult, logResult, userResult] = await Promise.allSettled([
          // 1) Token usage (raw rows → aggregate per day)
          supabase
            .from('token_usage')
            .select('id, created_at, total_tokens')
            .order('created_at', { ascending: false })
            .limit(1000),
          
          // 2) Error logs
          supabase
            .from('error_logs')
            .select('id, created_at, function_name, error_message')
            .order('created_at', { ascending: false })
            .limit(100),
          
          // 3) Users list
          supabase
            .from('admin_user_list')
            .select('*')
            .order('created_at', { ascending: false })
        ])

        // Process token usage data
        if (usageResult.status === 'fulfilled' && !usageResult.value.error) {
          const usageRows = usageResult.value.data || []
          const aggregate: Record<string, number> = {}
          
          usageRows.forEach((row: any) => {
            const day = row.created_at.slice(0, 10) // YYYY-MM-DD
            aggregate[day] = (aggregate[day] || 0) + (row.total_tokens || 0)
          })
          
          const tokenRows: TokenSpend[] = Object.entries(aggregate)
            .map(([date, tokens]) => ({ date, tokens }))
            .sort((a, b) => (a.date < b.date ? 1 : -1))
          
          setTokenSpend(tokenRows)
        } else {
          console.error('Failed to fetch token usage:', usageResult.status === 'rejected' ? usageResult.reason : usageResult.value.error)
        }

        // Process error logs
        if (logResult.status === 'fulfilled' && !logResult.value.error) {
          setLogs(logResult.value.data || [])
        } else {
          console.error('Failed to fetch error logs:', logResult.status === 'rejected' ? logResult.reason : logResult.value.error)
        }

        // Process users list  
        if (userResult.status === 'fulfilled' && !userResult.value.error) {
          setUsers(userResult.value.data as UserSummary[] || [])
        } else {
          console.error('Failed to fetch users:', userResult.status === 'rejected' ? userResult.reason : userResult.value.error)
        }

      } catch (err) {
        console.error('Admin data fetch failed', err)
        setError('Failed to load admin data. Some information may be unavailable.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthorized])

  if (!session || !isAuthorized) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p>You don't have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="text-center p-8 pt-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto pt-24 pb-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System monitoring and user management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Token Usage */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Token Usage (Daily Aggregates)</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-medium text-gray-700">Date</th>
                  <th className="p-4 text-left font-medium text-gray-700">Total Tokens</th>
                </tr>
              </thead>
              <tbody>
                {tokenSpend.length > 0 ? (
                  tokenSpend.map((row) => (
                    <tr key={row.date} className="border-t">
                      <td className="p-4">{row.date}</td>
                      <td className="p-4">{row.tokens.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">
                      No token usage data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Error Logs */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Recent Error Logs</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {logs.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-700">Function</th>
                      <th className="p-3 text-left font-medium text-gray-700">Error</th>
                      <th className="p-3 text-left font-medium text-gray-700">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="p-3 font-mono text-blue-600">{log.function_name}</td>
                        <td className="p-3 max-w-md truncate" title={log.error_message}>
                          {log.error_message}
                        </td>
                        <td className="p-3 text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No error logs available
              </div>
            )}
          </div>
        </section>

        {/* Users */}
        <section>
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-medium text-gray-700">Email</th>
                  <th className="p-4 text-left font-medium text-gray-700">Role</th>
                  <th className="p-4 text-left font-medium text-gray-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">
                      No user data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
} 
import React, { useEffect, useState } from 'react'
import { getProfile, upsertProfile, UserProfile } from '../api/profile'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/Header'

export default function ProfilePage() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ display_name: string; avatar_url: string }>({ display_name: '', avatar_url: '' })

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

  if (loading) return <p className="p-8">Loading...</p>
  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
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
          <button type="submit" className="bg-brand text-white px-4 py-2 rounded">
            Save
          </button>
        </form>
      </div>
    </>
  )
} 
import React, { useEffect, useState } from 'react'
import { fetchTrips, toggleTripVisibility, TripRecord } from '../api/trips'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { supabase } from '../lib/supabaseClient'

export default function TripHistory() {
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadTrips = async () => {
    setLoading(true)
    try {
      const data = await fetchTrips()
      setTrips(data)
    } catch (err) {
      console.error(err)
      alert('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const handleToggle = async (trip: TripRecord) => {
    const newVisibility = trip.visibility === 'private' ? 'public' : 'private'
    try {
      await toggleTripVisibility(trip.id, newVisibility)
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, visibility: newVisibility } : t)))
    } catch (err) {
      console.error(err)
      alert('Failed to update visibility')
    }
  }

  const handleReschedule = async (trip: TripRecord) => {
    const input = prompt('Enter new date (YYYY-MM-DD) or leave blank for today:') || ''
    const date = input.trim()
    try {
      const { data, error } = await supabase.functions.invoke<any>('reschedule', {
        body: { plan_id: trip.plan_id, date }
      })
      if (error) throw error
      alert('Trip rescheduled! New Plan ID: ' + data.plan_id)
      loadTrips()
    } catch (err) {
      console.error(err)
      alert('Failed to reschedule trip')
    }
  }

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-6">Your Trips</h1>

        {loading ? (
          <p>Loading...</p>
        ) : trips.length === 0 ? (
          <p>No trips yet. Generate one on the homepage!</p>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white shadow rounded p-4 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">Plan ID: {trip.plan_id}</h2>
                  <p className="text-sm text-gray-500">Generated {new Date(trip.generated_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(trip)}
                    className="text-sm underline"
                  >
                    {trip.visibility === 'private' ? 'Make Public' : 'Make Private'}
                  </button>
                  <button
                    onClick={() => handleReschedule(trip)}
                    className="text-sm underline text-accent"
                  >
                    Reschedule
                  </button>
                  <Link to={`/trip/${trip.plan_id}`} className="text-sm text-brand underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
} 
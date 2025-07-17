import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchTripByPlanId, TripRecord } from '../api/trips'
import { MapView } from '../components/MapView'
import { ItineraryDetails } from '../components/ItineraryDetails'
import { Header } from '../components/Header'
import { ChatGuide } from '../components/ChatGuide'

export default function SharedTrip() {
  const { planId } = useParams<{ planId: string }>()
  const [trip, setTrip] = useState<TripRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!planId) return
    const load = async () => {
      try {
        const data = await fetchTripByPlanId(planId)
        setTrip(data)
      } catch (err) {
        console.error(err)
        alert('Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [planId])

  if (loading) return <p className="p-8">Loading...</p>
  if (!trip) return <p className="p-8">Trip not found or is private.</p>

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-4">Trip {trip.plan_id}</h1>
        <p className="text-gray-500 mb-6">Generated {new Date(trip.generated_at).toLocaleString()}</p>

        {trip.itinerary?.waypoints && (
          <div className="mb-12">
            <MapView waypoints={trip.itinerary.waypoints} height="400px" />
          </div>
        )}

        {trip.itinerary && (
          <>
            <ItineraryDetails itinerary={trip.itinerary} />

            {/* Chat Guide */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">Ask the AI Guide</h2>
              <ChatGuide planId={trip.plan_id} />
            </div>
          </>
        )}
      </div>
    </>
  )
} 
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

        {/* Map & Itinerary – responsive grid */}
        {trip.itinerary && (
          <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-8 mb-12 mt-6">
            {/* Map */}
            <div>
               { (trip.itinerary.pointsOfInterest || trip.itinerary.waypoints) && (
                 <MapView waypoints={(trip.itinerary.pointsOfInterest ?? trip.itinerary.waypoints) || []} height="400px" enableSummary />
               )}
            </div>

            {/* Itinerary */}
            <div>
              <ItineraryDetails itinerary={trip.itinerary} />
            </div>

            {/* Chat – sticky */}
            <div className="lg:sticky lg:top-24">
              <h2 className="text-2xl font-bold mb-4">Ask the AI Guide</h2>
              <ChatGuide planId={trip.plan_id} />
            </div>
          </div>
        )}
      </div>
    </>
  )
} 
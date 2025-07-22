import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { TripPlanningForm } from './components/TripPlanningForm'
import { Header } from './components/Header'
import type { TripFormData } from './schemas/trip'
import { planTrip } from './api/planTrip'
import { MapView } from './components/MapView'
import { ItineraryDetails } from './components/ItineraryDetails'
import { ChatGuide } from './components/ChatGuide'
import { saveTrip, loadTrip } from './lib/storage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import AdminPage from './pages/AdminPage'
import TripHistory from './pages/TripHistory'
import SharedTrip from './pages/SharedTrip'
import ProfilePage from './pages/ProfilePage'
import BackToTop from './components/BackToTop'

function AppContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [plan, setPlan] = useState<any | null>(null)

  // Restore previously generated plan if available
  React.useEffect(() => {
    const id = localStorage.getItem('current_plan_id')
    if (id && !plan) {
      loadTrip(id).then((data) => {
        if (data) setPlan(data)
      }).catch(console.warn)
    }
  }, [])

  const { session, signOut } = useAuth()

  const handleSubmit = async (data: TripFormData) => {
    setIsLoading(true)
    try {
      const res = await planTrip(data)
      console.log('Received plan:', res)
      setPlan(res)
      saveTrip(res.plan_id, res)
      localStorage.setItem('current_plan_id', res.plan_id)
      alert('Trip plan generated! Check console for details.')
    } catch (err: any) {
      console.error(err)
      alert('Failed to generate trip plan.');
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Login />
      </div>
    )
  }

  const resetPlan = () => {
    setPlan(null)
    localStorage.removeItem('current_plan_id')
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-8">
      <div className="container mx-auto">
        <Header />
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand mb-2">CharterAI</h1>
          <p className="text-gray-600">Your AI-powered fishing trip planner</p>
        </header>
        
        {!plan && <TripPlanningForm onSubmit={handleSubmit} isLoading={isLoading} />}

        {plan && (
          <>
            <div className="mt-10 flex justify-end">
              <button onClick={resetPlan} className="text-sm text-brand underline">
                Plan new trip
              </button>
            </div>

            {/* New responsive grid: Map | Itinerary | Chat */}
            <div className="mt-6 grid lg:grid-cols-[1fr_2fr_1fr] gap-8">
              {/* Map */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Map Preview</h2>
                <MapView waypoints={(plan.itinerary.pointsOfInterest ?? plan.itinerary.waypoints) || []} />
              </div>

              {/* Itinerary Details */}
              <div>
                <ItineraryDetails itinerary={plan.itinerary} />
              </div>

              {/* Chat Guide – sticky on large screens */}
              <div className="lg:sticky lg:top-24">
                <h2 className="text-2xl font-bold mb-4">Ask the AI Guide</h2>
                <ChatGuide planId={plan.plan_id} />
              </div>
            </div>
          </>
        )}
        <BackToTop />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/history" element={<TripHistory />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/trip/:planId" element={<SharedTrip />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
} 
import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TripPlanningWizard from './components/TripPlanningWizard'
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
  const [pendingTrip, setPendingTrip] = useState<TripFormData | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  // Restore previously generated plan if available
  React.useEffect(() => {
    const id = localStorage.getItem('current_plan_id')
    if (id && !plan) {
      loadTrip(id).then((data) => {
        if (data) setPlan(data)
      }).catch(console.warn)
    }
  }, [])

  const { session } = useAuth()

  const handleSubmit = async (data: TripFormData) => {
    // If user is not authenticated yet, store trip and prompt login
    if (!session) {
      setPendingTrip(data)
      setShowLogin(true)
      return
    }

    // Otherwise execute request immediately
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
      alert('Failed to generate trip plan.')
    } finally {
      setIsLoading(false)
    }
  }

  /* After user completes login, if there was a pending trip submit it */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (session && pendingTrip) {
      // prevent redundant submissions if effect triggers multiple times
      const tripData = pendingTrip
      setPendingTrip(null)
      setShowLogin(false)
      // Submit in the background
      handleSubmit(tripData)
    }
  }, [session])

  // Allow user to start over after generating a plan
  const resetPlan = () => {
    setPlan(null)
    localStorage.removeItem('current_plan_id')
  }

  // Header is always shown, but contents vary based on auth state
  // If login modal requested, render overlay

  const loginModal = showLogin && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative">
        <button
          className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow"
          onClick={() => setShowLogin(false)}
          aria-label="Close sign-in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <Login />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-8">
      {loginModal}
      <div className="container mx-auto">
        <Header onSignInClick={() => setShowLogin(true)} />
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand mb-2">CharterAI</h1>
          <p className="text-gray-600">Your AI-powered fishing trip planner</p>
        </header>
        
        {!plan && <TripPlanningWizard onSubmit={handleSubmit} isLoading={isLoading} />}

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
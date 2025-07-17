import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { TripPlanningForm } from './components/TripPlanningForm'
import { Header } from './components/Header'
import type { TripFormData } from './schemas/trip'
import { planTrip } from './api/planTrip'
import { MapView } from './components/MapView'
import { ChatGuide } from './components/ChatGuide'
import { saveTrip } from './lib/storage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import AdminPage from './pages/AdminPage'
import TripHistory from './pages/TripHistory'
import SharedTrip from './pages/SharedTrip'
import ProfilePage from './pages/ProfilePage'

function AppContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [plan, setPlan] = useState<any | null>(null)

  const { session, signOut } = useAuth()

  const handleSubmit = async (data: TripFormData) => {
    setIsLoading(true)
    try {
      const res = await planTrip(data)
      console.log('Received plan:', res)
      setPlan(res)
      saveTrip(res.plan_id, res)
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

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto">
        <Header />
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand mb-2">CharterAI</h1>
          <p className="text-gray-600">Your AI-powered fishing trip planner</p>
        </header>
        
        <TripPlanningForm onSubmit={handleSubmit} isLoading={isLoading} />

        {plan && (
          <>
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">Map Preview</h2>
              <MapView waypoints={plan.itinerary.waypoints} />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">Ask the AI Guide</h2>
              <ChatGuide planId={plan.plan_id} />
            </div>
          </>
        )}
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
import { supabase } from '../lib/supabaseClient'
import type { TripFormData } from '../schemas/trip'

export interface PlanTripResponse {
  plan_id: string
  itinerary: any
  generated_at: string
}

export async function planTrip(payload: TripFormData): Promise<PlanTripResponse> {
  const { data, error } = await supabase.functions.invoke<PlanTripResponse>('plan_trip', {
    body: payload
  })

  if (error) {
    throw error
  }
  return data as PlanTripResponse
} 
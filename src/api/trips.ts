import { supabase } from '../lib/supabaseClient'

export interface TripRecord {
  id: string
  plan_id: string
  itinerary: any
  generated_at: string
  visibility: 'private' | 'public'
}

export async function fetchTrips(): Promise<TripRecord[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('generated_at', { ascending: false })

  if (error) throw error
  return data as TripRecord[]
}

export async function toggleTripVisibility(id: string, newVisibility: 'private' | 'public') {
  const { error } = await supabase
    .from('trips')
    .update({ visibility: newVisibility })
    .eq('id', id)
  if (error) throw error
}

export async function fetchTripByPlanId(planId: string): Promise<TripRecord | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('plan_id', planId).single()
  if (error && error.code !== 'PGRST116') throw error // row not found is ok
  return data as TripRecord | null
} 
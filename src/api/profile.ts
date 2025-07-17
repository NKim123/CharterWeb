import { supabase } from '../lib/supabaseClient'

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data as UserProfile | null
}

export async function upsertProfile(profile: Omit<UserProfile, 'id'>, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
} 
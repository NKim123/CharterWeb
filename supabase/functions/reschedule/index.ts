import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    const { plan_id } = await req.json()
    if (!plan_id) throw new Error('plan_id is required')

    // Best-effort: fetch trip row, then call plan_trip with same preferences but updated date (today)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env missing')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    })

    const { data: trip, error } = await supabase.from('trips').select('*').eq('plan_id', plan_id).maybeSingle()
    if (error) throw error
    if (!trip) throw new Error('Trip not found')

    // Prepare payload for plan_trip (reuse original with new date today)
    const payload = { ...trip.preferences, date: new Date().toISOString().split('T')[0] }

    // Invoke existing plan_trip function internally
    const resp = await fetch(`${supabaseUrl}/functions/v1/plan_trip`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') || ''
      },
      body: JSON.stringify(payload)
    })

    const json = await resp.json()
    if (!resp.ok) throw new Error(json.error || 'plan_trip failed')

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    console.error('reschedule error', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
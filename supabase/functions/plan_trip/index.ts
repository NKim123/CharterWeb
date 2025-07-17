import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Optional: import OpenAI if you plan to call it directly from the Edge Function
// import OpenAI from 'https://deno.land/x/openai@1.3.0/mod.ts'

// You can set these via the Supabase dashboard (Project Settings → Environment Variables)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// The main handler. For an MVP we just return a mocked plan.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const body = await req.json()
    const { location, date, targetSpecies, duration, experience } = body as {
      location: string
      date: string
      targetSpecies: string[]
      duration: string
      experience: string
    }

    // TODO: Fetch NOAA / USGS data, run RAG, call OpenAI, persist to DB.
    // Placeholder itinerary response
    const randomId = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

    const itinerary = {
      waypoints: [
        {
          id: randomId('wp_'),
          name: `${location} Launch Ramp`,
          coordinates: [-122.123, 47.123],
          type: 'launch',
          description: 'Primary boat launch',
          bestTime: '06:00',
          techniques: ['Trolling', 'Casting']
        }
      ],
      weather: {
        temperature: 68,
        conditions: 'Partly Cloudy',
        windSpeed: 5,
        windDirection: 'NW',
        visibility: 10
      },
      regulations: {
        licenseRequired: true,
        catchLimits: {
          Bass: 5
        },
        sizeLimits: {
          Bass: { min: 12, max: 18 }
        },
        closedAreas: []
      },
      tips: [
        'Arrive early to secure parking at the launch ramp.',
        'Use medium-weight spinning gear for versatile presentations.'
      ]
    }

    const responsePayload = {
      plan_id: randomId('plan_'),
      itinerary,
      generated_at: new Date().toISOString()
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to generate trip plan' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 
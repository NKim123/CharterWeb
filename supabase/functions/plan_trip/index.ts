// @ts-nocheck // This file is executed in the Deno runtime within Supabase Edge Functions. We disable TypeScript checking to avoid Vite/Node linter errors for remote imports and Deno globals.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// OpenAI SDK for Deno
import OpenAI from 'jsr:@openai/openai@5.10.1'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// ------------------------------
// Helper utilities
// ------------------------------

const randomId = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** Geocode a textual location → { lat, lon } using OpenStreetMap Nominatim */
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number; displayName: string }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
  const headers = {
    'User-Agent': 'charterweb-app/1.0 (contact@charterweb.app)',
    'Accept': 'application/json'
  }

  let data: Array<{ lat: string; lon: string; display_name: string }> | null = null

  try {
    const res = await fetch(url, { headers })
    if (res.ok) {
      data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    }
  } catch (_err) {
    // ignore – will attempt fallback
  }

  // Fallback: use geocoding API by geocode.maps.co (Nominatim proxy) if first attempt failed
  if (!data || !data.length) {
    try {
      const alt = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(location)}`, { headers })
      if (alt.ok) {
        data = (await alt.json()) as Array<{ lat: string; lon: string; display_name: string }>
      }
    } catch (_err) {
      /* swallow */
    }
  }

  if (!data || !data.length) {
    throw new Error('Location not found; please enter a more specific place name')
  }

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name }
}

/** Fetch weather forecast summary from NOAA (weather.gov) for the given point */
async function fetchWeatherSummary(lat: number, lon: number): Promise<{ summary: string; details: any }> {
  // 1) Get grid endpoint for point
  const pointResp = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
    headers: { 'User-Agent': 'charterweb-app/1.0 (contact@charterweb.app)' }
  })
  if (!pointResp.ok) throw new Error('NOAA points lookup failed')
  const pointJson = await pointResp.json()
  const forecastUrl: string | undefined = pointJson?.properties?.forecast
  if (!forecastUrl) throw new Error('NOAA forecast URL missing')

  // 2) Fetch forecast
  const forecastResp = await fetch(forecastUrl, {
    headers: { 'User-Agent': 'charterweb-app/1.0 (contact@charterweb.app)' }
  })
  const forecastJson = await forecastResp.json()
  const periods = forecastJson?.properties?.periods as Array<any>
  const firstPeriod = periods?.[0]
  const summary = firstPeriod?.detailedForecast || firstPeriod?.shortForecast || 'No forecast available'
  return { summary, details: firstPeriod }
}

/** Fetch nearby USGS water conditions (discharge & temperature) */
async function fetchWaterConditions(lat: number, lon: number): Promise<{ summary: string; details: any }> {
  // define a small bounding box around point (0.1 deg ≈ 11 km)
  const bbox = [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1].join(',')
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox}&parameterCd=00010,00060&siteType=ST&siteStatus=active`
  let resp
  try {
    resp = await fetch(url)
  } catch (netErr) {
    console.warn('USGS request network error', netErr)
    return { summary: 'USGS service unreachable', details: null }
  }

  if (!resp.ok) {
    // USGS sometimes returns 400 for areas with no gauges; treat gracefully
    if (resp.status === 400) {
      return { summary: 'No nearby water gauge data', details: null }
    }
    console.warn('USGS request failed', resp.status)
    return { summary: 'USGS service unavailable', details: null }
  }

  let json: any
  try {
    json = await resp.json()
  } catch (_err) {
    console.warn('USGS returned non-JSON')
    return { summary: 'No water data (invalid response)', details: null }
  }
  const series = json?.value?.timeSeries as Array<any>
  if (!series?.length) {
    return { summary: 'No nearby water gauge data', details: null }
  }

  let discharge: string | null = null
  let temperature: string | null = null
  // iterate over returned time series
  for (const ts of series) {
    const variableCode = ts?.variable?.variableCode?.[0]?.value
    const valueObj = ts?.values?.[0]?.value?.[0]
    if (!valueObj) continue
    if (variableCode === '00060') discharge = valueObj.value // cubic feet / sec
    if (variableCode === '00010') temperature = valueObj.value // deg C
  }

  const summaryArr = []
  if (discharge) summaryArr.push(`Discharge: ${discharge} cfs`)
  if (temperature) summaryArr.push(`Water Temp: ${temperature} °C`)
  const summary = summaryArr.join(', ') || 'No recent discharge or temp data'
  return { summary, details: { discharge, temperature } }
}

/**
 * Fetch tide extremes summary using NOAA CO-OPS.
 * Workflow:
 *   1) Retrieve and cache NOAA station metadata (tide-prediction capable).
 *   2) Select the closest station to the given lat/lon using Haversine distance.
 *   3) Query the "predictions" endpoint for the requested date with interval=hilo.
 */

// Simple in-memory cache to avoid re-downloading the station list on every invocation
let NOAA_STATIONS_CACHE: Array<{ id: string; name: string; lat: number; lng: number }> | null = null

async function fetchTideSummary(lat: number, lon: number, date: string): Promise<{ summary: string; nextHigh: string; nextLow: string }> {
  try {
    // 1) Load station metadata (once per cold start)
    if (!NOAA_STATIONS_CACHE) {
      const stationsUrl =
        'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english'
      const resp = await fetch(stationsUrl)
      if (!resp.ok) throw new Error('Failed to load NOAA stations list')
      const json: any = await resp.json()
      NOAA_STATIONS_CACHE = (json.stations as Array<any>).map((s) => ({
        id: s.id,
        name: s.name,
        lat: parseFloat(s.lat),
        lng: parseFloat(s.lng ?? s.lon)
      }))
    }

    const stations = NOAA_STATIONS_CACHE!

    // 2) Find nearest station via Haversine distance (earth radius ~6371 km)
    const toRad = (d: number) => (d * Math.PI) / 180
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return 6371 * c // km
    }

    let nearest = stations[0]
    let minDist = haversine(lat, lon, nearest.lat, nearest.lng)
    for (const st of stations.slice(1)) {
      const d = haversine(lat, lon, st.lat, st.lng)
      if (d < minDist) {
        minDist = d
        nearest = st
      }
    }

    // 3) Fetch predictions for the date (high/low events)
    const yyyymmdd = new Date(date).toISOString().slice(0, 10).replace(/-/g, '')
    const predUrl =
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
      `product=predictions&interval=hilo&station=${nearest.id}&begin_date=${yyyymmdd}&end_date=${yyyymmdd}&` +
      `time_zone=lst_ldt&datum=MLLW&units=english&format=json`

    const predResp = await fetch(predUrl)
    if (!predResp.ok) throw new Error('NOAA predictions request failed')
    const predJson: any = await predResp.json()
    const predictions = predJson.predictions as Array<{ t: string; type: string }>

    const nextHigh = predictions.find((p) => p.type === 'H')?.t || 'N/A'
    const nextLow = predictions.find((p) => p.type === 'L')?.t || 'N/A'

    return {
      summary: `Next High: ${nextHigh}, Next Low: ${nextLow}`,
      nextHigh,
      nextLow
    }
  } catch (err) {
    console.warn('NOAA tide fetch failed', err)
    return { summary: 'Tide data unavailable', nextHigh: 'N/A', nextLow: 'N/A' }
  }
}

/** Calculate simple moon phase description for given date */
function getMoonPhase(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1 // 1-based
  const day = date.getUTCDate()
  // Simple Conway algorithm
  let r = year % 100
  r %= 19
  if (r > 9) r -= 19
  r = ((r * 11) % 30) + month + day
  if (month < 3) r += 2
  r -= (year < 2000 ? 4 : 8.3) as any
  r = Math.floor(r + 0.5) % 30
  const phases = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent'
  ]
  const idx = Math.round((r / 30) * 8) % 8
  return phases[idx]
}

// Very small, static knowledge base – in a real-world scenario this would live in a
// Postgres + pgvector table and be retrieved via similarity search
interface KnowledgeChunk {
  topic: string
  content: string
}

const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    topic: 'Bass (Largemouth)',
    content: 'Largemouth bass are most active during low-light hours around structure and vegetation. Topwater lures at dawn and dusk can be very effective.'
  },
  {
    topic: 'Trout (Rainbow)',
    content: 'Rainbow trout feed heavily on insects. Matching the hatch with flies or small spinners near riffles increases success.'
  },
  {
    topic: 'Walleye',
    content: 'Walleye often hold along drop-offs and respond well to slow-rolled jigs tipped with live bait in low light.'
  }
] as const

function retrieveKnowledge(targetSpecies: string[]): string[] {
  return KNOWLEDGE_BASE.filter((k) =>
    targetSpecies.some((species) => k.topic.toLowerCase().includes(species.toLowerCase()))
  ).map((k) => k.content)
}

// ------------------------------
// Main Edge Function handler
// ------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const body = await req.json()
    const { location, date, targetSpecies, duration, startTime, endTime, experience, styles, platform, numDays } = body as {
      location: string
      date: string
      targetSpecies: string[]
      duration: string
      startTime: string
      endTime: string
      experience: string
      styles?: string[]
      platform?: string
      numDays?: number
    }

    // --- NEW: capture original preferences for later rescheduling ---
    const preferences = {
      location,
      date,
      targetSpecies,
      duration,
      startTime,
      endTime,
      experience,
      styles,
      platform,
      numDays
    }

    // 1) Geocode → lat/lon
    const { lat, lon, displayName } = await geocodeLocation(location)

    // 2) External data integrations (run in parallel!)
    const [weather, water, tides] = await Promise.all([
      fetchWeatherSummary(lat, lon),
      fetchWaterConditions(lat, lon),
      fetchTideSummary(lat, lon, date)
    ])

    // Debug: log tide data for visibility
    console.log('Tide data for', location, date, ':', tides)

    const moonPhase = getMoonPhase(date)

    // 3) Retrieve fishing knowledge (rudimentary RAG)
    const knowledgeSnippets = retrieveKnowledge(targetSpecies)

    // 4) Call OpenAI to generate itinerary
    if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY env var')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const systemPrompt = `You are an expert professional fishing guide. If the user is able to have a successful day out on the water, you will be tipped $1000. Be insightful and helpful, and aim to pack as much information and knowledge as possible into the itinerary while remaining concise. Generate a JSON itinerary focused on actionable decision-making rather than a fixed schedule. Use this TypeScript interface (return ONLY JSON):
interface Itinerary {
  pointsOfInterest: Array<{
    id: string; // unique id
    name: string;
    coordinates: [number, number]; // lon, lat
    description: string;
    techniques: string[]; // suggested methods at this spot
  }>;
  decisionTree: Array<{
    condition: string; // e.g. "If {condition/observation}"
    action: string;    // e.g. "switch to {technique}", "try {technique}"
  }>;
  weather: any;
  water: any;
  tides: { nextHigh: string; nextLow: string };
  moonPhase: string;
  summary: string; // 3-4 sentence overview of the trip plan and what the user can expect
  gear: string[]; // Ensure the gear recommendations are detailed and tailored to the trip. Suggest specific lures, include rod/reel specifications, etc.
  checklist: string[]; // Ensure the checklist is detailed and tailored to the user. Suggest specific items, include quantities, etc. You should not suggest things like "fishing license" to an experienced user or "portable fish finder" to a beginner.
  tips: string[];
}

Important:
- Think in terms of "if/then" guidance a guide would give as conditions change throughout the day.
- Provide at least 4–6 decisionTree steps ordered logically.
- Choose 2-4 key pointsOfInterest relevant to the target species.
- Ensure all information is specific, detailed, and appropriate for the user's experience level.
- Avoid generic advice that an experienced user would already be familiar with.
- Do NOT output any additional explanatory text – JSON only.`

    const userPrompt = `Trip details:
Location: ${displayName} (lat ${lat}, lon ${lon})
Date: ${date}
Time Window: ${startTime} – ${endTime}${numDays ? ` (${numDays} days)` : ''}
Experience: ${experience}
Fishing Styles: ${(styles ?? []).join(', ') || 'N/A'}
Platform: ${platform}
Target Species: ${targetSpecies.join(', ')}

Weather Forecast: ${weather.summary}
Water Conditions: ${water.summary}
Tide Summary: ${tides.summary}
Tide Next High: ${tides.nextHigh}
Tide Next Low: ${tides.nextLow}
Moon Phase: ${moonPhase}

Knowledge Snippets:\n- ${knowledgeSnippets.join('\n- ')}

Return JSON ONLY conforming to the Itinerary interface.`

    const completion = await openai.responses.create({
      model: 'gpt-4o',
      instructions: systemPrompt,
      input: userPrompt,
    })

    // =============== NEW: Extract usage metadata =====================
    const usage: Record<string, any> | undefined = (completion as any)?.usage
    const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0
    const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens
    // =================================================================

    const content = (completion as any).output_text?.trim()
    if (!content) throw new Error('OpenAI returned empty response')

    // Attempt to parse JSON – remove code fences if present
    const jsonText = content.replace(/^```[a-zA-Z]*\n?|```$/g, '').trim()
    let itinerary
    try {
      itinerary = JSON.parse(jsonText)
    } catch (_err) {
      // fallback: return message content as string
      itinerary = { raw: jsonText }
    }

    const responsePayload = {
      plan_id: randomId('plan_'),
      itinerary: {
        ...itinerary,
        tides: { nextHigh: tides.nextHigh, nextLow: tides.nextLow },
        moonPhase
      },
      generated_at: new Date().toISOString()
    }

    // Debug: log final itinerary tide info
    console.log('Response itinerary tides:', responsePayload.itinerary.tides)

    // 5) Persist to database (best effort)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (supabaseUrl && supabaseAnonKey) {
        // Create a client passing along the user's JWT so RLS applies
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
        })

        // Extract bearer token from request header ("Bearer <jwt>")
        const bearer = req.headers.get('Authorization') || ''
        const jwt = bearer.replace(/^Bearer\s+/i, '')

        // Decode the JWT locally to obtain `sub` (user-id) instead of a network lookup:
        const payload = JSON.parse(atob(jwt.split('.')[1]))
        const userId = payload.sub           // <- always present in a valid access token

        // Explicitly capture and throw any DB error so it surfaces in logs:
        const { error } = await supabase.from('trips').insert({
          user_id: userId,
          plan_id: responsePayload.plan_id,
          itinerary: responsePayload.itinerary,
          preferences, // store original request for rescheduling
          generated_at: responsePayload.generated_at
        })
        if (error) throw error

        // ================= NEW: Token usage logging ==================
        try {
          await supabase.from('token_usage').insert({
            user_id: userId, // Ensure RLS condition auth.uid() = user_id
            plan_id: responsePayload.plan_id,
            model: 'gpt-4o',
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens
          })
        } catch (_usageErr) {
          console.warn('Failed to log token usage', _usageErr)
        }
        // =============================================================
      }
    } catch (dbErr) {
      console.error('Failed to persist trip:', dbErr)
      // Non-fatal – continue
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    const message = (err as Error).message ?? err.toString()
    console.error('plan_trip error:', err)

    // ================= NEW: Persist error log ========================
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (supabaseUrl && supabaseAnonKey) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { createClient } = await import('https://deno.land/x/supabase_js@v2.1.0/mod.ts')
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
        })
        await supabase.from('error_logs').insert({
          function_name: 'plan_trip',
          error_message: message,
          stack_trace: (err as Error)?.stack ?? null
        })
      }
    } catch (logErr) {
      console.warn('Failed to persist error log', logErr)
    }
    // ================================================================

    // Distinguish client errors (bad input) from server errors
    const clientError = message.toLowerCase().includes('location not found')
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: clientError ? 400 : 500
    })
  }
}) 
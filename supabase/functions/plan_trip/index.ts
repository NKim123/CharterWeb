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
  const resp = await fetch(url)

  if (!resp.ok) {
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

/** Fetch tide extremes summary using WorldTides (demo key) */
async function fetchTideSummary(lat: number, lon: number, date: string): Promise<{ summary: string; nextHigh: string; nextLow: string }> {
  const ts = Math.floor(new Date(date).getTime() / 1000)
  // demo key is severely rate-limited – acceptable for dev; replace with env var in prod
  const url = `https://www.worldtides.info/api/v3?extremes&lat=${lat}&lon=${lon}&start=${ts}&length=43200&key=demo`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Tide API error')
    const json: any = await res.json()
    const extremes = json.extremes as Array<any>
    const nextHigh = extremes.find((e) => e.type === 'High')?.date || 'N/A'
    const nextLow = extremes.find((e) => e.type === 'Low')?.date || 'N/A'
    return {
      summary: `Next High: ${nextHigh}, Next Low: ${nextLow}`,
      nextHigh,
      nextLow
    }
  } catch (_err) {
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
    const { location, date, targetSpecies, duration, experience, styles, platform, numDays } = body as {
      location: string
      date: string
      targetSpecies: string[]
      duration: string
      experience: string
      styles?: string[]
      platform?: string
      numDays?: number
    }

    // 1) Geocode → lat/lon
    const { lat, lon, displayName } = await geocodeLocation(location)

    // 2) External data integrations (run in parallel!)
    const [weather, water, tides] = await Promise.all([
      fetchWeatherSummary(lat, lon),
      fetchWaterConditions(lat, lon),
      fetchTideSummary(lat, lon, date)
    ])

    const moonPhase = getMoonPhase(date)

    // 3) Retrieve fishing knowledge (rudimentary RAG)
    const knowledgeSnippets = retrieveKnowledge(targetSpecies)

    // 4) Call OpenAI to generate itinerary
    if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY env var')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const systemPrompt = `You are an expert professional fishing guide. Given user preferences, weather, water conditions, tide info, moon phase, and domain knowledge, generate a JSON-formatted itinerary for a fishing trip that follows this TypeScript interface without additional text:
interface Itinerary {
  waypoints: Array<{
    id: string; // unique id
    name: string;
    coordinates: [number, number]; // lon, lat
    type: 'launch' | 'spot' | 'return';
    description: string;
    bestTime: string; // e.g. "06:30"
    techniques: string[];
  }>;
  weather: any; // echo relevant weather details
  water: any;   // echo relevant water conditions
  tides: { nextHigh: string; nextLow: string };
  moonPhase: string;
  gear: string[]; // rods, tackle, safety etc.
  checklist: string[]; // licences, sunscreen, rain-gear etc.
  tips: string[];
}`

    const userPrompt = `Trip details:
Location: ${displayName} (lat ${lat}, lon ${lon})
Date: ${date}
Duration: ${duration}${numDays ? ` (${numDays} days)` : ''}
Experience: ${experience}
Fishing Styles: ${(styles ?? []).join(', ') || 'N/A'}
Platform: ${platform}
Target Species: ${targetSpecies.join(', ')}

Weather Forecast: ${weather.summary}
Water Conditions: ${water.summary}
Tide Summary: ${tides.summary}
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
          itinerary,
          generated_at: responsePayload.generated_at
        })
        if (error) throw error

        // ================= NEW: Token usage logging ==================
        try {
          await supabase.from('token_usage').insert({
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
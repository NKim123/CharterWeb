import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import OpenAI from 'jsr:@openai/openai@5.10.1'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Reverse geocode coordinates → human-readable place description
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  const headers = {
    'User-Agent': 'charterweb-app/1.0 (contact@charterweb.app)',
    Accept: 'application/json'
  }

  // Primary: Nominatim reverse endpoint
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&format=json&zoom=14`
    const res = await fetch(url, { headers })
    if (res.ok) {
      const json: any = await res.json()
      const display = json?.display_name as string | undefined
      if (display && display.trim().length > 0) return display
      // fallback to a compact address if available
      const addr = json?.address
      if (addr) {
        const parts = [
          addr.neighbourhood,
          addr.suburb,
          addr.village,
          addr.town,
          addr.city,
          addr.state,
          addr.country
        ].filter(Boolean)
        if (parts.length) return parts.join(', ')
      }
    }
  } catch (_err) {
    // swallow and try fallback
  }

  // Fallback: geocode.maps.co reverse (Nominatim proxy)
  try {
    const alt = await fetch(
      `https://geocode.maps.co/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}`,
      { headers }
    )
    if (alt.ok) {
      const json: any = await alt.json()
      const display = (json?.display_name as string) || ''
      if (display.trim().length > 0) return display
      const addr = json?.address
      if (addr) {
        const parts = [
          addr.neighbourhood,
          addr.suburb,
          addr.village,
          addr.town,
          addr.city,
          addr.state,
          addr.country
        ].filter(Boolean)
        if (parts.length) return parts.join(', ')
      }
    }
  } catch (_err) {
    // swallow; return null below
  }

  return null
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    const { lat, lon } = await req.json()
    const parsedLat = Number(lat)
    const parsedLon = Number(lon)
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      throw new Error('lat/lon required')
    }

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
    const placeDescription = await reverseGeocode(parsedLat, parsedLon).catch(() => null)
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are CharterAI pin summarizer. Given a coordinate and its reverse-geocoded place description, provide a very concise (≤80 words) summary of likely fishing conditions, target species and local considerations. Prefer details that align with the place description. If offshore, mention boating safety.'
        },
        { role: 'user', content: `Location: ${placeDescription ?? 'Unknown location'}` },
        { role: 'user', content: `Latitude: ${parsedLat}, Longitude: ${parsedLon}` }
      ]
    })

    const text = (completion as any)?.choices?.[0]?.message?.content || 'No data'
    return new Response(JSON.stringify({ summary: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
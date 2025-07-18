import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from 'jsr:@openai/openai@5.10.1'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })

  try {
    const { lat, lon } = await req.json()
    if (!lat || !lon) throw new Error('lat/lon required')

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are CharterAI pin summarizer. Given a coordinate, provide a concise (≤120 words) summary of likely fishing conditions, target species and local considerations. If coord is offshore, mention boating safety.'
        },
        { role: 'user', content: `Latitude: ${lat}, Longitude: ${lon}` }
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
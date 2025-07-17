// @ts-nocheck // Supabase Edge Function: chat_guide – provides streaming AI chat with trip context
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from 'jsr:@openai/openai@5.10.1'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const randomId = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Only POST requests are allowed
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    const body = await req.json()
    const { plan_id, messages } = body as {
      plan_id?: string
      messages?: ChatMessage[]
    }

    if (!messages || !Array.isArray(messages) || !messages.length) {
      throw new Error('`messages` array is required')
    }

    // Build conversation context – prepend system prompt
    let systemPrompt =
      'You are CharterAI, an expert professional fishing guide AI. Be concise (max 200 words) and helpful. If the user asks about trip logistics, reference the provided itinerary. If the question is unrelated to fishing or the trip, politely steer them back to fishing topics.'

    // If a plan_id is provided, fetch the corresponding itinerary for additional context
    let itineraryContext: any = null
    if (plan_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

        if (supabaseUrl && supabaseAnonKey) {
          // Dynamically import to avoid bundling issues
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
          })

          const { data, error } = await supabase
            .from('trips')
            .select('itinerary')
            .eq('plan_id', plan_id)
            .maybeSingle()
          if (error) throw error
          itineraryContext = data?.itinerary ?? null
        }
      } catch (ctxErr) {
        console.warn('Failed to fetch itinerary context', ctxErr)
      }

      if (itineraryContext) {
        // Provide condensed itinerary context (avoid huge prompts)
        let condensed = ''
        try {
          condensed = JSON.stringify(itineraryContext).slice(0, 4000) // truncate for token safety
        } catch (_err) {
          /* ignore */
        }
        systemPrompt += `\n\nHere is the JSON itinerary for reference (truncated if long): ${condensed}`
      }
    }

    // Prepare messages for OpenAI
    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...messages]

    if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY env var')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Create chat completion stream
    // The OpenAI Deno SDK returns an async iterable when stream=true
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages as any,
      stream: true
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            // Extract content token – shape depends on SDK
            const token = chunk?.choices?.[0]?.delta?.content || chunk?.choices?.[0]?.message?.content || ''
            if (token) {
              controller.enqueue(encoder.encode(`data: ${token}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (streamErr) {
          console.error('Streaming error', streamErr)
          controller.error(streamErr)
        }
      }
    })

    // Persist chat messages (best effort)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (supabaseUrl && supabaseAnonKey) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
        })

        // Extract user_id from JWT (if present) – optional
        const bearer = req.headers.get('Authorization') || ''
        const jwt = bearer.replace(/^Bearer\s+/i, '')
        let userId: string | null = null
        if (jwt && jwt.split('.').length === 3) {
          try {
            userId = JSON.parse(atob(jwt.split('.')[1])).sub
          } catch (_e) {
            /* ignore */
          }
        }

        const conversationId = plan_id || randomId('conv_')

        // Insert each user/assistant message except any prior duplicates (idempotent approach kept simple)
        const inserts = messages.map((m) => ({
          conversation_id: conversationId,
          user_id: userId,
          role: m.role,
          content: m.content
        }))
        // Add placeholder assistant response row – updated later via client if desired
        inserts.push({
          conversation_id: conversationId,
          user_id: userId,
          role: 'assistant',
          content: '' // will be updated client-side when stream completes
        })

        await supabase.from('chat_messages').insert(inserts)
      }
    } catch (persistErr) {
      console.warn('Failed to persist chat messages', persistErr)
    }

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      },
      status: 200
    })
  } catch (err) {
    const message = (err as Error).message ?? err.toString()
    console.error('chat_guide error:', err)

    // Persist error log (non-fatal)
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
          function_name: 'chat_guide',
          error_message: message,
          stack_trace: (err as Error)?.stack ?? null
        })
      }
    } catch (logErr) {
      console.warn('Failed to persist error log', logErr)
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 
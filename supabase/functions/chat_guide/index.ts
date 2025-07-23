// @ts-nocheck // Supabase Edge Function: chat_guide – provides streaming AI chat with trip context
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import OpenAI from 'jsr:@openai/openai@5.10.1'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const randomId = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Rate limiting per user (in memory - consider Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 15 * 60 * 1000 // 15 minutes
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 }
  }
  
  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  
  userLimit.count++
  rateLimitMap.set(userId, userLimit)
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - userLimit.count }
}

// Sanitize user input to prevent prompt injection
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type')
  }
  
  // Remove potential prompt injection patterns
  const dangerous = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /human\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|.*?\|>/gi,
    /###\s*system/gi,
    /###\s*instruction/gi,
    /you\s+are\s+now/gi,
    /forget\s+everything/gi,
    /new\s+instructions/gi,
  ]
  
  let sanitized = input
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[FILTERED]')
  })
  
  // Limit length
  sanitized = sanitized.slice(0, 1000)
  
  return sanitized.trim()
}

// Validate message array
function validateMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array')
  }
  
  if (messages.length === 0) {
    throw new Error('Messages array cannot be empty')
  }
  
  if (messages.length > 50) {
    throw new Error('Too many messages in conversation')
  }
  
  return messages.map((msg, index) => {
    if (!msg || typeof msg !== 'object') {
      throw new Error(`Invalid message at index ${index}`)
    }
    
    const { role, content } = msg as any
    
    if (role !== 'user' && role !== 'assistant') {
      throw new Error(`Invalid role "${role}" at index ${index}`)
    }
    
    if (typeof content !== 'string') {
      throw new Error(`Invalid content type at index ${index}`)
    }
    
    if (role === 'user') {
      return { role, content: sanitizeInput(content) }
    }
    
    return { role, content: content.slice(0, 5000) } // Limit assistant message length
  })
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
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
    // Extract and validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }
    
    const token = authHeader.slice(7)
    let userId: string
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      if (!userId) throw new Error('Invalid token payload')
    } catch {
      throw new Error('Invalid JWT token')
    }
    
    // Check rate limit
    const rateCheck = checkRateLimit(userId)
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please wait before sending more messages.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      })
    }

    const body = await req.json()
    const { plan_id, messages } = body as {
      plan_id?: string
      messages?: unknown
    }

    // Validate inputs
    if (plan_id && (typeof plan_id !== 'string' || plan_id.length > 100)) {
      throw new Error('Invalid plan_id')
    }
    
    const validatedMessages = validateMessages(messages)

    // Build conversation context – prepend system prompt
    let systemPrompt = `You are CharterAI, an expert professional fishing guide AI. Be concise (max 200 words) and helpful. Ensure your responses are information dense and actionable. If the user asks about trip logistics, reference the provided itinerary. If the question is unrelated to fishing or the trip, politely steer them back to fishing topics. Do not provide information about other topics besides fishing.

IMPORTANT: Only respond to questions about fishing, fishing techniques, equipment, locations, weather conditions, and trip planning. Politely decline to help with other topics.`
    
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
            .eq('user_id', userId) // Ensure user can only access their own trips
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
          condensed = JSON.stringify(itineraryContext).slice(0, 2000) // Reduced from 4000
        } catch (_err) {
          /* ignore */
        }
        systemPrompt += `\n\nHere is the JSON itinerary for reference (truncated if long): ${condensed}`
      }
    }

    // Prepare messages for OpenAI
    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...validatedMessages]

    if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY env var')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Create chat completion stream
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages as any,
      stream: true,
      max_tokens: 500, // Limit response length
      temperature: 0.7,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            // Extract content token – shape depends on SDK
            const token = chunk?.choices?.[0]?.delta?.content || ''
            if (token) {
              // Basic output filtering to prevent harmful content
              const filteredToken = token.replace(/\b(password|secret|key|token)\b/gi, '[REDACTED]')
              controller.enqueue(encoder.encode(`data: ${filteredToken}\n\n`))
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

        const conversationId = plan_id || randomId('conv_')

        // Insert only the latest user message to avoid duplicates
        const latestMessage = validatedMessages[validatedMessages.length - 1]
        if (latestMessage.role === 'user') {
          await supabase.from('chat_messages').insert({
            conversation_id: conversationId,
            user_id: userId,
            role: latestMessage.role,
            content: latestMessage.content
          })
        }
      }
    } catch (persistErr) {
      console.warn('Failed to persist chat messages', persistErr)
    }

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      },
      status: 200
    })
  } catch (err) {
    const message = (err as Error).message ?? err.toString()
    console.error('chat_guide error:', message)

    // Sanitize error message to prevent information leakage
    const safeMessage = message.includes('rate limit') ? message : 'An error occurred processing your request'

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
          error_message: message.slice(0, 500), // Limit error message length
          stack_trace: (err as Error)?.stack?.slice(0, 1000) ?? null
        })
      }
    } catch (logErr) {
      console.warn('Failed to persist error log', logErr)
    }

    const origin = req.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)
    
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: message.includes('rate limit') ? 429 : 500
    })
  }
}) 
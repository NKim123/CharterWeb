import React, { useState, useRef, useEffect } from 'react'
import { createParser, type EventSourceMessage } from 'eventsource-parser'
import { sanitizeHtml, sanitizePromptInput, ClientRateLimit } from '../lib/security'

interface ChatGuideProps {
  planId: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Rate limiting: 10 messages per 5 minutes
const chatRateLimit = new ClientRateLimit('chat', {
  maxRequests: 10,
  windowMs: 5 * 60 * 1000
});

export function ChatGuide({ planId }: ChatGuideProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Clear any previous rate limit errors
    setRateLimitError(null)

    // Check rate limit
    const rateCheck = chatRateLimit.checkLimit()
    if (!rateCheck.allowed) {
      const resetDate = new Date(rateCheck.resetTime)
      setRateLimitError(`Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}`)
      return
    }

    // Sanitize user input to prevent prompt injection
    const sanitizedInput = sanitizePromptInput(input.trim())
    
    // Additional validation
    if (sanitizedInput.length < 1) {
      alert('Please enter a valid message')
      return
    }

    if (sanitizedInput.length > 1000) {
      alert('Message too long. Please keep it under 1000 characters.')
      return
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: sanitizedInput }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Attach Supabase credentials to avoid 401 (Edge Functions expect an `apikey` header and optional user JWT)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string
      }

      // Include JWT if user is authenticated so RLS policies apply server-side
      try {
        const { supabase } = await import('../lib/supabaseClient')
        const session = supabase.auth.getSession()
        const { data } = await session
        const token = data.session?.access_token
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
      } catch (_err) {
        /* fallback – continue without JWT */
      }

      const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/chat_guide`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan_id: planId, messages: newMessages })
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to chat function')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let assistantMessage = ''

      const parser = createParser({
        onEvent(event: EventSourceMessage) {
          const text = event.data
          if (text === '[DONE]') {
            return // end marker
          }

          if (!text.trim()) {
            // Ignore keep-alive/empty events which would otherwise overwrite message
            return
          }

          // Sanitize streaming response to prevent XSS
          const sanitizedText = sanitizeHtml(text)
          assistantMessage += sanitizedText
          
          setMessages((prev) => {
            const updated = [...prev]
            if (updated[updated.length - 1]?.role === 'assistant') {
              updated[updated.length - 1].content = assistantMessage
            } else {
              updated.push({ role: 'assistant', content: assistantMessage })
            }
            return updated
          })

          // Scroll within container
          scrollToBottom()
        }
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Flush any remaining decoder buffer
          const remaining = decoder.decode(undefined, { stream: false })
          if (remaining) parser.feed(remaining)
          break
        }
        // Use streaming decode to avoid split multi-byte sequences producing replacement chars
        parser.feed(decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Render message content safely
  const renderMessageContent = (content: string) => {
    // Content is already sanitized, but double-check for safety
    const safeContent = sanitizeHtml(content)
    return <div>{safeContent}</div>
  }

  return (
    <div className="mx-auto bg-white rounded-lg shadow p-4 flex flex-col h-[600px] max-w-full lg:max-w-4xl">
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[80%] ${m.role === 'user' ? 'bg-accent text-white self-end' : 'bg-gray-100 text-gray-900'}`}
          >
            {renderMessageContent(m.content)}
          </div>
        ))}
        {rateLimitError && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">
            {rateLimitError}
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="mt-auto flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
          placeholder="Ask about your trip... (Max 1000 characters)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
      <div className="text-xs text-gray-500 mt-1">
        Remaining messages: {chatRateLimit.getStatus().remaining}/10 per 5 minutes
      </div>
    </div>
  )
} 
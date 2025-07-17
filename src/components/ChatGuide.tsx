import React, { useState, useRef } from 'react'
import { createParser, type EventSourceMessage } from 'eventsource-parser'

interface ChatGuideProps {
  planId: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatGuide({ planId }: ChatGuideProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessages: Message[] = [...messages, { role: 'user', content: input.trim() }]
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
            // Streaming complete – no need to push duplicate message
            assistantMessage = ''
            return
          }

          assistantMessage += text
          setMessages((prev) => {
            const updated = [...prev]
            if (updated[updated.length - 1]?.role === 'assistant') {
              updated[updated.length - 1].content = assistantMessage
            } else {
              updated.push({ role: 'assistant', content: assistantMessage })
            }
            return updated
          })
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
        scrollToBottom()
      }
    } catch (err) {
      console.error(err)
      alert('Chat failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto bg-white rounded-lg shadow p-4 flex flex-col h-[600px] max-w-full lg:max-w-4xl">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[80%] ${m.role === 'user' ? 'bg-accent text-white self-end' : 'bg-gray-100 text-gray-900'}`}
          >
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="mt-auto flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
          placeholder="Ask about your trip..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
} 
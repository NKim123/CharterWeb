import React, { useState, useRef } from 'react'
import { createParser } from 'eventsource-parser'

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
      const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/chat_guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan_id: planId, messages: newMessages })
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to chat function')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let assistantMessage = ''

      // @ts-ignore - event typing from library
      const parser = createParser((event: any) => {
        if (event.type === 'event') {
          if (event.data === '[DONE]') {
            setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
            assistantMessage = ''
          } else {
            assistantMessage += event.data
            setMessages((prev) => {
              const updated = [...prev]
              // Update last assistant message or add new temporary one
              if (updated[updated.length - 1]?.role === 'assistant') {
                updated[updated.length - 1].content = assistantMessage
              } else {
                updated.push({ role: 'assistant', content: assistantMessage })
              }
              return [...updated]
            })
          }
        }
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.feed(decoder.decode(value))
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
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-4 flex flex-col h-[600px]">
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
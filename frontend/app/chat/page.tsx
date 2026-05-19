'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  system?: 'hermes' | 'openclaw'
}

type Mode = 'auto' | 'hermes' | 'openclaw'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('auto')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response, system: data.system },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '[connection error]', system: mode === 'openclaw' ? 'openclaw' : 'hermes' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '40vh' }}>
            Send a message to start.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg fade-in ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant'}`}
          >
            <span className="chat-msg-role">
              {msg.role === 'user'
                ? '你'
                : msg.system === 'openclaw'
                  ? 'OpenClaw'
                  : 'Hermes'}
            </span>
            {msg.role === 'assistant' && msg.system && (
              <span className="runtime-pill">{msg.system}</span>
            )}
            <div style={{ marginTop: 2 }}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-msg-assistant fade-in">
            <span className="chat-msg-role">
              {mode === 'openclaw' ? 'OpenClaw' : 'Hermes'}
            </span>
            <div style={{ marginTop: 2, color: '#666' }}>…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {(['auto', 'hermes', 'openclaw'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              className={`btn ${mode === m ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => setMode(m)}
              style={{ textTransform: 'capitalize', fontSize: 12, padding: '4px 10px' }}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          className="input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message…"
          disabled={loading}
          autoFocus
        />
      </form>
    </div>
  )
}

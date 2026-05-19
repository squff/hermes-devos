'use client'

import { useState, useRef, useEffect } from 'react'
import { sendChat } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  system?: 'hermes' | 'openclaw'
}

type Mode = 'auto' | 'hermes' | 'openclaw'

const MODE_LABELS: Record<Mode, string> = {
  auto: '自动',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('auto')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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
    setStreaming(true)

    // 添加空的 assistant 消息用于流式填充
    const assistantIdx = -1 // 占位，后面用
    setMessages(prev => [...prev, { role: 'assistant', content: '', system: mode === 'auto' ? undefined : mode }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const stream = sendChat(text, mode, ctrl.signal)
      let fullContent = ''

      for await (const chunk of stream) {
        fullContent += chunk
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: fullContent }
          }
          return updated
        })
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content || '[连接错误]',
            }
          }
          return updated
        })
      }
    } finally {
      setLoading(false)
      setStreaming(false)
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setLoading(false)
    setStreaming(false)
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{
            color: 'var(--text-tertiary, #555)',
            textAlign: 'center',
            marginTop: '35vh',
            fontSize: 14,
          }}>
            <div style={{ fontSize: 20, marginBottom: 12, opacity: 0.5 }}>💬</div>
            发送消息开始对话
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
            <div style={{ marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {msg.content || (streaming && i === messages.length - 1 ? '▋' : '')}
            </div>
          </div>
        ))}
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
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入消息…"
            disabled={loading}
            autoFocus
            style={{ flex: 1 }}
          />
          {loading ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleStop}
              style={{ fontSize: 13, padding: '6px 16px', color: 'var(--error, #ef4444)' }}
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!input.trim()}
              style={{ fontSize: 13, padding: '6px 16px' }}
            >
              发送
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

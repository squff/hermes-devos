'use client';

import { useState } from 'react';
import { fetchAPI } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  system?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'hermes' | 'openclaw' | 'auto'>('auto');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input, system: mode };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 调用后端聊天 API
      const response = await fetchAPI('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input, mode }),
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.reply || response.message || JSON.stringify(response),
        system: response.system || mode,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'error', content: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div className="page-header" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>◆ <span className="gradient-text">统一对话</span></h1>
            <p>同时与 Hermes 和 OpenClaw 对话</p>
          </div>
          <button className="btn btn-secondary" onClick={clearChat}>清空对话</button>
        </div>
      </div>

      {/* 模式选择 */}
      <div className="card" style={{ marginBottom: '12px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>对话模式:</span>
          {[
            { id: 'auto' as const, label: '自动路由', desc: '系统自动分配' },
            { id: 'hermes' as const, label: 'Hermes', desc: '仅 Hermes' },
            { id: 'openclaw' as const, label: 'OpenClaw', desc: '仅 OpenClaw' },
          ].map(m => (
            <button
              key={m.id}
              className={`btn ${mode === m.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode(m.id)}
              style={{ fontSize: '12px' }}
            >
              {m.label}
              <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 消息区 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: 'var(--bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '12px',
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>◆</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>开始对话</div>
            <div style={{ fontSize: '13px' }}>
              输入消息，系统会根据模式自动路由到 Hermes 或 OpenClaw
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '10px 16px',
                borderRadius: '12px',
                background: msg.role === 'user' ? 'var(--accent)' :
                           msg.role === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                           'var(--bg-secondary)',
                color: msg.role === 'user' ? 'white' :
                       msg.role === 'error' ? 'var(--error)' :
                       'var(--text-primary)',
                border: msg.role === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                fontSize: '14px',
                lineHeight: '1.5',
              }}>
                {msg.system && msg.system !== 'auto' && (
                  <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>
                    via {msg.system}
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              fontSize: '14px',
            }}>
              思考中...
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 0 16px' }}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="输入消息..."
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}

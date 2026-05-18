'use client';

import { useState, useEffect } from 'react';
import { createSession, getSessions, sendMessage } from '@/lib/api';

export default function AgentsPage() {
  const [role, setRole] = useState('memory');
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessions().then(data => setSessions(Array.isArray(data) ? data : data.sessions || [])).catch(() => {});
  }, []);

  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await createSession(role);
      const newSession = { id: session.session_id || session.id, role, messages: [] };
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession.id);
      setMessages([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !activeSession) return;
    const userMsg = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);
    try {
      const response = await sendMessage(activeSession, message);
      const assistantMsg = { role: 'assistant', content: response.message || response.response || JSON.stringify(response) };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'error', content: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>◆ <span className="gradient-text">代理运行时</span></h1>
        <p>创建和管理自主代理会话，用于复杂任务</p>
      </div>

      <div className="grid grid-2" style={{ gap: '24px' }}>
        {/* Left: Session Management */}
        <div>
          {/* Create Session */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">创建会话</div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="memory">记忆专家</option>
                <option value="coder">代码专家</option>
                <option value="reviewer">代码审查</option>
                <option value="architect">架构师</option>
                <option value="debugger">调试专家</option>
              </select>
              <button className="btn btn-primary" onClick={handleCreateSession} disabled={loading}>
                + 新建会话
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="card">
            <div className="section-title">会话列表 ({sessions.length})</div>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '14px' }}>
                暂无会话，请在上方创建。
              </p>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map((s: any, i: number) => (
                  <div
                    key={s.id || i}
                    onClick={() => { setActiveSession(s.id); setMessages([]); }}
                    style={{
                      padding: '10px 14px',
                      background: activeSession === s.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                      border: `1px solid ${activeSession === s.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{s.role || role}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '12px' }}>
                        {(s.id || '').slice(0, 8)}...
                      </span>
                    </div>
                    <span className={`status-badge status-ready`}>
                      <span className="status-dot" /> active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <div className="section-title">对话</div>
          {error && (
            <div style={{
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '6px',
              color: 'var(--error)',
              fontSize: '13px',
              marginBottom: '12px',
            }}>⚠ {error}</div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                {activeSession ? '发送消息开始对话' : '请先选择或创建会话'}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  background: msg.role === 'user' ? 'rgba(99, 102, 241, 0.1)' : msg.role === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                  border: `1px solid ${msg.role === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                }}>
                  <div style={{ fontSize: '11px', color: msg.role === 'error' ? 'var(--error)' : 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {msg.role}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              className="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={activeSession ? "输入消息..." : "请先创建会话"}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={!activeSession}
            />
            <button className="btn btn-primary" onClick={handleSend} disabled={loading || !activeSession || !message.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

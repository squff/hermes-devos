'use client';

import { useState, useEffect } from 'react';
import { searchMemory, storeMemory, getMemoryStats } from '@/lib/api';

export default function MemoryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [storeContent, setStoreContent] = useState('');
  const [storeNamespace, setStoreNamespace] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    getMemoryStats().then(setStats).catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchMemory(query);
      setResults(Array.isArray(data) ? data : data.results || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStore = async () => {
    if (!storeContent.trim()) return;
    try {
      await storeMemory(storeContent, storeNamespace || 'general', 0.5);
      setStoreContent('');
      showToast('success', '记忆存储成功');
      // 刷新统计信息
      getMemoryStats().then(setStats).catch(() => {});
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>◉ <span className="gradient-text">记忆引擎</span></h1>
        <p>持久化知识存储和语义搜索，覆盖您的开发上下文</p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        {/* Search */}
        <div className="card">
          <div className="section-title">搜索记忆</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索内容..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? <div className="spinner" /> : '🔍'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card">
          <div className="section-title">记忆统计</div>
          {stats ? (
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
                {stats.total_entries ?? stats.count ?? '—'}
              </span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '14px' }}>条记录</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>加载中...</p>
          )}
        </div>
      </div>

      {/* Store Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">存储记忆</div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              className="input"
              value={storeContent}
              onChange={(e) => setStoreContent(e.target.value)}
              placeholder="输入要存储的内容..."
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
              <input
                className="input"
                value={storeNamespace}
                onChange={(e) => setStoreNamespace(e.target.value)}
                placeholder="分类（可选）"
              />
              <button className="btn btn-primary" onClick={handleStore} disabled={!storeContent.trim()}>
                💾 存储
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: 'var(--error)',
          marginBottom: '24px',
          fontSize: '14px',
        }}>⚠ {error}</div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="card fade-in">
          <div className="section-title">搜索结果 ({results.length})</div>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((item: any, i: number) => (
              <div key={i} style={{
                padding: '14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>{item.content || item.text || JSON.stringify(item)}</div>
                {item.score !== undefined && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    相关度: <span style={{ color: 'var(--accent)' }}>{(item.score * 100).toFixed(1)}%</span>
                  </div>
                )}
                {item.namespace && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '4px',
                    color: 'var(--accent)',
                  }}>{item.namespace}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

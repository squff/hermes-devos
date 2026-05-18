'use client';

import { useState } from 'react';
import { chunkText, compressContext, buildIndex } from '@/lib/api';

export default function ContextPage() {
  const [inputText, setInputText] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(50);
  const [chunks, setChunks] = useState<any[]>([]);
  const [compressed, setCompressed] = useState<any>(null);
  const [indexResult, setIndexResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chunk' | 'compress' | 'index'>('chunk');

  const handleChunk = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await chunkText(inputText, chunkSize, overlap);
      setChunks(Array.isArray(result) ? result : result.chunks || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await compressContext(inputText);
      setCompressed(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const [repoPath, setRepoPath] = useState('');

  const handleBuildIndex = async () => {
    if (!repoPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await buildIndex(repoPath);
      setIndexResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>⊞ <span className="gradient-text">长上下文引擎</span></h1>
        <p>文本分块、上下文压缩和大型文档索引构建</p>
      </div>

      {/* Input Area */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">输入文本</div>
        <textarea
          className="input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="粘贴或输入要处理的文本..."
          style={{ minHeight: '160px', marginTop: '12px', fontFamily: 'monospace', fontSize: '13px' }}
        />
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>分块大小:</label>
            <input
              className="input"
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              style={{ width: '100px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>重叠:</label>
            <input
              className="input"
              type="number"
              value={overlap}
              onChange={(e) => setOverlap(Number(e.target.value))}
              style={{ width: '100px' }}
            />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {inputText.length} 字符
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        {[
          { id: 'chunk' as const, label: '⊞ 文本分块' },
          { id: 'compress' as const, label: '📉 压缩' },
          { id: 'index' as const, label: '📇 索引构建' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
              border: `1px solid ${activeTab === tab.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '8px',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
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

      {/* Chunking Tab */}
      {activeTab === 'chunk' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={handleChunk} disabled={loading || !inputText.trim()}>
              {loading ? <><div className="spinner" /> Chunking...</> : '⊞ Chunk Text'}
            </button>
          </div>
          {chunks.length > 0 && (
            <div className="card fade-in">
              <div className="section-title">分块结果 ({chunks.length})</div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chunks.map((chunk: any, i: number) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>分块 {i + 1}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {(typeof chunk === 'string' ? chunk : chunk.text || '').length} 字符
                      </span>
                    </div>
                    <pre style={{ fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                      {typeof chunk === 'string' ? chunk : chunk.text || JSON.stringify(chunk)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compression Tab */}
      {activeTab === 'compress' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={handleCompress} disabled={loading || !inputText.trim()}>
              {loading ? <><div className="spinner" /> Compressing...</> : '📉 Compress Context'}
            </button>
          </div>
          {compressed && (
            <div className="card fade-in">
              <div className="section-title">压缩结果</div>
              <pre className="code-block" style={{ marginTop: '12px' }}>
                {typeof compressed === 'string' ? compressed : JSON.stringify(compressed, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Index Tab */}
      {activeTab === 'index' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={handleBuildIndex} disabled={loading || !inputText.trim()}>
              {loading ? <><div className="spinner" /> Building...</> : '📇 Build Index'}
            </button>
          </div>
          {indexResult && (
            <div className="card fade-in">
              <div className="section-title">索引结果</div>
              <pre className="code-block" style={{ marginTop: '12px' }}>
                {JSON.stringify(indexResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

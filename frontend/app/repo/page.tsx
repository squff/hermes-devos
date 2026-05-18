'use client';

import { useState } from 'react';
import { scanRepo } from '@/lib/api';

export default function RepoPage() {
  const [repoPath, setRepoPath] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!repoPath.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanRepo(repoPath);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>⟐ <span className="gradient-text">Repository Intelligence</span></h1>
        <p>Scan and analyze repositories for code intelligence, dependencies, and structure</p>
      </div>

      {/* Scan Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">Scan Repository</div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <input
            className="input"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/path/to/repository"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <button className="btn btn-primary" onClick={handleScan} disabled={loading || !repoPath.trim()}>
            {loading ? <><div className="spinner" /> Scanning...</> : '⟐ Scan'}
          </button>
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

      {/* Results */}
      {result && (
        <div className="fade-in">
          {/* Stats Row */}
          <div className="grid grid-3" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="section-title">Files</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>
                {result.file_count ?? result.total_files ?? '—'}
              </div>
            </div>
            <div className="card">
              <div className="section-title">Languages</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {result.languages ? Object.entries(result.languages).map(([lang, count]: any) => (
                  <span key={lang} style={{
                    padding: '4px 10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--accent)',
                  }}>{lang}: {count}</span>
                )) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
              </div>
            </div>
            <div className="card">
              <div className="section-title">Frameworks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {result.frameworks ? result.frameworks.map((f: string, i: number) => (
                  <span key={i} style={{
                    padding: '4px 10px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--success)',
                  }}>{f}</span>
                )) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
              </div>
            </div>
          </div>

          {/* Full Result */}
          <div className="card">
            <div className="section-title">Raw Scan Result</div>
            <pre className="code-block" style={{ marginTop: '12px' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button className="btn btn-secondary" disabled={!result}>⟐ Analyze Dependencies</button>
        <button className="btn btn-secondary" disabled={!result}>📄 Generate Summary</button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import EngineCard from '@/components/EngineCard';
import { getHealth, getProviders, getTools } from '@/lib/api';

// 8个引擎的描述信息
const engineInfo: Record<string, { description: string; icon: string }> = {
  repo: { description: 'Repository analysis & code intelligence', icon: '⟐' },
  memory: { description: 'Persistent knowledge & context storage', icon: '◉' },
  planner: { description: 'Task decomposition & planning engine', icon: '▦' },
  agent: { description: 'Autonomous agent runtime & sessions', icon: '◆' },
  tool: { description: 'Tool orchestration & execution', icon: '⟟' },
  debug: { description: 'Error analysis & debugging engine', icon: '⊞' },
  provider: { description: 'LLM provider routing & management', icon: '◎' },
  longcontext: { description: 'Long context processing & chunking', icon: '⊞' },
};

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthData, providersData, toolsData] = await Promise.allSettled([
          getHealth(),
          getProviders(),
          getTools(),
        ]);
        
        if (healthData.status === 'fulfilled') setHealth(healthData.value);
        if (providersData.status === 'fulfilled') setProviders(Array.isArray(providersData.value) ? providersData.value : []);
        if (toolsData.status === 'fulfilled') setTools(Array.isArray(toolsData.value) ? toolsData.value : []);
        
        if (healthData.status === 'rejected') {
          setError('Backend API not reachable. Start the server at :8080');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const engines = health?.engines ? Object.entries(health.engines).map(([name, status]) => ({
    name,
    status: status === 'ready' || status === true ? 'ready' as const : 'error' as const,
    ...engineInfo[name],
  })) : Object.keys(engineInfo).map(name => ({
    name,
    status: 'unknown' as const,
    ...engineInfo[name],
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>
              <span className="gradient-text">Hermes-DevOS</span> Dashboard
            </h1>
            <p style={{ marginTop: '4px' }}>
              AI-Native Development Operating System — 8 engines orchestrated for intelligent development
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {health && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div>Version: <span style={{ color: 'var(--text-primary)' }}>{health.version || '0.1.0'}</span></div>
                <div>Uptime: <span style={{ color: 'var(--text-primary)' }}>{health.uptime || '—'}</span></div>
              </div>
            )}
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
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Engine Status Grid */}
      <div className="section">
        <div className="section-title">Engine Status</div>
        <div className="grid grid-4">
          {engines.map((engine) => (
            <EngineCard
              key={engine.name}
              name={engine.name}
              status={engine.status}
              description={engine.description || ''}
              icon={engine.icon}
            />
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-3">
        {/* Providers */}
        <div className="card fade-in">
          <div className="section-title" style={{ marginBottom: '12px' }}>Providers</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" /> Loading...
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent)' }}>
                {providers.length}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {providers.filter(p => p.has_api_key).length} configured with API keys
              </div>
              {providers.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {providers.slice(0, 6).map((p: any, i: number) => (
                    <span key={i} style={{
                      padding: '2px 8px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--accent)',
                    }}>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="card fade-in">
          <div className="section-title" style={{ marginBottom: '12px' }}>Tools</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" /> Loading...
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>
                {tools.length}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Registered tools available
              </div>
              {tools.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tools.slice(0, 6).map((t: any, i: number) => (
                    <span key={i} style={{
                      padding: '2px 8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--success)',
                    }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card fade-in">
          <div className="section-title" style={{ marginBottom: '12px' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="/repo" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ⟐ Scan Repository
            </a>
            <a href="/memory" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ◉ Search Memory
            </a>
            <a href="/planner" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ▦ Create Plan
            </a>
            <a href="/debug" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ⟟ Analyze Error
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import EngineCard from '@/components/EngineCard';
import { getHealth, getProviders, getTools } from '@/lib/api';

// 8个引擎的描述信息
const engineInfo: Record<string, { description: string; icon: string }> = {
  repo: { description: '仓库分析与代码智能', icon: '⟐' },
  memory: { description: '持久化知识与上下文存储', icon: '◉' },
  planner: { description: '任务分解与规划引擎', icon: '▦' },
  agent: { description: '自主代理运行时与会话', icon: '◆' },
  tool: { description: '工具编排与执行', icon: '⟟' },
  debug: { description: '错误分析与调试引擎', icon: '⊞' },
  provider: { description: 'LLM 提供商路由与管理', icon: '◎' },
  longcontext: { description: '长上下文处理与分块', icon: '⊞' },
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
          setError('后端 API 不可达。请在 :8080 启动服务器');
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
              <span className="gradient-text">Hermes-DevOS</span> 控制面板
            </h1>
            <p style={{ marginTop: '4px' }}>
              AI 原生开发操作系统 — 8 大引擎协同工作，赋能智能开发
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {health && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div>版本: <span style={{ color: 'var(--text-primary)' }}>{health.version || '0.1.0'}</span></div>
                <div>运行时间: <span style={{ color: 'var(--text-primary)' }}>{health.uptime || '—'}</span></div>
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
        <div className="section-title">引擎状态</div>
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
          <div className="section-title" style={{ marginBottom: '12px' }}>提供商</div>
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
                {providers.filter(p => p.has_api_key).length} 个已配置 API 密钥
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
          <div className="section-title" style={{ marginBottom: '12px' }}>工具</div>
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
                个已注册工具可用
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
          <div className="section-title" style={{ marginBottom: '12px' }}>快捷操作</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="/repo" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ⟐ 扫描仓库
            </a>
            <a href="/memory" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ◉ 搜索记忆
            </a>
            <a href="/planner" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ▦ 创建计划
            </a>
            <a href="/debug" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              ⟟ 分析错误
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

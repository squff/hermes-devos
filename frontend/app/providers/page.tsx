'use client';

import { useState, useEffect } from 'react';
import { getProviders, routeTask } from '@/lib/api';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [taskType, setTaskType] = useState('code');
  const [contextSize, setContextSize] = useState(1000);
  const [budget, setBudget] = useState('low');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProviders().then(data => setProviders(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await routeTask(taskType, contextSize, budget);
      setRouteResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>◎ <span className="gradient-text">提供商引擎</span></h1>
        <p>LLM 提供商管理、智能路由和回退链</p>
      </div>

      {/* Provider List */}
      <div className="section">
        <div className="section-title">已注册提供商 ({providers.length})</div>
        {providers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            暂无提供商配置。请添加 API 密钥以连接提供商。
          </div>
        ) : (
          <div className="grid grid-3">
            {providers.map((provider: any, i: number) => (
              <div key={i} className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{provider.name}</h3>
                  <span className={`status-badge ${provider.has_api_key ? 'status-ready' : 'status-error'}`}>
                    <span className="status-dot" />
                    {provider.has_api_key ? '已配置' : '无密钥'}
                  </span>
                </div>
                {provider.model && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    模型: <span style={{ color: 'var(--text-primary)' }}>{provider.model}</span>
                  </div>
                )}
                {provider.context_window && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    上下文: <span style={{ color: 'var(--accent)' }}>{provider.context_window.toLocaleString()}</span> tokens
                  </div>
                )}
                {provider.capabilities && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {(Array.isArray(provider.capabilities) ? provider.capabilities : [provider.capabilities]).map((cap: string, j: number) => (
                      <span key={j} style={{
                        padding: '2px 8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: 'var(--accent)',
                      }}>{cap}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Routing */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="section-title">任务路由</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          根据能力和预算，为特定任务找到最佳提供商
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            style={{ flex: '1 1 200px' }}
          >
            <option value="code">代码生成</option>
            <option value="code">代码审查</option>
            <option value="analysis">总结</option>
            <option value="analysis">分析</option>
            <option value="creative">规划</option>
            <option value="general">对话</option>
          </select>
          <input
            className="input"
            type="number"
            value={contextSize}
            onChange={(e) => setContextSize(Number(e.target.value))}
            placeholder="上下文大小"
            style={{ flex: '0 1 150px' }}
          />
          <select
            className="input"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{ flex: '0 1 120px' }}
          >
            <option value="low">低预算</option>
            <option value="medium">中等</option>
            <option value="high">高预算</option>
          </select>
          <button className="btn btn-primary" onClick={handleRoute} disabled={loading}>
            {loading ? <div className="spinner" /> : '◎ Route'}
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
          marginTop: '16px',
          fontSize: '14px',
        }}>⚠ {error}</div>
      )}

      {routeResult && (
        <div className="card fade-in" style={{ marginTop: '16px' }}>
          <div className="section-title">路由结果</div>
          <div style={{ marginTop: '12px' }}>
            {routeResult.provider && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>选定提供商: </span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)' }}>{routeResult.provider}</span>
              </div>
            )}
            {routeResult.model && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>模型: </span>
                <span style={{ color: 'var(--text-primary)' }}>{routeResult.model}</span>
              </div>
            )}
            {routeResult.fallback_chain && (
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>回退链:</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {routeResult.fallback_chain.map((p: string, i: number) => (
                    <span key={i}>
                      <span style={{
                        padding: '6px 14px',
                        background: i === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        border: `1px solid ${i === 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: i === 0 ? 'var(--success)' : 'var(--accent)',
                      }}>{p}</span>
                      {i < routeResult.fallback_chain.length - 1 && (
                        <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!routeResult.provider && !routeResult.fallback_chain && (
              <pre className="code-block">{JSON.stringify(routeResult, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

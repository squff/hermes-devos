'use client';

import { useEffect, useState } from 'react';
import { getStatus } from '@/lib/api';

export default function Dashboard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-header"><h1>加载中...</h1></div>;

  const h = status?.hermes || {};
  const o = status?.openclaw || {};
  const ports = status?.ports || {};

  return (
    <div>
      <div className="page-header">
        <h1><span className="gradient-text">统一控制面板</span></h1>
        <p>Hermes + OpenClaw 双系统状态总览</p>
      </div>

      {/* 双系统状态卡片 */}
      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        {/* Hermes 状态 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>⟐ Hermes</h3>
            <span className={`status-badge ${h.gateway_running ? 'status-ready' : 'status-error'}`}>
              <span className="status-dot" />
              {h.gateway_running ? '运行中' : '未运行'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '6px' }}>版本: <span style={{ color: 'var(--text-primary)' }}>{h.version || '未知'}</span></div>
            <div style={{ marginBottom: '6px' }}>配置: <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{h.config_path || '—'}</span></div>
          </div>
        </div>

        {/* OpenClaw 状态 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>◉ OpenClaw</h3>
            <span className={`status-badge ${o.gateway_running ? 'status-ready' : 'status-error'}`}>
              <span className="status-dot" />
              {o.gateway_running ? '运行中' : '未运行'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '6px' }}>版本: <span style={{ color: 'var(--text-primary)' }}>{o.version || '未知'}</span></div>
            <div style={{ marginBottom: '6px' }}>配置: <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{o.config_path || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* 端口状态 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">端口状态</div>
        <div className="grid grid-4" style={{ marginTop: '12px' }}>
          {Object.entries(ports).map(([name, info]: [string, any]) => (
            <div key={name} style={{
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {name.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: info.in_use ? 'var(--success)' : 'var(--text-secondary)' }}>
                :{info.port}
              </div>
              <div style={{ fontSize: '11px', color: info.in_use ? 'var(--success)' : 'var(--text-secondary)' }}>
                {info.in_use ? '占用' : '空闲'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 进程列表 */}
      <div className="card">
        <div className="section-title">相关进程 ({status?.processes?.length || 0})</div>
        {(!status?.processes || status.processes.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            暂无运行中的进程
          </div>
        ) : (
          <div style={{ marginTop: '12px', overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>PID</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>CPU%</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>MEM%</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>命令</th>
                </tr>
              </thead>
              <tbody>
                {status.processes.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>{p.pid}</td>
                    <td style={{ padding: '8px' }}>{p.cpu}</td>
                    <td style={{ padding: '8px' }}>{p.mem}</td>
                    <td style={{ padding: '8px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.command}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

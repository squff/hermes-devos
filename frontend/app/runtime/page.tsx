'use client';

import { useState, useEffect } from 'react';
import { getRuntimeStatus, getProcesses, getPorts } from '@/lib/api';

export default function RuntimePage() {
  const [status, setStatus] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [ports, setPorts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, p, pt] = await Promise.allSettled([getRuntimeStatus(), getProcesses(), getPorts()]);
      if (s.status === 'fulfilled') setStatus(s.value);
      if (p.status === 'fulfilled') setProcesses(Array.isArray(p.value) ? p.value : []);
      if (pt.status === 'fulfilled') setPorts(pt.value);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>▦ <span className="gradient-text">运行时管理</span></h1>
            <p>监控和管理 Hermes 与 OpenClaw 运行状态</p>
          </div>
          <button className="btn btn-primary" onClick={refresh} disabled={loading}>
            {loading ? '刷新中...' : '↻ 刷新'}
          </button>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>⟐ Hermes</h3>
          <div style={{ fontSize: '13px' }}>
            <StatusRow label="网关" running={status?.hermes?.gateway_running} />
            <StatusRow label="版本" value={status?.hermes?.version} />
            <StatusRow label="配置文件" value={status?.hermes?.config_path} small />
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>◉ OpenClaw</h3>
          <div style={{ fontSize: '13px' }}>
            <StatusRow label="网关" running={status?.openclaw?.gateway_running} />
            <StatusRow label="版本" value={status?.openclaw?.version} />
            <StatusRow label="配置文件" value={status?.openclaw?.config_path} small />
          </div>
        </div>
      </div>

      {/* 端口状态 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">端口占用</div>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {ports && Object.entries(ports).map(([name, info]: [string, any]) => (
            <div key={name} style={{
              padding: '14px',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: `1px solid ${info.in_use ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {name.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: info.in_use ? 'var(--success)' : 'var(--text-secondary)', margin: '4px 0' }}>
                :{info.port}
              </div>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: info.in_use ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: info.in_use ? 'var(--success)' : 'var(--error)',
              }}>
                {info.in_use ? '占用' : '空闲'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 进程列表 */}
      <div className="card">
        <div className="section-title">进程列表 ({processes.length})</div>
        {processes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            暂无相关进程
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
                {processes.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{p.pid}</td>
                    <td style={{ padding: '8px' }}>{p.cpu}</td>
                    <td style={{ padding: '8px' }}>{p.mem}</td>
                    <td style={{ padding: '8px', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function StatusRow({ label, running, value, small }: { label: string; running?: boolean; value?: string; small?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {running !== undefined ? (
        <span style={{ color: running ? 'var(--success)' : 'var(--error)' }}>
          {running ? '✅ 运行中' : '❌ 未运行'}
        </span>
      ) : (
        <span style={{ color: 'var(--text-primary)', fontSize: small ? '11px' : '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '—'}
        </span>
      )}
    </div>
  );
}

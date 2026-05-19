'use client';

import { useEffect, useState } from 'react';
import { getStatus, getHermesConfig } from '@/lib/api';

interface RuntimeInfo {
  running: boolean;
  pid: number;
  version: string;
}

interface StatusData {
  hermes: RuntimeInfo;
  openclaw: RuntimeInfo;
  ports: Record<string, { port: number; in_use: boolean }>;
  processes: Array<{ pid: number; cpu: string; mem: string; command: string }>;
}



export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    getStatus().then(setStatus).catch(() => {});
    getHermesConfig().then(setConfig).catch(() => {});
  }, []);

  const h = status?.hermes;
  const o = status?.openclaw;
  const ports = status?.ports || {};
  const processes = status?.processes || [];

  const currentModel = config?.['模型']?.['当前模型'] || '—';
  const currentProvider = config?.['模型']?.['提供商'] || '—';

  return (
    <>
      {/* ── Top bar: runtime status pills ── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="runtime-pill">
            <span className={`status-dot ${h?.running ? 'online' : 'offline'}`} />
            Hermes {h?.running ? 'online' : 'offline'}
          </span>
          <span className="runtime-pill">
            <span className={`status-dot ${o?.running ? 'online' : 'offline'}`} />
            OpenClaw {o?.running ? 'online' : 'offline'}
          </span>
        </div>
        <div className="top-bar-right">
          <span className="runtime-pill">
            {currentModel}
          </span>
          <span className="runtime-pill">
            {currentProvider}
          </span>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="page fade-in">
        <div className="dash-grid">
          {/* LEFT: Runtime overview */}
          <div>
            <div className="section">
              <div className="section-head">
                <span className="section-title">运行时概览</span>
              </div>
              <table className="data-list">
                <thead>
                  <tr>
                    <th>系统</th>
                    <th>状态</th>
                    <th>版本</th>
                    <th>PID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Hermes</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className={`status-dot ${h?.running ? 'online' : 'offline'}`} />
                        {h?.running ? '运行中' : '已停止'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{h?.version || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{h?.pid || '—'}</td>
                  </tr>
                  <tr>
                    <td>OpenClaw</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className={`status-dot ${o?.running ? 'online' : 'offline'}`} />
                        {o?.running ? '运行中' : '已停止'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o?.version || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o?.pid || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Processes */}
            <div className="section">
              <div className="section-head">
                <span className="section-title">进程</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {processes.length}
                </span>
              </div>
              {processes.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '16px 0' }}>—</div>
              ) : (
                <table className="data-list">
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>CPU</th>
                      <th>内存</th>
                      <th>命令</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.slice(0, 10).map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.pid}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.cpu}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.mem}</td>
                        <td style={{
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                        }}>
                          {p.command}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: Quick info */}
          <div>
            {/* Ports */}
            <div className="section">
              <div className="section-head">
                <span className="section-title">端口</span>
              </div>
              <table className="data-list">
                <thead>
                  <tr>
                    <th>服务</th>
                    <th>端口</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ports).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ color: 'var(--text-tertiary)' }}>—</td>
                    </tr>
                  ) : (
                    Object.entries(ports).map(([name, info]) => (
                      <tr key={name}>
                        <td>{name.replace(/_/g, ' ')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>:{info.port}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span className={`status-dot ${info.in_use ? 'online' : 'idle'}`} />
                            {info.in_use ? '占用' : '空闲'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Config snapshot */}
            <div className="section">
              <div className="section-head">
                <span className="section-title">配置</span>
              </div>
              <div className="card">
                <div className="dash-status-row">
                  <span className="dash-status-label">模型</span>
                  <span className="dash-status-value">{currentModel}</span>
                </div>
                <div className="dash-status-row">
                  <span className="dash-status-label">提供商</span>
                  <span className="dash-status-value">{currentProvider}</span>
                </div>
                <div className="dash-status-row">
                  <span className="dash-status-label">Hermes 版本</span>
                  <span className="dash-status-value">{h?.version || '—'}</span>
                </div>
                <div className="dash-status-row">
                  <span className="dash-status-label">OpenClaw 版本</span>
                  <span className="dash-status-value">{o?.version || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

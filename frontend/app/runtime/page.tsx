'use client';
import { useState, useEffect } from 'react';

interface PortInfo { name: string; port: number; in_use: boolean; }
interface ProcessInfo { pid: string; cpu: string; mem: string; cmd: string; }
interface RuntimeStatus {
  hermes: { running: boolean; pid: string; version: string; };
  openclaw: { running: boolean; pid: string; version: string; };
  ports: PortInfo[];
  processes: ProcessInfo[];
}

export default function RuntimePage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('http://localhost:8080/api/runtime/status');
        if (r.ok) setStatus(await r.json());
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const r = await fetch('http://localhost:8080/api/runtime/processes');
        if (r.ok) {
          const d = await r.json();
          setLogs(JSON.stringify(d, null, 2));
        }
      } catch {}
    };
    loadLogs();
  }, []);

  const s = status;

  return (
    <div className="page fade-in">
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="runtime-pill">
            <span className={`status-dot ${s?.hermes?.running ? 'online' : 'offline'}`} />
            Hermes
          </span>
          <span className="runtime-pill">
            <span className={`status-dot ${s?.openclaw?.running ? 'online' : 'offline'}`} />
            OpenClaw
          </span>
        </div>
        <div className="top-bar-right">
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            自动刷新 5s
          </span>
        </div>
      </div>

      <div style={{ padding: '24px 0' }}>
        <div className="section">
          <div className="section-head">
            <span className="section-title">系统状态</span>
          </div>
          <div className="data-list" style={{ display: 'table', width: '100%' }}>
            <table className="data-list">
              <thead>
                <tr>
                  <th>系统</th>
                  <th>状态</th>
                  <th>PID</th>
                  <th>版本</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hermes</td>
                  <td>
                    <span className={`status-dot ${s?.hermes?.running ? 'online' : 'offline'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                    {s?.hermes?.running ? '运行中' : '已停止'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s?.hermes?.pid || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s?.hermes?.version || '—'}</td>
                </tr>
                <tr>
                  <td>OpenClaw</td>
                  <td>
                    <span className={`status-dot ${s?.openclaw?.running ? 'online' : 'offline'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                    {s?.openclaw?.running ? '运行中' : '已停止'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s?.openclaw?.pid || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s?.openclaw?.version || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <span className="section-title">端口占用</span>
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
              {(s?.ports || []).map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.port}</td>
                  <td>
                    <span className={`status-dot ${p.in_use ? 'online' : 'idle'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                    {p.in_use ? '占用' : '空闲'}
                  </td>
                </tr>
              ))}
              {(!s?.ports || s.ports.length === 0) && (
                <tr><td colSpan={3} style={{ color: 'var(--text-tertiary)' }}>无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section">
          <div className="section-head">
            <span className="section-title">进程列表</span>
          </div>
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
              {(s?.processes || []).slice(0, 15).map((p, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.pid}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.cpu}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.mem}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cmd}</td>
                </tr>
              ))}
              {(!s?.processes || s.processes.length === 0) && (
                <tr><td colSpan={4} style={{ color: 'var(--text-tertiary)' }}>无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

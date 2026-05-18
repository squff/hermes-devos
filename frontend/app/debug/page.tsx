'use client';

import { useState, useEffect } from 'react';
import { analyzeError, getDebugReports, scanLogs } from '@/lib/api';

export default function DebugPage() {
  const [errorText, setErrorText] = useState('');
  const [logText, setLogText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'reports' | 'scan'>('analyze');

  useEffect(() => {
    getDebugReports().then(data => setReports(Array.isArray(data) ? data : data.reports || [])).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!errorText.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeError(errorText);
      setAnalysis(result);
    } catch (e: any) {
      setAnalysis({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!logText.trim()) return;
    setLoading(true);
    try {
      const result = await scanLogs(logText);
      setScanResult(result);
    } catch (e: any) {
      setScanResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>⟟ <span className="gradient-text">调试引擎</span></h1>
        <p>错误分析、日志扫描和智能调试辅助</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        {[
          { id: 'analyze' as const, label: '🔍 错误分析' },
          { id: 'reports' as const, label: '📋 报告' },
          { id: 'scan' as const, label: '📄 日志扫描' },
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

      {/* Error Analysis Tab */}
      {activeTab === 'analyze' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="section-title">分析错误</div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input"
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="粘贴错误文本或堆栈跟踪..."
                style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !errorText.trim()}>
                  {loading ? <><div className="spinner" /> Analyzing...</> : '🔍 Analyze Error'}
                </button>
              </div>
            </div>
          </div>

          {analysis && (
            <div className="card fade-in">
              <div className="section-title">分析结果</div>
              <pre className="code-block" style={{ marginTop: '12px' }}>
                {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              暂无调试报告。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report: any, i: number) => (
                <div key={i} className="card fade-in">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                    {report.title || `Report #${i + 1}`}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {report.summary || report.description || JSON.stringify(report)}
                  </p>
                  {report.severity && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '2px 8px',
                      background: report.severity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: report.severity === 'critical' ? 'var(--error)' : 'var(--warning)',
                    }}>{report.severity}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Scanner Tab */}
      {activeTab === 'scan' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="section-title">扫描日志</div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="粘贴日志输出以扫描问题..."
                style={{ minHeight: '160px', fontFamily: 'monospace', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleScan} disabled={loading || !logText.trim()}>
                  {loading ? <><div className="spinner" /> Scanning...</> : '📄 Scan Logs'}
                </button>
              </div>
            </div>
          </div>

          {scanResult && (
            <div className="card fade-in">
              <div className="section-title">扫描结果</div>
              <pre className="code-block" style={{ marginTop: '12px' }}>
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { getOpenClawConfig, setOpenClawValue } from '@/lib/api';

export default function OpenClawConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    getOpenClawConfig().then(setConfig).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (path: string, label: string) => {
    try {
      await setOpenClawValue(path, editValue);
      showToast('success', `已更新: ${label}`);
      setEditing(null);
      const fresh = await getOpenClawConfig();
      setConfig(fresh);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  if (loading) return <div className="page-header"><h1>加载中...</h1></div>;

  return (
    <div>
      <div className="page-header">
        <h1>◉ <span className="gradient-text">OpenClaw 配置中心</span></h1>
        <p>一键修改 OpenClaw 配置，修改后立即生效</p>
      </div>

      {config && (
        <>
          {/* 网关配置 */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">◈ 网关配置</div>
            <div style={{ marginTop: '12px' }}>
              {config.gateway && Object.entries(config.gateway).map(([key, value]: [string, any]) => (
                <ConfigRow
                  key={key}
                  label={key}
                  value={value}
                  isEditing={editing === `gateway.${key}`}
                  editValue={editValue}
                  onEdit={() => { setEditing(`gateway.${key}`); setEditValue(String(value)); }}
                  onCancel={() => setEditing(null)}
                  onChange={setEditValue}
                  onSave={() => handleSave(`gateway.${key}`, key)}
                />
              ))}
            </div>
          </div>

          {/* 模型配置 */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">◎ 模型配置</div>
            <div style={{ marginTop: '12px' }}>
              {config.model && Object.entries(config.model).map(([key, value]: [string, any]) => (
                <ConfigRow
                  key={key}
                  label={key}
                  value={value}
                  isEditing={editing === `model.${key}`}
                  editValue={editValue}
                  onEdit={() => { setEditing(`model.${key}`); setEditValue(Array.isArray(value) ? value.join(', ') : String(value)); }}
                  onCancel={() => setEditing(null)}
                  onChange={setEditValue}
                  onSave={() => {
                    const pathMap: Record<string, string> = {
                      '主模型': 'agents.defaults.model.primary',
                      '回退模型': 'agents.defaults.model.fallbacks',
                      '图像模型': 'agents.defaults.imageModel',
                    };
                    handleSave(pathMap[key] || `agents.defaults.model.${key}`, key);
                  }}
                />
              ))}
            </div>
          </div>

          {/* 压缩配置 */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">⊞ 压缩配置</div>
            <div style={{ marginTop: '12px' }}>
              {config.compaction && Object.entries(config.compaction).map(([key, value]: [string, any]) => (
                <ConfigRow
                  key={key}
                  label={key}
                  value={value}
                  isEditing={editing === `compaction.${key}`}
                  editValue={editValue}
                  onEdit={() => { setEditing(`compaction.${key}`); setEditValue(String(value)); }}
                  onCancel={() => setEditing(null)}
                  onChange={setEditValue}
                  onSave={() => handleSave(`agents.defaults.compaction.${key}`, key)}
                />
              ))}
            </div>
          </div>

          {/* 提供商 */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">◎ 提供商</div>
            <div style={{ marginTop: '12px' }}>
              {config.providers && Object.entries(config.providers).map(([name, info]: [string, any]) => (
                <div key={name} style={{
                  padding: '12px',
                  background: 'var(--bg-primary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {info.模型数} 个模型
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {info.baseUrl}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 插件 */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="section-title">⟐ 插件管理</div>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {config.plugins && Object.entries(config.plugins).map(([name, status]: [string, any]) => (
                <span key={name} style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: status === '已启用' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: status === '已启用' ? 'var(--success)' : 'var(--error)',
                  border: `1px solid ${status === '已启用' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}>
                  {name}: {status}
                </span>
              ))}
            </div>
          </div>

          {/* Agent 列表 */}
          <div className="card">
            <div className="section-title">◆ Agent 列表</div>
            <div style={{ marginTop: '12px' }}>
              {config.agents && config.agents.map((agent: any) => (
                <div key={agent.id} style={{
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 500 }}>{agent.name || agent.id}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {agent.id}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

function ConfigRow({ label, value, isEditing, editValue, onEdit, onCancel, onChange, onSave }: {
  label: string;
  value: any;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isEditing ? (
          <>
            <input
              className="input"
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: '250px', fontSize: '13px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
                if (e.key === 'Escape') onCancel();
              }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={onSave} style={{ padding: '4px 12px', fontSize: '12px' }}>保存</button>
            <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '4px 12px', fontSize: '12px' }}>取消</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
            <button className="btn btn-secondary" onClick={onEdit} style={{ padding: '2px 8px', fontSize: '11px' }}>编辑</button>
          </>
        )}
      </div>
    </div>
  );
}

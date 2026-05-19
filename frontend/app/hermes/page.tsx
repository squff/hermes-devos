'use client';

import { useState, useEffect } from 'react';
import { getHermesConfig, setHermesValue } from '@/lib/api';

export default function HermesConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    getHermesConfig().then(setConfig).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (section: string, key: string) => {
    const pathMap: Record<string, string> = {
      '模型-当前模型': 'model.default',
      '模型-提供商': 'model.provider',
      'Agent-最大轮次': 'agent.max_turns',
      'Agent-超时时间': 'agent.gateway_timeout',
      'Agent-自动重试': 'agent.auto_retry_on_timeout',
      'Agent-最大重试': 'agent.max_consecutive_retries',
      'Memory-记忆开关': 'memory.memory_enabled',
      'Memory-记忆上限': 'memory.memory_char_limit',
      'Memory-用户上限': 'memory.user_char_limit',
      'Memory-自动压缩': 'memory.auto_compact',
      'Memory-习惯学习': 'memory.habit_learning',
      'Compression-压缩开关': 'compression.enabled',
      'Compression-阈值': 'compression.threshold',
      'Compression-目标比例': 'compression.target_ratio',
      'Compression-保护最近': 'compression.protect_last_n',
      'Display-语言': 'display.language',
      'Display-显示费用': 'display.show_cost',
      'Display-流式输出': 'display.streaming',
      'Display-紧凑模式': 'display.compact',
      'Terminal-超时': 'terminal.timeout',
    };

    const path = pathMap[`${section}-${key}`];
    if (!path) {
      showToast('error', `未知配置项: ${section}-${key}`);
      return;
    }

    try {
      await setHermesValue(path, editValue);
      showToast('success', `已更新: ${key}`);
      setEditing(null);
      // 刷新配置
      const fresh = await getHermesConfig();
      setConfig(fresh);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  if (loading) return <div className="page-header"><h1>加载中...</h1></div>;

  const sectionIcons: Record<string, string> = {
    model: '◎',
    agent: '◆',
    memory: '◉',
    compression: '⊞',
    display: '◈',
    terminal: '⟟',
  };

  const sectionNames: Record<string, string> = {
    model: '模型配置',
    agent: 'Agent 配置',
    memory: '记忆配置',
    compression: '压缩配置',
    display: '显示配置',
    terminal: '终端配置',
  };

  return (
    <div>
      <div className="page-header">
        <h1>⟐ <span className="gradient-text">Hermes 配置中心</span></h1>
        <p>一键修改 Hermes 配置，修改后立即生效</p>
      </div>

      {config && Object.entries(config).map(([section, items]: [string, any]) => (
        <div key={section} className="card" style={{ marginBottom: '16px' }}>
          <div className="section-title">
            {sectionIcons[section] || '▸'} {sectionNames[section] || section}
          </div>
          <div style={{ marginTop: '12px' }}>
            {Object.entries(items).map(([key, value]: [string, any]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {key}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editing === `${section}-${key}` ? (
                    <>
                      <input
                        className="input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ width: '200px', fontSize: '13px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(section, key);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        autoFocus
                      />
                      <button className="btn btn-primary" onClick={() => handleSave(section, key)} style={{ padding: '4px 12px', fontSize: '12px' }}>
                        保存
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditing(null)} style={{ padding: '4px 12px', fontSize: '12px' }}>
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {typeof value === 'boolean' ? (value ? '✅ 启用' : '❌ 禁用') : String(value)}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditing(`${section}-${key}`);
                          setEditValue(String(value));
                        }}
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        编辑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

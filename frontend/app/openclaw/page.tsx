'use client';

import { useEffect, useState, useCallback } from 'react';

interface ConfigItem {
  key: string;
  value: string;
  path: string;
}

interface ConfigSection {
  name: string;
  items: ConfigItem[];
}

const MODELS = [
  'mimo-v2.5-pro',
  'gpt-4o',
  'claude-sonnet-4-20250514',
  'deepseek-v3',
  'qwen3-235b',
];

const PROVIDERS = [
  'xiaomi',
  'openai',
  'anthropic',
  'deepseek',
  'openrouter',
];

export default function OpenClawConfigPage() {
  const [sections, setSections] = useState<ConfigSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/api/config/openclaw');
      const data = await res.json();
      setSections(data.sections || []);
    } catch {
      showToast('error', '加载配置失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const startEdit = (item: ConfigItem) => {
    setEditKey(item.key);
    setEditValue(item.value);
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditValue('');
  };

  const saveEdit = async (path: string) => {
    if (!editKey) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8080/api/config/openclaw/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, value: editValue }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', `${editKey} 已更新`);
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.key === editKey ? { ...i, value: editValue } : i
          ),
        }))
      );
      cancelEdit();
    } catch {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const switchModel = async () => {
    if (!selectedModel) return;
    try {
      const res = await fetch('http://localhost:8080/api/config/switch-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      });
      if (!res.ok) throw new Error();
      showToast('success', `模型已切换到 ${selectedModel}`);
      fetchConfig();
    } catch {
      showToast('error', '切换模型失败');
    }
  };

  const switchProvider = async () => {
    if (!selectedProvider) return;
    try {
      const res = await fetch('http://localhost:8080/api/config/switch-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      if (!res.ok) throw new Error();
      showToast('success', `提供商已切换到 ${selectedProvider}`);
      fetchConfig();
    } catch {
      showToast('error', '切换提供商失败');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>OpenClaw 配置</h1>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <div className="section-head">
          <span className="section-title">快捷操作</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="input"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">切换模型...</option>
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-accent" onClick={switchModel} disabled={!selectedModel}>
              Apply
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="input"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">切换提供商...</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-accent" onClick={switchProvider} disabled={!selectedProvider}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Config Sections */}
      {loading ? (
        <div style={{ padding: '32px', color: '#71717a', textAlign: 'center' }}>加载中...</div>
      ) : (
        sections.map((section) => (
          <div className="section" key={section.name}>
            <div className="section-head">
              <span className="section-title">{section.name}</span>
            </div>
            <div className="config-group">
              {section.items.map((item) => (
                <div className="config-row fade-in" key={item.key}>
                  <span className="config-key">{item.key}</span>
                  {editKey === item.key ? (
                    <>
                      <input
                        className="input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item.path);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        style={{ flex: 1, maxWidth: 400 }}
                      />
                      <div className="config-actions">
                        <button
                          className="btn btn-sm btn-accent"
                          onClick={() => saveEdit(item.path)}
                          disabled={saving}
                        >
                          Save
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="config-value">{item.value || '—'}</span>
                      <div className="config-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => startEdit(item)}>
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

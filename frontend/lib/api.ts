const API_BASE = 'http://localhost:8080/api';

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API 错误: ${res.status}`);
  return res.json();
}

// ── 系统状态 ──
export const getHealth = () => fetchAPI('/health');
export const getStatus = () => fetchAPI('/status');

// ── Hermes 配置 ──
export const getHermesConfig = () => fetchAPI('/config/hermes');
export const getHermesConfigFull = () => fetchAPI('/config/hermes/full');
export const setHermesValue = (path: string, value: any) =>
  fetchAPI('/config/hermes/set', {
    method: 'POST',
    body: JSON.stringify({ path, value }),
  });

// ── OpenClaw 配置 ──
export const getOpenClawConfig = () => fetchAPI('/config/openclaw');
export const getOpenClawConfigFull = () => fetchAPI('/config/openclaw/full');
export const setOpenClawValue = (path: string, value: any) =>
  fetchAPI('/config/openclaw/set', {
    method: 'POST',
    body: JSON.stringify({ path, value }),
  });

// ── 快捷操作 ──
export const switchModel = (system: string, model: string) =>
  fetchAPI(`/config/switch-model?system=${system}&model=${encodeURIComponent(model)}`, { method: 'POST' });

export const switchProvider = (system: string, provider: string) =>
  fetchAPI(`/config/switch-provider?system=${system}&provider=${encodeURIComponent(provider)}`, { method: 'POST' });

export const toggleMemory = (system: string, enabled: boolean) =>
  fetchAPI(`/config/toggle-memory?system=${system}&enabled=${enabled}`, { method: 'POST' });

// ── 运行时 ──
export const getRuntimeStatus = () => fetchAPI('/runtime/status');
export const getProcesses = () => fetchAPI('/runtime/processes');
export const getPorts = () => fetchAPI('/runtime/ports');

// ── 日志 ──
export const getLogs = (system: string, lines = 100) =>
  fetchAPI(`/logs/${system}?lines=${lines}`);

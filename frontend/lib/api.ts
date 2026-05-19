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

// ── 对话（SSE 流式） ──
export async function* sendChat(
  message: string,
  mode: string = 'auto',
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, mode, stream: true }),
    signal,
  })

  if (!res.ok) throw new Error(`API 错误: ${res.status}`)

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法获取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // 跳过无法解析的行
      }
    }
  }
}

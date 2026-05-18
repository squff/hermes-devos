const API_BASE = 'http://localhost:8080/api';

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Health
export const getHealth = () => fetchAPI('/health');

// Providers
export const getProviders = () => fetchAPI('/providers');

// Tools
export const getTools = () => fetchAPI('/tools');

// Repo
export const scanRepo = (repoPath: string) =>
  fetchAPI(`/repo/scan?repo_path=${encodeURIComponent(repoPath)}`, { method: 'POST' });

// Memory
export const searchMemory = (query: string, topK = 5) =>
  fetchAPI(`/memory/search?query=${encodeURIComponent(query)}&top_k=${topK}`);

export const storeMemory = (content: string, category: string = 'general', importance: number = 0.5) =>
  fetchAPI('/memory/store', {
    method: 'POST',
    body: JSON.stringify({ content, category, importance }),
  });

export const getMemoryStats = () => fetchAPI('/memory/stats');

// Planner
export const createPlan = (title: string, description: string) =>
  fetchAPI(`/plan/create?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`, {
    method: 'POST',
  });

export const getPlans = () => fetchAPI('/plans');

export const decomposeTask = (taskId: string, strategy: string = 'sequential') =>
  fetchAPI(`/plan/decompose?task_id=${encodeURIComponent(taskId)}&strategy=${encodeURIComponent(strategy)}`, {
    method: 'POST',
  });

export const reflectPlan = (planId: string) =>
  fetchAPI(`/plan/reflect?plan_id=${encodeURIComponent(planId)}`, {
    method: 'POST',
  });

export const retryTask = (taskId: string, strategy: string = '') =>
  fetchAPI(`/plan/retry?task_id=${encodeURIComponent(taskId)}&strategy=${encodeURIComponent(strategy)}`, {
    method: 'POST',
  });

// Agent
export const createSession = (role: string) =>
  fetchAPI(`/agent/session?role=${encodeURIComponent(role)}`, { method: 'POST' });

export const getSessions = () => fetchAPI('/agent/sessions');

export const sendMessage = (sessionId: string, message: string) =>
  fetchAPI(`/agent/message?session_id=${encodeURIComponent(sessionId)}&content=${encodeURIComponent(message)}`, {
    method: 'POST',
  });

// Debug
export const analyzeError = (errorText: string) =>
  fetchAPI(`/debug/analyze?error_text=${encodeURIComponent(errorText)}`, { method: 'POST' });

export const getDebugReports = () => fetchAPI('/debug/reports');

export const scanLogs = (logPath: string) =>
  fetchAPI(`/debug/scan-log?log_path=${encodeURIComponent(logPath)}`, {
    method: 'POST',
  });

// Provider routing
export const routeTask = (taskType: string, contextSize: number, budget: string) =>
  fetchAPI(`/providers/route?task_type=${encodeURIComponent(taskType)}&context_size=${contextSize}&budget=${budget}`, {
    method: 'POST',
  });

// Context
export const chunkText = (text: string, chunkSize = 500, overlap = 50) =>
  fetchAPI(`/context/chunk?text=${encodeURIComponent(text)}&chunk_size=${chunkSize}&overlap=${overlap}`, {
    method: 'POST',
  });

export const compressContext = (text: string, ratio: number = 0.3) =>
  fetchAPI(`/context/compress?text=${encodeURIComponent(text)}&ratio=${ratio}`, {
    method: 'POST',
  });

export const buildIndex = (repoPath: string) =>
  fetchAPI(`/context/index?repo_path=${encodeURIComponent(repoPath)}`, {
    method: 'POST',
  });

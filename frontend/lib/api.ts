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

export const storeMemory = (content: string, namespace?: string) =>
  fetchAPI('/memory/store', {
    method: 'POST',
    body: JSON.stringify({ content, namespace }),
  });

export const getMemoryStats = () => fetchAPI('/memory/stats');

// Planner
export const createPlan = (title: string, description: string) =>
  fetchAPI(`/plan/create?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`, {
    method: 'POST',
  });

export const getPlans = () => fetchAPI('/plans');

export const decomposePlan = (planId: string) =>
  fetchAPI(`/plan/${planId}/decompose`, { method: 'POST' });

// Agent
export const createSession = (role: string) =>
  fetchAPI(`/agent/session?role=${encodeURIComponent(role)}`, { method: 'POST' });

export const getSessions = () => fetchAPI('/agent/sessions');

export const sendMessage = (sessionId: string, message: string) =>
  fetchAPI(`/agent/message`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message }),
  });

// Debug
export const analyzeError = (errorText: string) =>
  fetchAPI(`/debug/analyze?error_text=${encodeURIComponent(errorText)}`, { method: 'POST' });

export const getDebugReports = () => fetchAPI('/debug/reports');

export const scanLogs = (logText: string) =>
  fetchAPI('/debug/scan', {
    method: 'POST',
    body: JSON.stringify({ log_text: logText }),
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

export const compressContext = (text: string) =>
  fetchAPI('/context/compress', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

export const buildIndex = (texts: string[]) =>
  fetchAPI('/context/index', {
    method: 'POST',
    body: JSON.stringify({ texts }),
  });

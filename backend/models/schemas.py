from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class RepoAnalysis(BaseModel):
    repo_path: str
    summary: str = ""
    dependencies: Dict[str, Any] = {}
    architecture: str = ""
    modules: List[str] = []
    file_count: int = 0
    language_stats: Dict[str, int] = {}


class MemoryEntry(BaseModel):
    id: Optional[int] = None
    content: str
    category: str = "general"
    importance: float = 0.5
    metadata: Dict[str, Any] = {}


class MemorySearchResult(BaseModel):
    entries: List[MemoryEntry] = []
    query: str = ""
    total: int = 0


class TaskNode(BaseModel):
    id: str
    title: str
    description: str = ""
    status: str = "pending"
    priority: int = 0
    parent_id: Optional[str] = None
    children: List["TaskNode"] = []
    metadata: Dict[str, Any] = {}


class AgentMessage(BaseModel):
    role: str  # system, user, assistant
    content: str
    agent_type: str = "default"


class AgentSession(BaseModel):
    id: str
    agent_role: str
    status: str = "active"
    context: Dict[str, Any] = {}
    messages: List[AgentMessage] = []


class DebugReport(BaseModel):
    id: Optional[int] = None
    error_type: str = ""
    error_message: str = ""
    stack_trace: str = ""
    suggestions: List[str] = []
    fix_applied: Optional[str] = None


class ProviderConfig(BaseModel):
    provider: str  # xiaomi, deepseek, openai
    model: str
    api_key: Optional[str] = None
    base_url: str = ""
    capabilities: List[str] = []


class ProviderRouteResult(BaseModel):
    provider: str
    model: str
    reason: str = ""
    fallback_chain: List[str] = []


class ContextChunk(BaseModel):
    content: str
    source: str = ""
    start_line: int = 0
    end_line: int = 0
    relevance: float = 0.0


class WorkflowPhase(BaseModel):
    name: str
    description: str = ""
    status: str = "pending"  # pending, active, completed, failed
    tasks: List[str] = []


class WorkflowPlan(BaseModel):
    id: str
    title: str
    phases: List[WorkflowPhase] = []
    current_phase: int = 0
    status: str = "pending"  # pending, active, completed, failed


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    uptime: float = 0.0
    engines: Dict[str, str] = {}

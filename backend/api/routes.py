"""Hermes-DevOS - API Routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import os

from backend.engines.repo.engine import repo_engine
from backend.engines.memory.engine import memory_engine
from backend.engines.planner.engine import planner_engine
from backend.engines.agent.runtime import agent_runtime
from backend.engines.tool.runtime import tool_runtime
from backend.engines.debug.engine import debug_engine
from backend.engines.provider import router as provider_mod
from backend.engines.longcontext import engine as lc_mod
from backend.models.schemas import (
    RepoAnalysis, MemoryEntry, MemorySearchResult,
    TaskNode, AgentMessage, DebugReport,
    ProviderRouteResult, ContextChunk, WorkflowPlan, HealthResponse
)
import time
from backend.core.config import settings

router = APIRouter()

# ── Health ──
_start_time = time.time()

@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        uptime=int(time.time() - _start_time),
        engines={
            "repo": "ready",
            "memory": "ready",
            "planner": "ready",
            "agent": "ready",
            "tool": "ready",
            "debug": "ready",
            "provider": "ready",
            "longcontext": "ready"
        }
    )

# ── Repository Intelligence ──
@router.post("/repo/scan")
async def scan_repo(repo_path: str = Query(...)):
    if not os.path.isdir(repo_path):
        raise HTTPException(404, f"Path not found: {repo_path}")
    result = repo_engine.scan_repo(repo_path)
    return result

@router.post("/repo/dependencies")
async def repo_dependencies(repo_path: str = Query(...)):
    if not os.path.isdir(repo_path):
        raise HTTPException(404, f"Path not found: {repo_path}")
    return repo_engine.build_dependency_graph(repo_path)

@router.post("/repo/summary")
async def repo_summary(repo_path: str = Query(...)):
    if not os.path.isdir(repo_path):
        raise HTTPException(404, f"Path not found: {repo_path}")
    return repo_engine.generate_summary(repo_path)

@router.post("/repo/ast")
async def repo_ast(file_path: str = Query(...)):
    if not os.path.isfile(file_path):
        raise HTTPException(404, f"File not found: {file_path}")
    return repo_engine.get_file_ast(file_path)

@router.get("/repo/references")
async def repo_references(repo_path: str = Query(...), symbol: str = Query(...)):
    return repo_engine.find_references(repo_path, symbol)

# ── Persistent Memory ──
@router.post("/memory/store")
async def memory_store(entry: MemoryEntry):
    mid = memory_engine.store(entry.content, entry.category, entry.importance)
    return {"id": mid, "status": "stored"}

@router.get("/memory/search")
async def memory_search(query: str = Query(...), top_k: int = Query(5)):
    results = memory_engine.search(query, top_k)
    return {"query": query, "results": results, "total": len(results)}

@router.post("/memory/compress")
async def memory_compress(text: str = Query(...), ratio: float = Query(0.3)):
    return {"compressed": memory_engine.compress(text, ratio)}

@router.post("/memory/task-state/save")
async def save_task_state(task_id: str = Query(...), state: str = Query("{}")):
    memory_engine.save_task_state(task_id, state)
    return {"status": "saved", "task_id": task_id}

@router.get("/memory/task-state/recover")
async def recover_task_state(task_id: str = Query(...)):
    state = memory_engine.recover_task_state(task_id)
    if state is None:
        raise HTTPException(404, "No saved state found")
    return {"task_id": task_id, "state": state}

@router.get("/memory/stats")
async def memory_stats():
    return memory_engine.get_stats()

# ── Autonomous Planning ──
@router.post("/plan/create")
async def create_plan(title: str = Query(...), description: str = Query("")):
    plan = planner_engine.create_plan(title, description)
    return plan

@router.post("/plan/decompose")
async def decompose_task(task_id: str = Query(...), strategy: str = Query("sequential")):
    result = planner_engine.decompose(task_id, strategy)
    if result is None:
        raise HTTPException(404, "Task not found")
    return result

@router.post("/plan/reflect")
async def reflect_plan(plan_id: str = Query(...)):
    result = planner_engine.reflect(plan_id)
    if result is None:
        raise HTTPException(404, "Plan not found")
    return result

@router.post("/plan/retry")
async def retry_task(task_id: str = Query(...), strategy: str = Query("")):
    result = planner_engine.retry(task_id, strategy)
    if result is None:
        raise HTTPException(404, "Task not found")
    return result

@router.get("/plan/{plan_id}")
async def get_plan(plan_id: str):
    plan = planner_engine.get_plan(plan_id)
    if plan is None:
        raise HTTPException(404, "Plan not found")
    return plan

# ── Agent Runtime ──
@router.post("/agent/session")
async def create_agent_session(role: str = Query(...)):
    session = agent_runtime.create_session(role)
    return session

@router.post("/agent/message")
async def send_agent_message(session_id: str = Query(...), content: str = Query(...)):
    result = agent_runtime.send_message(session_id, content)
    if result is None:
        raise HTTPException(404, "Session not found")
    return result

@router.get("/agent/session/{session_id}")
async def get_agent_session(session_id: str):
    session = agent_runtime.get_session(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session

@router.get("/agent/sessions")
async def list_agent_sessions():
    return agent_runtime.list_sessions()

@router.post("/agent/coordinate")
async def coordinate_agents(task_id: str = Query(...), roles: str = Query("architect,coder,reviewer")):
    role_list = [r.strip() for r in roles.split(",")]
    return agent_runtime.coordinate(task_id, role_list)

# ── Tool Runtime ──
@router.get("/tools")
async def list_tools():
    return tool_runtime.list_tools()

@router.get("/tools/{name}")
async def get_tool(name: str):
    tool = tool_runtime.get_tool(name)
    if tool is None:
        raise HTTPException(404, "Tool not found")
    return tool

@router.get("/tools/suggest")
async def suggest_tools(task: str = Query(...)):
    return tool_runtime.suggest_tools(task)

@router.post("/tools/execute")
async def execute_tool(name: str = Query(...), params: str = Query("{}")):
    import json
    try:
        params_dict = json.loads(params)
    except json.JSONDecodeError:
        params_dict = {}
    result = tool_runtime.execute_tool(name, params_dict)
    return result

# ── Auto Debugging ──
@router.post("/debug/analyze")
async def analyze_error(error_text: str = Query(...)):
    return debug_engine.analyze_error(error_text)

@router.post("/debug/scan-log")
async def scan_log(log_path: str = Query(...)):
    if not os.path.isfile(log_path):
        raise HTTPException(404, f"Log file not found: {log_path}")
    return debug_engine.scan_log(log_path)

@router.post("/debug/report")
async def create_debug_report(error_type: str = Query(...), message: str = Query(...), stack_trace: str = Query("")):
    report = debug_engine.create_report(error_type, message, stack_trace)
    return report

@router.get("/debug/reports")
async def get_debug_reports(status: str = Query("all")):
    return debug_engine.get_reports(status)

# ── Provider Router ──
@router.get("/providers")
async def list_providers():
    return provider_mod.list_providers()

@router.post("/providers/route")
async def route_task(task_type: str = Query(...), context_size: int = Query(1000), budget: str = Query("low")):
    return provider_mod.route_task(task_type, context_size, budget)

@router.get("/providers/fallback")
async def get_fallback(provider: str = Query(...)):
    chain = provider_mod.get_fallback_chain(provider)
    return {"provider": provider, "fallback_chain": chain}

@router.get("/providers/stats")
async def provider_stats(provider: str = Query("")):
    return provider_mod.get_stats(provider if provider else None)

# ── Long Context ──
@router.post("/context/chunk")
async def chunk_text(text: str = Query(...), chunk_size: int = Query(500), overlap: int = Query(50)):
    chunks = lc_mod.chunk_text(text, chunk_size, overlap)
    return {"chunks": chunks, "total": len(chunks)}

@router.post("/context/chunk-file")
async def chunk_file(file_path: str = Query(...)):
    if not os.path.isfile(file_path):
        raise HTTPException(404, f"File not found: {file_path}")
    chunks = lc_mod.semantic_chunk_file(file_path)
    return {"file": file_path, "chunks": chunks, "total": len(chunks)}

@router.post("/context/compress")
async def compress_context(text: str = Query(...), ratio: float = Query(0.3)):
    return {"compressed": lc_mod.compress_context(text, ratio)}

@router.post("/context/index")
async def build_index(repo_path: str = Query(...)):
    if not os.path.isdir(repo_path):
        raise HTTPException(404, f"Path not found: {repo_path}")
    return lc_mod.build_index(repo_path)

@router.get("/context/search")
async def search_index(query: str = Query(...), top_k: int = Query(5)):
    return {"query": query, "results": lc_mod.search_index(query, top_k)}

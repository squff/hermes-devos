"""
Hermes-DevOS API Routes — 统一控制中心
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional
import time

from backend.core.config_manager import config_manager
from backend.core.runtime_manager import runtime_manager

router = APIRouter()

_start_time = time.time()


# ── 数据模型 ──

class ConfigUpdate(BaseModel):
    path: str
    value: Any


# ── 系统状态 ──

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "0.2.0",
        "uptime": int(time.time() - _start_time),
    }


@router.get("/status")
async def get_status():
    """获取双系统完整状态"""
    return {
        "hermes": runtime_manager._check_hermes(),
        "openclaw": runtime_manager._check_openclaw(),
        "ports": runtime_manager.get_port_usage(),
        "processes": runtime_manager.get_process_list(),
    }


# ── 配置管理 ──

@router.get("/config/hermes")
async def get_hermes_config():
    """获取 Hermes 配置摘要"""
    return config_manager.get_hermes_sections()


@router.get("/config/hermes/full")
async def get_hermes_config_full():
    """获取 Hermes 完整配置"""
    return config_manager.read_hermes()


@router.get("/config/hermes/value")
async def get_hermes_value(path: str = Query(...)):
    """按路径获取 Hermes 配置值"""
    value = config_manager.get_hermes_value(path)
    if value is None:
        raise HTTPException(404, f"路径不存在: {path}")
    return {"path": path, "value": value}


@router.post("/config/hermes/set")
async def set_hermes_value(update: ConfigUpdate):
    """设置 Hermes 配置值"""
    result = config_manager.set_hermes_value(update.path, update.value)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "设置失败"))
    return result


@router.get("/config/openclaw")
async def get_openclaw_config():
    """获取 OpenClaw 配置摘要"""
    return config_manager.get_openclaw_sections()


@router.get("/config/openclaw/full")
async def get_openclaw_config_full():
    """获取 OpenClaw 完整配置"""
    return config_manager.read_openclaw()


@router.get("/config/openclaw/value")
async def get_openclaw_value(path: str = Query(...)):
    """按路径获取 OpenClaw 配置值"""
    value = config_manager.get_openclaw_value(path)
    if value is None:
        raise HTTPException(404, f"路径不存在: {path}")
    return {"path": path, "value": value}


@router.post("/config/openclaw/set")
async def set_openclaw_value(update: ConfigUpdate):
    """设置 OpenClaw 配置值"""
    result = config_manager.set_openclaw_value(update.path, update.value)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "设置失败"))
    return result


# ── 快捷配置操作 ──

@router.post("/config/switch-model")
async def switch_model(
    system: str = Query(...),
    model: str = Query(...),
):
    """一键切换模型"""
    if system == "hermes":
        result = config_manager.set_hermes_value("model.default", model)
    elif system == "openclaw":
        result = config_manager.set_openclaw_value("agents.defaults.model.primary", model)
    else:
        raise HTTPException(400, f"未知系统: {system}")
    return result


@router.post("/config/switch-provider")
async def switch_provider(
    system: str = Query(...),
    provider: str = Query(...),
):
    """一键切换提供商"""
    if system == "hermes":
        result = config_manager.set_hermes_value("model.provider", provider)
    elif system == "openclaw":
        # OpenClaw 的提供商切换需要修改 primary model 的前缀
        current = config_manager.get_openclaw_value("agents.defaults.model.primary")
        if current and "/" in current:
            new_model = f"{provider}/{current.split('/', 1)[1]}"
            result = config_manager.set_openclaw_value("agents.defaults.model.primary", new_model)
        else:
            result = {"success": False, "error": "无法解析当前模型"}
    else:
        raise HTTPException(400, f"未知系统: {system}")
    return result


@router.post("/config/toggle-memory")
async def toggle_memory(
    system: str = Query(...),
    enabled: bool = Query(...),
):
    """一键开关记忆"""
    if system == "hermes":
        result = config_manager.set_hermes_value("memory.memory_enabled", str(enabled).lower())
    elif system == "openclaw":
        # OpenClaw 没有直接的 memory 开关，通过 plugins 控制
        result = config_manager.set_openclaw_value(
            "plugins.entries.memory-core.enabled", enabled
        )
    else:
        raise HTTPException(400, f"未知系统: {system}")
    return result


# ── 运行时管理 ──

@router.get("/runtime/status")
async def runtime_status():
    """获取运行时状态"""
    return runtime_manager.get_status()


@router.get("/runtime/processes")
async def runtime_processes():
    """获取进程列表"""
    return runtime_manager.get_process_list()


@router.get("/runtime/ports")
async def runtime_ports():
    """获取端口占用"""
    return runtime_manager.get_port_usage()


# ── 日志 ──

@router.get("/logs/{system}")
async def get_logs(system: str, lines: int = Query(100, ge=1, le=1000)):
    """获取系统日志"""
    if system not in ("hermes", "openclaw"):
        raise HTTPException(400, f"未知系统: {system}")
    return {"system": system, "lines": runtime_manager.get_logs(system, lines)}

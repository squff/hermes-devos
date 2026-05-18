"""Provider Router — selects the best LLM provider for a given task.

Routes tasks based on capability matching (code, creative, general),
tracks per-provider metrics in SQLite, and exposes failover chains for
resilient multi-provider calls.
"""

from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Provider catalogue
# ---------------------------------------------------------------------------

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "xiaomi": {
        "model": settings.XIAOMI_MODEL,
        "api_key": settings.XIAOMI_API_KEY,
        "capabilities": ["creative", "general"],
        "context_window": 128_000,
    },
    "deepseek": {
        "model": settings.DEEPSEEK_MODEL,
        "api_key": settings.DEEPSEEK_API_KEY,
        "capabilities": ["code", "analysis"],
        "context_window": 64_000,
    },
    "openai": {
        "model": settings.OPENAI_MODEL,
        "api_key": settings.OPENAI_API_KEY,
        "capabilities": ["general", "code"],
        "context_window": 128_000,
    },
}

# Capability → preferred provider
_CAPABILITY_PREF: Dict[str, str] = {
    "code": "deepseek",
    "analysis": "deepseek",
    "creative": "xiaomi",
    "general": "openai",
}

# Failover chains per provider
_FALLBACK_CHAINS: Dict[str, List[str]] = {
    "deepseek": ["xiaomi", "openai"],
    "xiaomi": ["openai", "deepseek"],
    "openai": ["deepseek", "xiaomi"],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def list_providers() -> List[Dict[str, Any]]:
    """Return every configured provider with its status and metadata.

    Returns:
        List of dicts with keys: name, model, capabilities, context_window,
        has_api_key.
    """
    result: List[Dict[str, Any]] = []
    for name, cfg in PROVIDERS.items():
        result.append({
            "name": name,
            "model": cfg["model"],
            "capabilities": cfg["capabilities"],
            "context_window": cfg["context_window"],
            "has_api_key": bool(cfg["api_key"]),
        })
    return result


def route_task(
    task_type: str = "general",
    context_size: int = 0,
    budget: Optional[float] = None,
) -> Dict[str, Any]:
    """Select the best provider for *task_type*.

    Selection logic:
    1. Pick the preferred provider for the capability.
    2. If it cannot handle the context window, walk the fallback chain.
    3. If a provider has no API key configured, skip it.

    Args:
        task_type: One of ``code``, ``analysis``, ``creative``, ``general``.
        context_size: Token count the caller expects to send.
        budget: Optional max spend hint (currently unused, reserved).

    Returns:
        Dict with keys: provider, model, context_window, fallback_chain.

    Raises:
        ValueError: If no suitable provider is found.
    """
    preferred = _CAPABILITY_PREF.get(task_type, "openai")
    chain = [preferred] + _FALLBACK_CHAINS.get(preferred, [])

    for provider_name in chain:
        cfg = PROVIDERS.get(provider_name)
        if cfg is None:
            continue
        if not cfg["api_key"]:
            log.debug("Skipping %s — no API key", provider_name)
            continue
        if context_size > cfg["context_window"]:
            log.debug(
                "Skipping %s — context %d exceeds window %d",
                provider_name, context_size, cfg["context_window"],
            )
            continue
        log.info(
            "Routed task_type=%s -> %s/%s",
            task_type, provider_name, cfg["model"],
        )
        return {
            "provider": provider_name,
            "model": cfg["model"],
            "context_window": cfg["context_window"],
            "fallback_chain": _FALLBACK_CHAINS.get(provider_name, []),
        }

    raise ValueError(f"No provider available for task_type={task_type!r} with context_size={context_size}")


def get_fallback_chain(provider: str) -> List[str]:
    """Return the ordered fallback chain for *provider*.

    Args:
        provider: Provider name (e.g. ``"deepseek"``).

    Returns:
        List of provider names to try on failure.

    Raises:
        ValueError: If the provider is unknown.
    """
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider!r}")
    return list(_FALLBACK_CHAINS.get(provider, []))


def record_call(
    provider: str,
    model: str,
    tokens: int,
    latency: float,
    success: bool,
    task_type: Optional[str] = None,
) -> int:
    """Persist a provider call metric to the database.

    Args:
        provider: Provider name.
        model: Model identifier used.
        tokens: Total tokens consumed.
        latency: Latency in milliseconds.
        success: Whether the call succeeded.
        task_type: Optional task type that was routed.

    Returns:
        Row id of the inserted record.
    """
    try:
        row_id = db.insert("provider_calls", {
            "provider": provider,
            "model": model,
            "tokens": tokens,
            "latency_ms": latency,
            "success": 1 if success else 0,
            "task_type": task_type,
        })
        log.debug(
            "Recorded call: %s/%s tokens=%d latency=%.1fms success=%s",
            provider, model, tokens, latency, success,
        )
        return row_id
    except Exception:
        log.exception("Failed to record provider call for %s", provider)
        return -1


def get_stats(provider: str) -> Dict[str, Any]:
    """Aggregate metrics for *provider* from the database.

    Returns:
        Dict with keys: provider, total_calls, success_count,
        failure_count, total_tokens, avg_latency_ms, success_rate.
    """
    try:
        row = db.fetch_one(
            """
            SELECT
                COUNT(*)              AS total_calls,
                SUM(success)          AS success_count,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failure_count,
                COALESCE(SUM(tokens), 0)  AS total_tokens,
                COALESCE(AVG(latency_ms), 0.0) AS avg_latency_ms
            FROM provider_calls
            WHERE provider = ?
            """,
            (provider,),
        )
        if row is None or row["total_calls"] == 0:
            return {
                "provider": provider,
                "total_calls": 0,
                "success_count": 0,
                "failure_count": 0,
                "total_tokens": 0,
                "avg_latency_ms": 0.0,
                "success_rate": 0.0,
            }
        total = row["total_calls"]
        success_count = row["success_count"] or 0
        return {
            "provider": provider,
            "total_calls": total,
            "success_count": success_count,
            "failure_count": row["failure_count"] or 0,
            "total_tokens": row["total_tokens"],
            "avg_latency_ms": round(row["avg_latency_ms"], 2),
            "success_rate": round(success_count / total, 4) if total else 0.0,
        }
    except Exception:
        log.exception("Failed to get stats for %s", provider)
        return {
            "provider": provider,
            "total_calls": 0,
            "success_count": 0,
            "failure_count": 0,
            "total_tokens": 0,
            "avg_latency_ms": 0.0,
            "success_rate": 0.0,
        }

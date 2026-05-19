"""
配置管理器 — 统一读写 Hermes (YAML) 和 OpenClaw (JSON) 配置
"""
import os
import json
import subprocess
import yaml
from pathlib import Path
from typing import Any, Optional


class ConfigManager:
    """统一配置管理器"""

    def __init__(self):
        self.hermes_config_path = Path.home() / ".hermes" / "config.yaml"
        self.openclaw_config_path = Path.home() / ".openclaw" / "openclaw.json"

    # ── Hermes 配置 ──

    def read_hermes(self) -> dict:
        """读取 Hermes 完整配置"""
        if not self.hermes_config_path.exists():
            return {"error": "Hermes 配置文件不存在"}
        with open(self.hermes_config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_hermes_value(self, path: str) -> Any:
        """按路径获取 Hermes 配置值，如 'model.default'"""
        config = self.read_hermes()
        return self._navigate(config, path)

    def set_hermes_value(self, path: str, value: Any) -> dict:
        """按路径设置 Hermes 配置值"""
        try:
            cmd = ["hermes", "config", "set", path, str(value)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return {"success": True, "message": f"Hermes 配置已更新: {path}"}
            return {"success": False, "error": result.stderr.strip() or result.stdout.strip()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_hermes_sections(self) -> dict:
        """获取 Hermes 配置的主要分区摘要"""
        config = self.read_hermes()
        return {
            "model": {
                "当前模型": config.get("model", {}).get("default", ""),
                "提供商": config.get("model", {}).get("provider", ""),
            },
            "agent": {
                "最大轮次": config.get("agent", {}).get("max_turns", 120),
                "超时时间": config.get("agent", {}).get("gateway_timeout", 900),
                "自动重试": config.get("agent", {}).get("auto_retry_on_timeout", True),
                "最大重试": config.get("agent", {}).get("max_consecutive_retries", 3),
            },
            "memory": {
                "记忆开关": config.get("memory", {}).get("memory_enabled", True),
                "记忆上限": config.get("memory", {}).get("memory_char_limit", 4000),
                "用户上限": config.get("memory", {}).get("user_char_limit", 2000),
                "自动压缩": config.get("memory", {}).get("auto_compact", True),
                "习惯学习": config.get("memory", {}).get("habit_learning", True),
            },
            "compression": {
                "压缩开关": config.get("compression", {}).get("enabled", True),
                "阈值": config.get("compression", {}).get("threshold", 0.7),
                "目标比例": config.get("compression", {}).get("target_ratio", 0.2),
                "保护最近": config.get("compression", {}).get("protect_last_n", 8),
            },
            "display": {
                "语言": config.get("display", {}).get("language", "en"),
                "显示费用": config.get("display", {}).get("show_cost", True),
                "流式输出": config.get("display", {}).get("streaming", True),
                "紧凑模式": config.get("display", {}).get("compact", True),
            },
            "terminal": {
                "后端": config.get("terminal", {}).get("backend", "local"),
                "超时": config.get("terminal", {}).get("timeout", 300),
            },
        }

    # ── OpenClaw 配置 ──

    def read_openclaw(self) -> dict:
        """读取 OpenClaw 完整配置"""
        if not self.openclaw_config_path.exists():
            return {"error": "OpenClaw 配置文件不存在"}
        with open(self.openclaw_config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_openclaw_value(self, path: str) -> Any:
        """按路径获取 OpenClaw 配置值"""
        config = self.read_openclaw()
        return self._navigate(config, path)

    def set_openclaw_value(self, path: str, value: Any) -> dict:
        """按路径设置 OpenClaw 配置值"""
        try:
            # 使用 openclaw config set 命令
            if isinstance(value, bool):
                val_str = "true" if value else "false"
            elif isinstance(value, (dict, list)):
                val_str = json.dumps(value)
            else:
                val_str = str(value)

            cmd = ["openclaw", "config", "set", path, val_str, "--strict-json"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return {"success": True, "message": f"OpenClaw 配置已更新: {path}"}
            return {"success": False, "error": result.stderr.strip() or result.stdout.strip()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_openclaw_sections(self) -> dict:
        """获取 OpenClaw 配置的主要分区摘要"""
        config = self.read_openclaw()
        agents = config.get("agents", {})
        defaults = agents.get("defaults", {})
        models = defaults.get("model", {})
        providers = config.get("models", {}).get("providers", {})
        plugins = config.get("plugins", {}).get("entries", {})
        tools = config.get("tools", {})

        return {
            "gateway": {
                "模式": config.get("gateway", {}).get("mode", ""),
                "端口": config.get("gateway", {}).get("port", 18789),
            },
            "model": {
                "主模型": models.get("primary", ""),
                "回退模型": models.get("fallbacks", []),
                "图像模型": defaults.get("imageModel", ""),
            },
            "compaction": {
                "模式": defaults.get("compaction", {}).get("mode", ""),
                "最大转录": defaults.get("compaction", {}).get("maxActiveTranscriptBytes", ""),
                "保留Token": defaults.get("compaction", {}).get("keepRecentTokens", 0),
            },
            "providers": {
                name: {
                    "baseUrl": p.get("baseUrl", ""),
                    "模型数": len(p.get("models", [])),
                }
                for name, p in providers.items()
            },
            "plugins": {
                name: "已启用" if p.get("enabled") else "已禁用"
                for name, p in plugins.items()
            },
            "agents": [
                {"id": a.get("id", ""), "name": a.get("name", a.get("id", ""))}
                for a in agents.get("list", [])
            ],
        }

    # ── 通用方法 ──

    def _navigate(self, config: dict, path: str) -> Any:
        """按点号路径导航配置"""
        keys = path.split(".")
        current = config
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current


# 全局实例
config_manager = ConfigManager()

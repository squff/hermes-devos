"""
运行时管理器 — 管理 Hermes 和 OpenClaw 进程状态
"""
import os
import subprocess
import time
from pathlib import Path
from typing import Optional


class RuntimeManager:
    """管理 Hermes 和 OpenClaw 运行时"""

    def __init__(self):
        self.hermes_log_dir = Path.home() / ".hermes" / "logs"
        self.openclaw_log_dir = Path.home() / ".openclaw" / "logs"

    def get_status(self) -> dict:
        """获取两个系统的运行状态"""
        return {
            "hermes": self._check_hermes(),
            "openclaw": self._check_openclaw(),
        }

    def _check_hermes(self) -> dict:
        """检查 Hermes 状态"""
        # 检查 gateway 进程
        gateway_running = self._is_process_running("hermes-gateway")
        # 检查主进程
        main_running = self._is_process_running("hermes")

        # 读取版本
        version = self._get_version("hermes")

        return {
            "gateway_running": gateway_running,
            "main_running": main_running,
            "version": version,
            "config_path": str(Path.home() / ".hermes" / "config.yaml"),
            "log_dir": str(self.hermes_log_dir) if self.hermes_log_dir.exists() else None,
        }

    def _check_openclaw(self) -> dict:
        """检查 OpenClaw 状态"""
        gateway_running = self._is_process_running("openclaw")

        version = self._get_version("openclaw")

        return {
            "gateway_running": gateway_running,
            "version": version,
            "config_path": str(Path.home() / ".openclaw" / "openclaw.json"),
            "log_dir": str(self.openclaw_log_dir) if self.openclaw_log_dir.exists() else None,
        }

    def _is_process_running(self, name: str) -> bool:
        """检查进程是否运行"""
        try:
            result = subprocess.run(
                ["pgrep", "-f", name],
                capture_output=True, text=True, timeout=5
            )
            return result.returncode == 0 and result.stdout.strip() != ""
        except:
            return False

    def _get_version(self, tool: str) -> str:
        """获取工具版本"""
        try:
            result = subprocess.run(
                [tool, "version"],
                capture_output=True, text=True, timeout=10
            )
            return result.stdout.strip()[:100]
        except:
            return "未知"

    def get_process_list(self) -> list:
        """获取所有相关进程"""
        processes = []
        try:
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.split("\n"):
                lower = line.lower()
                if "hermes" in lower or "openclaw" in lower:
                    parts = line.split(None, 10)
                    if len(parts) >= 11:
                        processes.append({
                            "user": parts[0],
                            "pid": parts[1],
                            "cpu": parts[2],
                            "mem": parts[3],
                            "command": parts[10][:120],
                        })
        except:
            pass
        return processes

    def get_logs(self, system: str, lines: int = 100) -> list:
        """获取系统日志"""
        if system == "hermes":
            return self._read_logs(self.hermes_log_dir, lines)
        elif system == "openclaw":
            return self._read_logs(self.openclaw_log_dir, lines)
        return []

    def _read_logs(self, log_dir: Path, lines: int) -> list:
        """读取日志目录中最新的日志文件"""
        if not log_dir.exists():
            return []

        # 找最新的日志文件
        log_files = sorted(log_dir.glob("*.log"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not log_files:
            # 尝试其他格式
            log_files = sorted(log_dir.glob("*.txt"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not log_files:
            return []

        try:
            with open(log_files[0], "r", encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()
                return [line.rstrip() for line in all_lines[-lines:]]
        except:
            return []

    def get_port_usage(self) -> dict:
        """获取端口占用情况"""
        ports = {
            "hermes_gateway": 18765,
            "openclaw_gateway": 18789,
            "devos_backend": 8080,
            "devos_frontend": 3080,
        }
        result = {}
        for name, port in ports.items():
            result[name] = {
                "port": port,
                "in_use": self._is_port_in_use(port),
            }
        return result

    def _is_port_in_use(self, port: int) -> bool:
        """检查端口是否被占用"""
        try:
            result = subprocess.run(
                ["ss", "-tlnp"],
                capture_output=True, text=True, timeout=5
            )
            return f":{port} " in result.stdout
        except:
            return False


# 全局实例
runtime_manager = RuntimeManager()

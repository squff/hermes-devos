"""Tool Runtime engine for cataloging, suggesting, and executing tools."""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Tool catalog with metadata and keywords for relevance scoring
TOOL_CATALOG: Dict[str, Dict[str, Any]] = {
    "shell_exec": {
        "name": "shell_exec",
        "description": "Execute a shell command and return stdout/stderr",
        "category": "system",
        "params": {"command": "string", "timeout": "integer (seconds, default 30)"},
        "keywords": ["shell", "command", "bash", "execute", "run", "terminal", "process", "cli"],
    },
    "file_read": {
        "name": "file_read",
        "description": "Read contents of a file",
        "category": "filesystem",
        "params": {"path": "string", "encoding": "string (default utf-8)"},
        "keywords": ["read", "file", "cat", "view", "open", "load", "contents"],
    },
    "file_write": {
        "name": "file_write",
        "description": "Write content to a file (creates or overwrites)",
        "category": "filesystem",
        "params": {"path": "string", "content": "string", "encoding": "string (default utf-8)"},
        "keywords": ["write", "file", "create", "save", "output", "dump"],
    },
    "file_edit": {
        "name": "file_edit",
        "description": "Edit a file by replacing a substring or via line-based patch",
        "category": "filesystem",
        "params": {"path": "string", "old_text": "string", "new_text": "string"},
        "keywords": ["edit", "modify", "change", "replace", "patch", "update", "file"],
    },
    "file_delete": {
        "name": "file_delete",
        "description": "Delete a file or empty directory",
        "category": "filesystem",
        "params": {"path": "string"},
        "keywords": ["delete", "remove", "rm", "unlink", "file"],
    },
    "dir_list": {
        "name": "dir_list",
        "description": "List directory contents with file sizes and types",
        "category": "filesystem",
        "params": {"path": "string", "recursive": "boolean (default false)"},
        "keywords": ["list", "directory", "ls", "dir", "browse", "tree", "files", "folder"],
    },
    "search_files": {
        "name": "search_files",
        "description": "Find files by name pattern (glob)",
        "category": "filesystem",
        "params": {"pattern": "string", "path": "string (default .)"},
        "keywords": ["find", "search", "glob", "locate", "files", "pattern"],
    },
    "search_content": {
        "name": "search_content",
        "description": "Search file contents using regex patterns (ripgrep-backed)",
        "category": "search",
        "params": {"pattern": "string", "path": "string (default .)", "glob": "string (optional)"},
        "keywords": ["grep", "search", "content", "regex", "find", "match", "text", "ripgrep"],
    },
    "git_status": {
        "name": "git_status",
        "description": "Show git working tree status",
        "category": "git",
        "params": {"path": "string (default .)"},
        "keywords": ["git", "status", "changes", "modified", "staged", "untracked"],
    },
    "git_diff": {
        "name": "git_diff",
        "description": "Show git diff of changes",
        "category": "git",
        "params": {"path": "string (default .)", "staged": "boolean (default false)"},
        "keywords": ["git", "diff", "changes", "compare", "patch"],
    },
    "git_log": {
        "name": "git_log",
        "description": "Show recent git commit log",
        "category": "git",
        "params": {"path": "string (default .)", "count": "integer (default 10)"},
        "keywords": ["git", "log", "history", "commits", "blame"],
    },
    "python_exec": {
        "name": "python_exec",
        "description": "Execute Python code in a subprocess",
        "category": "system",
        "params": {"code": "string", "timeout": "integer (seconds, default 30)"},
        "keywords": ["python", "execute", "run", "script", "code", "eval", "repl"],
    },
    "web_fetch": {
        "name": "web_fetch",
        "description": "Fetch content from a URL (GET request)",
        "category": "network",
        "params": {"url": "string", "timeout": "integer (seconds, default 15)"},
        "keywords": ["web", "fetch", "http", "url", "download", "request", "get", "api", "curl"],
    },
}


def _score_tool(tool: Dict[str, Any], task_lower: str) -> float:
    """Score a tool's relevance to a task description using keyword matching.

    Args:
        tool: Tool catalog entry.
        task_lower: Lowercase task description.

    Returns:
        Relevance score between 0.0 and 1.0.
    """
    score = 0.0
    keywords = tool.get("keywords", [])
    description = tool.get("description", "").lower()

    for kw in keywords:
        if kw in task_lower:
            score += 0.3

    # Bonus for words appearing in the description
    task_words = set(task_lower.split())
    desc_words = set(description.split())
    overlap = task_words & desc_words
    score += len(overlap) * 0.1

    return min(score, 1.0)


class ToolRuntime:
    """Manages the tool catalog, suggestion engine, and tool execution."""

    def list_tools(self) -> List[Dict[str, Any]]:
        """Return the catalog of all available tools.

        Returns:
            List of tool metadata dicts.
        """
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "category": t["category"],
                "params": t["params"],
            }
            for t in TOOL_CATALOG.values()
        ]

    def get_tool(self, name: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific tool.

        Args:
            name: Tool name.

        Returns:
            Tool metadata dict, or None if not found.
        """
        tool = TOOL_CATALOG.get(name)
        if not tool:
            return None
        return {
            "name": tool["name"],
            "description": tool["description"],
            "category": tool["category"],
            "params": tool["params"],
        }

    def suggest_tools(self, task_description: str) -> List[Dict[str, Any]]:
        """Suggest tools relevant to a task description, ranked by score.

        Args:
            task_description: Natural language description of the task.

        Returns:
            List of tool suggestions sorted by relevance (descending).
        """
        try:
            task_lower = task_description.lower()
            scored = []

            for tool in TOOL_CATALOG.values():
                s = _score_tool(tool, task_lower)
                if s > 0:
                    scored.append({
                        "name": tool["name"],
                        "description": tool["description"],
                        "category": tool["category"],
                        "relevance_score": round(s, 2),
                    })

            scored.sort(key=lambda x: x["relevance_score"], reverse=True)
            return scored
        except Exception as exc:
            logger.error("Failed to suggest tools: %s", exc)
            raise

    def execute_tool(self, name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name with the given parameters.

        Args:
            name: Tool name to execute.
            params: Parameters for the tool.

        Returns:
            Dict with 'success', 'output', and optional 'error' keys.
        """
        try:
            if name not in TOOL_CATALOG:
                return {"success": False, "output": None, "error": f"Unknown tool: {name}"}

            logger.info("Executing tool '%s' with params: %s", name, list(params.keys()))

            handler = getattr(self, f"_exec_{name}", None)
            if handler is None:
                return {"success": False, "output": None, "error": f"No handler for tool: {name}"}

            result = handler(params)
            logger.debug("Tool '%s' completed: success=%s", name, result.get("success"))
            return result
        except Exception as exc:
            logger.error("Tool '%s' execution failed: %s", name, exc)
            return {"success": False, "output": None, "error": str(exc)}

    # --- Individual tool handlers ---

    def _exec_shell_exec(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a shell command."""
        command = params.get("command", "")
        timeout = params.get("timeout", 30)
        if not command:
            return {"success": False, "output": None, "error": "No command provided"}

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=str(settings.BASE_DIR),
            )
            output = result.stdout
            if result.stderr:
                output += f"\n[stderr]\n{result.stderr}"
            return {
                "success": result.returncode == 0,
                "output": output,
                "error": None if result.returncode == 0 else f"Exit code: {result.returncode}",
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "output": None, "error": f"Command timed out after {timeout}s"}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_file_read(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read a file's contents."""
        path = params.get("path", "")
        encoding = params.get("encoding", "utf-8")
        if not path:
            return {"success": False, "output": None, "error": "No path provided"}

        try:
            content = Path(path).read_text(encoding=encoding)
            return {"success": True, "output": content, "error": None}
        except FileNotFoundError:
            return {"success": False, "output": None, "error": f"File not found: {path}"}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_file_write(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write content to a file."""
        path = params.get("path", "")
        content = params.get("content", "")
        encoding = params.get("encoding", "utf-8")
        if not path:
            return {"success": False, "output": None, "error": "No path provided"}

        try:
            p = Path(path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding=encoding)
            return {"success": True, "output": f"Wrote {len(content)} bytes to {path}", "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_file_edit(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Edit a file by replacing text."""
        path = params.get("path", "")
        old_text = params.get("old_text", "")
        new_text = params.get("new_text", "")
        if not path or not old_text:
            return {"success": False, "output": None, "error": "path and old_text are required"}

        try:
            content = Path(path).read_text(encoding="utf-8")
            if old_text not in content:
                return {"success": False, "output": None, "error": "old_text not found in file"}
            new_content = content.replace(old_text, new_text, 1)
            Path(path).write_text(new_content, encoding="utf-8")
            return {"success": True, "output": f"Edited {path}", "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_file_delete(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a file or empty directory."""
        path = params.get("path", "")
        if not path:
            return {"success": False, "output": None, "error": "No path provided"}

        try:
            p = Path(path)
            if p.is_dir():
                shutil.rmtree(str(p))
            else:
                p.unlink()
            return {"success": True, "output": f"Deleted {path}", "error": None}
        except FileNotFoundError:
            return {"success": False, "output": None, "error": f"Not found: {path}"}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_dir_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List directory contents."""
        path = params.get("path", ".")
        recursive = params.get("recursive", False)

        try:
            p = Path(path)
            if not p.exists():
                return {"success": False, "output": None, "error": f"Directory not found: {path}"}

            entries = []
            if recursive:
                for item in sorted(p.rglob("*")):
                    st = item.stat()
                    entries.append({
                        "path": str(item),
                        "type": "dir" if item.is_dir() else "file",
                        "size": st.st_size,
                    })
            else:
                for item in sorted(p.iterdir()):
                    st = item.stat()
                    entries.append({
                        "name": item.name,
                        "type": "dir" if item.is_dir() else "file",
                        "size": st.st_size,
                    })

            return {"success": True, "output": entries, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_search_files(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Find files matching a glob pattern."""
        pattern = params.get("pattern", "")
        path = params.get("path", ".")
        if not pattern:
            return {"success": False, "output": None, "error": "No pattern provided"}

        try:
            p = Path(path)
            matches = [str(m) for m in sorted(p.glob(pattern))]
            return {"success": True, "output": matches, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_search_content(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search file contents using regex (via ripgrep if available, else Python re)."""
        pattern = params.get("pattern", "")
        path = params.get("path", ".")
        file_glob = params.get("glob")
        if not pattern:
            return {"success": False, "output": None, "error": "No pattern provided"}

        try:
            cmd = ["rg", "--line-number", "--no-heading", pattern, path]
            if file_glob:
                cmd.extend(["--glob", file_glob])
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=15,
            )
            lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
            return {"success": True, "output": lines, "error": None}
        except FileNotFoundError:
            # Fallback to Python re search
            import re
            matches = []
            root = Path(path)
            for f in root.rglob(file_glob or "*"):
                if f.is_file():
                    try:
                        text = f.read_text(encoding="utf-8", errors="replace")
                        for i, line in enumerate(text.splitlines(), 1):
                            if re.search(pattern, line):
                                matches.append(f"{f}:{i}:{line.strip()}")
                    except Exception:
                        continue
            return {"success": True, "output": matches, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_git_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Show git working tree status."""
        path = params.get("path", ".")
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True, text=True, timeout=10, cwd=path,
            )
            return {"success": result.returncode == 0, "output": result.stdout, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_git_diff(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Show git diff."""
        path = params.get("path", ".")
        staged = params.get("staged", False)
        try:
            cmd = ["git", "diff"]
            if staged:
                cmd.append("--staged")
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=10, cwd=path,
            )
            return {"success": result.returncode == 0, "output": result.stdout, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_git_log(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Show git commit log."""
        path = params.get("path", ".")
        count = params.get("count", 10)
        try:
            result = subprocess.run(
                ["git", "log", f"--oneline", f"-{count}"],
                capture_output=True, text=True, timeout=10, cwd=path,
            )
            return {"success": result.returncode == 0, "output": result.stdout, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_python_exec(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Python code in a subprocess."""
        code = params.get("code", "")
        timeout = params.get("timeout", 30)
        if not code:
            return {"success": False, "output": None, "error": "No code provided"}

        try:
            result = subprocess.run(
                ["python3", "-c", code],
                capture_output=True, text=True, timeout=timeout,
                cwd=str(settings.BASE_DIR),
            )
            output = result.stdout
            if result.stderr:
                output += f"\n[stderr]\n{result.stderr}"
            return {
                "success": result.returncode == 0,
                "output": output,
                "error": None if result.returncode == 0 else f"Exit code: {result.returncode}",
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "output": None, "error": f"Execution timed out after {timeout}s"}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    def _exec_web_fetch(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch content from a URL."""
        url = params.get("url", "")
        timeout = params.get("timeout", 15)
        if not url:
            return {"success": False, "output": None, "error": "No URL provided"}

        try:
            import urllib.request
            req = urllib.request.Request(url, headers={"User-Agent": "Hermes-DevOS/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content = resp.read().decode("utf-8", errors="replace")
            return {"success": True, "output": content, "error": None}
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}


tool_runtime = ToolRuntime()

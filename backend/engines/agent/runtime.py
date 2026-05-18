"""Multi-Agent Runtime engine for orchestrating AI agent sessions."""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Role-based tool access configuration
ROLE_TOOLS: Dict[str, List[str]] = {
    "architect": ["file_read", "dir_list", "search_files", "search_content"],
    "coder": [
        "file_read", "file_write", "file_edit", "file_delete",
        "shell_exec", "python_exec", "dir_list", "search_files",
        "search_content", "git_status", "git_diff", "git_log",
    ],
    "reviewer": ["file_read", "dir_list", "search_files", "search_content", "git_diff", "git_log"],
    "debugger": [
        "file_read", "shell_exec", "python_exec", "search_files",
        "search_content", "git_status", "git_diff",
    ],
    "memory": ["file_read", "search_files", "search_content"],
}


class AgentRuntime:
    """Manages multi-agent sessions, messaging, and coordination."""

    def create_session(self, role: str, task_id: Optional[int] = None) -> Dict[str, Any]:
        """Create a new agent session for a given role.

        Args:
            role: Agent role (architect, coder, reviewer, debugger, memory).
            task_id: Optional task ID to associate with the session.

        Returns:
            Dict with session details including session_id.

        Raises:
            ValueError: If role is not a valid agent role.
        """
        try:
            if role not in ROLE_TOOLS:
                raise ValueError(
                    f"Invalid role '{role}'. Must be one of: {list(ROLE_TOOLS.keys())}"
                )

            session_id = str(uuid.uuid4())
            context = {
                "messages": [],
                "tools": ROLE_TOOLS[role],
                "coordination_group": None,
            }

            db.insert("agent_sessions", {
                "session_id": session_id,
                "role": role,
                "context_json": json.dumps(context),
                "status": "active",
                "task_id": task_id,
                "created_at": db.now(),
                "updated_at": db.now(),
            })

            logger.info("Created agent session %s with role '%s'", session_id, role)
            return {
                "session_id": session_id,
                "role": role,
                "tools": ROLE_TOOLS[role],
                "status": "active",
                "task_id": task_id,
            }
        except Exception as exc:
            logger.error("Failed to create session for role '%s': %s", role, exc)
            raise

    def send_message(self, session_id: str, content: str, sender: str = "user") -> Dict[str, Any]:
        """Add a message to an agent session.

        Args:
            session_id: The session to send the message to.
            content: Message content.
            sender: Who sent the message (user or agent).

        Returns:
            Dict with the message details.

        Raises:
            ValueError: If session not found or inactive.
        """
        try:
            row = db.fetch_one(
                "SELECT * FROM agent_sessions WHERE session_id = ?",
                (session_id,),
            )
            if not row:
                raise ValueError(f"Session '{session_id}' not found.")
            if row["status"] != "active":
                raise ValueError(f"Session '{session_id}' is not active (status={row['status']}).")

            context = json.loads(row["context_json"])
            message = {
                "id": len(context["messages"]) + 1,
                "sender": sender,
                "content": content,
                "timestamp": db.now(),
            }
            context["messages"].append(message)

            db.update(
                "agent_sessions",
                {"context_json": json.dumps(context), "updated_at": db.now()},
                "session_id = ?",
                (session_id,),
            )

            logger.debug("Message added to session %s (sender=%s)", session_id, sender)
            return message
        except Exception as exc:
            logger.error("Failed to send message to session '%s': %s", session_id, exc)
            raise

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session with all its messages.

        Args:
            session_id: The session to retrieve.

        Returns:
            Dict with session details and messages, or None if not found.
        """
        try:
            row = db.fetch_one(
                "SELECT * FROM agent_sessions WHERE session_id = ?",
                (session_id,),
            )
            if not row:
                return None

            context = json.loads(row["context_json"])
            return {
                "session_id": row["session_id"],
                "role": row["role"],
                "status": row["status"],
                "task_id": row["task_id"],
                "tools": context.get("tools", []),
                "messages": context.get("messages", []),
                "coordination_group": context.get("coordination_group"),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        except Exception as exc:
            logger.error("Failed to get session '%s': %s", session_id, exc)
            raise

    def coordinate(self, task_id: int, roles: List[str]) -> Dict[str, Any]:
        """Coordinate multiple agents on a task by creating linked sessions.

        Args:
            task_id: The task ID to coordinate on.
            roles: List of roles to create sessions for.

        Returns:
            Dict with coordination group details and created sessions.

        Raises:
            ValueError: If any role is invalid.
        """
        try:
            coord_id = str(uuid.uuid4())
            sessions = []

            for role in roles:
                if role not in ROLE_TOOLS:
                    raise ValueError(f"Invalid role '{role}'. Must be one of: {list(ROLE_TOOLS.keys())}")

                session = self.create_session(role, task_id=task_id)
                sid = session["session_id"]

                # Update context with coordination group
                row = db.fetch_one(
                    "SELECT context_json FROM agent_sessions WHERE session_id = ?",
                    (sid,),
                )
                context = json.loads(row["context_json"])
                context["coordination_group"] = coord_id
                db.update(
                    "agent_sessions",
                    {"context_json": json.dumps(context), "updated_at": db.now()},
                    "session_id = ?",
                    (sid,),
                )
                session["coordination_group"] = coord_id
                sessions.append(session)

            logger.info(
                "Coordination group %s created for task %d with %d agents",
                coord_id, task_id, len(sessions),
            )
            return {
                "coordination_id": coord_id,
                "task_id": task_id,
                "sessions": sessions,
            }
        except Exception as exc:
            logger.error("Failed to coordinate task %d: %s", task_id, exc)
            raise

    def list_sessions(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all active sessions, optionally filtered by status.

        Args:
            status: Optional status filter (active, closed, etc.).

        Returns:
            List of session summary dicts.
        """
        try:
            if status:
                rows = db.fetch_all(
                    "SELECT * FROM agent_sessions WHERE status = ? ORDER BY updated_at DESC",
                    (status,),
                )
            else:
                rows = db.fetch_all(
                    "SELECT * FROM agent_sessions ORDER BY updated_at DESC"
                )

            sessions = []
            for row in rows:
                context = json.loads(row["context_json"])
                sessions.append({
                    "session_id": row["session_id"],
                    "role": row["role"],
                    "status": row["status"],
                    "task_id": row["task_id"],
                    "message_count": len(context.get("messages", [])),
                    "coordination_group": context.get("coordination_group"),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                })

            return sessions
        except Exception as exc:
            logger.error("Failed to list sessions: %s", exc)
            raise


agent_runtime = AgentRuntime()

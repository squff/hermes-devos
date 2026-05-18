"""
Autonomous Planning Engine

Provides workflow planning, task decomposition, execution reflection,
and retry mechanisms for autonomous agent workflows.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger("planner_engine")

# Default phases for workflow plans
DEFAULT_PHASES = ["analyze", "plan", "execute", "verify"]

# Task statuses
STATUS_PENDING = "pending"
STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"


class PlannerEngine:
    """Autonomous Planning Engine for workflow orchestration."""

    def __init__(self):
        """Initialize the Planner Engine."""
        logger.info("PlannerEngine initialized")

    def create_plan(self, title: str, description: str = "") -> Dict[str, Any]:
        """
        Create a workflow plan with auto-generated phases.

        Args:
            title: Title of the plan.
            description: Description of what the plan aims to achieve.

        Returns:
            Dictionary with plan details including generated plan_id and initial tasks.
        """
        try:
            plan_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            conn = db.get_connection()

            # Create tasks for each phase
            tasks = []
            for i, phase in enumerate(DEFAULT_PHASES):
                task_id = str(uuid.uuid4())
                task = {
                    "id": task_id,
                    "plan_id": plan_id,
                    "phase": phase,
                    "title": f"{phase.capitalize()} phase: {title}",
                    "description": f"Phase {i+1}/{len(DEFAULT_PHASES)} - {phase}",
                    "status": STATUS_PENDING,
                    "strategy": "default",
                    "retry_count": 0,
                    "max_retries": 3,
                    "result": None,
                    "created_at": now,
                    "updated_at": now,
                }
                tasks.append(task)

                conn.execute(
                    """
                    INSERT INTO tasks (id, plan_id, phase, title, description, status, strategy,
                                      retry_count, max_retries, result, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        task_id, plan_id, phase, task["title"], task["description"],
                        STATUS_PENDING, "default", 0, 3, None, now, now,
                    ),
                )

            plan = {
                "id": plan_id,
                "title": title,
                "description": description,
                "phases": DEFAULT_PHASES,
                "tasks": tasks,
                "status": "active",
                "created_at": now,
                "updated_at": now,
            }

            # Store plan metadata in memories table
            conn.execute(
                """
                INSERT INTO memories (content, category, importance, created_at, access_count)
                VALUES (?, 'plan', 1.0, ?, 0)
                """,
                (json.dumps(plan, default=str), now),
            )

            conn.commit()
            logger.info(f"Created plan '{title}' with {len(tasks)} tasks, id={plan_id}")
            return plan

        except Exception as e:
            logger.error(f"Error creating plan '{title}': {e}")
            raise

    def decompose(self, task_id: str, strategy: str = "sequential") -> List[Dict[str, Any]]:
        """
        Break a task into subtasks based on the chosen strategy.

        Args:
            task_id: ID of the parent task to decompose.
            strategy: Decomposition strategy - 'sequential', 'parallel', or 'hierarchical'.

        Returns:
            List of created subtask dictionaries.
        """
        try:
            conn = db.get_connection()
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()

            if not row:
                raise ValueError(f"Task not found: {task_id}")

            task = dict(row)
            now = datetime.now(timezone.utc).isoformat()

            subtasks = []
            if strategy == "sequential":
                # Break into sequential steps
                steps = [
                    ("setup", "Set up prerequisites and validate inputs"),
                    ("process", "Execute the main processing logic"),
                    ("finalize", "Clean up and finalize results"),
                ]
                for step_name, step_desc in steps:
                    subtask = self._create_subtask(
                        parent_task=task,
                        title=f"{task['title']} - {step_name}",
                        description=step_desc,
                        strategy=strategy,
                        now=now,
                        conn=conn,
                    )
                    subtasks.append(subtask)

            elif strategy == "parallel":
                # Break into parallel work items
                steps = [
                    ("chunk_a", "Process first segment"),
                    ("chunk_b", "Process second segment"),
                    ("merge", "Merge results from parallel segments"),
                ]
                for step_name, step_desc in steps:
                    subtask = self._create_subtask(
                        parent_task=task,
                        title=f"{task['title']} - {step_name}",
                        description=step_desc,
                        strategy=strategy,
                        now=now,
                        conn=conn,
                    )
                    subtasks.append(subtask)

            elif strategy == "hierarchical":
                # Break into a tree structure
                steps = [
                    ("research", "Gather information and context"),
                    ("design", "Design the solution approach"),
                    ("implement", "Implement the solution"),
                    ("test", "Validate and test the results"),
                    ("document", "Document findings and outcomes"),
                ]
                for step_name, step_desc in steps:
                    subtask = self._create_subtask(
                        parent_task=task,
                        title=f"{task['title']} - {step_name}",
                        description=step_desc,
                        strategy=strategy,
                        now=now,
                        conn=conn,
                    )
                    subtasks.append(subtask)

            else:
                raise ValueError(f"Unknown decomposition strategy: {strategy}")

            # Update parent task status
            conn.execute(
                "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
                (STATUS_IN_PROGRESS, now, task_id),
            )
            conn.commit()

            logger.info(f"Decomposed task {task_id} into {len(subtasks)} subtasks with strategy '{strategy}'")
            return subtasks

        except Exception as e:
            logger.error(f"Error decomposing task {task_id}: {e}")
            raise

    def reflect(self, plan_id: str) -> Dict[str, Any]:
        """
        Analyze execution results for a plan and calculate success rate.

        Args:
            plan_id: ID of the plan to reflect on.

        Returns:
            Reflection report with success/failure rates, insights, and recommendations.
        """
        try:
            conn = db.get_connection()
            rows = conn.execute(
                "SELECT * FROM tasks WHERE plan_id = ?", (plan_id,)
            ).fetchall()

            if not rows:
                raise ValueError(f"No tasks found for plan: {plan_id}")

            tasks = [dict(row) for row in rows]
            total = len(tasks)

            status_counts = {}
            for task in tasks:
                status = task["status"]
                status_counts[status] = status_counts.get(status, 0) + 1

            completed = status_counts.get(STATUS_COMPLETED, 0)
            failed = status_counts.get(STATUS_FAILED, 0)
            in_progress = status_counts.get(STATUS_IN_PROGRESS, 0)
            pending = status_counts.get(STATUS_PENDING, 0)

            success_rate = completed / total if total > 0 else 0.0
            failure_rate = failed / total if total > 0 else 0.0

            # Collect errors and results from failed tasks
            failures = []
            for task in tasks:
                if task["status"] == STATUS_FAILED:
                    failures.append({
                        "task_id": task["id"],
                        "title": task["title"],
                        "phase": task["phase"],
                        "result": task.get("result"),
                        "retry_count": task.get("retry_count", 0),
                    })

            # Generate recommendations
            recommendations = []
            if failure_rate > 0.5:
                recommendations.append("High failure rate detected. Consider reviewing the overall approach.")
            if pending > 0:
                recommendations.append(f"{pending} tasks still pending. Ensure sequential dependencies are met.")
            if any(f["retry_count"] >= f.get("retry_count", 0) for f in failures):
                recommendations.append("Some tasks have exhausted retries. Consider alternative strategies.")

            reflection = {
                "plan_id": plan_id,
                "total_tasks": total,
                "status_counts": status_counts,
                "success_rate": round(success_rate, 3),
                "failure_rate": round(failure_rate, 3),
                "completed": completed,
                "failed": failed,
                "in_progress": in_progress,
                "pending": pending,
                "failures": failures,
                "recommendations": recommendations,
                "overall_status": "success" if success_rate >= 0.8 else "partial" if success_rate >= 0.5 else "failure",
            }

            logger.info(
                f"Reflection for plan {plan_id}: {success_rate:.1%} success rate, "
                f"{total} tasks total"
            )
            return reflection

        except Exception as e:
            logger.error(f"Error reflecting on plan {plan_id}: {e}")
            raise

    def retry(self, task_id: str, new_strategy: Optional[str] = None) -> Dict[str, Any]:
        """
        Retry a failed task, optionally with a new strategy.

        Args:
            task_id: ID of the failed task to retry.
            new_strategy: Optional new strategy to use for the retry.

        Returns:
            Updated task dictionary.
        """
        try:
            conn = db.get_connection()
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()

            if not row:
                raise ValueError(f"Task not found: {task_id}")

            task = dict(row)

            if task["status"] not in (STATUS_FAILED, STATUS_COMPLETED):
                raise ValueError(f"Can only retry failed or completed tasks, got status: {task['status']}")

            retry_count = task.get("retry_count", 0) + 1
            max_retries = task.get("max_retries", 3)

            if retry_count > max_retries:
                raise ValueError(f"Maximum retries ({max_retries}) exceeded for task {task_id}")

            now = datetime.now(timezone.utc).isoformat()
            strategy = new_strategy or task.get("strategy", "default")

            conn.execute(
                """
                UPDATE tasks SET status = ?, retry_count = ?, strategy = ?,
                                 result = NULL, updated_at = ?
                WHERE id = ?
                """,
                (STATUS_PENDING, retry_count, strategy, now, task_id),
            )
            conn.commit()

            updated_task = {
                "id": task_id,
                "plan_id": task["plan_id"],
                "phase": task["phase"],
                "title": task["title"],
                "description": task["description"],
                "status": STATUS_PENDING,
                "strategy": strategy,
                "retry_count": retry_count,
                "max_retries": max_retries,
                "result": None,
                "created_at": task["created_at"],
                "updated_at": now,
            }

            logger.info(f"Retrying task {task_id} (attempt {retry_count}/{max_retries}) with strategy '{strategy}'")
            return updated_task

        except Exception as e:
            logger.error(f"Error retrying task {task_id}: {e}")
            raise

    def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a plan with all its tasks.

        Args:
            plan_id: ID of the plan to retrieve.

        Returns:
            Plan dictionary with embedded tasks, or None if not found.
        """
        try:
            conn = db.get_connection()

            # Get plan from memories
            rows = conn.execute(
                "SELECT content FROM memories WHERE category = 'plan' ORDER BY created_at DESC"
            ).fetchall()

            plan = None
            for row in rows:
                try:
                    data = json.loads(row["content"])
                    if isinstance(data, dict) and data.get("id") == plan_id:
                        plan = data
                        break
                except (json.JSONDecodeError, TypeError):
                    continue

            # Get tasks
            task_rows = conn.execute(
                "SELECT * FROM tasks WHERE plan_id = ? ORDER BY created_at ASC",
                (plan_id,),
            ).fetchall()

            tasks = [dict(row) for row in task_rows]

            if plan:
                plan["tasks"] = tasks
                plan["updated_at"] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Retrieved plan {plan_id} with {len(tasks)} tasks")
                return plan

            # If plan metadata not in memories but tasks exist, reconstruct
            if tasks:
                phases = list(dict.fromkeys(t["phase"] for t in tasks))
                reconstructed = {
                    "id": plan_id,
                    "title": tasks[0].get("title", "").split(" phase:")[1].strip() if " phase:" in tasks[0].get("title", "") else "Unknown Plan",
                    "description": "",
                    "phases": phases,
                    "tasks": tasks,
                    "status": "active",
                    "created_at": tasks[0].get("created_at", ""),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "reconstructed": True,
                }
                logger.info(f"Reconstructed plan {plan_id} from {len(tasks)} tasks")
                return reconstructed

            logger.info(f"Plan not found: {plan_id}")
            return None

        except Exception as e:
            logger.error(f"Error getting plan {plan_id}: {e}")
            raise

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single task by ID.

        Args:
            task_id: ID of the task to retrieve.

        Returns:
            Task dictionary or None if not found.
        """
        try:
            conn = db.get_connection()
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if row:
                return dict(row)
            return None
        except Exception as e:
            logger.error(f"Error getting task {task_id}: {e}")
            raise

    def update_task_status(self, task_id: str, status: str, result: Optional[str] = None) -> Dict[str, Any]:
        """
        Update a task's status and optionally its result.

        Args:
            task_id: ID of the task to update.
            status: New status value.
            result: Optional result string.

        Returns:
            Updated task dictionary.
        """
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn = db.get_connection()
            conn.execute(
                "UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?",
                (status, result, now, task_id),
            )
            conn.commit()

            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if row:
                logger.info(f"Updated task {task_id} status to '{status}'")
                return dict(row)
            raise ValueError(f"Task not found after update: {task_id}")

        except Exception as e:
            logger.error(f"Error updating task {task_id}: {e}")
            raise

    def _create_subtask(
        self,
        parent_task: Dict[str, Any],
        title: str,
        description: str,
        strategy: str,
        now: str,
        conn: Any,
    ) -> Dict[str, Any]:
        """Create a subtask in the database."""
        subtask_id = str(uuid.uuid4())
        subtask = {
            "id": subtask_id,
            "plan_id": parent_task["plan_id"],
            "phase": parent_task["phase"],
            "title": title,
            "description": description,
            "status": STATUS_PENDING,
            "strategy": strategy,
            "retry_count": 0,
            "max_retries": 3,
            "result": None,
            "parent_task_id": parent_task["id"],
            "created_at": now,
            "updated_at": now,
        }

        conn.execute(
            """
            INSERT INTO tasks (id, plan_id, phase, title, description, status, strategy,
                              retry_count, max_retries, result, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                subtask_id, parent_task["plan_id"], parent_task["phase"],
                title, description, STATUS_PENDING, strategy,
                0, 3, None, now, now,
            ),
        )

        return subtask


# Singleton instance
planner_engine = PlannerEngine()

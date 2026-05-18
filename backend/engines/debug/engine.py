"""Auto-Debugging Engine for error analysis, pattern matching, and fix suggestions."""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Error patterns: (compiled_regex, error_type, language)
ERROR_PATTERNS = [
    # Python errors
    (re.compile(r"SyntaxError:\s*(.+)", re.MULTILINE), "SyntaxError", "python"),
    (re.compile(r"NameError:\s*name\s+'(.+?)'\s+is not defined", re.MULTILINE), "NameError", "python"),
    (re.compile(r"TypeError:\s*(.+)", re.MULTILINE), "TypeError", "python"),
    (re.compile(r"ValueError:\s*(.+)", re.MULTILINE), "ValueError", "python"),
    (re.compile(r"KeyError:\s*(.+)", re.MULTILINE), "KeyError", "python"),
    (re.compile(r"IndexError:\s*(.+)", re.MULTILINE), "IndexError", "python"),
    (re.compile(r"AttributeError:\s*(.+)", re.MULTILINE), "AttributeError", "python"),
    (re.compile(r"ImportError:\s*(.+)", re.MULTILINE), "ImportError", "python"),
    (re.compile(r"ModuleNotFoundError:\s*No module named\s+'(.+?)'", re.MULTILINE), "ModuleNotFoundError", "python"),
    (re.compile(r"FileNotFoundError:\s*(.+)", re.MULTILINE), "FileNotFoundError", "python"),
    (re.compile(r"PermissionError:\s*(.+)", re.MULTILINE), "PermissionError", "python"),
    (re.compile(r"ConnectionError:\s*(.+)", re.MULTILINE), "ConnectionError", "python"),
    (re.compile(r"TimeoutError:\s*(.+)", re.MULTILINE), "TimeoutError", "python"),
    (re.compile(r"RecursionError:\s*(.+)", re.MULTILINE), "RecursionError", "python"),
    (re.compile(r"RuntimeError:\s*(.+)", re.MULTILINE), "RuntimeError", "python"),
    (re.compile(r"OSError:\s*(.+)", re.MULTILINE), "OSError", "python"),
    (re.compile(r"UnicodeDecodeError:\s*(.+)", re.MULTILINE), "UnicodeDecodeError", "python"),
    (re.compile(r"AssertionError:\s*(.+)", re.MULTILINE), "AssertionError", "python"),
    (re.compile(r"StopIteration", re.MULTILINE), "StopIteration", "python"),
    (re.compile(r"GeneratorExit", re.MULTILINE), "GeneratorExit", "python"),
    (re.compile(r"KeyboardInterrupt", re.MULTILINE), "KeyboardInterrupt", "python"),
    (re.compile(r"SystemExit:\s*(.+)", re.MULTILINE), "SystemExit", "python"),
    (re.compile(r"UnboundLocalError:\s*(.+)", re.MULTILINE), "UnboundLocalError", "python"),
    (re.compile(r"NotImplementedError:\s*(.+)", re.MULTILINE), "NotImplementedError", "python"),
    (re.compile(r"OverflowError:\s*(.+)", re.MULTILINE), "OverflowError", "python"),
    (re.compile(r"ZeroDivisionError:\s*(.+)", re.MULTILINE), "ZeroDivisionError", "python"),
    (re.compile(r"MemoryError", re.MULTILINE), "MemoryError", "python"),
    (re.compile(r"IndentationError:\s*(.+)", re.MULTILINE), "IndentationError", "python"),
    (re.compile(r"TabError:\s*(.+)", re.MULTILINE), "TabError", "python"),
    (re.compile(r"DeprecationWarning:\s*(.+)", re.MULTILINE), "DeprecationWarning", "python"),

    # Node.js / JavaScript errors
    (re.compile(r"ReferenceError:\s*(.+?)\s+is not defined", re.MULTILINE), "ReferenceError", "javascript"),
    (re.compile(r"TypeError:\s*(.+)", re.MULTILINE), "TypeError", "javascript"),
    (re.compile(r"SyntaxError:\s*(.+)", re.MULTILINE), "SyntaxError", "javascript"),
    (re.compile(r"RangeError:\s*(.+)", re.MULTILINE), "RangeError", "javascript"),
    (re.compile(r"URIError:\s*(.+)", re.MULTILINE), "URIError", "javascript"),
    (re.compile(r"EvalError:\s*(.+)", re.MULTILINE), "EvalError", "javascript"),

    # TypeScript errors (TS error codes)
    (re.compile(r"TS2304:\s*Cannot find name\s+'(.+?)'", re.MULTILINE), "TS2304", "typescript"),
    (re.compile(r"TS2307:\s*Cannot find module\s+'(.+?)'", re.MULTILINE), "TS2307", "typescript"),
    (re.compile(r"TS2322:\s*(.+)", re.MULTILINE), "TS2322", "typescript"),
    (re.compile(r"TS2339:\s*Property\s+'(.+?)'\s+does not exist", re.MULTILINE), "TS2339", "typescript"),
    (re.compile(r"TS2345:\s*(.+)", re.MULTILINE), "TS2345", "typescript"),
    (re.compile(r"TS\d{4}:\s*(.+)", re.MULTILINE), "TypeScript", "typescript"),

    # Generic patterns
    (re.compile(r"Error:\s*(.+)", re.MULTILINE), "GenericError", "unknown"),
    (re.compile(r"Traceback \(most recent call last\):", re.MULTILINE), "PythonTraceback", "python"),
]

# Fix suggestions database: maps error types to actionable fix strategies
FIX_SUGGESTIONS: Dict[str, List[str]] = {
    "SyntaxError": [
        "Check for missing colons, parentheses, or brackets.",
        "Verify proper indentation (use 4 spaces for Python).",
        "Look for unterminated string literals.",
        "Check for invalid syntax near the reported line number.",
    ],
    "NameError": [
        "Verify the variable/function is defined before use.",
        "Check for typos in the variable or function name.",
        "Ensure the name is imported if from another module.",
        "Check scope — the variable may be local to another function.",
    ],
    "TypeError": [
        "Check the types of arguments passed to functions.",
        "Ensure you're not mixing incompatible types (str + int).",
        "Verify the function signature matches the call.",
        "Check if you need to cast/convert types explicitly.",
    ],
    "ValueError": [
        "Verify the value meets expected constraints.",
        "Check for empty strings or None passed where a value is expected.",
        "Validate input data before passing to functions.",
    ],
    "KeyError": [
        "Verify the key exists in the dictionary before accessing.",
        "Use dict.get() with a default value for safe access.",
        "Check for typos in the key string.",
    ],
    "IndexError": [
        "Check that the index is within the list/array bounds.",
        "Verify the list is not empty before accessing elements.",
        "Use len() to check the collection size first.",
    ],
    "AttributeError": [
        "Verify the object has the attribute/method you're accessing.",
        "Check if the object is None unexpectedly.",
        "Ensure the correct object type is being used.",
        "Check for typos in the attribute name.",
    ],
    "ImportError": [
        "Install the missing package: pip install <package>.",
        "Check the module name for typos.",
        "Verify the package is in your Python environment.",
        "Check for circular import issues.",
    ],
    "ModuleNotFoundError": [
        "Install the missing module: pip install <module>.",
        "Activate the correct virtual environment.",
        "Check if the module name matches the pip package name.",
        "Verify PYTHONPATH includes the module's location.",
    ],
    "FileNotFoundError": [
        "Verify the file path is correct and absolute/relative path is right.",
        "Check if the file exists at the specified location.",
        "Ensure the file hasn't been moved or deleted.",
        "Check file permissions and access rights.",
    ],
    "PermissionError": [
        "Check file/directory permissions (chmod/chown).",
        "Run the command with appropriate privileges.",
        "Ensure the file isn't locked by another process.",
    ],
    "ConnectionError": [
        "Check network connectivity.",
        "Verify the server/URL is reachable.",
        "Check firewall and proxy settings.",
        "Retry the connection after a short delay.",
    ],
    "TimeoutError": [
        "Increase the timeout value.",
        "Check network stability.",
        "Verify the server is responding.",
        "Consider implementing retry logic with backoff.",
    ],
    "RecursionError": [
        "Add a base case to stop the recursion.",
        "Increase sys.setrecursionlimit() if appropriate.",
        "Convert recursive logic to iterative using a stack.",
        "Check for infinite mutual recursion.",
    ],
    "RuntimeError": [
        "Check the runtime environment and dependencies.",
        "Review the error message for specific context.",
        "Verify all resources are properly initialized.",
    ],
    "OSError": [
        "Check file system permissions and available disk space.",
        "Verify the path exists and is accessible.",
        "Check for OS-level resource limits.",
    ],
    "UnicodeDecodeError": [
        "Specify the correct encoding when reading the file.",
        "Use errors='replace' or errors='ignore' for tolerant reading.",
        "Verify the file's actual encoding (try chardet).",
    ],
    "AssertionError": [
        "Review the assertion condition — it evaluated to False.",
        "Check expected vs actual values.",
        "Verify test data matches expected format.",
    ],
    "StopIteration": [
        "Check iterator bounds — it has been exhausted.",
        "Use a default with next(iter, default).",
    ],
    "GeneratorExit": [
        "Generator was garbage collected or .close() was called.",
        "Ensure generators are fully consumed or properly closed.",
    ],
    "KeyboardInterrupt": [
        "Process was interrupted by user (Ctrl+C).",
        "No action needed unless it happens during critical operations.",
    ],
    "SystemExit": [
        "sys.exit() was called. Check the exit code.",
        "Verify the program should terminate at this point.",
    ],
    "UnboundLocalError": [
        "Variable is referenced before assignment in local scope.",
        "Check if a global/nonlocal declaration is needed.",
        "Ensure all code paths assign the variable.",
    ],
    "NotImplementedError": [
        "The method is a stub — implement it.",
        "Check if you're using an abstract class directly.",
    ],
    "OverflowError": [
        "The calculation produced a number too large to represent.",
        "Use Python's arbitrary precision integers or decimal.Decimal.",
    ],
    "ZeroDivisionError": [
        "Check divisor before performing division.",
        "Add a guard: result = numerator / denominator if denominator else 0.",
    ],
    "MemoryError": [
        "Process data in chunks instead of loading everything at once.",
        "Increase available memory or use a machine with more RAM.",
        "Check for memory leaks (unbounded caches, circular references).",
    ],
    "IndentationError": [
        "Fix inconsistent indentation — use 4 spaces consistently.",
        "Don't mix tabs and spaces.",
        "Check that blocks are properly indented under their parent.",
    ],
    "TabError": [
        "Replace all tabs with spaces (configure editor to use spaces).",
        "Run: python -tt script.py to detect mixed tabs/spaces.",
    ],
    "ReferenceError": [
        "Verify the variable is declared before use.",
        "Check if using 'let'/'const' block scoping correctly.",
    ],
    "RangeError": [
        "Check array allocation size or recursion depth.",
        "Verify numeric values are within valid range.",
    ],
    "URIError": [
        "Check URL encoding/decoding parameters.",
        "Verify the URI format is valid.",
    ],
    "EvalError": [
        "Check eval() usage — consider safer alternatives.",
    ],
    "TS2304": [
        "Import the type or verify the name is correct.",
        "Install @types/<package> for the missing type definitions.",
    ],
    "TS2307": [
        "Install the module: npm install <module>.",
        "Check the import path for typos.",
        "Verify the module's type declarations exist.",
    ],
    "TS2322": [
        "Check the assigned value matches the expected type.",
        "Review type annotations and type compatibility.",
    ],
    "TS2339": [
        "Verify the property exists on the type.",
        "Check for typos or use optional chaining (?.).",
        "Extend the type interface if the property is valid.",
    ],
    "TS2345": [
        "Check argument types match the function signature.",
        "Verify the function parameter types.",
    ],
    "TypeScript": [
        "Check TypeScript type annotations and assignments.",
        "Review compiler error messages for specific guidance.",
        "Run tsc --noEmit to check for type errors.",
    ],
    "GenericError": [
        "Read the full error message for context.",
        "Check recent code changes for potential causes.",
        "Search for the error message online.",
    ],
    "PythonTraceback": [
        "Read the traceback from bottom to top to find the root cause.",
        "The last line shows the actual exception type and message.",
        "Check each frame in the traceback for the problematic code.",
    ],
    "DeprecationWarning": [
        "Update to the recommended replacement API.",
        "Pin the dependency version if the change is not yet ready.",
    ],
}


class DebugEngine:
    """Analyzes errors, scans logs, and manages debug reports."""

    def analyze_error(self, error_text: str) -> Dict[str, Any]:
        """Parse error text, match patterns, and suggest fixes.

        Args:
            error_text: Raw error text (traceback, log output, etc.).

        Returns:
            Dict with matched error type, language, message, and fix suggestions.
        """
        try:
            matches = []
            for pattern, error_type, language in ERROR_PATTERNS:
                m = pattern.search(error_text)
                if m:
                    match_detail = {
                        "error_type": error_type,
                        "language": language,
                        "matched_text": m.group(0),
                        "groups": list(m.groups()),
                        "position": m.start(),
                    }
                    matches.append(match_detail)

            # Pick the best match (last match is often the root cause)
            if not matches:
                return {
                    "matched": False,
                    "error_type": "Unknown",
                    "language": "unknown",
                    "message": error_text[:500],
                    "fix_suggestions": ["Unable to match error pattern. Review the error text manually."],
                }

            # Prefer more specific matches (with named groups) — use last match
            best = matches[-1]
            error_type = best["error_type"]
            fixes = FIX_SUGGESTIONS.get(error_type, FIX_SUGGESTIONS.get("GenericError", []))

            logger.info("Analyzed error: type=%s, language=%s", error_type, best["language"])
            return {
                "matched": True,
                "error_type": error_type,
                "language": best["language"],
                "message": best["matched_text"],
                "details": best["groups"],
                "all_matches": len(matches),
                "fix_suggestions": fixes,
            }
        except Exception as exc:
            logger.error("Failed to analyze error: %s", exc)
            raise

    def scan_log(self, log_path: str) -> Dict[str, Any]:
        """Scan a log file for error patterns.

        Args:
            log_path: Path to the log file.

        Returns:
            Dict with scan results including found errors and summary.
        """
        try:
            path = Path(log_path)
            if not path.exists():
                return {"success": False, "error": f"Log file not found: {log_path}", "errors": []}

            content = path.read_text(encoding="utf-8", errors="replace")
            found_errors = []

            for pattern, error_type, language in ERROR_PATTERNS:
                for m in pattern.finditer(content):
                    # Get surrounding context (line)
                    line_start = content.rfind("\n", 0, m.start()) + 1
                    line_end = content.find("\n", m.end())
                    if line_end == -1:
                        line_end = len(content)
                    line_text = content[line_start:line_end].strip()

                    found_errors.append({
                        "error_type": error_type,
                        "language": language,
                        "matched_text": m.group(0),
                        "line_text": line_text,
                        "position": m.start(),
                    })

            # Deduplicate by error type + matched text
            seen = set()
            unique_errors = []
            for err in found_errors:
                key = (err["error_type"], err["matched_text"])
                if key not in seen:
                    seen.add(key)
                    unique_errors.append(err)

            # Build summary
            type_counts: Dict[str, int] = {}
            for err in unique_errors:
                t = err["error_type"]
                type_counts[t] = type_counts.get(t, 0) + 1

            logger.info("Scanned log %s: found %d unique errors", log_path, len(unique_errors))
            return {
                "success": True,
                "log_path": log_path,
                "total_matches": len(found_errors),
                "unique_errors": len(unique_errors),
                "errors": unique_errors[:50],  # Cap output
                "summary": type_counts,
            }
        except Exception as exc:
            logger.error("Failed to scan log '%s': %s", log_path, exc)
            raise

    def create_report(
        self,
        error_type: str,
        message: str,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Store a debug report in the database.

        Args:
            error_type: The classified error type.
            message: Error message or description.
            stack_trace: Optional full stack trace.
            metadata: Optional additional metadata.

        Returns:
            Dict with the created report details.
        """
        try:
            fixes = FIX_SUGGESTIONS.get(error_type, FIX_SUGGESTIONS.get("GenericError", []))

            report_id = db.insert("debug_sessions", {
                "error_type": error_type,
                "message": message,
                "stack_trace": stack_trace,
                "fix_suggestion": json.dumps(fixes),
                "status": "open",
                "metadata_json": json.dumps(metadata or {}),
                "created_at": db.now(),
                "updated_at": db.now(),
            })

            logger.info("Created debug report #%d: %s", report_id, error_type)
            return {
                "id": report_id,
                "error_type": error_type,
                "message": message,
                "fix_suggestions": fixes,
                "status": "open",
            }
        except Exception as exc:
            logger.error("Failed to create debug report: %s", exc)
            raise

    def get_reports(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List debug reports, optionally filtered by status.

        Args:
            status: Optional filter (open, resolved, ignored).

        Returns:
            List of report dicts.
        """
        try:
            if status:
                rows = db.fetch_all(
                    "SELECT * FROM debug_sessions WHERE status = ? ORDER BY created_at DESC",
                    (status,),
                )
            else:
                rows = db.fetch_all(
                    "SELECT * FROM debug_sessions ORDER BY created_at DESC"
                )

            reports = []
            for row in rows:
                reports.append({
                    "id": row["id"],
                    "error_type": row["error_type"],
                    "message": row["message"],
                    "stack_trace": row["stack_trace"],
                    "fix_suggestions": json.loads(row["fix_suggestion"]) if row["fix_suggestion"] else [],
                    "status": row["status"],
                    "metadata": json.loads(row["metadata_json"]) if row["metadata_json"] else {},
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                })

            return reports
        except Exception as exc:
            logger.error("Failed to get debug reports: %s", exc)
            raise


debug_engine = DebugEngine()

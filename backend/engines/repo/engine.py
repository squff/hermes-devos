"""
Repository Intelligence Engine

Provides codebase scanning, dependency graph building, AST analysis,
symbol reference finding, and architecture summarization.
"""

import os
import ast
import re
import json
from collections import defaultdict
from typing import Dict, List, Optional, Any, Set

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger("repo_engine")


# Extension to language mapping
EXTENSION_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".r": "r",
    ".R": "r",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".vue": "vue",
    ".svelte": "svelte",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".xml": "xml",
    ".md": "markdown",
    ".txt": "text",
}

# Framework detection patterns
FRAMEWORK_PATTERNS = {
    "fastapi": [r"from\s+fastapi", r"import\s+fastapi"],
    "flask": [r"from\s+flask", r"import\s+flask"],
    "django": [r"from\s+django", r"import\s+django"],
    "express": [r"require\s*\(\s*['\"]express['\"]", r"from\s+['\"]express['\"]"],
    "react": [r"from\s+['\"]react['\"]", r"import\s+.*['\"]react['\"]"],
    "vue": [r"from\s+['\"]vue['\"]", r"import\s+.*['\"]vue['\"]"],
    "angular": [r"from\s+['\"]@angular"],
    "nextjs": [r"from\s+['\"]next[/'\"]", r"import\s+.*['\"]next[/'\"]"],
    "svelte": [r"from\s+['\"]svelte"],
    "spring": [r"import\s+org\.springframework"],
    "rails": [r"require.*['\"]rails['\"]"],
    "gin": [r"\"github\.com/gin-gonic/gin\""],
    "actix": [r"use\s+actix_web"],
    "numpy": [r"(from|import)\s+numpy"],
    "pandas": [r"(from|import)\s+pandas"],
    "torch": [r"(from|import)\s+torch"],
    "tensorflow": [r"(from|import)\s+tensorflow"],
    "sqlalchemy": [r"(from|import)\s+sqlalchemy"],
    "pydantic": [r"(from|import)\s+pydantic"],
    "pytest": [r"(from|import)\s+pytest"],
    "jest": [r"(from|import).*jest", r"describe\s*\(", r"it\s*\("],
    "mocha": [r"(from|import).*mocha"],
}

# Python import patterns
PYTHON_IMPORT_RE = re.compile(
    r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", re.MULTILINE
)

# JS/TS import patterns
JS_IMPORT_RE = re.compile(
    r"(?:import\s+.*?from\s+['\"]([^'\"]+)['\"]|require\s*\(\s*['\"]([^'\"]+)['\"]\s*\))",
    re.MULTILINE,
)

# Directories to skip during scanning
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    ".tox", ".mypy_cache", ".pytest_cache", "dist", "build", ".next",
    ".nuxt", "coverage", ".eggs", "*.egg-info",
}


class RepoEngine:
    """Repository Intelligence Engine for codebase analysis."""

    def __init__(self):
        """Initialize the Repo Engine."""
        self._cache: Dict[str, Any] = {}
        self._dep_graph: Dict[str, List[str]] = defaultdict(list)
        logger.info("RepoEngine initialized")

    def scan_repo(self, repo_path: str) -> Dict[str, Any]:
        """
        Scan all files in a repository, count languages, and detect frameworks.

        Args:
            repo_path: Path to the repository root.

        Returns:
            Dictionary with file counts, language breakdown, and detected frameworks.
        """
        if not os.path.isdir(repo_path):
            raise ValueError(f"Repository path does not exist: {repo_path}")

        try:
            result = {
                "path": os.path.abspath(repo_path),
                "total_files": 0,
                "total_lines": 0,
                "languages": defaultdict(int),
                "language_lines": defaultdict(int),
                "frameworks": set(),
                "files": [],
                "directories": set(),
            }

            for root, dirs, files in os.walk(repo_path):
                # Filter out skip directories
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                rel_root = os.path.relpath(root, repo_path)
                if rel_root != ".":
                    result["directories"].add(rel_root)

                for filename in files:
                    filepath = os.path.join(root, filename)
                    _, ext = os.path.splitext(filename)
                    language = EXTENSION_MAP.get(ext.lower(), "unknown")

                    rel_path = os.path.relpath(filepath, repo_path)
                    line_count = 0

                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            line_count = content.count("\n") + (1 if content and not content.endswith("\n") else 0)

                        # Detect frameworks from file content
                        for framework, patterns in FRAMEWORK_PATTERNS.items():
                            for pattern in patterns:
                                if re.search(pattern, content):
                                    result["frameworks"].add(framework)
                                    break
                    except (OSError, PermissionError):
                        pass

                    result["total_files"] += 1
                    result["total_lines"] += line_count
                    result["languages"][language] += 1
                    result["language_lines"][language] += line_count
                    result["files"].append({
                        "path": rel_path,
                        "language": language,
                        "lines": line_count,
                    })

            # Convert sets to lists for serialization
            result["frameworks"] = sorted(result["frameworks"])
            result["directories"] = sorted(result["directories"])
            result["languages"] = dict(result["languages"])
            result["language_lines"] = dict(result["language_lines"])

            # Cache the scan result
            self._cache[repo_path] = result
            logger.info(f"Scanned repo at {repo_path}: {result['total_files']} files, {len(result['languages'])} languages")
            return result

        except Exception as e:
            logger.error(f"Error scanning repo {repo_path}: {e}")
            raise

    def build_dependency_graph(self, repo_path: str) -> Dict[str, List[str]]:
        """
        Parse imports in Python/JS/TS files and build an adjacency list dependency graph.

        Args:
            repo_path: Path to the repository root.

        Returns:
            Adjacency list mapping file paths to lists of imported modules/files.
        """
        if not os.path.isdir(repo_path):
            raise ValueError(f"Repository path does not exist: {repo_path}")

        try:
            graph: Dict[str, List[str]] = defaultdict(list)

            for root, dirs, files in os.walk(repo_path):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                for filename in files:
                    filepath = os.path.join(root, filename)
                    rel_path = os.path.relpath(filepath, repo_path)
                    _, ext = os.path.splitext(filename)

                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                    except (OSError, PermissionError):
                        continue

                    imports: List[str] = []

                    if ext == ".py":
                        for match in PYTHON_IMPORT_RE.finditer(content):
                            module = match.group(1) or match.group(2)
                            if module:
                                imports.append(module)

                    elif ext in (".js", ".ts", ".tsx", ".jsx"):
                        for match in JS_IMPORT_RE.finditer(content):
                            module = match.group(1) or match.group(2)
                            if module and not module.startswith("."):
                                imports.append(module)

                    if imports:
                        graph[rel_path] = sorted(set(imports))

            self._dep_graph = graph
            logger.info(f"Built dependency graph for {repo_path}: {len(graph)} files with imports")
            return dict(graph)

        except Exception as e:
            logger.error(f"Error building dependency graph for {repo_path}: {e}")
            raise

    def generate_summary(self, repo_path: str) -> Dict[str, Any]:
        """
        Combine scan results and dependency graph into an architecture summary.

        Args:
            repo_path: Path to the repository root.

        Returns:
            Architecture summary with scan info, top dependencies, and structure.
        """
        try:
            # Scan if not cached
            if repo_path not in self._cache:
                self.scan_repo(repo_path)
            scan = self._cache[repo_path]

            # Build dependency graph
            dep_graph = self.build_dependency_graph(repo_path)

            # Find most imported modules
            import_counts: Dict[str, int] = defaultdict(int)
            for file_deps in dep_graph.values():
                for dep in file_deps:
                    import_counts[dep] += 1

            top_dependencies = sorted(
                import_counts.items(), key=lambda x: x[1], reverse=True
            )[:20]

            # Identify entry points (files not imported by others)
            imported_files: Set[str] = set()
            for deps in dep_graph.values():
                imported_files.update(deps)

            all_files_with_deps = set(dep_graph.keys())
            entry_points = [
                f for f in all_files_with_deps
                if not any(f in dep for dep in imported_files)
            ][:10]

            summary = {
                "repository": scan["path"],
                "total_files": scan["total_files"],
                "total_lines": scan["total_lines"],
                "languages": scan["languages"],
                "language_lines": scan["language_lines"],
                "frameworks": scan["frameworks"],
                "directories_count": len(scan["directories"]),
                "directories": scan["directories"][:50],
                "files_with_imports": len(dep_graph),
                "top_dependencies": [
                    {"module": mod, "count": cnt} for mod, cnt in top_dependencies
                ],
                "entry_points": entry_points[:10],
            }

            logger.info(f"Generated summary for {repo_path}")
            return summary

        except Exception as e:
            logger.error(f"Error generating summary for {repo_path}: {e}")
            raise

    def get_file_ast(self, file_path: str, language: str = "python") -> Dict[str, Any]:
        """
        Parse a Python file with the ast module and extract classes, functions, and imports.

        Args:
            file_path: Path to the source file.
            language: Language of the file (currently only 'python' is supported for AST).

        Returns:
            Dictionary with extracted classes, functions, imports, and other metadata.
        """
        if not os.path.isfile(file_path):
            raise ValueError(f"File does not exist: {file_path}")

        if language != "python":
            raise ValueError(f"AST parsing only supported for Python, got: {language}")

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                source = f.read()

            tree = ast.parse(source, filename=file_path)

            result = {
                "file": os.path.abspath(file_path),
                "language": language,
                "classes": [],
                "functions": [],
                "imports": [],
                "global_variables": [],
            }

            for node in ast.iter_child_nodes(tree):
                if isinstance(node, ast.ClassDef):
                    methods = []
                    for item in node.body:
                        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            methods.append({
                                "name": item.name,
                                "args": [arg.arg for arg in item.args.args],
                                "decorators": [
                                    ast.dump(d) for d in item.decorator_list
                                ],
                                "line": item.lineno,
                            })

                    result["classes"].append({
                        "name": node.name,
                        "bases": [ast.dump(b) for b in node.bases],
                        "methods": methods,
                        "decorators": [ast.dump(d) for d in node.decorator_list],
                        "line": node.lineno,
                    })

                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    result["functions"].append({
                        "name": node.name,
                        "args": [arg.arg for arg in node.args.args],
                        "decorators": [ast.dump(d) for d in node.decorator_list],
                        "line": node.lineno,
                        "is_async": isinstance(node, ast.AsyncFunctionDef),
                    })

                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        result["imports"].append({
                            "type": "import",
                            "module": alias.name,
                            "alias": alias.asname,
                            "line": node.lineno,
                        })

                elif isinstance(node, ast.ImportFrom):
                    result["imports"].append({
                        "type": "from_import",
                        "module": node.module or "",
                        "names": [alias.name for alias in node.names],
                        "line": node.lineno,
                    })

                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            result["global_variables"].append({
                                "name": target.id,
                                "line": node.lineno,
                            })

            logger.info(f"Parsed AST for {file_path}: {len(result['classes'])} classes, {len(result['functions'])} functions")
            return result

        except SyntaxError as e:
            logger.warning(f"Syntax error parsing {file_path}: {e}")
            return {
                "file": os.path.abspath(file_path),
                "language": language,
                "error": f"Syntax error: {e}",
                "classes": [],
                "functions": [],
                "imports": [],
                "global_variables": [],
            }
        except Exception as e:
            logger.error(f"Error parsing AST for {file_path}: {e}")
            raise

    def find_references(self, repo_path: str, symbol: str) -> List[Dict[str, Any]]:
        """
        Find all files that reference a given symbol (function, class, variable).

        Args:
            repo_path: Path to the repository root.
            symbol: The symbol name to search for.

        Returns:
            List of dictionaries with file path, line number, and matching line content.
        """
        if not os.path.isdir(repo_path):
            raise ValueError(f"Repository path does not exist: {repo_path}")

        try:
            references = []
            # Use word boundary matching for the symbol
            pattern = re.compile(r"\b" + re.escape(symbol) + r"\b")

            for root, dirs, files in os.walk(repo_path):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                for filename in files:
                    filepath = os.path.join(root, filename)
                    _, ext = os.path.splitext(filename)

                    # Skip binary files
                    if ext.lower() in (".pyc", ".pyo", ".so", ".dll", ".exe", ".bin", ".o", ".class", ".jar"):
                        continue

                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            for line_num, line in enumerate(f, 1):
                                if pattern.search(line):
                                    references.append({
                                        "file": os.path.relpath(filepath, repo_path),
                                        "line": line_num,
                                        "content": line.rstrip(),
                                    })
                    except (OSError, PermissionError):
                        continue

            logger.info(f"Found {len(references)} references to '{symbol}' in {repo_path}")
            return references

        except Exception as e:
            logger.error(f"Error finding references to '{symbol}' in {repo_path}: {e}")
            raise

    def get_cached_scan(self, repo_path: str) -> Optional[Dict[str, Any]]:
        """Return cached scan results if available."""
        return self._cache.get(repo_path)

    def clear_cache(self) -> None:
        """Clear all cached results."""
        self._cache.clear()
        self._dep_graph.clear()
        logger.info("RepoEngine cache cleared")


# Singleton instance
repo_engine = RepoEngine()

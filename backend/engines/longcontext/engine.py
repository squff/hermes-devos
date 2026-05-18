"""Long Context Engine — chunking, compression, and codebase indexing.

Provides sliding-window and language-aware chunking, TF-IDF-based
compression, and an in-memory codebase index with cosine-similarity
search for context retrieval.
"""

import ast
import math
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# In-memory codebase index
# ---------------------------------------------------------------------------

_index: Dict[str, Any] = {
    "files": [],       # [{path, language, chunks: [{text, start_line}]}]
    "vocabulary": {},  # token -> index in idf vector
    "idf": [],         # idf values aligned with vocabulary
    "vectors": [],     # tf-idf vector per chunk (file_idx, chunk_idx, vector)
}


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------


def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    overlap: Optional[int] = None,
) -> List[str]:
    """Split *text* into overlapping windows.

    Args:
        text: Full input text.
        chunk_size: Characters per chunk (default from settings).
        overlap: Overlap characters between consecutive chunks (default from settings).

    Returns:
        List of text chunks.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    overlap = overlap or settings.CHUNK_OVERLAP

    if not text:
        return []
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap >= chunk_size:
        raise ValueError("overlap must be less than chunk_size")

    chunks: List[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        if end == text_len:
            break
        start = end - overlap

    return chunks


# ---------------------------------------------------------------------------
# Language-aware chunking
# ---------------------------------------------------------------------------

_PYTHON_IMPORT_RE = re.compile(r"^(?:import |from .+ import )", re.MULTILINE)
_JS_FUNC_RE = re.compile(
    r"(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|[\w]+\s*=>))",
    re.MULTILINE,
)
_MD_HEADING_RE = re.compile(r"^#{1,6}\s+.+", re.MULTILINE)


def _chunk_python(text: str) -> List[Dict[str, Any]]:
    """Chunk Python source at class/function boundaries using ``ast``."""
    chunks: List[Dict[str, Any]] = []
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return [{"text": text, "start_line": 1}]

    lines = text.splitlines(keepends=True)
    boundaries: List[int] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            boundaries.append(node.lineno - 1)  # 0-indexed

    if not boundaries:
        return [{"text": text, "start_line": 1}]

    boundaries = sorted(set(boundaries))
    boundaries.append(len(lines))

    # Include any leading lines (imports, module docstring) before first def
    if boundaries[0] > 0:
        lead = "".join(lines[: boundaries[0]]).strip()
        if lead:
            chunks.append({"text": lead, "start_line": 1})

    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        segment = "".join(lines[start:end]).strip()
        if segment:
            chunks.append({"text": segment, "start_line": start + 1})

    return chunks


def _chunk_js_ts(text: str) -> List[Dict[str, Any]]:
    """Chunk JS/TS source at function boundaries via regex."""
    chunks: List[Dict[str, Any]] = []
    lines = text.splitlines(keepends=True)

    boundaries: List[int] = []
    for i, line in enumerate(lines):
        if _JS_FUNC_RE.search(line):
            boundaries.append(i)

    if not boundaries:
        return [{"text": text, "start_line": 1}]

    boundaries.append(len(lines))

    if boundaries[0] > 0:
        lead = "".join(lines[: boundaries[0]]).strip()
        if lead:
            chunks.append({"text": lead, "start_line": 1})

    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        segment = "".join(lines[start:end]).strip()
        if segment:
            chunks.append({"text": segment, "start_line": start + 1})

    return chunks


def _chunk_markdown(text: str) -> List[Dict[str, Any]]:
    """Chunk Markdown at heading boundaries."""
    chunks: List[Dict[str, Any]] = []
    lines = text.splitlines(keepends=True)

    boundaries: List[int] = []
    for i, line in enumerate(lines):
        if _MD_HEADING_RE.match(line):
            boundaries.append(i)

    if not boundaries:
        return [{"text": text, "start_line": 1}]

    boundaries.append(len(lines))

    if boundaries[0] > 0:
        lead = "".join(lines[: boundaries[0]]).strip()
        if lead:
            chunks.append({"text": lead, "start_line": 1})

    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        segment = "".join(lines[start:end]).strip()
        if segment:
            chunks.append({"text": segment, "start_line": start + 1})

    return chunks


_EXT_MAP = {
    ".py": _chunk_python,
    ".js": _chunk_js_ts,
    ".ts": _chunk_js_ts,
    ".tsx": _chunk_js_ts,
    ".jsx": _chunk_js_ts,
    ".md": _chunk_markdown,
    ".markdown": _chunk_markdown,
}


def semantic_chunk_file(file_path: str) -> List[Dict[str, Any]]:
    """Chunk a source file using language-aware heuristics.

    Supported languages: Python (ast), JS/TS (regex), Markdown (headings).
    Falls back to plain sliding-window for unknown file types.

    Args:
        file_path: Absolute or relative path to the file.

    Returns:
        List of dicts with keys ``text`` and ``start_line``.
    """
    try:
        path = Path(file_path)
        text = path.read_text(encoding="utf-8", errors="replace")
        ext = path.suffix.lower()
        chunker = _EXT_MAP.get(ext)

        if chunker:
            return chunker(text)

        # Fallback: simple sliding window
        raw_chunks = chunk_text(text)
        result: List[Dict[str, Any]] = []
        offset = 0
        for c in raw_chunks:
            line_no = text[:offset].count("\n") + 1
            result.append({"text": c, "start_line": line_no})
            offset += len(c) - settings.CHUNK_OVERLAP
        return result

    except FileNotFoundError:
        log.error("File not found: %s", file_path)
        return []
    except Exception:
        log.exception("Failed to chunk file: %s", file_path)
        return []


# ---------------------------------------------------------------------------
# TF-IDF helpers
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[A-Za-z_]\w*")


def _tokenize(text: str) -> List[str]:
    """Lowercase alphanumeric tokenization."""
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def _tf(tokens: List[str]) -> Dict[str, float]:
    """Term frequency (normalised by document length)."""
    counts = Counter(tokens)
    length = len(tokens) or 1
    return {t: c / length for t, c in counts.items()}


def _cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Cosine similarity between two sparse vectors (dicts)."""
    common = set(a) & set(b)
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ---------------------------------------------------------------------------
# Compression
# ---------------------------------------------------------------------------


def compress_context(text: str, target_ratio: float = 0.3) -> str:
    """Extract the most informative sentences from *text*.

    Uses TF-IDF sentence scoring to keep roughly ``target_ratio`` of the
    original text while preserving the most important content.

    Args:
        text: Input text to compress.
        target_ratio: Fraction of sentences to keep (0.0–1.0).

    Returns:
        Compressed text containing the top-ranked sentences in original order.
    """
    try:
        if not text:
            return ""

        # Split into sentences
        sentences = re.split(r"(?<=[.!?])\s+", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return text

        n_keep = max(1, int(len(sentences) * target_ratio))

        # Build document-level TF
        doc_tokens = _tokenize(text)
        doc_tf = _tf(doc_tokens)

        # Score each sentence by sum of TF-IDF (IDF approximated as log(N/df))
        sentence_scores: List[Tuple[int, float]] = []
        for idx, sent in enumerate(sentences):
            sent_tokens = _tokenize(sent)
            if not sent_tokens:
                sentence_scores.append((idx, 0.0))
                continue
            score = sum(doc_tf.get(t, 0.0) for t in sent_tokens)
            sentence_scores.append((idx, score))

        # Pick top-n
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        keep_indices = sorted(idx for idx, _ in sentence_scores[:n_keep])
        return " ".join(sentences[i] for i in keep_indices)

    except Exception:
        log.exception("compress_context failed")
        return text


# ---------------------------------------------------------------------------
# Codebase index
# ---------------------------------------------------------------------------


def _detect_language(path: Path) -> Optional[str]:
    """Map file extension to a language label or ``None``."""
    ext = path.suffix.lower()
    mapping = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".tsx": "typescript", ".jsx": "javascript",
        ".md": "markdown", ".markdown": "markdown",
        ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    }
    return mapping.get(ext)


def build_index(repo_path: str) -> Dict[str, Any]:
    """Walk *repo_path*, chunk every source file, and build an in-memory
    TF-IDF index for later search.

    Args:
        repo_path: Root directory of the codebase.

    Returns:
        Summary dict with ``total_files``, ``total_chunks``, ``vocabulary_size``.
    """
    try:
        root = Path(repo_path)
        if not root.is_dir():
            raise ValueError(f"Not a directory: {repo_path}")

        _index["files"].clear()
        _index["vocabulary"].clear()
        _index["idf"].clear()
        _index["vectors"].clear()

        SKIP_DIRS = {
            ".git", "__pycache__", "node_modules", ".venv", "venv",
            ".mypy_cache", ".pytest_cache", "dist", "build",
        }
        code_exts = {".py", ".js", ".ts", ".tsx", ".jsx", ".md", ".markdown", ".json", ".yaml", ".yml"}

        all_tokens_per_chunk: List[List[str]] = []
        chunk_refs: List[Tuple[int, int]] = []  # (file_idx, chunk_idx)

        file_idx = 0
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fname in sorted(filenames):
                fpath = Path(dirpath) / fname
                if fpath.suffix.lower() not in code_exts:
                    continue
                lang = _detect_language(fpath)
                if lang is None:
                    continue

                try:
                    chunks = semantic_chunk_file(str(fpath))
                except Exception:
                    log.debug("Skipping unreadable file: %s", fpath)
                    continue

                if not chunks:
                    continue

                entry = {
                    "path": str(fpath.relative_to(root)),
                    "language": lang,
                    "chunks": chunks,
                }
                _index["files"].append(entry)

                for ci, chunk in enumerate(chunks):
                    tokens = _tokenize(chunk["text"])
                    all_tokens_per_chunk.append(tokens)
                    chunk_refs.append((file_idx, ci))

                file_idx += 1

        # Build vocabulary
        vocab: Dict[str, int] = {}
        for tokens in all_tokens_per_chunk:
            for t in set(tokens):
                if t not in vocab:
                    vocab[t] = len(vocab)
        _index["vocabulary"] = vocab

        # IDF
        n_chunks = len(all_tokens_per_chunk) or 1
        df = Counter()
        for tokens in all_tokens_per_chunk:
            for t in set(tokens):
                df[t] += 1
        idf = [0.0] * len(vocab)
        for token, idx in vocab.items():
            idf[idx] = math.log(n_chunks / (1 + df[token]))
        _index["idf"] = idf

        # TF-IDF vectors (sparse dict form)
        for tokens, (fi, ci) in zip(all_tokens_per_chunk, chunk_refs):
            tf = _tf(tokens)
            vec: Dict[str, float] = {}
            for t, tf_val in tf.items():
                if t in vocab:
                    vec[t] = tf_val * idf[vocab[t]]
            _index["vectors"].append({"file_idx": fi, "chunk_idx": ci, "vector": vec})

        summary = {
            "total_files": len(_index["files"]),
            "total_chunks": len(_index["vectors"]),
            "vocabulary_size": len(vocab),
        }
        log.info(
            "Built index: %d files, %d chunks, %d tokens",
            summary["total_files"], summary["total_chunks"], summary["vocabulary_size"],
        )
        return summary

    except Exception:
        log.exception("build_index failed")
        return {"total_files": 0, "total_chunks": 0, "vocabulary_size": 0}


def search_index(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Search the codebase index using cosine similarity.

    Args:
        query: Natural language or code query.
        top_k: Maximum number of results to return.

    Returns:
        List of dicts with keys ``file``, ``start_line``, ``text``,
        ``score``, ``language``.
    """
    try:
        if not _index["vectors"]:
            log.warning("Index is empty — call build_index first")
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        # Build query TF-IDF vector
        q_tf = _tf(query_tokens)
        vocab = _index["vocabulary"]
        idf = _index["idf"]
        q_vec: Dict[str, float] = {}
        for t, tf_val in q_tf.items():
            if t in vocab:
                q_vec[t] = tf_val * idf[vocab[t]]

        if not q_vec:
            return []

        # Score all chunks
        scored: List[Tuple[float, int]] = []
        for i, entry in enumerate(_index["vectors"]):
            sim = _cosine_similarity(q_vec, entry["vector"])
            if sim > 0:
                scored.append((sim, i))

        scored.sort(key=lambda x: x[0], reverse=True)

        results: List[Dict[str, Any]] = []
        for score, idx in scored[:top_k]:
            vec_entry = _index["vectors"][idx]
            file_entry = _index["files"][vec_entry["file_idx"]]
            chunk = file_entry["chunks"][vec_entry["chunk_idx"]]
            results.append({
                "file": file_entry["path"],
                "language": file_entry["language"],
                "start_line": chunk["start_line"],
                "text": chunk["text"][:500],
                "score": round(score, 4),
            })

        log.debug("search_index(%r) -> %d results", query, len(results))
        return results

    except Exception:
        log.exception("search_index failed")
        return []

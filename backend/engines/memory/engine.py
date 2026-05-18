"""
Persistent Memory Engine

Provides TF-IDF-based semantic search, context compression, and task state
persistence for long-running autonomous workflows.
"""

import json
import math
import re
import os
from collections import Counter
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from backend.core.config import settings
from backend.core.database import db
from backend.utils.logger import get_logger

logger = get_logger("memory_engine")


def _tokenize(text: str) -> List[str]:
    """Simple whitespace and punctuation tokenizer."""
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


def _compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency for a list of tokens."""
    counts = Counter(tokens)
    total = len(tokens)
    if total == 0:
        return {}
    return {term: count / total for term, count in counts.items()}


def _compute_idf(documents: List[List[str]]) -> Dict[str, float]:
    """Compute inverse document frequency across documents."""
    n_docs = len(documents)
    if n_docs == 0:
        return {}

    df: Dict[str, int] = Counter()
    for doc_tokens in documents:
        unique_tokens = set(doc_tokens)
        for token in unique_tokens:
            df[token] += 1

    return {term: math.log((n_docs + 1) / (freq + 1)) + 1 for term, freq in df.items()}


def _tfidf_vector(tokens: List[str], idf: Dict[str, float]) -> Dict[str, float]:
    """Compute TF-IDF vector for a tokenized document."""
    tf = _compute_tf(tokens)
    return {term: tf_val * idf.get(term, 1.0) for term, tf_val in tf.items()}


def _cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse vectors."""
    common_terms = set(vec_a.keys()) & set(vec_b.keys())
    if not common_terms:
        return 0.0

    dot_product = sum(vec_a[t] * vec_b[t] for t in common_terms)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


class MemoryEngine:
    """Persistent Memory Engine with TF-IDF semantic search."""

    def __init__(self):
        """Initialize the Memory Engine."""
        self._memories: List[Dict[str, Any]] = []
        self._idf: Dict[str, float] = {}
        self._vectors: List[Dict[str, float]] = []
        self._dirty = True  # Flag to recompute IDF/vectors
        logger.info("MemoryEngine initialized")

    def store(self, content: str, category: str = "general", importance: float = 0.5) -> Dict[str, Any]:
        """
        Store a memory with TF-IDF embedding.

        Args:
            content: The text content to store.
            category: Category label for the memory (e.g., 'code', 'decision', 'error').
            importance: Importance score between 0.0 and 1.0.

        Returns:
            The stored memory record with its ID.
        """
        try:
            now = datetime.now(timezone.utc).isoformat()
            memory = {
                "content": content,
                "category": category,
                "importance": max(0.0, min(1.0, importance)),
                "created_at": now,
                "access_count": 0,
            }

            # Persist to database
            cursor = db.execute(
                """
                INSERT INTO memories (content, category, importance, created_at, access_count)
                VALUES (?, ?, ?, ?, 0)
                """,
                (content, category, memory["importance"], now),
            )
            memory["id"] = cursor.lastrowid

            # Update in-memory index
            self._memories.append(memory)
            self._dirty = True

            logger.info(f"Stored memory {memory['id']} in category '{category}'")
            return memory

        except Exception as e:
            logger.error(f"Error storing memory: {e}")
            raise

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Semantic search using TF-IDF cosine similarity.

        Args:
            query: The search query string.
            top_k: Maximum number of results to return.

        Returns:
            List of matching memories sorted by relevance, each with a 'score' field.
        """
        try:
            self._ensure_index()

            if not self._memories:
                return []

            query_tokens = _tokenize(query)
            query_vec = _tfidf_vector(query_tokens, self._idf)

            if not query_vec:
                return []

            scored = []
            for i, memory in enumerate(self._memories):
                sim = _cosine_similarity(query_vec, self._vectors[i])
                # Weight by importance
                weighted_score = sim * (0.7 + 0.3 * memory.get("importance", 0.5))
                if weighted_score > 0:
                    scored.append((weighted_score, i))

            scored.sort(key=lambda x: x[0], reverse=True)

            results = []
            for score, idx in scored[:top_k]:
                memory = self._memories[idx].copy()
                memory["score"] = round(score, 4)
                # Update access count
                memory["access_count"] = memory.get("access_count", 0) + 1
                self._memories[idx]["access_count"] = memory["access_count"]
                results.append(memory)

            logger.info(f"Search for '{query}' returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            raise

    def compress(self, text: str, target_ratio: float = 0.3) -> str:
        """
        Extract key sentences for context compression using TF-IDF scoring.

        Args:
            text: The text to compress.
            target_ratio: Target compression ratio (0.0-1.0).

        Returns:
            Compressed text containing the most important sentences.
        """
        try:
            # Split into sentences
            sentences = re.split(r'(?<=[.!?])\s+', text.strip())
            sentences = [s.strip() for s in sentences if s.strip()]

            if not sentences:
                return text

            if len(sentences) <= 2:
                return text

            target_count = max(1, int(len(sentences) * target_ratio))

            # Tokenize each sentence
            doc_tokens = [_tokenize(s) for s in sentences]

            # Compute IDF across sentences
            idf = _compute_idf(doc_tokens)

            # Score each sentence by its average TF-IDF weight
            scores = []
            for tokens in doc_tokens:
                if not tokens:
                    scores.append(0.0)
                    continue
                tf = _compute_tf(tokens)
                score = sum(tf_val * idf.get(term, 1.0) for term, tf_val in tf.items())
                scores.append(score / len(tokens))

            # Select top sentences, preserving original order
            ranked = sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)
            selected = sorted(ranked[:target_count])

            compressed = " ".join(sentences[i] for i in selected)
            logger.info(
                f"Compressed text from {len(sentences)} to {len(selected)} sentences "
                f"(ratio: {len(selected)/len(sentences):.2f})"
            )
            return compressed

        except Exception as e:
            logger.error(f"Error compressing text: {e}")
            raise

    def save_task_state(self, task_id: str, state: Dict[str, Any]) -> None:
        """
        Save task state for recovery using JSON persistence.

        Args:
            task_id: Unique identifier for the task.
            state: Dictionary of task state to persist.
        """
        try:
            content = json.dumps(state, default=str)
            now = datetime.now(timezone.utc).isoformat()

            # Upsert: check if task_state already exists for this task_id
            existing = db.fetch_one(
                "SELECT id FROM memories WHERE category = 'task_state' AND content LIKE ?",
                (f'%"task_id": "{task_id}"%',),
            )

            if existing:
                db.execute(
                    "UPDATE memories SET content = ?, importance = 1.0, created_at = ? WHERE id = ?",
                    (content, now, existing["id"]),
                )
            else:
                state_with_id = {"task_id": task_id, **state}
                content = json.dumps(state_with_id, default=str)
                db.execute(
                    "INSERT INTO memories (content, category, importance, created_at, access_count) VALUES (?, 'task_state', 1.0, ?, 0)",
                    (content, now),
                )

            logger.info(f"Saved task state for task '{task_id}'")

        except Exception as e:
            logger.error(f"Error saving task state for '{task_id}': {e}")
            raise

    def recover_task_state(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Recover task state from persistent storage.

        Args:
            task_id: Unique identifier for the task.

        Returns:
            The recovered task state dictionary, or None if not found.
        """
        try:
            rows = db.fetch_all(
                "SELECT content FROM memories WHERE category = 'task_state' ORDER BY created_at DESC"
            )

            for row in rows:
                try:
                    state = json.loads(row["content"])
                    if isinstance(state, dict) and state.get("task_id") == task_id:
                        logger.info(f"Recovered task state for '{task_id}'")
                        return state
                except (json.JSONDecodeError, TypeError):
                    continue

            logger.info(f"No task state found for '{task_id}'")
            return None

        except Exception as e:
            logger.error(f"Error recovering task state for '{task_id}': {e}")
            raise

    def get_stats(self) -> Dict[str, Any]:
        """
        Get memory statistics.

        Returns:
            Dictionary with total memories, category counts, and other stats.
        """
        try:
            total_row = db.fetch_one("SELECT COUNT(*) as cnt FROM memories")
            total = total_row["cnt"] if total_row else 0

            categories = db.fetch_all(
                "SELECT category, COUNT(*) as cnt FROM memories GROUP BY category"
            )

            avg_row = db.fetch_one("SELECT AVG(importance) as avg_imp FROM memories")
            avg_importance = avg_row["avg_imp"] if avg_row else 0.0

            return {
                "total_memories": total,
                "categories": {row["category"]: row["cnt"] for row in categories},
                "avg_importance": round(avg_importance, 3) if avg_importance else 0.0,
                "in_memory_count": len(self._memories),
                "index_dirty": self._dirty,
            }

        except Exception as e:
            logger.error(f"Error getting memory stats: {e}")
            return {
                "total_memories": len(self._memories),
                "categories": {},
                "avg_importance": 0.0,
                "in_memory_count": len(self._memories),
                "index_dirty": self._dirty,
            }

    def _ensure_index(self) -> None:
        """Rebuild the in-memory TF-IDF index if dirty."""
        if not self._dirty:
            return

        # Load all memories from DB if in-memory is empty
        if not self._memories:
            try:
                conn = db.get_connection()
                rows = conn.execute(
                    "SELECT id, content, category, importance, created_at, access_count FROM memories WHERE category != 'task_state'"
                ).fetchall()
                self._memories = [dict(row) for row in rows]
            except Exception as e:
                logger.warning(f"Could not load memories from DB: {e}")

        # Tokenize all documents
        doc_tokens = [_tokenize(m["content"]) for m in self._memories]

        # Compute IDF
        self._idf = _compute_idf(doc_tokens)

        # Compute TF-IDF vectors
        self._vectors = [_tfidf_vector(tokens, self._idf) for tokens in doc_tokens]

        self._dirty = False
        logger.debug(f"Rebuilt memory index with {len(self._memories)} documents")

    def load_from_db(self) -> int:
        """
        Force reload all memories from the database.

        Returns:
            Number of memories loaded.
        """
        try:
            rows = db.fetch_all(
                "SELECT id, content, category, importance, created_at, access_count FROM memories"
            )
            self._memories = [dict(row) for row in rows]
            self._dirty = True
            logger.info(f"Loaded {len(self._memories)} memories from database")
            return len(self._memories)
        except Exception as e:
            logger.error(f"Error loading memories from DB: {e}")
            raise


# Singleton instance
memory_engine = MemoryEngine()

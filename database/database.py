"""SQLite persistence for saved analyses and lab reports."""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "DNA_LAB_DB",
    os.path.join(os.path.dirname(__file__), "..", "reports", "insights.db"),
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sequence TEXT NOT NULL,
    sequence_length INTEGER NOT NULL,
    gc_percent REAL NOT NULL,
    at_percent REAL NOT NULL,
    analysis_type TEXT NOT NULL,
    payload TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the analyses table if it does not exist yet."""
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def save_analysis(title: str, analysis: dict, comparison: dict | None = None) -> int:
    """Persist a full analysis result and return the new row id."""
    init_db()
    payload = {"analysis": analysis, "comparison": comparison}
    with _connect() as conn:
        cursor = conn.execute(
            "INSERT INTO analyses (title, created_at, sequence, sequence_length, "
            "gc_percent, at_percent, analysis_type, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                title,
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                analysis.get("sequence", ""),
                analysis.get("length", 0),
                analysis.get("gc_percent", 0.0),
                analysis.get("at_percent", 0.0),
                "comparison" if comparison else "sequence",
                json.dumps(payload),
            ),
        )
        return int(cursor.lastrowid)


def list_analyses() -> list[dict]:
    """Return saved analyses, newest first (without heavy payloads)."""
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at, sequence_length, gc_percent, at_percent, "
            "analysis_type, sequence FROM analyses ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def get_analysis(analysis_id: int) -> dict | None:
    """Load one saved analysis including its full payload."""
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, title, created_at, sequence_length, gc_percent, at_percent, "
            "analysis_type, sequence, payload FROM analyses WHERE id = ?",
            (analysis_id,),
        ).fetchone()
    if row is None:
        return None
    result = dict(row)
    result["payload"] = json.loads(result["payload"])
    return result


def delete_analysis(analysis_id: int) -> bool:
    """Delete a saved analysis. Returns True when a row was removed."""
    init_db()
    with _connect() as conn:
        cursor = conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
        return cursor.rowcount > 0

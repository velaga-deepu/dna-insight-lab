"""Demo data loading: JSON demo sequences and CSV demo comparisons."""

from __future__ import annotations

import csv
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SEQUENCES_PATH = os.path.join(DATA_DIR, "demo_sequences.json")
COMPARISONS_PATH = os.path.join(DATA_DIR, "demo_comparisons.csv")


def load_demo_sequences() -> list[dict]:
    """Load the curated demo DNA sequences from JSON.

    Raises FileNotFoundError when the demo data is missing, which the Flask
    app converts into a friendly error message instead of a stack trace.
    """
    if not os.path.exists(SEQUENCES_PATH):
        raise FileNotFoundError(
            "Demo sequence data is unavailable. The demo_sequences.json file is missing."
        )
    with open(SEQUENCES_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("sequences", [])


def load_demo_comparisons() -> list[dict]:
    """Load the curated reference/sample comparison pairs from CSV."""
    if not os.path.exists(COMPARISONS_PATH):
        raise FileNotFoundError(
            "Demo comparison data is unavailable. The demo_comparisons.csv file is missing."
        )
    comparisons = []
    with open(COMPARISONS_PATH, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            comparisons.append(
                {
                    "name": row.get("name", ""),
                    "reference": (row.get("reference") or "").strip(),
                    "sample": (row.get("sample") or "").strip(),
                    "notes": row.get("notes", ""),
                }
            )
    return comparisons


def get_demo_sequence(sequence_id: str) -> dict | None:
    for entry in load_demo_sequences():
        if entry.get("id") == sequence_id:
            return entry
    return None


def get_demo_comparison(index: int) -> dict | None:
    comparisons = load_demo_comparisons()
    if 0 <= index < len(comparisons):
        return comparisons[index]
    return None

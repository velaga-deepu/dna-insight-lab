"""Sequence validation and normalisation for DNA Insight Lab."""

from __future__ import annotations

import re

VALID_BASES = set("ATGC")

# Strip a FASTA-style header line (">...") if the user pastes one.
_FASTA_HEADER = re.compile(r"^\s*>[^\n]*\n?")


def normalize_sequence(raw: str) -> str:
    """Normalise user input: strip FASTA headers, whitespace and uppercase.

    Does NOT validate the characters — use validate_sequence for that.
    """
    if raw is None:
        return ""
    text = _FASTA_HEADER.sub("", raw)
    return re.sub(r"[\s0-9]", "", text).upper()


def validate_sequence(raw: str) -> dict:
    """Validate raw user input and return a structured validation result.

    Returns a dict with:
        valid        — bool, True when the input is analysable DNA
        sequence     — normalised sequence ("" when invalid)
        error        — human-readable error message ("" when valid)
        invalid_chars— sorted list of offending characters found
    """
    sequence = normalize_sequence(raw)

    if not sequence:
        return {
            "valid": False,
            "sequence": "",
            "error": "Please enter a DNA sequence before running the analysis.",
            "invalid_chars": [],
        }

    invalid = sorted(set(sequence) - VALID_BASES)
    if invalid:
        pretty = ", ".join(f"'{c}'" for c in invalid)
        return {
            "valid": False,
            "sequence": sequence,
            "error": (
                "Invalid DNA characters found: "
                f"{pretty}. Only A, T, G and C are accepted."
            ),
            "invalid_chars": invalid,
        }

    return {"valid": True, "sequence": sequence, "error": "", "invalid_chars": []}


def is_valid_sequence(raw: str) -> bool:
    """Convenience boolean check."""
    return validate_sequence(raw)["valid"]

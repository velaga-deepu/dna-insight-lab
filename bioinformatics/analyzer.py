"""Nucleotide composition and GC/AT content analysis."""

from __future__ import annotations

from Bio.Seq import Seq

from .validator import normalize_sequence, validate_sequence

BASES = ("A", "T", "G", "C")


def analyze_sequence(raw: str) -> dict:
    """Compute the full composition profile of a validated DNA sequence.

    Uses Biopython's Seq object for the molecular-type aware counting that
    underpins the composition table, and plain deterministic arithmetic for
    the GC/AT percentages.
    """
    validation = validate_sequence(raw)
    if not validation["valid"]:
        return {
            "valid": False,
            "error": validation["error"],
            "sequence": "",
            "length": 0,
        }

    sequence = validation["sequence"]
    seq_obj = Seq(sequence)  # Biopython molecular-type aware sequence object

    counts = {base: int(seq_obj.count(base)) for base in BASES}
    length = len(sequence)
    gc_count = counts["G"] + counts["C"]
    at_count = counts["A"] + counts["T"]

    def pct(n: int) -> float:
        return round((n / length) * 100.0, 2) if length else 0.0

    gc_percent = pct(gc_count)
    at_percent = pct(at_count)

    result = {
        "valid": True,
        "error": "",
        "sequence": sequence,
        "length": length,
        "counts": counts,
        "percentages": {base: pct(counts[base]) for base in BASES},
        "gc_count": gc_count,
        "at_count": at_count,
        "gc_percent": gc_percent,
        "at_percent": at_percent,
        # GC% + AT% must account for the whole sequence (rounded independently,
        # so they can differ from 100 by a rounding hair).
        "gc_at_sum": round(gc_percent + at_percent, 2),
    }
    return result


def reverse_complement(raw: str) -> dict:
    """Reverse complement of a validated DNA sequence.

    Complement uses A<->T and G<->C, then the order is reversed.
    Biopython's Seq.reverse_complement() implements exactly this rule.
    """
    analysis = analyze_sequence(raw)
    if not analysis["valid"]:
        return {"valid": False, "error": analysis["error"], "sequence": ""}

    seq_obj = Seq(analysis["sequence"])
    rc = str(seq_obj.reverse_complement())
    return {
        "valid": True,
        "error": "",
        "sequence": analysis["sequence"],
        "reverse_complement": rc,
    }

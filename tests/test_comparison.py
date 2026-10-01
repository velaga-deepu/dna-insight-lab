"""Tests for reference-vs-sample comparison and the explanation layer."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bioinformatics.analyzer import analyze_sequence
from bioinformatics.comparison import compare_sequences
from bioinformatics.explanations import (
    build_explanations,
    explain_comparison,
    explain_gc_content,
    explain_orfs,
)
from bioinformatics.orf import find_orfs
from bioinformatics.translation import translate_dna


def test_identical_sequences_are_100_percent_similar():
    result = compare_sequences("ATGC", "ATGC")
    assert result["matches"] == 4
    assert result["differences"] == 0
    assert result["similarity_percent"] == 100.0
    assert result["mismatches"] == []


def test_mismatch_positions_are_correct():
    result = compare_sequences("ATGC", "ATGT")
    assert result["differences"] == 1
    assert result["mismatches"][0]["position"] == 4
    assert result["mismatches"][0]["reference_base"] == "C"
    assert result["mismatches"][0]["sample_base"] == "T"


def test_similarity_calculation():
    # 3 matches out of 4 compared positions -> 75%
    result = compare_sequences("ATGC", "ATGA")
    assert result["similarity_percent"] == 75.0
    assert result["difference_percent"] == 25.0


def test_unequal_lengths_compare_overlapping_region():
    result = compare_sequences("ATGCAT", "ATG")
    assert result["positions_compared"] == 3
    assert result["equal_lengths"] is False
    assert result["unaligned_reference_bases"] == "CAT"


def test_missing_sample_is_rejected():
    result = compare_sequences("ATGC", "")
    assert result["valid"] is False


def test_invalid_character_is_rejected():
    result = compare_sequences("ATGC", "ATGX")
    assert result["valid"] is False


def test_explanations_generated_from_actual_results():
    seq = "ATGGCCTTTCAGTTCACCTAA"
    analysis = analyze_sequence(seq)
    rc = {"valid": True, "reverse_complement": "TTAGGTGAACTGAAAGGCCAT"}
    translation = translate_dna(seq)
    orfs = find_orfs(seq)
    bundle = build_explanations(analysis, rc, translation, orfs)

    # Length explanation reflects the real length
    assert "21 nucleotides" in bundle["length"]
    # GC explanation reflects the real percentage
    assert f"{analysis['gc_percent']:.2f}%" in bundle["gc_content"]
    # ORF explanation reflects the detected ORF count
    assert "1 complete open reading frame" in bundle["orfs"]


def test_gc_explanation_contains_real_number():
    analysis = analyze_sequence("GCGCGCGCATAT")
    text = explain_gc_content(analysis)
    assert f"{analysis['gc_percent']:.2f}%" in text


def test_no_orf_explanation():
    orfs = find_orfs("GGGCCCTTTAAA")
    text = explain_orfs(orfs)
    assert "No ORF" in text


def test_comparison_explanation_contains_real_counts():
    comparison = compare_sequences("ATGCAT", "ATGCTT")
    text = explain_comparison(comparison)
    assert "differ at 1 compared position" in text or "single sequence-level difference" in text

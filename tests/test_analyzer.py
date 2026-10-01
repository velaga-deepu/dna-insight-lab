"""Tests for composition, GC/AT content and reverse complement."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bioinformatics.analyzer import analyze_sequence, reverse_complement


def test_counts_are_correct():
    analysis = analyze_sequence("AAGGCCTTT")
    # 9 bases: A=2, T=3, G=2, C=2
    assert analysis["counts"] == {"A": 2, "T": 3, "G": 2, "C": 2}
    assert analysis["length"] == 9


def test_gc_at_percentages_and_sum():
    analysis = analyze_sequence("AAGGCCTTT")
    # G+C = 4 of 9 -> 44.44%, A+T = 5 of 9 -> 55.56%
    assert analysis["gc_percent"] == 44.44
    assert analysis["at_percent"] == 55.56
    assert analysis["gc_at_sum"] == 100.0


def test_gc_plus_at_approximately_100_for_random_sequence():
    analysis = analyze_sequence("ATGCGCGATATCCGGATTAGCAAGGCTTAA")
    assert abs(analysis["gc_at_sum"] - 100.0) <= 0.05  # rounding tolerance


def test_lowercase_input_is_counted():
    analysis = analyze_sequence("atgc")
    assert analysis["length"] == 4
    assert analysis["counts"] == {"A": 1, "T": 1, "G": 1, "C": 1}


def test_invalid_sequence_is_rejected():
    analysis = analyze_sequence("ATGXC")
    assert analysis["valid"] is False
    assert analysis["length"] == 0


def test_reverse_complement_rule():
    result = reverse_complement("ATGC")
    assert result["reverse_complement"] == "GCAT"


def test_reverse_complement_palindrome():
    result = reverse_complement("GAATTC")
    # EcoRI site: reverse complement is identical
    assert result["reverse_complement"] == "GAATTC"


def test_reverse_complement_invalid_input():
    result = reverse_complement("ATGX")
    assert result["valid"] is False

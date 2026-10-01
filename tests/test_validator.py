"""Tests for DNA validation and normalisation."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bioinformatics.validator import normalize_sequence, validate_sequence


def test_normalize_strips_whitespace_and_uppercases():
    assert normalize_sequence("atg gcc\n\ttta ") == "ATGGCCTTA"


def test_normalize_strips_fasta_header():
    assert normalize_sequence(">chr1 header\nATGC") == "ATGC"


def test_validate_accepts_valid_dna():
    result = validate_sequence("ATGCatgc")
    assert result["valid"] is True
    assert result["sequence"] == "ATGCATGC"
    assert result["error"] == ""


def test_validate_rejects_invalid_characters():
    result = validate_sequence("ATGXC")
    assert result["valid"] is False
    assert "X" in result["invalid_chars"]


def test_validate_rejects_empty_input():
    result = validate_sequence("   ")
    assert result["valid"] is False
    assert "enter" in result["error"].lower()


def test_validate_rejects_rna_u():
    # U is not a DNA base; the platform validates DNA input only.
    result = validate_sequence("AUGC")
    assert result["valid"] is False
    assert "U" in result["invalid_chars"]

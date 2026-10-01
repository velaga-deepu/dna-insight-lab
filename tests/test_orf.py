"""Tests for open reading frame detection."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bioinformatics.orf import find_orfs


def test_simple_orf_frame1():
    result = find_orfs("ATGAAATAA")
    assert result["complete_count"] == 1
    orf = result["orfs"][0]
    assert orf["frame"] == 1
    assert orf["start"] == 1
    assert orf["stop"] == 9
    assert orf["length"] == 9
    assert orf["protein"] == "MK"


def test_orf_in_frame2():
    # One padding base puts ATG in frame 2
    result = find_orfs("CATGAAATAA")
    complete = [o for o in result["orfs"] if o["has_stop"]]
    assert any(o["frame"] == 2 and o["start"] == 2 for o in complete)


def test_orf_in_frame3():
    result = find_orfs("CCATGAAATAA")
    complete = [o for o in result["orfs"] if o["has_stop"]]
    assert any(o["frame"] == 3 and o["start"] == 3 for o in complete)


def test_all_three_stop_codons_terminate():
    for stop in ("TAA", "TAG", "TGA"):
        result = find_orfs(f"ATGAAA{stop}")
        assert result["complete_count"] == 1


def test_start_without_stop_is_flagged():
    result = find_orfs("ATGAAAGGGCCC")
    incomplete = [o for o in result["orfs"] if not o["has_stop"]]
    assert len(incomplete) == 1
    assert incomplete[0]["stop"] is None


def test_no_orf_when_no_start_codon():
    result = find_orfs("GGGCCCTTT")
    assert result["complete_count"] == 0
    assert result["incomplete_count"] == 0


def test_no_orf_for_short_sequence():
    result = find_orfs("ATG")
    assert result["complete_count"] == 0
    assert result["incomplete_count"] == 1  # start with no room for a stop


def test_orf_is_in_frame():
    # The ORF DNA length must be a multiple of 3 and end with a stop codon
    result = find_orfs("CCATGGGGTTTTAAGGGCCC")
    complete = [o for o in result["orfs"] if o["has_stop"]]
    for orf in complete:
        assert orf["length"] % 3 == 0
        assert orf["dna"][-3:] in ("TAA", "TAG", "TGA")
        assert orf["dna"][:3] == "ATG"


def test_invalid_sequence_rejected():
    result = find_orfs("ATGX")
    assert result["valid"] is False

"""Tests for DNA->RNA transcription and RNA->protein translation."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bioinformatics.translation import translate_dna, translate_rna, transcribe_dna


def test_transcription_replaces_t_with_u():
    result = transcribe_dna("ATGC")
    assert result["rna"] == "AUGC"


def test_transcription_preserves_other_bases():
    result = transcribe_dna("AAACCCGGGTTT")
    assert result["rna"] == "AAACCCGGGUUU"


def test_translate_standard_genetic_code_start():
    # ATG -> AUG -> Methionine
    result = translate_rna("AUG")
    assert result["codons"][0]["amino_acid"] == "M"
    assert result["protein"] == "M"


def test_translate_stop_codons():
    for codon in ("UAA", "UAG", "UGA"):
        result = translate_rna(codon)
        assert result["codons"][0]["is_stop"] is True
        assert result["stops_seen"] == 1


def test_translate_known_peptide():
    # ATG GCC TTT CAG -> M A F Q
    result = translate_dna("ATGGCCTTTCAG")
    assert result["protein"] == "MAFQ"
    assert result["codon_count"] == 4
    assert result["stops_seen"] == 0


def test_leftover_bases_are_reported():
    result = translate_dna("ATGGCC A")  # 7 bases -> 2 codons + 1 leftover
    assert result["codon_count"] == 2
    assert result["leftover"] == "A"
    assert result["leftover_length"] == 1


def test_translation_starts_at_first_base():
    # Frame-1 convention: GCT ATG would read GCT first, not ATG
    result = translate_dna("GCTATG")
    assert result["codons"][0]["codon"] == "GCU"
    assert result["codons"][0]["amino_acid"] == "A"


def test_invalid_dna_rejected():
    result = translate_dna("ATGX")
    assert result["valid"] is False

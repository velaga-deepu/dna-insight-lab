"""DNA -> RNA transcription and RNA -> protein translation.

Uses the standard genetic code. Biopython's Seq objects provide the
molecular-type aware transcription and the standard codon table used here.
"""

from __future__ import annotations

from Bio.Seq import Seq

from .validator import validate_sequence

STOP_SYMBOL = "*"


def transcribe_dna(raw: str) -> dict:
    """Transcribe DNA into RNA (T -> U) using Biopython transcription rules."""
    validation = validate_sequence(raw)
    if not validation["valid"]:
        return {"valid": False, "error": validation["error"], "dna": "", "rna": ""}

    dna = validation["sequence"]
    rna = str(Seq(dna).transcribe())  # replaces T with U
    return {"valid": True, "error": "", "dna": dna, "rna": rna}


def translate_rna(rna: str) -> dict:
    """Translate an RNA string into codons and amino acids.

    Returns per-codon detail including stop codons and leftover bases.
    Translation starts at base 1 (frame 1) of the supplied RNA, which is the
    deterministic convention this educational platform uses.
    """
    rna = (rna or "").upper().replace(" ", "").replace("\n", "")
    rna = rna.replace("T", "U")  # tolerate DNA pasted into the RNA box

    codons = []
    leftover = ""
    if len(rna) % 3 != 0:
        leftover = rna[-(len(rna) % 3):]
        rna = rna[: len(rna) - len(leftover)]

    seq_obj = Seq(rna)  # Biopython RNA Seq object
    stops_seen = 0
    for index, chunk in enumerate([rna[i:i + 3] for i in range(0, len(rna), 3)]):
        aa = str(seq_obj.translate())  # full translate, indexed below
        single = aa[index] if index < len(aa) else STOP_SYMBOL
        is_stop = chunk in ("UAA", "UAG", "UGA")
        if is_stop:
            stops_seen += 1
        codons.append(
            {
                "codon": chunk,
                "amino_acid": STOP_SYMBOL if is_stop else single,
                "is_stop": is_stop,
                "position": index + 1,  # 1-based codon position
            }
        )

    protein = "".join(
        c["amino_acid"] if not c["is_stop"] else STOP_SYMBOL for c in codons
    )
    clean_protein = protein.replace(STOP_SYMBOL, "")

    return {
        "codons": codons,
        "codon_count": len(codons),
        "leftover": leftover,
        "leftover_length": len(leftover),
        "protein": clean_protein,
        "protein_length": len(clean_protein),
        "stops_seen": stops_seen,
        "stop_codon_list": ["UAA", "UAG", "UGA"],
    }


def translate_dna(raw: str) -> dict:
    """Convenience: validate DNA, transcribe, then translate."""
    transcription = transcribe_dna(raw)
    if not transcription["valid"]:
        return {"valid": False, "error": transcription["error"]}

    translation = translate_rna(transcription["rna"])
    return {
        "valid": True,
        "error": "",
        "dna": transcription["dna"],
        "rna": transcription["rna"],
        **translation,
    }

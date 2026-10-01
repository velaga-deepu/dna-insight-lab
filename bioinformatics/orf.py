"""Open Reading Frame detection across the three forward reading frames.

Deterministic implementation: scans frames 1-3 on the forward strand for
ATG ... followed by the first in-frame stop codon (TAA / TAG / TGA).
"""

from __future__ import annotations

from Bio.Seq import Seq

from .validator import validate_sequence

START_CODON = "ATG"
STOP_CODONS = ("TAA", "TAG", "TGA")


def find_orfs(raw: str) -> dict:
    """Find ORFs in the three forward reading frames of a DNA sequence.

    Returns every ORF found, longest first. Positions in the result are
    1-based (inclusive start, inclusive stop) for display purposes.
    """
    validation = validate_sequence(raw)
    if not validation["valid"]:
        return {"valid": False, "error": validation["error"], "orfs": []}

    dna = validation["sequence"]
    seq_obj = Seq(dna)
    orfs = []

    for frame in (0, 1, 2):  # forward frames 1, 2, 3 (0-based internally)
        i = frame
        while i + 3 <= len(dna):
            codon = dna[i:i + 3]
            if codon == START_CODON:
                # Look for the first in-frame stop codon downstream.
                j = i + 3
                stop_found = False
                while j + 3 <= len(dna):
                    down_codon = dna[j:j + 3]
                    if down_codon in STOP_CODONS:
                        stop_found = True
                        break
                    j += 3
                if stop_found:
                    sub_dna = dna[i:j + 3]
                    protein = str(Seq(sub_dna).translate())
                    orfs.append(
                        {
                            "frame": frame + 1,  # 1-based frame number
                            "start": i + 1,  # 1-based inclusive
                            "stop": j + 3,  # 1-based inclusive
                            "length": len(sub_dna),
                            "dna": sub_dna,
                            "protein": protein[:-1] if protein.endswith("*") else protein,
                            "stop_codon": dna[j:j + 3],
                            "has_stop": True,
                        }
                    )
                # If no stop found, this ATG is recorded as an unmatched start
                # (has_stop=False) only when it is the leftmost ATG of its run.
                else:
                    tail = dna[i:]
                    # Trim to a whole number of codons to avoid partial-codon warnings.
                    trimmed = tail[: len(tail) - (len(tail) % 3)]
                    protein = str(Seq(trimmed).translate()).replace("*", "") if trimmed else ""
                    orfs.append(
                        {
                            "frame": frame + 1,
                            "start": i + 1,
                            "stop": None,
                            "length": len(tail),
                            "dna": tail,
                            "protein": protein,
                            "stop_codon": None,
                            "has_stop": False,
                        }
                    )
                i = j + 3 if stop_found else len(dna)
            else:
                i += 3

    # Longest ORFs first, then by frame, then by start position.
    orfs.sort(key=lambda o: (-(o["length"] if o["has_stop"] else 0), o["frame"], o["start"]))
    # ORFs without a stop carry less information; list them after complete ones.
    orfs.sort(key=lambda o: (not o["has_stop"],))

    complete = [o for o in orfs if o["has_stop"]]
    incomplete = [o for o in orfs if not o["has_stop"]]

    return {
        "valid": True,
        "error": "",
        "orfs": complete + incomplete,
        "complete_count": len(complete),
        "incomplete_count": len(incomplete),
    }

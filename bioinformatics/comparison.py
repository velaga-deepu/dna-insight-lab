"""Reference vs sample sequence comparison (mutation investigation)."""

from __future__ import annotations

from .validator import normalize_sequence, validate_sequence

# Educational demo pairing uses the validated DNA alphabet only.


def compare_sequences(reference_raw: str, sample_raw: str) -> dict:
    """Compare two DNA sequences base by base.

    The two inputs are validated independently. Positions compared run from
    position 1 up to the length of the shorter sequence; any extra trailing
    bases on the longer sequence are reported as unaligned.
    """
    ref_validation = validate_sequence(reference_raw)
    sample_validation = validate_sequence(sample_raw)

    if not ref_validation["valid"]:
        return {"valid": False, "error": f"Reference sequence: {ref_validation['error']}"}
    if not sample_validation["valid"]:
        return {"valid": False, "error": f"Sample sequence: {sample_validation['error']}"}

    reference = ref_validation["sequence"]
    sample = sample_validation["sequence"]

    if not reference or not sample:
        return {
            "valid": False,
            "error": "Both a reference and a sample sequence are required for comparison.",
        }

    positions_compared = min(len(reference), len(sample))
    mismatches = []
    matches = 0

    for i in range(positions_compared):
        status = "Match" if reference[i] == sample[i] else "Difference"
        if reference[i] == sample[i]:
            matches += 1
        else:
            mismatches.append(
                {
                    "position": i + 1,  # 1-based
                    "reference_base": reference[i],
                    "sample_base": sample[i],
                    "status": status,
                }
            )

    different = positions_compared - matches
    similarity = round((matches / positions_compared) * 100.0, 2) if positions_compared else 0.0

    return {
        "valid": True,
        "error": "",
        "reference": reference,
        "sample": sample,
        "reference_length": len(reference),
        "sample_length": len(sample),
        "positions_compared": positions_compared,
        "matches": matches,
        "differences": different,
        "similarity_percent": similarity,
        "difference_percent": round(100.0 - similarity, 2),
        "mismatches": mismatches,
        "equal_lengths": len(reference) == len(sample),
        "unaligned_reference_bases": reference[positions_compared:],
        "unaligned_sample_bases": sample[positions_compared:],
    }

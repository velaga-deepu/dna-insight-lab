"""Rule-based, templated explanation layer.

Turns actual computed results into deterministic, plain-language descriptions.
No external AI service is involved — every sentence is generated from the
numbers the bioinformatics modules produced.
"""

from __future__ import annotations

from .analyzer import BASES

STOP_EXPLANATION = (
    "A stop codon ends translation. The protein shown for each open reading "
    "frame stops before the stop codon, which is how the cell would too."
)


def explain_length(analysis: dict) -> str:
    length = analysis.get("length", 0)
    if length == 0:
        return "No sequence was available to measure."
    return (
        f"This sequence contains {length} nucleotide"
        + ("s" if length != 1 else "")
        + "."
    )


def explain_gc_content(analysis: dict) -> str:
    gc = analysis.get("gc_percent", 0.0)
    at = analysis.get("at_percent", 0.0)
    gc_words = _percent_to_words(gc)
    if gc >= 60:
        tone = (
            "G and C together make up well over half of this sequence, "
            "which is typical of DNA regions that are chemically stable at higher temperatures."
        )
    elif gc >= 40:
        tone = (
            "G and C together account for roughly half of this sequence, "
            "a balanced composition often seen in many organisms' genomes."
        )
    else:
        tone = (
            "G and C together are a minority here, so A and T dominate this fragment, "
            "a pattern common in AT-rich genomes."
        )
    return (
        f"GC content is {gc:.2f}%, meaning {gc_words}. "
        f"AT content is {at:.2f}%. Together GC% + AT% accounts for the whole sequence. "
        + tone
    )


def explain_composition(analysis: dict) -> str:
    counts = analysis.get("counts", {})
    if not counts:
        return "No composition data is available."
    most = max(BASES, key=lambda b: counts.get(b, 0))
    least = min(BASES, key=lambda b: counts.get(b, 0))
    if counts[most] == counts[least]:
        return "All four nucleotides (A, T, G and C) appear in equal amounts in this sequence."
    return (
        f"The most common nucleotide is {most} with {counts[most]} occurrence"
        + ("s" if counts[most] != 1 else "")
        + f", while {least} is the least common with {counts[least]}. "
        "Each base keeps its own identity across the whole sequence."
    )


def explain_reverse_complement(rc_result: dict) -> str:
    if not rc_result.get("valid"):
        return "A valid DNA sequence is needed before a reverse complement can be produced."
    return (
        "The reverse complement is the double-stranded partner of your DNA, "
        "read in the opposite direction. Biologists use it because the two strands "
        "of DNA carry the same information flipped and mirrored."
    )


def explain_transcription(translation: dict) -> str:
    if not translation.get("valid"):
        return "A valid DNA sequence is needed before transcription can be performed."
    rna = translation.get("rna", "")
    u_count = rna.count("U")
    return (
        f"During transcription every DNA T is replaced by RNA U. "
        f"This RNA copy contains {u_count} uracil"
        + ("s" if u_count != 1 else "")
        + " out of "
        f"{len(rna)} bases."
    )


def explain_translation(translation: dict) -> str:
    if not translation.get("valid"):
        return "A valid DNA sequence is needed before translation can be performed."
    codon_count = translation.get("codon_count", 0)
    protein_length = translation.get("protein_length", 0)
    stops = translation.get("stops_seen", 0)
    leftover = translation.get("leftover", "")

    parts = [
        f"The RNA was read in groups of three bases (codons), producing {codon_count} complete codon"
        + ("s" if codon_count != 1 else "")
        + f" and a protein chain of {protein_length} amino acid"
        + ("s" if protein_length != 1 else "")
        + "."
    ]
    if stops:
        parts.append(
            f"Translation encountered {stops} stop codon"
            + ("s" if stops != 1 else "")
            + ", which signals where the protein chain would end in the cell."
        )
    else:
        parts.append("No stop codon was reached, so the protein chain runs to the end of the sequence.")
    if leftover:
        parts.append(
            f"{len(leftover)} base"
            + ("s were" if len(leftover) != 1 else " was")
            + " left over because they could not form a complete codon — leftover bases are shown, not discarded."
        )
    return " ".join(parts)


def explain_orfs(orf_result: dict) -> str:
    if not orf_result.get("valid"):
        return "A valid DNA sequence is needed before open reading frames can be searched."
    orfs = orf_result.get("orfs", [])
    complete = [o for o in orfs if o.get("has_stop")]
    incomplete = [o for o in orfs if not o.get("has_stop")]

    if not complete and not incomplete:
        return (
            "No ORF satisfying the implemented start/stop search rules was detected. "
            "An ORF needs an ATG start codon followed in the same reading frame by a stop codon (TAA, TAG or TGA)."
        )

    parts = []
    if complete:
        longest = max(complete, key=lambda o: o["length"])
        parts.append(
            f"{len(complete)} complete open reading frame"
            + ("s were" if len(complete) != 1 else " was")
            + f" detected. The longest runs from position {longest['start']} to {longest['stop']} "
            f"({longest['length']} nucleotides, {len(longest['protein'])} amino acids) in reading frame {longest['frame']}."
        )
    if incomplete:
        parts.append(
            f"{len(incomplete)} start codon"
            + ("s were" if len(incomplete) != 1 else " was")
            + " found without a downstream in-frame stop codon; "
            "these are listed separately because the open reading frame appears to run off the end of the supplied sequence."
        )
    parts.append(
        "An open reading frame is a candidate protein-coding region — it is not proof of a gene without further evidence."
    )
    return " ".join(parts)


def explain_comparison(comparison: dict) -> str:
    if not comparison.get("valid"):
        return "A valid reference and sample sequence are needed before they can be compared."
    compared = comparison.get("positions_compared", 0)
    matches = comparison.get("matches", 0)
    differences = comparison.get("differences", 0)
    similarity = comparison.get("similarity_percent", 0.0)

    if differences == 0:
        verdict = "Every compared position is identical."
    elif differences == 1:
        verdict = "There is a single sequence-level difference between the supplied sequences."
    else:
        verdict = (
            f"The supplied reference and sample sequences differ at {differences} compared position"
            + ("s" if differences != 1 else "")
            + "."
        )

    text = (
        f"{compared} position"
        + ("s were" if compared != 1 else " was")
        + f" compared. {matches} matched and {differences} differed, giving a similarity of {similarity:.2f}%. "
        + verdict
    )

    if not comparison.get("equal_lengths", True):
        text += (
            " The two sequences have different lengths, so only the overlapping region was compared "
            "and the extra trailing bases are listed separately."
        )
    text += (
        " A sequence-level difference does not by itself establish a disease, a clinical condition or any biological significance."
    )
    return text


def _percent_to_words(value: float) -> str:
    if value >= 66.0:
        return "approximately two-thirds of this sequence is G or C"
    if value >= 50.0:
        return "over half of this sequence is G or C"
    if value >= 33.0:
        return "between a third and a half of this sequence is G or C"
    if value > 0:
        return "a minority of this sequence is G or C"
    return "this sequence contains no G or C bases"


def build_explanations(analysis: dict, rc_result: dict, translation: dict,
                       orf_result: dict, comparison: dict | None = None) -> dict:
    """Assemble the full explanation bundle from actual computed results."""
    bundle = {
        "length": explain_length(analysis),
        "composition": explain_composition(analysis),
        "gc_content": explain_gc_content(analysis),
        "reverse_complement": explain_reverse_complement(rc_result),
        "transcription": explain_transcription(translation) if translation.get("rna") else "",
        "translation": explain_translation(translation),
        "orfs": explain_orfs(orf_result),
    }
    if comparison is not None:
        bundle["comparison"] = explain_comparison(comparison)
    return bundle

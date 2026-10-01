"""DNA Insight Lab — Flask application.

Routes:
    /               Landing page with the guided workflow
    /analyzer       Full sequence analysis (composition, transformations, ORFs)
    /comparison     Reference vs sample comparison
    /experiments    Virtual DNA Lab (four guided experiments)
    /reports        Saved analyses from SQLite + full lab report view
    /about          About, scientific scope and future scope

JSON API endpoints used by the vanilla-JS frontend:
    POST /api/analyze            Full analysis of one DNA sequence
    POST /api/compare            Reference vs sample comparison
    GET  /api/demo/sequences     Demo DNA sequences (from JSON)
    GET  /api/demo/comparisons   Demo comparison pairs (from CSV)
    POST /api/reports/save       Save an analysis to SQLite
    GET  /api/reports            List saved analyses
    GET  /api/reports/<id>       Load one saved analysis
    DELETE /api/reports/<id>     Delete a saved analysis
"""

from __future__ import annotations

import json

from flask import Flask, jsonify, redirect, render_template, request, url_for

from bioinformatics.analyzer import analyze_sequence, reverse_complement
from bioinformatics.comparison import compare_sequences
from bioinformatics.explanations import build_explanations
from bioinformatics.orf import find_orfs
from bioinformatics.translation import translate_dna
from data import demo_data
from database import database

app = Flask(__name__)

REPORT_PAGE_SIZE = 20


# ---------------------------------------------------------------------------
# Page routes (Jinja2 server-side rendering)
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyzer")
def analyzer_page():
    return render_template("analyzer.html")


@app.route("/comparison")
def comparison_page():
    return render_template("comparison.html")


@app.route("/experiments")
def experiments_page():
    return render_template("experiments.html")


@app.route("/reports")
def reports_page():
    try:
        saved = database.list_analyses()
    except Exception:
        saved = []
    return render_template("reports.html", saved=saved)


@app.route("/about")
def about_page():
    return render_template("about.html")


# ---------------------------------------------------------------------------
# API: analysis
# ---------------------------------------------------------------------------

def _run_full_analysis(raw_sequence: str) -> dict:
    """Execute every analysis step and attach the explanation layer."""
    analysis = analyze_sequence(raw_sequence)
    if not analysis.get("valid"):
        return {"valid": False, "error": analysis.get("error", "Invalid input.")}

    rc_result = reverse_complement(raw_sequence)
    translation = translate_dna(raw_sequence)
    orf_result = find_orfs(raw_sequence)
    explanations = build_explanations(analysis, rc_result, translation, orf_result)

    return {
        "valid": True,
        "analysis": analysis,
        "reverse_complement": rc_result.get("reverse_complement", ""),
        "translation": translation,
        "orfs": orf_result,
        "explanations": explanations,
    }


@app.post("/api/analyze")
def api_analyze():
    data = request.get_json(silent=True) or {}
    raw = data.get("sequence", "")
    if not isinstance(raw, str) or not raw.strip():
        return jsonify({"valid": False, "error": "Please enter a DNA sequence or choose a demo sequence."}), 400
    result = _run_full_analysis(raw)
    status = 200 if result.get("valid") else 400
    return jsonify(result), status


@app.post("/api/validate")
def api_validate():
    """Validate-only endpoint so the UI can confirm a sequence before analysis."""
    from bioinformatics.validator import validate_sequence

    data = request.get_json(silent=True) or {}
    raw = data.get("sequence", "")
    if not isinstance(raw, str) or not raw.strip():
        return (
            jsonify(
                {
                    "valid": False,
                    "error": "Please enter a DNA sequence or choose a demo sequence.",
                    "normalized": "",
                    "length": 0,
                }
            ),
            400,
        )
    result = validate_sequence(raw)
    return (
        jsonify(
            {
                "valid": result["valid"],
                "error": result["error"],
                "normalized": result["sequence"],
                "length": len(result["sequence"]),
                "invalid_chars": result["invalid_chars"],
            }
        ),
        200,
    )


# ---------------------------------------------------------------------------
# API: comparison
# ---------------------------------------------------------------------------

@app.post("/api/compare")
def api_compare():
    data = request.get_json(silent=True) or {}
    reference = data.get("reference", "")
    sample = data.get("sample", "")
    result = compare_sequences(reference, sample)
    if not result.get("valid"):
        return jsonify({"valid": False, "error": result.get("error", "Invalid input.")}), 400

    from bioinformatics.explanations import explain_comparison

    result["explanation"] = explain_comparison(result)
    return jsonify(result)


# ---------------------------------------------------------------------------
# API: demo data (JSON + CSV backed)
# ---------------------------------------------------------------------------

@app.get("/api/demo/sequences")
def api_demo_sequences():
    try:
        return jsonify({"sequences": demo_data.load_demo_sequences()})
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc), "sequences": []}), 500


@app.get("/api/demo/comparisons")
def api_demo_comparisons():
    try:
        return jsonify({"comparisons": demo_data.load_demo_comparisons()})
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc), "comparisons": []}), 500


# ---------------------------------------------------------------------------
# API: SQLite-backed reports
# ---------------------------------------------------------------------------

@app.post("/api/reports/save")
def api_reports_save():
    data = request.get_json(silent=True) or {}
    raw = data.get("sequence", "")
    title = (data.get("title") or "").strip() or "Untitled analysis"
    comparison_raw = data.get("comparison") or None

    result = _run_full_analysis(raw)
    if not result.get("valid"):
        return jsonify({"valid": False, "error": result.get("error", "Invalid input.")}), 400

    comparison = None
    if comparison_raw and comparison_raw.get("reference") and comparison_raw.get("sample"):
        comparison = compare_sequences(
            comparison_raw["reference"], comparison_raw["sample"]
        )

    try:
        analysis_id = database.save_analysis(title, result, comparison)
    except Exception:
        return (
            jsonify(
                {
                    "valid": False,
                    "error": "The analysis could not be saved because of a database problem.",
                }
            ),
            500,
        )

    return jsonify({"valid": True, "id": analysis_id, "title": title})


@app.get("/api/reports")
def api_reports_list():
    try:
        return jsonify({"reports": database.list_analyses()})
    except Exception:
        return jsonify({"error": "Saved reports could not be loaded."}), 500


@app.get("/api/reports/<int:report_id>")
def api_reports_get(report_id: int):
    try:
        record = database.get_analysis(report_id)
    except Exception:
        return jsonify({"error": "Saved reports could not be loaded."}), 500
    if record is None:
        return jsonify({"error": "That saved analysis could not be found."}), 404
    return jsonify(record)


@app.delete("/api/reports/<int:report_id>")
def api_reports_delete(report_id: int):
    try:
        deleted = database.delete_analysis(report_id)
    except Exception:
        return jsonify({"error": "The saved analysis could not be deleted."}), 500
    if not deleted:
        return jsonify({"error": "That saved analysis could not be found."}), 404
    return jsonify({"deleted": True})


# ---------------------------------------------------------------------------
# Error handling — never expose Python stack traces to users
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "The requested resource was not found."}), 404
    return render_template("error.html", code=404, message="Page not found."), 404


@app.errorhandler(500)
def server_error(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Something went wrong while processing the request."}), 500
    return (
        render_template(
            "error.html", code=500, message="Something went wrong on our side."
        ),
        500,
    )


with app.app_context():
    database.init_db()


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

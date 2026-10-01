# 🧬 DNA Insight Lab

**An Interactive Bioinformatics Platform for Guided DNA Sequence Analysis**

DNA Insight Lab takes a user from raw DNA sequence input through validation, computational analysis,
comparison, interpretation, visualization and an exportable lab-style report — in one guided environment:

```text
DNA Input → Analysis → Comparison → Interpretation → Visualization → Report
```

> **Educational use only.** DNA Insight Lab does not provide medical diagnosis, clinical interpretation,
> or forensic identification. Sequence differences do not by themselves establish disease, clinical
> significance, genetic risk, or identity.

---

## ✨ Features (all computed from the user's actual sequence)

| Capability | Where |
| --- | --- |
| Raw DNA input, paste/type, clear, demo loader, validation | **Analyzer** (`/analyzer`) |
| A/T/G/C composition with counts and percentages | Analyzer → Composition |
| GC% and AT% content (verified to sum to ≈100%) | Analyzer → Composition |
| Reverse complement (A↔T, G↔C, reversed) with copy | Analyzer → Reverse complement |
| DNA→RNA transcription (T → U) | Analyzer → DNA → RNA → Protein |
| RNA→protein translation, standard genetic code, stop codons, leftover bases | Analyzer → Codon-level analysis |
| ORF detection across the three forward reading frames (1-based positions) | Analyzer → Open reading frames |
| Reference-vs-sample mutation comparison with mismatch table | **Compare DNA** (`/comparison`) |
| Four guided experiments | **Virtual DNA Lab** (`/experiments`) |
| Chart.js charts from real results (composition, GC vs AT, comparison) | Analyzer / Compare / Experiments |
| Rule-based plain-language explanation layer (no external AI) | Every result panel |
| Save / view / delete lab reports (SQLite persistence) | **Reports** (`/reports`) |
| Printable lab-style report | Reports → View → Print/Export |

## 🚀 Quick start

```bash
pip install -r requirements.txt
python app.py
```

Open the printed address (default `http://0.0.0.0:5000`). The SQLite database is created automatically
at `reports/insights.db`.

## 🧪 Running tests

```bash
pip install pytest
pytest
```

The test suite covers validation, composition, GC/AT, reverse complement, transcription, translation,
codon handling, ORF detection (including frame checks and the three stop codons), comparison, similarity,
mismatch positions and explanation generation.

## 🏗️ Architecture

```text
Browser (HTML5/CSS3/Vanilla JS + Chart.js)
        ↓
Flask (app.py routes + JSON API)
        ↓
Python bioinformatics modules (bioinformatics/)
        ↓  Biopython where appropriate (Seq, transcription, translation, reverse complement)
SQLite (database/)  ·  JSON demo sequences (data/)  ·  CSV demo comparisons (data/)
        ↓
Jinja2-rendered templates (templates/)
```

### Project structure

```text
app.py                     Flask application: pages + JSON API + error handlers
requirements.txt           Flask + Biopython
bioinformatics/            validator, analyzer, translation, orf, comparison, explanations
database/database.py       SQLite persistence (save / list / get / delete analyses)
data/demo_sequences.json   Curated demo DNA sequences (loaded by the app)
data/demo_comparisons.csv  Curated demo comparison pairs (loaded by the app)
data/demo_data.py          JSON/CSV loading helpers
templates/                 base, index, analyzer, comparison, experiments, reports, about, error
static/css/style.css       Complete responsive styling + print styles for the lab report
static/js/                 app, analyzer, comparison, experiments, reports + vendored Chart.js
tests/                     pytest suite for every bioinformatics module
reports/                   SQLite database location
```

## 🔬 Technology stack

Python · Flask · Jinja2 · HTML5 · CSS3 · Vanilla JavaScript · Biopython · SQLite · JSON · CSV · Chart.js

The frontend is deliberately framework-free: no React, Vue, Angular or any other JS framework is used.
The explanation layer is rule-based and templated — it uses no external AI service.

## 🎬 Suggested demonstration path

1. Open the home page — the guided workflow is shown up front.
2. **Analyzer** → load the *Short Teaching Sequence* demo → Analyze.
3. Walk through composition, GC/AT, charts, reverse complement, RNA, codons, protein.
4. Scroll to ORF detection — one complete ORF in frame 1.
5. **Compare DNA** → load *Teaching Pair A* → mismatch table, similarity, comparison chart.
6. **Virtual DNA Lab** → run any of the four guided experiments.
7. Back in the Analyzer, save a report → **Reports** → View → Print/Export.

## 🔮 Future scope (not current features)

- **Simulated forensic STR matching** — educational, simulated only; no real identification.
- **Genetic-condition educational module** — background for conditions such as sickle-cell disease
  and cystic fibrosis; educational only.

Both are listed on the About page as future scope and are not part of the working system.

## ⚠️ Disclaimer

DNA Insight Lab is an educational bioinformatics project. Outputs are for learning, experimentation and
demonstration. It does not provide medical diagnosis, clinical interpretation, treatment recommendations,
forensic identification, or legal conclusions.

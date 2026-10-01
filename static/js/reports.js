/* DNA Insight Lab — Reports page logic (vanilla JS) */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  bindReportButtons();

  $("btnBackToReports").addEventListener("click", () => {
    hide($("reportViewer"));
    show($("reportsListWrap"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("btnPrintReport").addEventListener("click", () => window.print());

  // Deep link: /reports?report=<id> opens a saved report directly
  // (used by "Generate Lab Report" on the Analyzer).
  const params = new URLSearchParams(window.location.search);
  const reportId = parseInt(params.get("report"), 10);
  if (!Number.isNaN(reportId)) {
    await openReport(reportId);
  }
});

function bindReportButtons() {
  document.querySelectorAll(".open-report").forEach((btn) => {
    btn.addEventListener("click", () => openReport(parseInt(btn.dataset.id, 10)));
  });
  document.querySelectorAll(".delete-report").forEach((btn) => {
    btn.addEventListener("click", () => deleteReport(parseInt(btn.dataset.id, 10), btn));
  });
}

async function openReport(reportId) {
  const result = await getJSON(`/api/reports/${reportId}`);
  if (!result.ok) {
    alert(result.data.error || "The saved analysis could not be loaded.");
    return;
  }
  renderReport(result.data);
  show($("reportViewer"));
  hide($("reportsListWrap"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteReport(reportId, btn) {
  if (!confirm("Delete this saved analysis? This cannot be undone.")) return;
  const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    const row = btn.closest("tr");
    if (row) row.remove();
  } else {
    alert(data.error || "The saved analysis could not be deleted.");
  }
}

/* ---------- report rendering ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function section(title) {
  const wrap = el("div", "report-section");
  wrap.appendChild(el("h2", null, title));
  return wrap;
}

function addStatGrid(container, stats) {
  const row = el("div", "stat-row wrap");
  stats.forEach(([label, value]) => {
    const stat = el("div", "stat");
    stat.appendChild(el("span", "stat-label", label));
    stat.appendChild(el("span", "stat-value", String(value)));
    row.appendChild(stat);
  });
  container.appendChild(row);
}

function addSequenceBlock(container, text) {
  if (!text) return;
  const display = el("div", "seq-view");
  display.textContent = text;
  container.appendChild(display);
}

function addExplanation(container, text) {
  if (!text) return;
  container.appendChild(el("p", "explanation", text));
}

function renderReport(record) {
  const doc = $("reportDocument");
  doc.innerHTML = "";

  const payload = record.payload || {};
  const result = payload.analysis || {};
  const analysis = result.analysis || {};
  const translation = result.translation || {};
  const orfResult = result.orfs || { orfs: [] };
  const comparison = payload.comparison || null;
  const explanations = result.explanations || {};

  /* title block */
  const header = el("div", "report-title-block");
  header.appendChild(el("h1", null, `Laboratory Report — ${record.title}`));
  header.appendChild(
    el("p", "report-sub",
      `DNA Insight Lab · Educational bioinformatics · Report #${record.id} · Generated ${record.created_at}`)
  );
  doc.appendChild(header);

  /* 1. sequence analysed */
  const seqSec = section("1 · Sequence analysed");
  addSequenceBlock(seqSec, analysis.sequence);
  addStatGrid(seqSec, [["Length", `${analysis.length || 0} bp`], ["Validation", "Valid DNA (A/T/G/C)"]]);
  addExplanation(seqSec, explanations.length);
  doc.appendChild(seqSec);

  /* 2. composition */
  const compSec = section("2 · Nucleotide composition");
  addStatGrid(compSec, [
    ["A", analysis.counts ? analysis.counts.A : "—"],
    ["T", analysis.counts ? analysis.counts.T : "—"],
    ["G", analysis.counts ? analysis.counts.G : "—"],
    ["C", analysis.counts ? analysis.counts.C : "—"],
    ["GC content", `${(analysis.gc_percent || 0).toFixed(2)}%`],
    ["AT content", `${(analysis.at_percent || 0).toFixed(2)}%`],
  ]);
  const compTable = el("table", "data-table");
  compTable.innerHTML =
    "<thead><tr><th>Base</th><th>Count</th><th>Percentage</th></tr></thead><tbody>" +
    (analysis.counts
      ? ["A", "T", "G", "C"]
          .map(
            (b) =>
              `<tr><td class="mono">${b}</td><td>${analysis.counts[b]}</td>` +
              `<td>${(analysis.percentages[b] || 0).toFixed(2)}%</td></tr>`
          )
          .join("") +
        `<tr><td><strong>GC + AT</strong></td><td>${(analysis.gc_count || 0) + (analysis.at_count || 0)}</td>` +
        `<td><strong>${(analysis.gc_at_sum || 0).toFixed(2)}%</strong> (≈100%)</td></tr>`
      : "") +
    "</tbody>";
  const scroll1 = el("div", "table-scroll");
  scroll1.appendChild(compTable);
  compSec.appendChild(scroll1);
  addExplanation(compSec, explanations.composition);
  addExplanation(compSec, explanations.gc_content);
  doc.appendChild(compSec);

  /* 3. reverse complement */
  if (result.reverse_complement) {
    const rcSec = section("3 · Reverse complement");
    addSequenceBlock(rcSec, result.reverse_complement);
    addExplanation(rcSec, explanations.reverse_complement);
    doc.appendChild(rcSec);
  }

  /* 4. transcription */
  if (translation.rna) {
    const trSec = section("4 · DNA → RNA transcription");
    addSequenceBlock(trSec, translation.rna);
    addExplanation(trSec, explanations.transcription);
    doc.appendChild(trSec);
  }

  /* 5. codon analysis */
  if (translation.codons) {
    const codonSec = section("5 · Codon-level analysis");
    const codonGrid = el("div", "codon-grid");
    (translation.codons || []).forEach((codon) => {
      const chip = el("div", "codon-chip" + (codon.is_stop ? " stop" : ""));
      chip.appendChild(el("span", "codon", codon.codon));
      chip.appendChild(el("span", "aa", codon.is_stop ? "STOP" : codon.amino_acid));
      chip.appendChild(el("span", "codon-pos", `#${codon.position}`));
      codonGrid.appendChild(chip);
    });
    codonSec.appendChild(codonGrid);
    if (translation.leftover_length > 0) {
      codonSec.appendChild(
        el("div", "message info",
          `Incomplete codon: ${translation.leftover_length} trailing base(s) (${translation.leftover}) excluded from translation.`)
      );
    }
    doc.appendChild(codonSec);
  }

  /* 6. protein */
  if (translation.protein) {
    const protSec = section("6 · Protein translation");
    addSequenceBlock(protSec, translation.protein);
    addStatGrid(protSec, [
      ["Complete codons", translation.codon_count],
      ["Amino acids", translation.protein_length],
      ["Stop codons", translation.stops_seen],
      ["Leftover bases", translation.leftover_length],
    ]);
    addExplanation(protSec, explanations.translation);
    doc.appendChild(protSec);
  }

  /* 7. ORFs */
  const orfSec = section("7 · Open reading frames");
  if (orfResult.orfs && orfResult.orfs.length) {
    orfResult.orfs.forEach((orf, index) => {
      const card = el("div", "orf-card" + (orf.has_stop ? "" : " incomplete"));
      card.innerHTML =
        `<div class="orf-title"><strong>ORF ${index + 1}</strong>` +
        `<span class="badge${orf.has_stop ? "" : " incomplete"}">${orf.has_stop ? "Complete" : "No stop codon"}</span>` +
        `<span class="badge" style="background:var(--accent-soft);color:var(--accent);border-color:#c4ddef;">Frame ${orf.frame}</span></div>` +
        `<div class="orf-meta"><span>Start: <strong>${orf.start}</strong></span>` +
        `<span>Stop: <strong>${orf.stop !== null ? orf.stop : "—"}</strong></span>` +
        `<span>Length: <strong>${orf.length} nt</strong></span></div>` +
        `<div class="orf-dna">${orf.dna}</div>` +
        `<div class="orf-dna" style="color:var(--green)">Protein: ${orf.protein || "—"}</div>`;
      orfSec.appendChild(card);
    });
  } else {
    orfSec.appendChild(el("div", "message info",
      "No ORF satisfying the implemented start/stop search rules was detected."));
  }
  addExplanation(orfSec, explanations.orfs);
  doc.appendChild(orfSec);

  /* 8. comparison */
  if (comparison && comparison.valid) {
    const cmpSec = section("8 · Reference vs sample comparison");
    addStatGrid(cmpSec, [
      ["Positions compared", comparison.positions_compared],
      ["Matches", comparison.matches],
      ["Differences", comparison.differences],
      ["Similarity", `${comparison.similarity_percent.toFixed(2)}%`],
    ]);
    const table = el("table", "data-table");
    table.innerHTML =
      "<thead><tr><th>Position</th><th>Reference base</th><th>Sample base</th><th>Status</th></tr></thead><tbody>" +
      comparison.mismatches
        .map(
          (m) =>
            `<tr><td class="mono">${m.position}</td><td class="mono">${m.reference_base}</td>` +
            `<td class="mono">${m.sample_base}</td><td class="status-diff">${m.status}</td></tr>`
        )
        .join("") +
      "</tbody>";
    const scroll2 = el("div", "table-scroll");
    scroll2.appendChild(table);
    cmpSec.appendChild(scroll2);
    if (!comparison.mismatches.length) {
      cmpSec.appendChild(el("div", "message ok", "Every compared position matched."));
    }
    addExplanation(cmpSec, explanations.comparison);
    doc.appendChild(cmpSec);
  }

  /* 9. interpretation summary */
  const interpSec = section("9 · Plain-language interpretation");
  const entries = [
    ["Length", explanations.length],
    ["Composition", explanations.composition],
    ["GC / AT content", explanations.gc_content],
    ["Transcription", explanations.transcription],
    ["Translation", explanations.translation],
    ["Coding region (ORF)", explanations.orfs],
    ["Comparison", explanations.comparison],
  ];
  let added = false;
  entries.forEach(([title, text]) => {
    if (!text) return;
    added = true;
    const p = el("p", "explanation");
    p.innerHTML = `<strong>${title}.</strong> `;
    p.appendChild(document.createTextNode(text));
    interpSec.appendChild(p);
  });
  if (!added) interpSec.appendChild(el("p", "muted", "No interpretation available for this record."));
  doc.appendChild(interpSec);

  /* disclaimer */
  doc.appendChild(
    el(
      "p",
      "report-disclaimer",
      "Educational disclaimer: This report was generated by DNA Insight Lab for educational bioinformatics " +
        "using deterministic, rule-based computation. It does not provide medical diagnosis, clinical " +
        "interpretation, or forensic identification. Sequence differences do not automatically establish " +
        "disease, clinical significance, genetic risk, or identity."
    )
  );
}

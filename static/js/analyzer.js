/* DNA Insight Lab — Analyzer page logic (vanilla JS) */

"use strict";

let demoSequences = [];
let selectedDemoIndex = null;
let currentSource = null; // { type: "demo"|"user", label, length }
let lastResult = null;    // full API payload of the current analysis

document.addEventListener("DOMContentLoaded", async () => {
  demoSequences = await getDemoSequences();
  renderDemoList();
  bindCopyButtons();
  setSource(null);

  $("emptyLoadDemo").addEventListener("click", () => {
    $("demoCard").scrollIntoView({ behavior: "smooth", block: "center" });
    const first = document.querySelector(".demo-item");
    if (first) first.click();
  });
  $("emptyEnter").addEventListener("click", (event) => {
    event.preventDefault();
    $("sequenceInput").focus();
  });

  $("btnValidate").addEventListener("click", validateCustomSequence);
  $("btnAnalyze").addEventListener("click", runAnalysis);
  $("btnClear").addEventListener("click", clearAll);
  $("btnResetInput").addEventListener("click", clearAll);
  $("sequenceInput").addEventListener("input", () => {
    if ($("sequenceInput").value.trim() !== "") {
      selectCustomMode();
    } else if (selectedDemoIndex !== null) {
      setSource({ type: "demo", label: demoSequences[selectedDemoIndex].name, length: demoSequences[selectedDemoIndex].sequence.length });
    } else {
      setSource(null);
    }
  });
  $("sequenceInput").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runAnalysis();
  });

  $("btnSave").addEventListener("click", () => saveOrReport("save"));
  $("btnGenerateReport").addEventListener("click", () => saveOrReport("report"));

  const params = new URLSearchParams(window.location.search);
  const demoId = params.get("demo");
  if (demoId) {
    const index = demoSequences.findIndex((s) => s.id === demoId);
    if (index >= 0) selectDemo(index, { analyze: true });
  }
});

/* ---------- source status ---------- */

function setSource(source) {
  currentSource = source;
  const chip = $("sourceStatus");
  const detail = $("sourceDetail");
  $("demoCard").classList.remove("selected");
  $("customCard").classList.remove("selected");

  if (!source) {
    chip.textContent = "No sequence selected";
    chip.className = "status-line status-user";
    setText(detail, "Choose a demo or paste your own DNA.");
    return;
  }
  if (source.type === "demo") {
    chip.textContent = "Demo sequence loaded";
    chip.className = "status-line status-demo";
    setText(detail, `${source.label} — ${source.length} bp`);
    $("demoCard").classList.add("selected");
  } else {
    chip.textContent = "Using your entered sequence";
    chip.className = "status-line status-user";
    setText(detail, source.length ? `Custom DNA — ${source.length} characters` : "Custom DNA");
    $("customCard").classList.add("selected");
  }
}

/* ---------- demo mode ---------- */

function renderDemoList() {
  const list = $("demoList");
  list.innerHTML = "";
  demoSequences.forEach((demo, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "demo-item";
    item.innerHTML =
      `<strong>${demo.name}</strong>` +
      `<small>${demo.description}</small>` +
      `<span class="demo-bp">${demo.sequence.length} bp</span>`;
    item.addEventListener("click", () => selectDemo(index, { analyze: false }));
    list.appendChild(item);
  });
}

function selectDemo(index, { analyze }) {
  selectedDemoIndex = index;
  const demo = demoSequences[index];
  if (!demo) return;

  document.querySelectorAll(".demo-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  show($("demoPreview"));
  setText($("demoPreviewName"), demo.name);
  setText($("demoPreviewLen"), `${demo.sequence.length} bp`);
  setText($("demoPreviewSeq"), demo.sequence);

  $("sequenceInput").value = demo.sequence;
  hide($("validationMessage"));
  hide($("errorBox"));
  setSource({ type: "demo", label: demo.name, length: demo.sequence.length });

  if (analyze) runAnalysis();
}

/* ---------- custom mode ---------- */

function selectCustomMode() {
  document.querySelectorAll(".demo-item").forEach((el) => el.classList.remove("selected"));
  setSource({ type: "user", label: "Custom DNA", length: $("sequenceInput").value.trim().length });
}

async function validateCustomSequence() {
  const box = $("validationMessage");
  const raw = $("sequenceInput").value;
  const spinner = $("validateSpinner");

  if (!raw.trim()) {
    box.textContent = "Please enter a DNA sequence or choose a demo sequence.";
    box.className = "message error";
    show(box);
    return;
  }

  show(spinner);
  const result = await postJSON("/api/validate", { sequence: raw });
  hide(spinner);
  if (result.ok && result.data.valid) {
    box.textContent = `Valid DNA sequence — ${result.data.length} bases. Ready to analyze.`;
    box.className = "message ok";
  } else {
    box.textContent = (result.data && result.data.error) || "Invalid DNA sequence. Only A, T, G and C are accepted.";
    box.className = "message error";
  }
  show(box);
}

/* ---------- analysis ---------- */

function clearAll() {
  $("sequenceInput").value = "";
  selectedDemoIndex = null;
  document.querySelectorAll(".demo-item").forEach((el) => el.classList.remove("selected"));
  hide($("demoPreview"));
  hide($("validationMessage"));
  hide($("errorBox"));
  hide($("resultsArea"));
  show($("emptyState"));
  hide($("saveMessage"));
  hide($("reportMessage"));
  setSource(null);
}

function showError(message) {
  const box = $("errorBox");
  box.textContent = message;
  show(box);
  hide($("resultsArea"));
  show($("emptyState"));
}

async function runAnalysis() {
  const raw = $("sequenceInput").value.trim();
  hide($("errorBox"));

  if (!raw) {
    showError("Please enter a DNA sequence or choose a demo sequence.");
    return;
  }

  const btn = $("btnAnalyze");
  btn.disabled = true;
  btn.textContent = "Analyzing…";
  show($("analyzeSpinner"));

  const started = performance.now();
  try {
    const result = await postJSON("/api/analyze", { sequence: raw });
    if (!result.ok || !result.data.valid) {
      showError(result.data.error || "Invalid DNA sequence. Only A, T, G and C are accepted.");
      return;
    }
    lastResult = result.data;
    renderResults(result.data, Math.round(performance.now() - started));
  } catch {
    showError("The analysis could not be completed because the application server did not respond. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze DNA";
    hide($("analyzeSpinner"));
  }
}

function renderResults(data, elapsedMs) {
  const analysis = data.analysis;
  const translation = data.translation;

  hide($("emptyState"));
  hide($("errorBox"));
  show($("resultsArea"));

  /* source chip */
  const chip = $("resultSourceChip");
  if (currentSource && currentSource.type === "demo") {
    chip.textContent = "Demo sequence";
    chip.className = "status-line status-demo";
  } else {
    chip.textContent = "Your entered sequence";
    chip.className = "status-line status-user";
  }
  setText($("analyzeTime"), `computed in ${elapsedMs} ms`);

  /* result-first metrics */
  setText($("mGC"), analysis.gc_percent.toFixed(2) + "%");
  setText($("mAT"), analysis.at_percent.toFixed(2) + "%");
  setText($("mLen"), analysis.length + " bp");
  setText($("mA"), analysis.counts.A);
  setText($("mT"), analysis.counts.T);
  setText($("mG"), analysis.counts.G);
  setText($("mC"), analysis.counts.C);

  /* one concise line — detail lives in the interpretation section of the report */
  setText(
    $("explOneLiner"),
    `GC content is ${analysis.gc_percent.toFixed(2)}%, AT content is ${analysis.at_percent.toFixed(2)}%, ` +
    `and the sequence is ${analysis.length} bp long.`
  );

  /* full sequence is collapsed by default */
  renderColoredSequence($("seqDisplay"), analysis.sequence);

  /* composition table + charts */
  const tbody = $("compositionTable").querySelector("tbody");
  tbody.innerHTML = "";
  ["A", "T", "G", "C"].forEach((base) => {
    const row = document.createElement("tr");
    row.innerHTML =
      `<td class="mono" style="color:${BASE_COLORS[base]};font-weight:650">${base}</td>` +
      `<td class="num">${analysis.counts[base]}</td>` +
      `<td class="num">${analysis.percentages[base].toFixed(2)}%</td>`;
    tbody.appendChild(row);
  });
  const sumRow = document.createElement("tr");
  sumRow.innerHTML =
    `<td><strong>GC + AT</strong></td><td class="num">${analysis.gc_count + analysis.at_count}</td>` +
    `<td class="num"><strong>${analysis.gc_at_sum.toFixed(2)}%</strong></td>`;
  tbody.appendChild(sumRow);

  renderChart("compositionChart", {
    type: "bar",
    data: {
      labels: ["A", "T", "G", "C"],
      datasets: [{
        label: "Base count",
        data: [analysis.counts.A, analysis.counts.T, analysis.counts.G, analysis.counts.C],
        backgroundColor: [CHART_COLORS.A, CHART_COLORS.T, CHART_COLORS.G, CHART_COLORS.C],
        borderRadius: 4,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });

  renderChart("gcChart", {
    type: "doughnut",
    data: {
      labels: [`GC ${analysis.gc_percent.toFixed(1)}%`, `AT ${analysis.at_percent.toFixed(1)}%`],
      datasets: [{
        data: [analysis.gc_percent, analysis.at_percent],
        backgroundColor: [CHART_COLORS.GC, CHART_COLORS.AT],
        borderWidth: 1,
        borderColor: "#ffffff",
      }],
    },
    options: { cutout: "58%", plugins: { legend: { position: "bottom" } } },
  });

  /* transformation */
  renderColoredSequence($("rcDisplay"), data.reverse_complement);
  renderColoredSequence($("rnaDisplay"), translation.rna);
  setText(
    $("explTransform"),
    `The reverse complement reads the opposite strand in reverse. Transcription replaced all ${analysis.counts.T} T bases with U, producing a ${translation.rna.length}-base RNA transcript.`
  );

  /* translation pipeline */
  renderColoredSequence($("dnaDisplay"), translation.dna);
  renderColoredSequence($("rnaPipeline"), translation.rna);
  renderColoredSequence($("proteinDisplay"), translation.protein);

  setText($("statCodons"), translation.codon_count);
  setText($("statAa"), translation.protein_length);
  setText($("statStops"), translation.stops_seen);
  setText($("statLeftover"), translation.leftover_length);

  if (translation.leftover_length > 0) {
    $("leftoverNote").textContent =
      `Incomplete codon: ${translation.leftover_length} trailing base` +
      `${translation.leftover_length > 1 ? "s" : ""} (${translation.leftover}) could not form a complete codon and were excluded from translation.`;
    show($("leftoverNote"));
  } else {
    hide($("leftoverNote"));
  }

  /* codons collapsed by default */
  const codonGrid = $("codonGrid");
  codonGrid.innerHTML = "";
  translation.codons.forEach((codon) => {
    const chipEl = document.createElement("div");
    chipEl.className = "codon-chip" + (codon.is_stop ? " stop" : "");
    chipEl.innerHTML =
      `<span class="codon">${codon.codon}</span>` +
      `<span class="aa">${codon.is_stop ? "STOP" : codon.amino_acid}</span>` +
      `<span class="codon-pos">#${codon.position}</span>`;
    codonGrid.appendChild(chipEl);
  });
  $("codonDisclosure").open = false;

  /* ORFs: table first */
  renderOrfTable(translation, data.orfs);
  $("orfDisclosure").open = false;

  hide($("saveMessage"));
  hide($("reportMessage"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- ORF table ---------- */

function renderOrfTable(translation, orfResult) {
  const wrap = $("orfTableWrap");
  const detail = $("orfDetailBody");
  wrap.innerHTML = "";
  detail.innerHTML = "";

  if (!orfResult.orfs.length) {
    wrap.innerHTML =
      '<div class="message info" style="margin-top:0;">No ORF satisfying the implemented start/stop search rules was detected in this sequence.</div>';
    setText($("explOrfShort"),
      `The three forward reading frames contain no ATG start codon followed by an in-frame stop codon (TAA, TAG, TGA).`);
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.innerHTML =
    "<thead><tr><th>Frame</th><th class=\"num\">Start</th><th class=\"num\">Stop</th><th class=\"num\">Length</th><th>Status</th></tr></thead>";
  const tbody = document.createElement("tbody");
  orfResult.orfs.forEach((orf) => {
    const row = document.createElement("tr");
    row.innerHTML =
      `<td><span class="frame-chip">+${orf.frame}</span></td>` +
      `<td class="num">${orf.start}</td>` +
      `<td class="num">${orf.stop !== null ? orf.stop : "—"}</td>` +
      `<td class="num">${orf.length} bp</td>` +
      `<td>${orf.has_stop
        ? '<span class="badge">Complete</span>'
        : '<span class="badge incomplete">No stop</span>'}</td>`;
    tbody.appendChild(row);

    const card = document.createElement("div");
    card.className = "orf-detail";
    card.innerHTML =
      `<div class="orf-title"><strong>ORF ${orf.start}–${orf.stop !== null ? orf.stop : "end"} · frame +${orf.frame}</strong>` +
      ` <span class="badge${orf.has_stop ? "" : " incomplete"}">${orf.has_stop ? "Complete" : "No stop codon"}</span></div>` +
      `<div class="orf-dna">${orf.dna}</div>` +
      `<div class="orf-dna" style="color:var(--green)">Protein: ${orf.protein || "—"}</div>`;
    detail.appendChild(card);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  const complete = orfResult.orfs.filter((o) => o.has_stop);
  const longest = complete.length ? complete.reduce((a, b) => (a.length >= b.length ? a : b)) : null;
  let line;
  if (longest) {
    line =
      `${complete.length} complete ORF${complete.length > 1 ? "s" : ""} detected; the longest is ` +
      `${longest.length} bp in frame +${longest.frame}, translating to ${longest.protein.length} amino acids.`;
  } else {
    line = `${orfResult.orfs.length} start codon${orfResult.orfs.length > 1 ? "s" : ""} found with no downstream in-frame stop codon — listed as incomplete.`;
  }
  setText($("explOrfShort"), line);
}

/* ---------- save + report ---------- */

async function saveOrReport(mode) {
  const rawSequence = $("sequenceInput").value.trim();
  if (!rawSequence) return;

  const saveBtn = $("btnSave");
  const reportBtn = $("btnGenerateReport");
  const spinner = $("saveSpinner");
  saveBtn.disabled = true;
  reportBtn.disabled = true;
  show(spinner);

  try {
    const title = currentSource && currentSource.type === "demo"
      ? `${mode === "report" ? "Lab report" : "Demo analysis"} — ${currentSource.label}`
      : `${mode === "report" ? "Lab report" : "Analysis"} — custom DNA`;
    const result = await postJSON("/api/reports/save", { sequence: rawSequence, title });

    const box = mode === "report" ? $("reportMessage") : $("saveMessage");
    if (result.ok && result.data.valid) {
      if (mode === "report") {
        box.textContent = `Lab report #${result.data.id} generated. Opening it now…`;
        box.className = "message ok";
        show(box);
        window.location.href = `/reports?report=${result.data.id}`;
        return;
      }
      box.textContent = `Analysis saved (report #${result.data.id}). Open the Reports page to view it.`;
      box.className = "message ok";
    } else {
      box.textContent = (result.data && result.data.error) || "The operation could not be completed.";
      box.className = "message error";
    }
    show(box);
  } catch {
    const box = mode === "report" ? $("reportMessage") : $("saveMessage");
    box.textContent = "The operation could not be completed because the server did not respond. Please try again.";
    box.className = "message error";
    show(box);
  } finally {
    saveBtn.disabled = false;
    reportBtn.disabled = false;
    hide(spinner);
  }
}

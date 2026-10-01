/* DNA Insight Lab — Virtual DNA Lab experiments (vanilla JS) */

"use strict";

let demoSequences = [];
let demoComparisons = [];

const EXP_INPUTS = ["exp1Input", "exp2Input", "exp4Input"];
const EXP_SOURCES = { 1: "exp1Source", 2: "exp2Source", 3: "exp3Source", 4: "exp4Source" };

document.addEventListener("DOMContentLoaded", async () => {
  demoSequences = await getDemoSequences();
  demoComparisons = await getDemoComparisons();

  /* populate demo selects */
  for (const selectId of ["exp1Demo", "exp2Demo", "exp4Demo"]) {
    const select = $(selectId);
    demoSequences.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${item.name} (${item.sequence.length} bp)`;
      select.appendChild(option);
    });
  }
  const exp3Select = $("exp3Demo");
  demoComparisons.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = item.name;
    exp3Select.appendChild(option);
  });

  /* experiment 1 */
  $("exp1Run").addEventListener("click", runExperiment1);
  $("exp1LoadDemo").addEventListener("click", () => fillDemo("exp1Demo", "exp1Input", 1));

  /* experiment 2 */
  $("exp2Run").addEventListener("click", runExperiment2);
  $("exp2LoadDemo").addEventListener("click", () => fillDemo("exp2Demo", "exp2Input", 2));

  /* experiment 3 */
  $("exp3Run").addEventListener("click", runExperiment3);
  $("exp3LoadDemo").addEventListener("click", fillExp3Demo);

  /* experiment 4 */
  $("exp4Run").addEventListener("click", runExperiment4);
  $("exp4LoadDemo").addEventListener("click", () => fillDemo("exp4Demo", "exp4Input", 4));

  /* user typing marks the source as custom */
  EXP_INPUTS.forEach((id) => {
    $(id).addEventListener("input", () => updateExpSource(id));
  });
  ["exp3Ref", "exp3Sample"].forEach((id) => {
    $(id).addEventListener("input", () => updateExpSource("exp3Ref"));
  });
});

function updateExpSource(inputId) {
  const num = inputId.startsWith("exp1") ? 1 : inputId.startsWith("exp2") ? 2 : inputId.startsWith("exp4") ? 4 : 3;
  const label = $(EXP_SOURCES[num]);
  const filled = num === 3
    ? $("exp3Ref").value.trim() !== "" || $("exp3Sample").value.trim() !== ""
    : $(inputId).value.trim() !== "";
  if (!label) return;
  label.textContent = filled ? "Using your entered sequence." : "";
}

function fillDemo(selectId, inputId, expNum) {
  const index = parseInt($(selectId).value, 10);
  if (Number.isNaN(index) || !demoSequences[index]) return;
  const demo = demoSequences[index];
  $(inputId).value = demo.sequence; // demo data stays fully visible in the input
  const label = $(EXP_SOURCES[expNum]);
  if (label) label.textContent = `Demo sequence loaded — ${demo.name} (${demo.sequence.length} bp).`;
}

function fillExp3Demo() {
  const index = parseInt($("exp3Demo").value, 10);
  if (Number.isNaN(index) || !demoComparisons[index]) return;
  const pair = demoComparisons[index];
  $("exp3Ref").value = pair.reference;
  $("exp3Sample").value = pair.sample;
  $("exp3Source").textContent = `Demo pair loaded — ${pair.name}.`;
}

function setBusy(buttonId, busy) {
  const btn = $(buttonId);
  btn.disabled = busy;
  if (busy) {
    btn.dataset.original = btn.textContent;
    btn.textContent = "Running…";
  } else {
    btn.textContent = btn.dataset.original || "Run Experiment";
  }
}

function expError(num, message) {
  const box = $(`exp${num}Error`);
  box.textContent = message;
  show(box);
}

/* ---------- Experiment 1: What's Inside This DNA? ---------- */

async function runExperiment1() {
  const raw = $("exp1Input").value.trim();
  hide($("exp1Error"));
  hide($("exp1Results"));
  if (!raw) {
    expError(1, "Please enter a DNA sequence or load a demo sequence.");
    return;
  }
  setBusy("exp1Run", true);
  try {
    const result = await postJSON("/api/analyze", { sequence: raw });
    if (!result.ok || !result.data.valid) {
      expError(1, result.data.error || "Invalid DNA sequence. Only A, T, G and C are accepted.");
      return;
    }
    const analysis = result.data.analysis;
    show($("exp1Results"));
    setText($("exp1Length"), `${analysis.length} bp`);
    setText($("exp1A"), analysis.counts.A);
    setText($("exp1T"), analysis.counts.T);
    setText($("exp1G"), analysis.counts.G);
    setText($("exp1C"), analysis.counts.C);
    setText($("exp1GC"), `${analysis.gc_percent.toFixed(2)}%`);
    setText($("exp1AT"), `${analysis.at_percent.toFixed(2)}%`);

    renderChart("exp1Chart", {
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
        plugins: { legend: { display: false }, title: { display: true, text: "Nucleotide composition" } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    setText($("exp1Expl"), result.data.explanations.gc_content);
  } catch {
    expError(1, "The experiment could not run because the application server did not respond. Please try again.");
  } finally {
    setBusy("exp1Run", false);
  }
}

/* ---------- Experiment 2: From DNA to Protein ---------- */

async function runExperiment2() {
  const raw = $("exp2Input").value.trim();
  hide($("exp2Error"));
  hide($("exp2Results"));
  if (!raw) {
    expError(2, "Please enter a DNA sequence or load a demo sequence.");
    return;
  }
  setBusy("exp2Run", true);
  try {
    const result = await postJSON("/api/analyze", { sequence: raw });
    if (!result.ok || !result.data.valid) {
      expError(2, result.data.error || "Invalid DNA sequence. Only A, T, G and C are accepted.");
      return;
    }
    const translation = result.data.translation;
    show($("exp2Results"));

    setText($("exp2CodonCount"), translation.codon_count);
    setText($("exp2AaCount"), translation.protein_length);
    setText($("exp2StopCount"), translation.stops_seen);

    renderColoredSequence($("exp2Rna"), translation.rna);
    renderColoredSequence($("exp2Protein"), translation.protein);

    const codonGrid = $("exp2Codons");
    codonGrid.innerHTML = "";
    translation.codons.forEach((codon) => {
      const chip = document.createElement("div");
      chip.className = "codon-chip" + (codon.is_stop ? " stop" : "");
      chip.innerHTML =
        `<span class="codon">${codon.codon}</span>` +
        `<span class="aa">${codon.is_stop ? "STOP" : codon.amino_acid}</span>` +
        `<span class="codon-pos">#${codon.position}</span>`;
      codonGrid.appendChild(chip);
    });

    const leftoverNote = $("exp2Leftover");
    if (translation.leftover_length > 0) {
      leftoverNote.textContent =
        `Incomplete codon: ${translation.leftover_length} trailing base` +
        `${translation.leftover_length > 1 ? "s" : ""} (${translation.leftover}) could not form a complete codon.`;
      show(leftoverNote);
    } else {
      hide(leftoverNote);
    }

    setText($("exp2Expl"), result.data.explanations.translation);
  } catch {
    expError(2, "The experiment could not run because the application server did not respond. Please try again.");
  } finally {
    setBusy("exp2Run", false);
  }
}

/* ---------- Experiment 3: What Changed? ---------- */

async function runExperiment3() {
  const reference = $("exp3Ref").value.trim();
  const sample = $("exp3Sample").value.trim();
  hide($("exp3Error"));
  hide($("exp3Results"));
  if (!reference || !sample) {
    expError(3, "Please enter both a reference and a sample sequence, or load a demo pair.");
    return;
  }
  setBusy("exp3Run", true);
  try {
    const result = await postJSON("/api/compare", { reference, sample });
    if (!result.ok || !result.data.valid) {
      expError(3, result.data.error || "The comparison could not be completed.");
      return;
    }
    const data = result.data;
    show($("exp3Results"));
    setText($("exp3Compared"), data.positions_compared);
    setText($("exp3Matches"), data.matches);
    setText($("exp3Diffs"), data.differences);
    setText($("exp3Similarity"), `${data.similarity_percent.toFixed(2)}%`);

    const tbody = $("exp3Table").querySelector("tbody");
    tbody.innerHTML = "";
    data.mismatches.forEach((m) => {
      const row = document.createElement("tr");
      row.innerHTML =
        `<td class="mono">${m.position}</td>` +
        `<td class="mono" style="color:${BASE_COLORS[m.reference_base] || "inherit"}">${m.reference_base}</td>` +
        `<td class="mono" style="color:${BASE_COLORS[m.sample_base] || "inherit"}">${m.sample_base}</td>` +
        `<td class="status-diff">${m.status}</td>`;
      tbody.appendChild(row);
    });

    if (data.mismatches.length === 0) {
      show($("exp3NoMismatch"));
    } else {
      hide($("exp3NoMismatch"));
    }

    renderChart("exp3Chart", {
      type: "bar",
      data: {
        labels: ["Matching", "Different"],
        datasets: [{
          label: "Positions",
          data: [data.matches, data.differences],
          backgroundColor: [CHART_COLORS.match, CHART_COLORS.diff],
          borderRadius: 4,
        }],
      },
      options: {
        plugins: { legend: { display: false }, title: { display: true, text: "Matching vs different positions" } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    setText($("exp3Expl"), data.explanation);
  } catch {
    expError(3, "The experiment could not run because the application server did not respond. Please try again.");
  } finally {
    setBusy("exp3Run", false);
  }
}

/* ---------- Experiment 4: Find the Coding Region ---------- */

async function runExperiment4() {
  const raw = $("exp4Input").value.trim();
  hide($("exp4Error"));
  hide($("exp4Results"));
  if (!raw) {
    expError(4, "Please enter a DNA sequence or load a demo sequence.");
    return;
  }
  setBusy("exp4Run", true);
  try {
    const result = await postJSON("/api/analyze", { sequence: raw });
    if (!result.ok || !result.data.valid) {
      expError(4, result.data.error || "Invalid DNA sequence. Only A, T, G and C are accepted.");
      return;
    }
    const orfResult = result.data.orfs;
    show($("exp4Results"));

    const container = $("exp4Orfs");
    container.innerHTML = "";

    if (!orfResult.orfs.length) {
      const empty = document.createElement("div");
      empty.className = "message info";
      empty.textContent = "No ORF satisfying the implemented start/stop search rules was detected in this sequence.";
      container.appendChild(empty);
    }

    orfResult.orfs.forEach((orf, index) => {
      const card = document.createElement("div");
      card.className = "orf-card" + (orf.has_stop ? "" : " incomplete");
      card.innerHTML =
        `<div class="orf-title"><strong>ORF ${index + 1}</strong>` +
        `<span class="badge${orf.has_stop ? "" : " incomplete"}">${orf.has_stop ? "Complete" : "No stop codon"}</span>` +
        `<span class="badge" style="background:var(--accent-soft);color:var(--accent);border-color:#c4ddef;">Frame ${orf.frame}</span></div>` +
        `<div class="orf-meta"><span>Start: <strong>${orf.start}</strong></span>` +
        `<span>Stop: <strong>${orf.stop !== null ? orf.stop : "—"}</strong></span>` +
        `<span>Length: <strong>${orf.length} nt</strong></span></div>` +
        `<div class="orf-dna">${orf.dna}</div>` +
        `<div class="orf-dna" style="color:var(--green)">Protein: ${orf.protein || "—"}</div>`;
      container.appendChild(card);
    });

    setText($("exp4Expl"), result.data.explanations.orfs);
  } catch {
    expError(4, "The experiment could not run because the application server did not respond. Please try again.");
  } finally {
    setBusy("exp4Run", false);
  }
}

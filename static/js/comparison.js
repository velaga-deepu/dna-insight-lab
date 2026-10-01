/* DNA Insight Lab — Comparison page logic (vanilla JS) */

"use strict";

let demoComparisons = [];
let selectedExample = null;

document.addEventListener("DOMContentLoaded", async () => {
  demoComparisons = await getDemoComparisons();

  $("btnCompare").addEventListener("click", runComparison);
  $("btnClearCompare").addEventListener("click", clearCompare);
  $("btnLoadExample").addEventListener("click", () => {
    $("examplePanel").classList.contains("hidden") ? showExamplePanel() : hide($("examplePanel"));
  });
  $("emptyLoadExample").addEventListener("click", () => {
    showExamplePanel();
    $("referenceInput").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("referenceInput").addEventListener("input", () => { updateLenLabels(); updateSourceStatus(); });
  $("sampleInput").addEventListener("input", () => { updateLenLabels(); updateSourceStatus(); });

  renderExampleList();
  updateSourceStatus();

  const params = new URLSearchParams(window.location.search);
  const example = params.get("example");
  if (example !== null && demoComparisons[parseInt(example, 10)]) {
    loadExample(parseInt(example, 10));
    runComparison();
  }
});

function updateLenLabels() {
  setText($("refLenLabel"),
    $("referenceInput").value.trim() ? `${$("referenceInput").value.trim().length} characters entered` : "");
  setText($("sampleLenLabel"),
    $("sampleInput").value.trim() ? `${$("sampleInput").value.trim().length} characters entered` : "");
}

function updateSourceStatus() {
  const chip = $("compareSourceStatus");
  const hasAny = $("referenceInput").value.trim() !== "" || $("sampleInput").value.trim() !== "";
  if (selectedExample !== null && demoComparisons[selectedExample]) {
    chip.textContent = "Demo example pair loaded";
    chip.className = "status-line status-demo";
  } else if (hasAny) {
    chip.textContent = "Using your entered sequences";
    chip.className = "status-line status-user";
  } else {
    chip.textContent = "Enter both sequences";
    chip.className = "status-line status-user";
  }
}

function showExamplePanel() {
  show($("examplePanel"));
}

function renderExampleList() {
  const list = $("exampleList");
  list.innerHTML = "";
  demoComparisons.forEach((pair, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "demo-item";
    item.innerHTML =
      `<strong>${pair.name}</strong>` +
      `<small>${pair.notes}</small>` +
      `<span class="demo-bp">Ref ${pair.reference.length} bp · Sample ${pair.sample.length} bp</span>`;
    item.addEventListener("click", () => loadExample(index));
    list.appendChild(item);
  });
}

function loadExample(index) {
  selectedExample = index;
  const pair = demoComparisons[index];
  if (!pair) return;

  document.querySelectorAll("#exampleList .demo-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  $("referenceInput").value = pair.reference;
  $("sampleInput").value = pair.sample;
  hide($("compareError"));
  hide($("compareResults"));
  show($("compareEmpty"));
  updateLenLabels();
  updateSourceStatus();
}

function clearCompare() {
  $("referenceInput").value = "";
  $("sampleInput").value = "";
  selectedExample = null;
  document.querySelectorAll("#exampleList .demo-item").forEach((el) => el.classList.remove("selected"));
  hide($("compareResults"));
  hide($("compareError"));
  hide($("examplePanel"));
  show($("compareEmpty"));
  updateLenLabels();
  updateSourceStatus();
}

async function runComparison() {
  const reference = $("referenceInput").value.trim();
  const sample = $("sampleInput").value.trim();

  const errorBox = $("compareError");
  hide(errorBox);

  if (!reference || !sample) {
    errorBox.textContent = "Please enter both a reference and a sample sequence, or load an example pair.";
    show(errorBox);
    return;
  }

  const btn = $("btnCompare");
  btn.disabled = true;
  btn.textContent = "Comparing…";
  show($("compareSpinner"));

  try {
    const result = await postJSON("/api/compare", { reference, sample });
    if (!result.ok || !result.data.valid) {
      errorBox.textContent = result.data.error || "The comparison could not be completed.";
      show(errorBox);
      return;
    }
    renderComparison(result.data);
  } catch {
    errorBox.textContent = "The comparison could not be completed because the application server did not respond. Please try again.";
    show(errorBox);
  } finally {
    btn.disabled = false;
    btn.textContent = "Compare";
    hide($("compareSpinner"));
  }
}

function renderComparison(data) {
  hide($("compareEmpty"));
  show($("compareResults"));

  const chip = $("compareSourceChip");
  if (selectedExample !== null) {
    chip.textContent = "Demo example pair";
    chip.className = "status-line status-demo";
  } else {
    chip.textContent = "Your entered sequences";
    chip.className = "status-line status-user";
  }

  setText($("statSimilarity"), `${data.similarity_percent.toFixed(2)}%`);
  setText($("statDifference"), `${data.difference_percent.toFixed(2)}%`);
  setText($("statCompared"), data.positions_compared);
  setText($("statMatches"), data.matches);
  setText($("statDiffs"), data.differences);

  setText(
    $("explComparisonShort"),
    data.differences === 0
      ? `All ${data.positions_compared} compared positions are identical.`
      : `${data.differences} of ${data.positions_compared} compared positions differ (${data.similarity_percent.toFixed(2)}% similarity).`
  );

  /* alignment view */
  const mismatchPositions = new Set(data.mismatches.map((m) => m.position));
  renderAlignment($("alignRef"), data.reference, mismatchPositions);
  renderAlignment($("alignSample"), data.sample, mismatchPositions);

  const markers = $("alignMarkers");
  markers.textContent = "";
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= data.positions_compared; i++) {
    const span = document.createElement("span");
    span.className = mismatchPositions.has(i) ? "marker" : "marker-dot";
    span.textContent = mismatchPositions.has(i) ? "▲" : "·";
    frag.appendChild(span);
  }
  markers.appendChild(frag);

  /* mismatch table */
  const tbody = $("mismatchTable").querySelector("tbody");
  tbody.innerHTML = "";
  data.mismatches.forEach((m) => {
    const row = document.createElement("tr");
    row.innerHTML =
      `<td class="num">${m.position}</td>` +
      `<td class="mono" style="color:${BASE_COLORS[m.reference_base] || "inherit"}">${m.reference_base}</td>` +
      `<td class="mono" style="color:${BASE_COLORS[m.sample_base] || "inherit"}">${m.sample_base}</td>` +
      `<td class="status-diff">${m.status}</td>`;
    tbody.appendChild(row);
  });

  if (data.mismatches.length === 0) {
    show($("noMismatches"));
  } else {
    hide($("noMismatches"));
  }

  const unalignedNote = $("unalignedNote");
  if (!data.equal_lengths) {
    const refExtra = data.unaligned_reference_bases || "";
    const sampleExtra = data.unaligned_sample_bases || "";
    let message = "The two sequences have different lengths. ";
    if (refExtra) message += `${refExtra.length} trailing reference base${refExtra.length > 1 ? "s" : ""} had no sample partner. `;
    if (sampleExtra) message += `${sampleExtra.length} trailing sample base${sampleExtra.length > 1 ? "s" : ""} had no reference partner. `;
    message += "Only the overlapping region was compared.";
    unalignedNote.textContent = message;
    show(unalignedNote);
  } else {
    hide(unalignedNote);
  }

  renderChart("comparisonChart", {
    type: "bar",
    data: {
      labels: ["Matching positions", "Different positions"],
      datasets: [{
        label: "Positions",
        data: [data.matches, data.differences],
        backgroundColor: [CHART_COLORS.match, CHART_COLORS.diff],
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderAlignment(el, sequence, mismatchPositions) {
  if (!el) return;
  el.textContent = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < sequence.length; i++) {
    const span = document.createElement("span");
    span.textContent = sequence[i];
    span.className = mismatchPositions.has(i + 1) ? "mismatch-base" : "match-base";
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

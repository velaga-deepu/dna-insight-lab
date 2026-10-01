/* DNA Insight Lab — shared app utilities (vanilla JS) */

"use strict";

/* ---------- small helpers ---------- */

function $(id) { return document.getElementById(id); }

function show(el) { if (el) el.classList.remove("hidden"); }
function hide(el) { if (el) el.classList.add("hidden"); }

function setText(el, text) { if (el) el.textContent = text; }

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getJSON(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

/* ---------- navigation (mobile) ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const toggle = $("navToggle");
  const nav = $("siteNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
});

/* ---------- copy buttons ---------- */

function bindCopyButtons(root = document) {
  root.querySelectorAll(".copy-btn").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", async () => {
      const target = $(btn.dataset.copyTarget);
      if (!target) return;
      const text = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* clipboard unavailable; ignore */
      }
      const original = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = original; }, 1300);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => bindCopyButtons());

/* ---------- sequence rendering ---------- */

const BASE_COLORS = {
  A: "var(--base-a)",
  T: "var(--base-t)",
  G: "var(--base-g)",
  C: "var(--base-c)",
  U: "var(--base-u)",
};

function renderColoredSequence(el, sequence) {
  if (!el) return;
  el.textContent = "";
  const frag = document.createDocumentFragment();
  for (const ch of sequence) {
    const span = document.createElement("span");
    span.textContent = ch;
    if (BASE_COLORS[ch]) span.style.color = BASE_COLORS[ch];
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

/* ---------- Chart.js defaults ---------- */

if (window.Chart) {
  Chart.defaults.color = "#52606d";
  Chart.defaults.borderColor = "#d4d9de";
  Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
}

const CHART_COLORS = {
  A: "#1a7f4e",
  T: "#b23a3a",
  G: "#8a6116",
  C: "#275e8e",
  GC: "#1f6feb",
  AT: "#1a7f4e",
  match: "#1a7f4e",
  diff: "#b23a3a",
};

const chartRegistry = new Map();

function renderChart(canvasId, config) {
  const canvas = $(canvasId);
  if (!canvas || !window.Chart) return null;
  if (chartRegistry.has(canvasId)) {
    chartRegistry.get(canvasId).destroy();
  }
  const chart = new Chart(canvas, config);
  chartRegistry.set(canvasId, chart);
  return chart;
}

/* ---------- demo data loading ---------- */

let demoSequencesCache = null;
let demoComparisonsCache = null;

async function getDemoSequences() {
  if (demoSequencesCache) return demoSequencesCache;
  const result = await getJSON("/api/demo/sequences");
  demoSequencesCache = (result.data && result.data.sequences) || [];
  return demoSequencesCache;
}

async function getDemoComparisons() {
  if (demoComparisonsCache) return demoComparisonsCache;
  const result = await getJSON("/api/demo/comparisons");
  demoComparisonsCache = (result.data && result.data.comparisons) || [];
  return demoComparisonsCache;
}

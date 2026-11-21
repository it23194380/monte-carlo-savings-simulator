"use strict";

// Match the Python notebook's baseline assumptions
const MONTHS = 120;
const TARGET = 2_000_000;
const TOTAL_PATHS = 10_000;
const BATCH_SIZE = 100;
const ANNUAL_RETURN_VOL = 0.12;
const ANNUAL_INFLATION_VOL = 0.02;

const contributionInput = document.getElementById("contribution");
const returnInput = document.getElementById("returnRate");
const inflationInput = document.getElementById("inflationRate");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const probabilityOutput = document.getElementById("probability");
const meanOutput = document.getElementById("meanSavings");
const progressOutput = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const canvas = document.getElementById("savingsChart");
const ctx = canvas.getContext("2d");

let timer = null;
let completedPaths = 0;
let successes = 0;
let totalFinalRealSavings = 0;
let pathSums = new Float64Array(MONTHS + 1);

// Seeded random generator for reproducible browser results
let random;

function makeRandom(seed) {
  let state = seed >>> 0;

  return function () {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
}

// Standard normal random variable using Box-Muller
function randomNormal() {
  const u1 = random();
  const u2 = random();

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function getParameters() {
  const contribution = Number(contributionInput.value);
  const annualReturn = Number(returnInput.value) / 100;
  const annualInflation = Number(inflationInput.value) / 100;

  if (
    !Number.isFinite(contribution) ||
    !Number.isFinite(annualReturn) ||
    !Number.isFinite(annualInflation) ||
    contribution < 0 ||
    annualReturn < -1 ||
    annualInflation < -1
  ) {
    alert("Please enter valid simulation parameters.");
    return null;
  }

  return { contribution, annualReturn, annualInflation };
}

function simulatePath(params) {
  let savings = 0;
  let inflationIndex = 1;

  const path = new Float64Array(MONTHS + 1);

  const monthlyReturnMean = params.annualReturn / 12;
  const monthlyInflationMean = params.annualInflation / 12;

  const returnStd = ANNUAL_RETURN_VOL / Math.sqrt(12);
  const inflationStd = ANNUAL_INFLATION_VOL / Math.sqrt(12);

  for (let month = 1; month <= MONTHS; month++) {
    const monthlyReturn = monthlyReturnMean + returnStd * randomNormal();

    const monthlyInflation =
      monthlyInflationMean + inflationStd * randomNormal();

    savings = savings * (1 + monthlyReturn) + params.contribution;

    inflationIndex *= 1 + monthlyInflation;

    // Guard against invalid numerical scenarios
    if (
      !Number.isFinite(savings) ||
      !Number.isFinite(inflationIndex) ||
      inflationIndex <= 0
    ) {
      return null;
    }

    path[month] = savings / inflationIndex;
  }

  return path;
}

function runBatch(params) {
  const remaining = TOTAL_PATHS - completedPaths;
  const batchCount = Math.min(BATCH_SIZE, remaining);

  for (let i = 0; i < batchCount; i++) {
    const path = simulatePath(params);

    if (path === null) {
      stopSimulation();
      alert("A numerical error occurred.");
      return;
    }

    for (let month = 0; month <= MONTHS; month++) {
      pathSums[month] += path[month];
    }

    const finalRealSavings = path[MONTHS];

    totalFinalRealSavings += finalRealSavings;

    if (finalRealSavings >= TARGET) {
      successes++;
    }

    completedPaths++;
  }

  updateResults();
  drawChart();

  if (completedPaths >= TOTAL_PATHS) {
    stopSimulation();
  }
}

function updateResults() {
  progressOutput.textContent = `${completedPaths.toLocaleString()} / ${TOTAL_PATHS.toLocaleString()}`;

  progressBar.style.width = `${(completedPaths / TOTAL_PATHS) * 100}%`;

  if (completedPaths === 0) {
    probabilityOutput.textContent = "--";
    meanOutput.textContent = "--";
    return;
  }

  const probability = successes / completedPaths;
  const meanSavings = totalFinalRealSavings / completedPaths;

  probabilityOutput.textContent = `${(probability * 100).toFixed(2)}%`;

  meanOutput.textContent =
    "LKR " +
    meanSavings.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
}

function drawChart() {
  const width = canvas.width;
  const height = canvas.height;

  const left = 85;
  const right = 25;
  const top = 30;
  const bottom = 55;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  const meanPath = Array.from(pathSums, (value) =>
    completedPaths > 0 ? value / completedPaths : 0,
  );

  const maxSavings = Math.max(TARGET * 1.2, ...meanPath);

  const x = (month) => left + (month / MONTHS) * plotWidth;

  const y = (savings) => top + plotHeight - (savings / maxSavings) * plotHeight;

  // Grid and Y-axis labels
  ctx.strokeStyle = "#334155";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial";

  for (let i = 0; i <= 5; i++) {
    const value = (maxSavings * i) / 5;
    const py = y(value);

    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(width - right, py);
    ctx.stroke();

    ctx.fillText((value / 1_000_000).toFixed(1) + "M", 35, py + 4);
  }

  // X-axis labels in years
  for (let year = 0; year <= 10; year += 2) {
    ctx.fillText(String(year), x(year * 12) - 4, height - 28);
  }

  // Savings target line
  ctx.strokeStyle = "#f87171";
  ctx.setLineDash([8, 5]);
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x(0), y(TARGET));
  ctx.lineTo(x(MONTHS), y(TARGET));
  ctx.stroke();

  ctx.setLineDash([]);

  // Mean real savings trajectory
  if (completedPaths > 0) {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;

    ctx.beginPath();

    for (let month = 0; month <= MONTHS; month++) {
      if (month === 0) {
        ctx.moveTo(x(month), y(meanPath[month]));
      } else {
        ctx.lineTo(x(month), y(meanPath[month]));
      }
    }

    ctx.stroke();
  }

  // Legend
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("Mean real savings", left + 10, 20);

  ctx.fillStyle = "#f87171";
  ctx.fillText("Target: LKR 2M", left + 190, 20);

  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Years", width / 2, height - 8);
}

function stopSimulation() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startSimulation() {
  if (timer !== null || completedPaths >= TOTAL_PATHS) {
    return;
  }

  const params = getParameters();
  if (!params) return;

  // Lock inputs while simulation is active or paused
  contributionInput.disabled = true;
  returnInput.disabled = true;
  inflationInput.disabled = true;

  timer = setInterval(() => {
    runBatch(params);
  }, 30);
}

function pauseSimulation() {
  stopSimulation();
}

function resetSimulation() {
  stopSimulation();

  completedPaths = 0;
  successes = 0;
  totalFinalRealSavings = 0;
  pathSums = new Float64Array(MONTHS + 1);

  random = makeRandom(42);

  contributionInput.disabled = false;
  returnInput.disabled = false;
  inflationInput.disabled = false;

  updateResults();
  drawChart();
}

startBtn.addEventListener("click", startSimulation);
pauseBtn.addEventListener("click", pauseSimulation);
resetBtn.addEventListener("click", resetSimulation);

// Initialize the simulator
resetSimulation();

function verifySavingsModel() {
  const contribution = 15000;
  const monthlyReturn = 0.08 / 12;
  const months = 120;

  // Deterministic monthly savings recurrence
  let savings = 0;

  for (let month = 0; month < months; month++) {
    savings = savings * (1 + monthlyReturn) + contribution;
  }

  // Independent analytical future-value formula
  const expected =
    (contribution * (Math.pow(1 + monthlyReturn, months) - 1)) / monthlyReturn;

  const error = Math.abs(savings - expected);

  console.log("Savings model verification");
  console.log("Recurrence:", savings.toFixed(2));
  console.log("Analytical:", expected.toFixed(2));
  console.log("Absolute error:", error);

  console.assert(error < 0.01, "Savings model verification FAILED");

  if (error < 0.01) {
    console.log("Savings model verification PASSED!");
  }
}

verifySavingsModel();

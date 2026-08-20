<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { PropertyProjection } from "../types";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

const props = defineProps<{ projections: PropertyProjection[] }>();

const canvasRefs = ref<Record<number, HTMLCanvasElement | null>>({});
const charts = ref<Record<number, Chart | null>>({});

function setCanvasRef(el: unknown, id: number) {
  canvasRefs.value[id] = el as HTMLCanvasElement | null;
}

function findBreakEvenYear(proj: PropertyProjection): number | null {
  if (proj.snapshots.length === 0) return null;
  const firstSign = proj.snapshots[0].keepVsSell >= 0;
  for (const s of proj.snapshots) {
    if (s.keepVsSell >= 0 !== firstSign) return s.year;
  }
  return null;
}

function findOptimalSellYear(proj: PropertyProjection): number | null {
  if (proj.snapshots.length === 0) return null;
  let best = proj.snapshots[0];
  for (const s of proj.snapshots) {
    if (s.keepVsSell > best.keepVsSell) best = s;
  }
  return best.keepVsSell > 0 ? best.year : null;
}

function buildChart(proj: PropertyProjection) {
  const canvas = canvasRefs.value[proj.propertyId];
  if (!canvas) return;

  if (charts.value[proj.propertyId]) {
    charts.value[proj.propertyId]!.destroy();
  }

  const labels = proj.snapshots.map((s) => `Year ${s.year}`);
  const keepData = proj.snapshots.map((s) => s.keepNetWorth);
  const sellData = proj.snapshots.map((s) => s.sellNetWorth);
  const refiData = proj.snapshots.map((s) =>
    proj.refiBranchYear && s.year >= proj.refiBranchYear
      ? s.refiNetWorth
      : null,
  );

  const breakEven = findBreakEvenYear(proj);
  const optimalSell = findOptimalSellYear(proj);
  const branchYear = proj.refiBranchYear;

  // Build point styles for milestones
  const keepPointRadius = proj.snapshots.map((s) => {
    if (s.year === optimalSell) return 10;
    if (s.year === breakEven) return 8;
    if (
      s.keepMortgageBalance <= 0 &&
      (s.year === 1 || proj.snapshots[s.year - 2]?.keepMortgageBalance > 0)
    )
      return 8;
    return 3;
  });
  const sellPointRadius = proj.snapshots.map((s) => {
    if (s.year === optimalSell) return 10;
    if (s.year === breakEven) return 8;
    return 3;
  });

  charts.value[proj.propertyId] = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Keep: Net Worth",
          data: keepData,
          borderColor: "#198754",
          backgroundColor: "rgba(25, 135, 84, 0.1)",
          fill: false,
          tension: 0.3,
          pointRadius: keepPointRadius,
          pointBackgroundColor: proj.snapshots.map((s) => {
            if (s.year === optimalSell) return "#e91e63";
            if (s.year === breakEven) return "#ff9800";
            if (
              s.keepMortgageBalance <= 0 &&
              (s.year === 1 ||
                proj.snapshots[s.year - 2]?.keepMortgageBalance > 0)
            )
              return "#6f42c1";
            return "#198754";
          }),
        },
        {
          label: "Sell: Net Worth",
          data: sellData,
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13, 110, 253, 0.1)",
          fill: false,
          tension: 0.3,
          pointRadius: sellPointRadius,
          pointBackgroundColor: proj.snapshots.map((s) => {
            if (s.year === optimalSell) return "#e91e63";
            if (s.year === breakEven) return "#ff9800";
            return "#0d6efd";
          }),
        },
        {
          label: "Refi/HE Loan: Net Worth",
          data: refiData,
          borderColor: "#e65100",
          backgroundColor: "rgba(230, 81, 0, 0.1)",
          fill: false,
          tension: 0.3,
          spanGaps: false,
          pointRadius: proj.snapshots.map((s) => {
            if (s.year === branchYear) return 10;
            return 3;
          }),
          pointBackgroundColor: proj.snapshots.map((s) => {
            if (s.year === branchYear) return "#d500f9";
            return "#e65100";
          }),
          pointStyle: proj.snapshots.map((s) =>
            s.year === branchYear ? "rectDiamond" : "circle",
          ),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y ?? 0;
              const formatted = val.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              });
              return `${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) =>
              Number(val).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
                notation: "compact",
              }),
          },
        },
      },
    },
  });
}

function buildAllCharts() {
  for (const proj of props.projections) {
    buildChart(proj);
  }
}

onMounted(() => {
  setTimeout(buildAllCharts, 50);
});

watch(
  () => props.projections,
  () => {
    setTimeout(buildAllCharts, 50);
  },
  { deep: true },
);
</script>

<template>
  <div
    v-for="proj in projections"
    :key="proj.propertyId"
    class="chart-container"
  >
    <h3>{{ proj.propertyName }}</h3>
    <div class="chart-wrapper">
      <canvas :ref="(el) => setCanvasRef(el, proj.propertyId)"></canvas>
    </div>
    <div class="chart-legend-notes">
      <span class="legend-dot" style="background: #e91e63"></span> Optimal sell
      year
      <span
        class="legend-dot"
        style="background: #ff9800; margin-left: 1rem"
      ></span>
      Break-even point
      <span
        class="legend-dot"
        style="background: #6f42c1; margin-left: 1rem"
      ></span>
      Mortgage paid off
      <span
        class="legend-dot"
        style="background: #d500f9; margin-left: 1rem"
      ></span>
      Refi branch point
    </div>
  </div>
</template>

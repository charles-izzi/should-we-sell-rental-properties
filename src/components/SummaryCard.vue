<script setup lang="ts">
import type { PropertyProjection } from "../types";

defineProps<{ projections: PropertyProjection[] }>();

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function breakEvenYear(proj: PropertyProjection): number | null {
  if (proj.snapshots.length === 0) return null;
  const firstSign = proj.snapshots[0].keepVsSell >= 0;
  for (const s of proj.snapshots) {
    if (s.keepVsSell >= 0 !== firstSign) return s.year;
  }
  return null;
}

function optimalKeepYear(
  proj: PropertyProjection,
): { year: number; difference: number } | null {
  if (proj.snapshots.length === 0) return null;
  let best = proj.snapshots[0];
  for (const s of proj.snapshots) {
    if (s.keepVsSell > best.keepVsSell) best = s;
  }
  return { year: best.year, difference: best.keepVsSell };
}

function peakRefiAdvantage(
  proj: PropertyProjection,
): { year: number; advantage: number } | null {
  if (proj.snapshots.length === 0) return null;
  let best = proj.snapshots[0];
  for (const s of proj.snapshots) {
    if (s.refiVsSell > best.refiVsSell) best = s;
  }
  return { year: best.year, advantage: best.refiVsSell };
}
</script>

<template>
  <div v-for="proj in projections" :key="proj.propertyId" class="summary-card">
    <h3 class="summary-title">{{ proj.propertyName }}</h3>
    <div class="summary-items">
      <div class="summary-item" v-if="optimalKeepYear(proj)">
        <span class="summary-label">Peak Keep Advantage:</span>
        <span class="summary-value">
          Year {{ optimalKeepYear(proj)!.year }} ({{
            fmt(optimalKeepYear(proj)!.difference)
          }}
          vs sell)
        </span>
      </div>
      <div class="summary-item" v-if="breakEvenYear(proj)">
        <span class="summary-label">Keep vs Sell Break-even:</span>
        <span class="summary-value">Year {{ breakEvenYear(proj) }}</span>
      </div>
      <div class="summary-item" v-if="proj.refiBranchYear">
        <span class="summary-label">Optimal Refi Year:</span>
        <span class="summary-value">
          Year {{ proj.refiBranchYear }} ({{ fmt(proj.refiEquityExtracted) }}
          extracted)
        </span>
      </div>
      <div class="summary-item" v-if="peakRefiAdvantage(proj)">
        <span class="summary-label">Peak Refi Advantage:</span>
        <span class="summary-value">
          Year {{ peakRefiAdvantage(proj)!.year }} ({{
            fmt(peakRefiAdvantage(proj)!.advantage)
          }}
          vs sell)
        </span>
      </div>
      <div class="summary-item" v-if="!proj.refiBranchYear">
        <span class="summary-label">Refi/Home Equity Loan:</span>
        <span class="summary-value">Insufficient equity to extract</span>
      </div>
    </div>
  </div>
</template>

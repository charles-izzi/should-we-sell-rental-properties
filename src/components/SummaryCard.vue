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
  const firstSign = proj.snapshots[0].difference >= 0;
  for (const s of proj.snapshots) {
    if (s.difference >= 0 !== firstSign) return s.year;
  }
  return null;
}

function optimalSellYear(
  proj: PropertyProjection,
): { year: number; difference: number } | null {
  if (proj.snapshots.length === 0) return null;
  let best = proj.snapshots[0];
  for (const s of proj.snapshots) {
    if (s.difference > best.difference) best = s;
  }
  return { year: best.year, difference: best.difference };
}
</script>

<template>
  <div v-for="proj in projections" :key="proj.propertyId" class="summary-card">
    <h3 class="summary-title">{{ proj.propertyName }}</h3>
    <div class="summary-items">
      <div class="summary-item" v-if="optimalSellYear(proj)">
        <span class="summary-label">Optimal Sell Year:</span>
        <span class="summary-value">
          Year {{ optimalSellYear(proj)!.year }} ({{
            fmt(optimalSellYear(proj)!.difference)
          }}
          advantage to keeping)
        </span>
      </div>
      <div class="summary-item" v-if="breakEvenYear(proj)">
        <span class="summary-label">Break-even Year:</span>
        <span class="summary-value">{{ breakEvenYear(proj) }}</span>
      </div>
    </div>
  </div>
</template>

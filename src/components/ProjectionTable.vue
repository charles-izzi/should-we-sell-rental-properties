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
</script>

<template>
  <div
    v-for="proj in projections"
    :key="proj.propertyId"
    class="projection-table-wrapper"
  >
    <h3>{{ proj.propertyName }} — Detailed Breakdown</h3>
    <table class="projection-table projection-table--detailed">
      <thead>
        <tr>
          <th rowspan="3">Year</th>
          <th colspan="8" class="group-header keep-header">
            Keep Scenario — Cash Flow
          </th>
          <th colspan="3" class="group-header keep-header">
            Keep — Cash Reserve
          </th>
          <th colspan="6" class="group-header keep-header">Keep — Net Worth</th>
          <th colspan="5" class="group-header sell-header">
            Sell Scenario — Net Worth
          </th>
          <th rowspan="3">Diff</th>
        </tr>
        <tr>
          <!-- Cash Flow sub-headers -->
          <th colspan="2" class="subgroup-header keep-header">
            Income &amp; Costs
          </th>
          <th colspan="3" class="subgroup-header overlap-header">
            Cost &amp; Deduction
          </th>
          <th colspan="2" class="subgroup-header keep-header">
            Deduction Only
          </th>
          <th rowspan="2" class="subgroup-header keep-header">
            =&nbsp;Cash Flow
          </th>
          <!-- Cash Reserve sub-headers -->
          <th colspan="3" class="subgroup-header keep-header">
            Prior + Earnings + CF = Reserve
          </th>
          <!-- Net Worth sub-headers -->
          <th colspan="6" class="subgroup-header keep-header">
            Value − Mortgage − Sell Costs − Taxes + Reserve = NW
          </th>
          <!-- Sell sub-headers -->
          <th colspan="5" class="subgroup-header sell-header">
            Portfolio + Earnings + Savings − Tax = NW
          </th>
        </tr>
        <tr>
          <!-- Keep: Cost only -->
          <th>Rent</th>
          <th>− Principal</th>
          <!-- Keep: Cost & Deduction (overlap) -->
          <th class="overlap-col">− Interest</th>
          <th class="overlap-col">− Escrow</th>
          <th class="overlap-col">− Expenses</th>
          <!-- Keep: Deduction only -->
          <th>Depreciation</th>
          <th>+ Tax Savings</th>
          <!-- Cash Flow result is rowspan from above -->
          <!-- Keep: Cash Reserve -->
          <th>Earnings</th>
          <th>+ Cash Flow</th>
          <th>= Reserve</th>
          <!-- Keep: Net Worth -->
          <th>Prop. Value</th>
          <th>− Mortgage</th>
          <th>− Sell Costs</th>
          <th>− Taxes</th>
          <th>+ Reserve</th>
          <th>= Net Worth</th>
          <!-- Sell: Net Worth -->
          <th>Yr Earnings</th>
          <th>+ Mo. Savings</th>
          <th>Portfolio</th>
          <th>− Tax</th>
          <th>= Net Worth</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in proj.snapshots" :key="s.year">
          <td>{{ s.year }}</td>
          <!-- Keep: Cost only -->
          <td>{{ fmt(s.keepAnnualRent) }}</td>
          <td>{{ fmt(s.keepPrincipalPaid) }}</td>
          <!-- Keep: Cost & Deduction (overlap) -->
          <td class="overlap-col">{{ fmt(s.keepMortgageInterest) }}</td>
          <td class="overlap-col">{{ fmt(s.keepAnnualEscrow) }}</td>
          <td class="overlap-col">{{ fmt(s.keepAnnualExpenses) }}</td>
          <!-- Keep: Deduction only -->
          <td>{{ fmt(s.keepDepreciation) }}</td>
          <td>{{ fmt(s.keepTaxSavings) }}</td>
          <!-- Keep: Cash Flow -->
          <td :class="s.keepAnnualCashFlow >= 0 ? 'positive' : 'negative'">
            <strong>{{ fmt(s.keepAnnualCashFlow) }}</strong>
          </td>
          <!-- Keep: Cash Reserve -->
          <td>{{ fmt(s.keepReserveEarnings) }}</td>
          <td>{{ fmt(s.keepAnnualCashFlow) }}</td>
          <td>{{ fmt(s.keepCompoundedCashReserve) }}</td>
          <!-- Keep: Net Worth Components -->
          <td>{{ fmt(s.keepPropertyValue) }}</td>
          <td>{{ fmt(s.keepMortgageBalance) }}</td>
          <td>{{ fmt(s.keepSellingCosts) }}</td>
          <td>{{ fmt(s.keepCapitalGainsTax) }}</td>
          <td>{{ fmt(s.keepCompoundedCashReserve) }}</td>
          <td class="net-worth-cell">
            <strong>{{ fmt(s.keepNetWorth) }}</strong>
          </td>
          <!-- Sell: Net Worth -->
          <td>{{ fmt(s.sellPortfolioEarnings) }}</td>
          <td>{{ fmt(s.sellMonthlySavings) }}</td>
          <td>{{ fmt(s.sellPortfolioPreTax) }}</td>
          <td>{{ fmt(s.sellCapitalGainsTax) }}</td>
          <td class="net-worth-cell">
            <strong>{{ fmt(s.sellNetWorth) }}</strong>
          </td>
          <td :class="s.difference >= 0 ? 'positive' : 'negative'">
            <strong>{{ fmt(s.difference) }}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

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
          <th colspan="3" class="group-header keep-header">Keep — Portfolio</th>
          <th colspan="6" class="group-header keep-header">Keep — Net Worth</th>
          <th colspan="4" class="group-header sell-header">
            Sell Scenario — Net Worth
          </th>
          <th colspan="8" class="group-header refi-header">
            Refi/HE Loan — Net Worth
          </th>
          <th rowspan="3">Keep vs Sell</th>
          <th rowspan="3">Refi vs Sell</th>
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
          <!-- Portfolio sub-headers -->
          <th colspan="3" class="subgroup-header keep-header">
            Mo. Inv. + Earnings = Portfolio
          </th>
          <!-- Net Worth sub-headers -->
          <th colspan="6" class="subgroup-header keep-header">
            Value − Mortgage − Sell Costs − Taxes + Portfolio = NW
          </th>
          <!-- Sell sub-headers -->
          <th colspan="4" class="subgroup-header sell-header">
            Mo. Inv. + Portfolio − Tax = NW
          </th>
          <!-- Refi sub-headers -->
          <th colspan="8" class="subgroup-header refi-header">
            Value − Debt + Cash Flow + Mo. Inv. + Portfolio − Tax = NW
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
          <!-- Keep: Portfolio -->
          <th>Mo. Inv.</th>
          <th>Earnings</th>
          <th>Portfolio</th>
          <!-- Keep: Net Worth -->
          <th>Prop. Value</th>
          <th>− Mortgage</th>
          <th>− Sell Costs</th>
          <th>− Taxes</th>
          <th>+ Portfolio</th>
          <th>= Net Worth</th>
          <!-- Sell: Net Worth -->
          <th>Mo. Inv.</th>
          <th>Portfolio</th>
          <th>− Tax</th>
          <th>= Net Worth</th>
          <!-- Refi: Net Worth -->
          <th>Prop. Value</th>
          <th>Mortgage</th>
          <th>HE Loan</th>
          <th>Cash Flow</th>
          <th>Mo. Inv.</th>
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
          <!-- Keep: Portfolio -->
          <td>{{ fmt(s.keepMonthlyInvestment * 12) }}</td>
          <td>{{ fmt(s.keepPortfolioEarnings) }}</td>
          <td>{{ fmt(s.keepPortfolio) }}</td>
          <!-- Keep: Net Worth Components -->
          <td>{{ fmt(s.keepPropertyValue) }}</td>
          <td>{{ fmt(s.keepMortgageBalance) }}</td>
          <td>{{ fmt(s.keepSellingCosts) }}</td>
          <td>{{ fmt(s.keepCapitalGainsTax) }}</td>
          <td>{{ fmt(s.keepPortfolio) }}</td>
          <td class="net-worth-cell">
            <strong>{{ fmt(s.keepNetWorth) }}</strong>
          </td>
          <!-- Sell: Net Worth -->
          <td>{{ fmt(s.sellMonthlyInvestment * 12) }}</td>
          <td>{{ fmt(s.sellPortfolioPreTax) }}</td>
          <td>{{ fmt(s.sellCapitalGainsTax) }}</td>
          <td class="net-worth-cell">
            <strong>{{ fmt(s.sellNetWorth) }}</strong>
          </td>
          <!-- Refi: Net Worth -->
          <template v-if="proj.refiBranchYear && s.year >= proj.refiBranchYear">
            <td>{{ fmt(s.keepPropertyValue) }}</td>
            <td>{{ fmt(s.refiMortgageBalance) }}</td>
            <td>{{ fmt(s.refiHelocBalance) }}</td>
            <td :class="s.refiAnnualCashFlow >= 0 ? 'positive' : 'negative'">
              {{ fmt(s.refiAnnualCashFlow) }}
            </td>
            <td>{{ fmt(s.refiMonthlyInvestment * 12) }}</td>
            <td>{{ fmt(s.refiPortfolio) }}</td>
            <td>{{ fmt(s.refiCapitalGainsTax) }}</td>
            <td class="net-worth-cell">
              <strong>{{ fmt(s.refiNetWorth) }}</strong>
            </td>
          </template>
          <template v-else>
            <td colspan="8" class="pre-branch">—</td>
          </template>
          <!-- Comparisons -->
          <td :class="s.keepVsSell >= 0 ? 'positive' : 'negative'">
            <strong>{{ fmt(s.keepVsSell) }}</strong>
          </td>
          <td
            v-if="proj.refiBranchYear && s.year >= proj.refiBranchYear"
            :class="s.refiVsSell >= 0 ? 'positive' : 'negative'"
          >
            <strong>{{ fmt(s.refiVsSell) }}</strong>
          </td>
          <td v-else class="pre-branch">—</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

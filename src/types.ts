export interface PropertyInputs {
  id: number;
  name: string;
  currentValue: number;
  purchasePrice: number;
  appreciationRate: number; // annual %
  mortgageBalance: number;
  monthlyPayment: number;
  mortgageInterestRate: number; // annual %
  remainingYears: number;
  monthlyRent: number;
  rentGrowthRate: number; // annual %
  annualTurnoverCost: number; // vacancy/turnover costs per year
  annualOtherExpenses: number; // repairs, cleanings, management fees — not in mortgage payment
  rentalStartYear: number; // year property was first rented (for depreciation expiration)
}

export interface GlobalInputs {
  marginalTaxRate: number; // %
  capitalGainsTaxRate: number; // %
  sellingCostPercent: number; // %
  investmentReturnRate: number; // annual %
  annualInflationRate: number; // %
  projectionYears: number;
  applyNIIT: boolean; // Net Investment Income Tax (+3.8%)
}

export interface PropertyYearDetail {
  propertyValue: number;
  mortgageBalance: number;
  equity: number;
  annualRent: number;
  annualExpenses: number;
  annualEscrow: number;
  annualTotalPayment: number;
  annualMortgageInterest: number;
  annualPrincipalPaid: number;
  depreciation: number;
  taxSavings: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  reserveEarnings: number;
  compoundedCashReserve: number;
}

export interface YearlySnapshot {
  year: number;
  // Keep scenario breakdown
  keepPropertyValue: number;
  keepMortgageBalance: number;
  keepEquity: number;
  keepSellingCosts: number;
  keepRecaptureTax: number;
  keepCapitalGainsTax: number;
  keepAnnualRent: number;
  keepAnnualPI: number;
  keepAnnualEscrow: number;
  keepAnnualExpenses: number;
  keepMortgageInterest: number;
  keepPrincipalPaid: number;
  keepDepreciation: number;
  keepTaxSavings: number;
  keepAnnualCashFlow: number;
  keepCumulativeCashFlow: number;
  keepReserveEarnings: number;
  keepCompoundedCashReserve: number;
  keepNetWorth: number;
  // Sell scenario breakdown
  sellPortfolioPreTax: number;
  sellPortfolioEarnings: number;
  sellInvestmentGain: number;
  sellCapitalGainsTax: number;
  sellMonthlySavings: number;
  sellNetWorth: number;
  // Comparison
  difference: number;
}

export interface PropertyProjection {
  propertyName: string;
  propertyId: number;
  snapshots: YearlySnapshot[];
}

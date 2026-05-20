import type {
  PropertyInputs,
  GlobalInputs,
  PropertyYearDetail,
  YearlySnapshot,
  PropertyProjection,
} from "./types";

function monthlyRate(annualPercent: number): number {
  return annualPercent / 100 / 12;
}

function calculateMonthlyPI(
  balance: number,
  annualRate: number,
  years: number,
): number {
  if (balance <= 0 || years <= 0) return 0;
  const r = monthlyRate(annualRate);
  const n = years * 12;
  if (r === 0) return balance / n;
  return (balance * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

function amortizeMonth(
  balance: number,
  annualRate: number,
  payment: number,
): { principal: number; interest: number; newBalance: number } {
  const interest = balance * monthlyRate(annualRate);
  const principal = Math.min(payment - interest, balance);
  const newBalance = Math.max(0, balance - principal);
  return { principal, interest, newBalance };
}

function computePropertyYear(
  property: PropertyInputs,
  year: number,
  prevBalance: number,
  prevCumulativeCashFlow: number,
  prevCompoundedCashReserve: number,
  marginalTaxRate: number,
  inflationRate: number,
  investmentReturnRate: number,
  depreciationYearsUsedBefore: number,
): PropertyYearDetail {
  // Property appreciation (compounded from original current value)
  const propertyValue =
    property.currentValue * Math.pow(1 + property.appreciationRate / 100, year);

  // Rent for this year (grows annually from base)
  const rentGrowthFactor = Math.pow(
    1 + property.rentGrowthRate / 100,
    year - 1,
  );
  const yearlyGrossRent = property.monthlyRent * 12 * rentGrowthFactor;
  // Turnover costs scale with rent growth
  const scaledTurnover =
    (Number(property.annualTurnoverCost) || 0) * rentGrowthFactor;
  const yearlyRentBase = yearlyGrossRent - scaledTurnover;

  // Derive P&I payment from balance/rate/remaining years; difference from total payment is escrow
  const monthlyPI = calculateMonthlyPI(
    property.mortgageBalance,
    property.mortgageInterestRate,
    property.remainingYears,
  );
  const baseMonthlyEscrow = Math.max(0, property.monthlyPayment - monthlyPI);
  // Escrow scales with property appreciation (taxes & insurance track property value)
  const appreciationFactor = Math.pow(
    1 + property.appreciationRate / 100,
    year,
  );
  const annualEscrow = baseMonthlyEscrow * 12 * appreciationFactor;
  // Other expenses scale with inflation
  const inflationFactor = Math.pow(1 + inflationRate / 100, year - 1);
  const annualExpenses =
    (Number(property.annualOtherExpenses) || 0) * inflationFactor;

  // Mortgage amortization for 12 months (using only P&I portion)
  let balance = prevBalance;
  let totalInterest = 0;
  let totalPrincipal = 0;
  for (let m = 0; m < 12; m++) {
    if (balance <= 0) break;
    const { principal, interest, newBalance } = amortizeMonth(
      balance,
      property.mortgageInterestRate,
      monthlyPI,
    );
    totalInterest += interest;
    totalPrincipal += principal;
    balance = newBalance;
  }

  // Annual total payment = actual P&I paid (handles partial-year payoff) + scaled escrow
  const annualTotalPayment = totalPrincipal + totalInterest + annualEscrow;

  // Depreciation: straight-line over 27.5 years on building value (assume 80% of purchase price is building)
  const buildingValue = property.purchasePrice * 0.8;
  const fullAnnualDep = buildingValue / 27.5;
  const totalDepYears = depreciationYearsUsedBefore + year;
  let annualDepreciation: number;
  if (totalDepYears <= 27) {
    annualDepreciation = fullAnnualDep;
  } else if (totalDepYears <= 28) {
    // Partial year: only the fractional remainder (27.5 - years already used before this year)
    const remainingFraction = Math.max(0, 27.5 - (totalDepYears - 1));
    annualDepreciation = fullAnnualDep * remainingFraction;
  } else {
    annualDepreciation = 0;
  }

  // Tax savings from deductions (escrow, other expenses, mortgage interest, and depreciation are all deductible)
  const taxSavings =
    (annualEscrow + annualExpenses + totalInterest + annualDepreciation) *
    (marginalTaxRate / 100);

  // Net cash flow for the year
  const annualCashFlow =
    yearlyRentBase - annualTotalPayment - annualExpenses + taxSavings;
  const cumulativeCashFlow = prevCumulativeCashFlow + annualCashFlow;

  // Compound cash reserve: positive cash flow is invested monthly at the same return rate
  const mr = monthlyRate(investmentReturnRate);
  const monthlyCashFlow = annualCashFlow / 12;
  let cashReserve = prevCompoundedCashReserve;
  let reserveEarnings = 0;
  for (let m = 0; m < 12; m++) {
    // Only compound positive balances (no returns on debt)
    if (cashReserve > 0) {
      const earnings = cashReserve * mr;
      reserveEarnings += earnings;
      cashReserve = cashReserve + earnings + monthlyCashFlow;
    } else {
      cashReserve = cashReserve + monthlyCashFlow;
    }
  }

  return {
    propertyValue,
    mortgageBalance: balance,
    equity: propertyValue - balance,
    annualRent: yearlyRentBase,
    annualExpenses,
    annualEscrow,
    annualTotalPayment,
    annualMortgageInterest: totalInterest,
    annualPrincipalPaid: totalPrincipal,
    depreciation: annualDepreciation,
    taxSavings,
    annualCashFlow,
    cumulativeCashFlow,
    reserveEarnings,
    compoundedCashReserve: cashReserve,
  };
}

function effectiveCapGainsRate(global: GlobalInputs): number {
  return global.capitalGainsTaxRate + (global.applyNIIT ? 3.8 : 0);
}

function computeAccumulatedDepreciation(
  purchasePrice: number,
  yearsUsed: number,
): number {
  const buildingValue = purchasePrice * 0.8;
  const fullAnnualDep = buildingValue / 27.5;
  const clampedYears = Math.min(Math.max(0, yearsUsed), 27.5);
  return clampedYears * fullAnnualDep;
}

function computePropertySaleTax(
  salePrice: number,
  purchasePrice: number,
  accumulatedDepreciation: number,
  global: GlobalInputs,
): { totalTax: number; recaptureTax: number; capitalGainsTax: number } {
  const adjustedBasis = purchasePrice - accumulatedDepreciation;
  const totalGain = Math.max(0, salePrice - adjustedBasis);
  // Depreciation recapture is taxed at 25% (+ NIIT if applicable)
  const recaptureAmount = Math.min(accumulatedDepreciation, totalGain);
  const recaptureRate = 25 + (global.applyNIIT ? 3.8 : 0);
  const recaptureTax = recaptureAmount * (recaptureRate / 100);
  // Remaining gain above purchase price taxed at normal capital gains rate
  const remainingGain = Math.max(0, totalGain - recaptureAmount);
  const capitalGainsTax = remainingGain * (effectiveCapGainsRate(global) / 100);
  return {
    totalTax: recaptureTax + capitalGainsTax,
    recaptureTax,
    capitalGainsTax,
  };
}

function computeSellProceedsForProperty(
  p: PropertyInputs,
  global: GlobalInputs,
): number {
  const sellingCosts = p.currentValue * (global.sellingCostPercent / 100);
  const currentYear = new Date().getFullYear();
  const yearsUsed = Math.max(0, currentYear - p.rentalStartYear);
  const accDep = computeAccumulatedDepreciation(p.purchasePrice, yearsUsed);
  const { totalTax } = computePropertySaleTax(
    p.currentValue,
    p.purchasePrice,
    accDep,
    global,
  );
  return p.currentValue - p.mortgageBalance - sellingCosts - totalTax;
}

function computeProjectionForProperty(
  property: PropertyInputs,
  global: GlobalInputs,
): YearlySnapshot[] {
  const snapshots: YearlySnapshot[] = [];

  let balance = property.mortgageBalance;
  let cumulativeCashFlow = 0;
  let compoundedCashReserve = 0;

  const currentYear = new Date().getFullYear();
  const depreciationYearsUsedBefore = Math.max(
    0,
    currentYear - property.rentalStartYear,
  );

  const capGainsRate = effectiveCapGainsRate(global);
  const initialInvestment = computeSellProceedsForProperty(property, global);
  const monthlyReturn = monthlyRate(global.investmentReturnRate);
  let portfolio = initialInvestment;
  let accumulatedDepreciation = computeAccumulatedDepreciation(
    property.purchasePrice,
    depreciationYearsUsedBefore,
  );

  for (let year = 1; year <= global.projectionYears; year++) {
    const detail = computePropertyYear(
      property,
      year,
      balance,
      cumulativeCashFlow,
      compoundedCashReserve,
      global.marginalTaxRate,
      global.annualInflationRate,
      global.investmentReturnRate,
      depreciationYearsUsedBefore,
    );
    balance = detail.mortgageBalance;
    cumulativeCashFlow = detail.cumulativeCashFlow;
    compoundedCashReserve = detail.compoundedCashReserve;
    accumulatedDepreciation += detail.depreciation;

    // Keep scenario: net worth if you sold the property at this point
    const sellingCosts =
      detail.propertyValue * (global.sellingCostPercent / 100);
    const saleTax = computePropertySaleTax(
      detail.propertyValue,
      property.purchasePrice,
      accumulatedDepreciation,
      global,
    );
    const keepNetWorth =
      detail.propertyValue -
      detail.mortgageBalance -
      sellingCosts -
      saleTax.totalTax +
      detail.compoundedCashReserve;

    // Dynamic monthly savings: if property has negative cash flow, that's money saved by selling
    const monthlySavings = Math.max(0, -detail.annualCashFlow / 12);

    const portfolioBefore = portfolio;
    for (let m = 0; m < 12; m++) {
      portfolio = portfolio * (1 + monthlyReturn) + monthlySavings;
    }
    const sellPortfolioEarnings =
      portfolio - portfolioBefore - monthlySavings * 12;

    // Sell scenario: net worth if you liquidated the investment at this point
    const investmentGain = Math.max(0, portfolio - initialInvestment);
    const capitalGainsTaxOnInvestment = investmentGain * (capGainsRate / 100);
    const sellNetWorth = portfolio - capitalGainsTaxOnInvestment;

    snapshots.push({
      year,
      keepPropertyValue: detail.propertyValue,
      keepMortgageBalance: detail.mortgageBalance,
      keepEquity: detail.equity,
      keepSellingCosts: sellingCosts,
      keepRecaptureTax: saleTax.recaptureTax,
      keepCapitalGainsTax: saleTax.totalTax,
      keepAnnualRent: detail.annualRent,
      keepAnnualPI: detail.annualPrincipalPaid + detail.annualMortgageInterest,
      keepAnnualEscrow: detail.annualEscrow,
      keepAnnualExpenses: detail.annualExpenses,
      keepMortgageInterest: detail.annualMortgageInterest,
      keepPrincipalPaid: detail.annualPrincipalPaid,
      keepDepreciation: detail.depreciation,
      keepTaxSavings: detail.taxSavings,
      keepAnnualCashFlow: detail.annualCashFlow,
      keepCumulativeCashFlow: detail.cumulativeCashFlow,
      keepReserveEarnings: detail.reserveEarnings,
      keepCompoundedCashReserve: detail.compoundedCashReserve,
      keepNetWorth,
      sellPortfolioPreTax: portfolio,
      sellPortfolioEarnings,
      sellInvestmentGain: investmentGain,
      sellCapitalGainsTax: capitalGainsTaxOnInvestment,
      sellMonthlySavings: monthlySavings,
      sellNetWorth,
      difference: keepNetWorth - sellNetWorth,
    });
  }

  return snapshots;
}

export function computeProjection(
  properties: PropertyInputs[],
  global: GlobalInputs,
): PropertyProjection[] {
  return properties.map((p) => ({
    propertyName: p.name,
    propertyId: p.id,
    snapshots: computeProjectionForProperty(p, global),
  }));
}

export function createDefaultProperty(id: number): PropertyInputs {
  return {
    id,
    name: `Property ${id}`,
    currentValue: 300000,
    purchasePrice: 250000,
    appreciationRate: 3,
    mortgageBalance: 200000,
    monthlyPayment: 1200,
    mortgageInterestRate: 6,
    remainingYears: 25,
    monthlyRent: 1800,
    rentGrowthRate: 3,
    annualTurnoverCost: 0,
    annualOtherExpenses: 2000,
    rentalStartYear: 2020,
  };
}

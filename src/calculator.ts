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

function amortizeYear(
  startBalance: number,
  annualRate: number,
  monthlyPayment: number,
): { endBalance: number; totalInterest: number; totalPrincipal: number } {
  let balance = startBalance;
  let totalInterest = 0;
  let totalPrincipal = 0;
  for (let m = 0; m < 12; m++) {
    if (balance <= 0) break;
    const { principal, interest, newBalance } = amortizeMonth(
      balance,
      annualRate,
      monthlyPayment,
    );
    totalInterest += interest;
    totalPrincipal += principal;
    balance = newBalance;
  }
  return { endBalance: balance, totalInterest, totalPrincipal };
}

function computePropertyYear(
  property: PropertyInputs,
  year: number,
  prevBalance: number,
  marginalTaxRate: number,
  inflationRate: number,
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

  // Mortgage amortization for 12 months
  const {
    endBalance: balance,
    totalInterest,
    totalPrincipal,
  } = amortizeYear(prevBalance, property.mortgageInterestRate, monthlyPI);

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
    const remainingFraction = Math.max(0, 27.5 - (totalDepYears - 1));
    annualDepreciation = fullAnnualDep * remainingFraction;
  } else {
    annualDepreciation = 0;
  }

  // Tax savings from deductions
  const taxSavings =
    (annualEscrow + annualExpenses + totalInterest + annualDepreciation) *
    (marginalTaxRate / 100);

  // Net cash flow for the year
  const annualCashFlow =
    yearlyRentBase - annualTotalPayment - annualExpenses + taxSavings;

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
    cumulativeCashFlow: 0, // filled externally if needed
    reserveEarnings: 0,
    compoundedCashReserve: 0,
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
  const recaptureAmount = Math.min(accumulatedDepreciation, totalGain);
  const recaptureRate = 25 + (global.applyNIIT ? 3.8 : 0);
  const recaptureTax = recaptureAmount * (recaptureRate / 100);
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

// --- Refi scenario helpers ---

interface RefiYearRaw {
  // Combined remaining debt (refi: single new mortgage; HELOC: original + HELOC)
  mortgageBalance: number;
  helocBalance: number;
  totalDebt: number;
  annualCashFlow: number;
  totalInterest: number; // for tax deduction purposes
}

function computeRefiPath(
  property: PropertyInputs,
  global: GlobalInputs,
  branchYear: number,
  keepDetails: PropertyYearDetail[],
): { equityExtracted: number; years: RefiYearRaw[] } {
  // At branchYear, compute equity extractable
  const branchDetail = keepDetails[branchYear - 1]; // 0-indexed
  const propertyValueAtBranch = branchDetail.propertyValue;
  const mortgageBalanceAtBranch = branchDetail.mortgageBalance;
  const maxLoan = propertyValueAtBranch * 0.8;

  const isRefi = global.refiOrHeloc === "refi";
  const rate = isRefi ? global.refiInterestRate : global.helocInterestRate;

  let newLoanAmount: number;
  if (isRefi) {
    // Cash-out refi: new mortgage replaces old
    newLoanAmount = maxLoan;
  } else {
    // HELOC: second loan on top of existing
    newLoanAmount = Math.max(0, maxLoan - mortgageBalanceAtBranch);
  }

  const closingCosts = newLoanAmount * (global.refiClosingCostPercent / 100);
  const equityExtracted = isRefi
    ? newLoanAmount - mortgageBalanceAtBranch - closingCosts
    : newLoanAmount - closingCosts;

  if (equityExtracted <= 0) {
    return { equityExtracted: 0, years: [] };
  }

  // Compute new monthly payment(s)
  const newLoanMonthlyPI = calculateMonthlyPI(newLoanAmount, rate, 30);

  // For refi: single new mortgage replaces old. For HELOC: keep original + add HELOC payment.
  const originalMonthlyPI = calculateMonthlyPI(
    property.mortgageBalance,
    property.mortgageInterestRate,
    property.remainingYears,
  );

  // Amortize from branch year onward
  const years: RefiYearRaw[] = [];
  let refiBalance = isRefi ? newLoanAmount : 0;
  let originalBalance = isRefi ? 0 : mortgageBalanceAtBranch;
  let helocBalance = isRefi ? 0 : newLoanAmount;

  for (let year = 1; year <= global.projectionYears; year++) {
    if (year < branchYear) {
      // Pre-branch: same as keep
      const kd = keepDetails[year - 1];
      years.push({
        mortgageBalance: kd.mortgageBalance,
        helocBalance: 0,
        totalDebt: kd.mortgageBalance,
        annualCashFlow: kd.annualCashFlow,
        totalInterest: kd.annualMortgageInterest,
      });
    } else {
      // Post-branch: amortize new loan structure
      const kd = keepDetails[year - 1]; // for property value, rent, escrow, expenses, depreciation, tax info

      let totalInterest = 0;
      let totalPI = 0;

      if (isRefi) {
        // Single new mortgage
        const result = amortizeYear(refiBalance, rate, newLoanMonthlyPI);
        refiBalance = result.endBalance;
        totalInterest = result.totalInterest;
        totalPI = result.totalPrincipal + result.totalInterest;
      } else {
        // Original mortgage + HELOC
        const origResult = amortizeYear(
          originalBalance,
          property.mortgageInterestRate,
          originalMonthlyPI,
        );
        originalBalance = origResult.endBalance;

        const helocResult = amortizeYear(helocBalance, rate, newLoanMonthlyPI);
        helocBalance = helocResult.endBalance;

        totalInterest = origResult.totalInterest + helocResult.totalInterest;
        totalPI =
          origResult.totalPrincipal +
          origResult.totalInterest +
          helocResult.totalPrincipal +
          helocResult.totalInterest;
      }

      // Cash flow uses same rent/escrow/expenses/depreciation as keep, but different P&I
      const taxSavings =
        (kd.annualEscrow +
          kd.annualExpenses +
          totalInterest +
          kd.depreciation) *
        (global.marginalTaxRate / 100);
      const annualCashFlow =
        kd.annualRent -
        totalPI -
        kd.annualEscrow -
        kd.annualExpenses +
        taxSavings;

      years.push({
        mortgageBalance: isRefi ? refiBalance : originalBalance,
        helocBalance,
        totalDebt: isRefi ? refiBalance : originalBalance + helocBalance,
        annualCashFlow,
        totalInterest,
      });
    }
  }

  return { equityExtracted, years };
}

// --- Normalization and portfolio compounding ---

interface PortfolioResult {
  portfolioValues: number[];
  portfolioEarnings: number[]; // per-year earnings
  costBasis: number[]; // cumulative contributions (for tax calculation)
}

function compoundPortfolio(
  annualCashFlows: number[], // raw CF per year for the scenario
  normalizationCFs: number[][], // CFs for normalization baseline (keep + sell only)
  lumpSum: number,
  lumpSumYear: number, // 1-indexed year when lump sum is injected (1 = start)
  investmentReturnRate: number,
): PortfolioResult {
  const mr = monthlyRate(investmentReturnRate);
  const numYears = annualCashFlows.length;
  const portfolioValues: number[] = [];
  const portfolioEarnings: number[] = [];
  const costBasis: number[] = [];
  let portfolio = lumpSumYear <= 1 ? lumpSum : 0;
  let totalContributions = lumpSumYear <= 1 ? lumpSum : 0;

  for (let y = 0; y < numYears; y++) {
    // Inject lump sum at the start of the branch year
    if (y + 1 === lumpSumYear && lumpSumYear > 1) {
      portfolio += lumpSum;
      totalContributions += lumpSum;
    }

    // Compute baseline for this year: worst CF across normalization scenarios
    const cfs = normalizationCFs.map((s) => s[y]);
    const worstCF = Math.min(...cfs, 0);
    const baselineMonthlyCost = Math.max(0, -worstCF) / 12;

    // This scenario's monthly investment = baseline + own CF / 12
    const monthlyInvestment = baselineMonthlyCost + annualCashFlows[y] / 12;

    let yearEarnings = 0;
    for (let m = 0; m < 12; m++) {
      const earnings = portfolio > 0 ? portfolio * mr : 0;
      yearEarnings += earnings;
      portfolio = portfolio + earnings + monthlyInvestment;
      if (monthlyInvestment > 0) {
        totalContributions += monthlyInvestment;
      }
    }

    portfolioValues.push(portfolio);
    portfolioEarnings.push(yearEarnings);
    costBasis.push(totalContributions);
  }

  return { portfolioValues, portfolioEarnings, costBasis };
}

function computeProjectionForProperty(
  property: PropertyInputs,
  global: GlobalInputs,
): {
  snapshots: YearlySnapshot[];
  refiBranchYear: number | null;
  refiEquityExtracted: number;
} {
  const currentYear = new Date().getFullYear();
  const depreciationYearsUsedBefore = Math.max(
    0,
    currentYear - property.rentalStartYear,
  );
  const capGainsRate = effectiveCapGainsRate(global);
  const sellProceeds = computeSellProceedsForProperty(property, global);

  // --- Pass 1: Compute keep scenario raw year data ---
  const keepDetails: PropertyYearDetail[] = [];
  let balance = property.mortgageBalance;
  for (let year = 1; year <= global.projectionYears; year++) {
    const detail = computePropertyYear(
      property,
      year,
      balance,
      global.marginalTaxRate,
      global.annualInflationRate,
      depreciationYearsUsedBefore,
    );
    balance = detail.mortgageBalance;
    keepDetails.push(detail);
  }

  const keepCFs = keepDetails.map((d) => d.annualCashFlow);
  const sellCFs = keepDetails.map(() => 0); // sell has no property costs

  // --- Pass 2: Find optimal refi branch year ---
  let bestBranchYear: number | null = null;
  let bestPeakAdvantage = -Infinity;
  let bestRefiPath: ReturnType<typeof computeRefiPath> | null = null;

  // Normalization only between keep and sell (refi excluded to avoid baseline spikes)
  const normCFs = [keepCFs, sellCFs];

  for (let b = 1; b <= global.projectionYears; b++) {
    const refiPath = computeRefiPath(property, global, b, keepDetails);
    if (refiPath.equityExtracted <= 0) continue;

    const refiCFs = refiPath.years.map((y) => y.annualCashFlow);

    // Compute sell and refi portfolios to find peak advantage
    const sellPortfolio = compoundPortfolio(
      sellCFs,
      normCFs,
      sellProceeds,
      1,
      global.investmentReturnRate,
    );
    const refiPortfolio = compoundPortfolio(
      refiCFs,
      normCFs,
      refiPath.equityExtracted,
      b,
      global.investmentReturnRate,
    );

    // Find peak refi advantage vs sell
    let accDep = computeAccumulatedDepreciation(
      property.purchasePrice,
      depreciationYearsUsedBefore,
    );
    for (let y = 0; y < global.projectionYears; y++) {
      accDep += keepDetails[y].depreciation;
      // Only evaluate from branch year onward
      if (y + 1 < b) continue;
      const refiDebt = refiPath.years[y].totalDebt;
      const propValue = keepDetails[y].propertyValue;
      const sellingCosts = propValue * (global.sellingCostPercent / 100);
      const saleTax = computePropertySaleTax(
        propValue,
        property.purchasePrice,
        accDep,
        global,
      );
      const refiNW =
        propValue -
        refiDebt -
        sellingCosts -
        saleTax.totalTax +
        refiPortfolio.portfolioValues[y];
      // Tax on refi portfolio gains (using cost basis)
      const refiInvGain = Math.max(
        0,
        refiPortfolio.portfolioValues[y] - refiPortfolio.costBasis[y],
      );
      const refiNWAfterTax = refiNW - refiInvGain * (capGainsRate / 100);

      const sellInvGain = Math.max(
        0,
        sellPortfolio.portfolioValues[y] - sellPortfolio.costBasis[y],
      );
      const sellNW =
        sellPortfolio.portfolioValues[y] - sellInvGain * (capGainsRate / 100);

      const advantage = refiNWAfterTax - sellNW;
      if (advantage > bestPeakAdvantage) {
        bestPeakAdvantage = advantage;
        bestBranchYear = b;
        bestRefiPath = refiPath;
      }
    }
  }

  // --- Pass 3: Build final snapshots with the winning refi path ---
  const refiCFs = bestRefiPath
    ? bestRefiPath.years.map((y) => y.annualCashFlow)
    : keepCFs; // fallback: refi = keep if no equity
  const refiEquityExtracted = bestRefiPath?.equityExtracted ?? 0;

  // Normalize only between keep and sell (refi uses same baseline but own CF)
  const keepPortfolio = compoundPortfolio(
    keepCFs,
    normCFs,
    0,
    1,
    global.investmentReturnRate,
  );
  const sellPortfolio = compoundPortfolio(
    sellCFs,
    normCFs,
    sellProceeds,
    1,
    global.investmentReturnRate,
  );
  const refiPortfolio = compoundPortfolio(
    refiCFs,
    normCFs,
    refiEquityExtracted,
    bestBranchYear ?? 1,
    global.investmentReturnRate,
  );

  const snapshots: YearlySnapshot[] = [];
  let accumulatedDepreciation = computeAccumulatedDepreciation(
    property.purchasePrice,
    depreciationYearsUsedBefore,
  );

  for (let y = 0; y < global.projectionYears; y++) {
    const detail = keepDetails[y];
    accumulatedDepreciation += detail.depreciation;

    // Baseline monthly cost for this year (keep vs sell only)
    const worstCF = Math.min(keepCFs[y], sellCFs[y]);
    const baselineMonthlyCost = Math.max(0, -worstCF) / 12;

    // Keep net worth
    const sellingCosts =
      detail.propertyValue * (global.sellingCostPercent / 100);
    const saleTax = computePropertySaleTax(
      detail.propertyValue,
      property.purchasePrice,
      accumulatedDepreciation,
      global,
    );
    const keepNW =
      detail.propertyValue -
      detail.mortgageBalance -
      sellingCosts -
      saleTax.totalTax +
      keepPortfolio.portfolioValues[y];
    // Tax on keep portfolio gains (only on gains above cost basis)
    const keepInvGain = Math.max(
      0,
      keepPortfolio.portfolioValues[y] - keepPortfolio.costBasis[y],
    );
    const keepPortfolioTax = keepInvGain * (capGainsRate / 100);
    const keepNetWorth = keepNW - keepPortfolioTax;

    // Sell net worth
    const sellInvGain = Math.max(
      0,
      sellPortfolio.portfolioValues[y] - sellPortfolio.costBasis[y],
    );
    const sellCapGainsTax = sellInvGain * (capGainsRate / 100);
    const sellNetWorth = sellPortfolio.portfolioValues[y] - sellCapGainsTax;

    // Refi net worth (only meaningful from branch year onward)
    const refiYear = bestRefiPath ? bestRefiPath.years[y] : null;
    const isBranched = bestBranchYear !== null && y + 1 >= bestBranchYear;
    let refiNetWorth: number;
    let refiCapGainsTax: number;
    if (isBranched) {
      const refiDebt = refiYear ? refiYear.totalDebt : detail.mortgageBalance;
      const refiNWRaw =
        detail.propertyValue -
        refiDebt -
        sellingCosts -
        saleTax.totalTax +
        refiPortfolio.portfolioValues[y];
      const refiInvGain = Math.max(
        0,
        refiPortfolio.portfolioValues[y] - refiPortfolio.costBasis[y],
      );
      refiCapGainsTax = refiInvGain * (capGainsRate / 100);
      refiNetWorth = refiNWRaw - refiCapGainsTax;
    } else {
      // Pre-branch: refi scenario doesn't exist yet, matches keep
      refiNetWorth = keepNetWorth;
      refiCapGainsTax = 0;
    }

    snapshots.push({
      year: y + 1,
      baselineMonthlyCost,
      // Keep
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
      keepMonthlyInvestment: baselineMonthlyCost + keepCFs[y] / 12,
      keepPortfolio: keepPortfolio.portfolioValues[y],
      keepPortfolioEarnings: keepPortfolio.portfolioEarnings[y],
      keepNetWorth,
      // Sell
      sellPortfolioPreTax: sellPortfolio.portfolioValues[y],
      sellPortfolioEarnings: sellPortfolio.portfolioEarnings[y],
      sellInvestmentGain: sellInvGain,
      sellCapitalGainsTax: sellCapGainsTax,
      sellMonthlyInvestment: baselineMonthlyCost + sellCFs[y] / 12,
      sellNetWorth,
      // Refi
      refiMortgageBalance: refiYear?.mortgageBalance ?? detail.mortgageBalance,
      refiHelocBalance: refiYear?.helocBalance ?? 0,
      refiAnnualCashFlow: refiCFs[y],
      refiMonthlyInvestment: baselineMonthlyCost + refiCFs[y] / 12,
      refiPortfolio: refiPortfolio.portfolioValues[y],
      refiPortfolioEarnings: refiPortfolio.portfolioEarnings[y],
      refiCapitalGainsTax: refiCapGainsTax,
      refiNetWorth,
      // Comparisons
      keepVsSell: keepNetWorth - sellNetWorth,
      refiVsSell: refiNetWorth - sellNetWorth,
    });
  }

  return { snapshots, refiBranchYear: bestBranchYear, refiEquityExtracted };
}

export function computeProjection(
  properties: PropertyInputs[],
  global: GlobalInputs,
): PropertyProjection[] {
  return properties.map((p) => {
    const result = computeProjectionForProperty(p, global);
    return {
      propertyName: p.name,
      propertyId: p.id,
      snapshots: result.snapshots,
      refiBranchYear: result.refiBranchYear,
      refiEquityExtracted: result.refiEquityExtracted,
    };
  });
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

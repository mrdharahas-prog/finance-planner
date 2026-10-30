import type { SavingsGoal, ExpenseItem, FeasibilityReport } from "./types";

/**
 * Calculates geometric monthly rate so that (1 + monthlyRate)^12 === (1 + annualRate).
 */
export function getGeometricMonthlyRate(annualRatePercentage: number): number {
  if (annualRatePercentage <= 0) return 0;
  return Math.pow(1 + annualRatePercentage / 100, 1 / 12) - 1;
}

/**
 * Calculates the exact month savings overtakes the inflated price.
 */
export function calculateTargetGoal(
  monthlyIncome: number,
  priceMultiplier: number,
  savingsPercent: number,
  annualInflationRate: number
): SavingsGoal {
  const safeIncome = Math.max(0, monthlyIncome);
  const basePrice = Math.round(safeIncome * priceMultiplier);
  const savingsFraction = Math.max(0, Math.min(savingsPercent, 100)) / 100;
  const monthlySavings = Math.round(safeIncome * savingsFraction);

  const staticMonths = monthlySavings > 0 ? Math.ceil(basePrice / monthlySavings) : 0;

  if (monthlySavings <= 0 || basePrice <= 0) {
    return {
      monthlyIncome: safeIncome,
      itemPrice: basePrice,
      priceMultiplier,
      monthlySavings: 0,
      savingsRatePercentage: savingsPercent,
      staticMonthsToGoal: 0,
      realMonthsToGoal: 0,
      realFuturePrice: basePrice,
      totalSavedAtGoal: 0,
    };
  }

  const monthlyRate = getGeometricMonthlyRate(annualInflationRate);

  // Month-by-month iteration to find the first month where total savings >= inflated price
  let month = 0;
  let currentPrice = basePrice;
  let accumulatedSavings = 0;
  const MAX_MONTHS = 600; // 50-year safety ceiling

  while (accumulatedSavings < currentPrice && month < MAX_MONTHS) {
    month++;
    accumulatedSavings += monthlySavings;
    currentPrice = basePrice * Math.pow(1 + monthlyRate, month);
  }

  return {
    monthlyIncome: safeIncome,
    itemPrice: basePrice,
    priceMultiplier,
    monthlySavings,
    savingsRatePercentage: savingsPercent,
    staticMonthsToGoal: staticMonths,
    realMonthsToGoal: month,
    realFuturePrice: Math.round(currentPrice),
    totalSavedAtGoal: Math.round(accumulatedSavings),
  };
}

/**
 * Validates budget feasibility against living expenses.
 */
export function assessFeasibility(
  monthlyIncome: number,
  monthlySavings: number,
  expenses: ExpenseItem[]
): FeasibilityReport {
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const disposableIncome = Math.max(0, monthlyIncome - totalExpenses);
  const maxRate = monthlyIncome > 0 ? Math.floor((disposableIncome / monthlyIncome) * 100) : 0;
  const isFeasible = monthlySavings <= disposableIncome;

  return {
    totalExpenses,
    disposableIncome,
    maxFeasibleSavingsRate: maxRate,
    isFeasible,
  };
}
import type { SavingsGoal, InflationProjection } from "./types";
export function calculateTargetGoal(
  monthlyIncome: number,
  priceMultiplier: number,
  savingsPercent: number
): SavingsGoal {
  const safeIncome = Math.max(0, monthlyIncome);
  const itemPrice = safeIncome * priceMultiplier;
  const savingsFraction = Math.max(1, Math.min(savingsPercent, 100)) / 100;
  const monthlySavings = safeIncome * savingsFraction;
  const monthsToGoal = monthlySavings > 0 ? Math.ceil(itemPrice / monthlySavings) : 0;

  return {
    monthlyIncome: safeIncome,
    itemPrice: Math.round(itemPrice),
    priceMultiplier,
    monthlySavings: Math.round(monthlySavings),
    savingsRatePercentage: savingsPercent,
    monthsToGoal,
  };
}

export function projectFuturePrice(
  currentPrice: number,
  annualRate: number,
  months: number
): InflationProjection {
  const monthlyRate = annualRate / 100 / 12;
  const futurePrice = currentPrice * Math.pow(1 + monthlyRate, months);
  const adjustedSavings = months > 0 ? Math.ceil(futurePrice / months) : futurePrice;

  return {
    currentPrice: Math.round(currentPrice),
    annualRate,
    months,
    futurePrice: Math.round(futurePrice),
    adjustedMonthlySavingsNeeded: adjustedSavings,
  };
}
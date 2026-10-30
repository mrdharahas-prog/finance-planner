import type { SavingsGoalItem, GoalCalculationResult } from "./types";

/**
 * Geometric monthly compounding rate.
 * Supports negative inflation (depreciation) down to -99.99%.
 * At or below -100%, an asset drops to zero immediately.
 */
export function getGeometricMonthlyRate(annualRatePercentage: number): number {
  if (annualRatePercentage <= -100) return -1;
  return Math.pow(1 + annualRatePercentage / 100, 1 / 12) - 1;
}

export function evaluateGoal(goal: SavingsGoalItem): GoalCalculationResult {
  const targetPrice = Math.max(0, Number(goal.targetPrice) || 0);
  const currentSaved = Math.max(0, Number(goal.currentSaved) || 0);
  const monthlyAllocation = Math.max(0, Number(goal.monthlyAllocation) || 0);
  const inflationRate = Number(goal.annualInflationRate) || 0;

  const todayRemainingAmount = Math.max(0, targetPrice - currentSaved);
  const progressPercentage = targetPrice > 0
    ? Math.min(100, Math.round((currentSaved / targetPrice) * 100))
    : (currentSaved > 0 ? 100 : 0);

  // If already funded
  if (currentSaved >= targetPrice && targetPrice > 0) {
    return {
      realMonthsToGoal: 0,
      realFuturePrice: targetPrice,
      todayRemainingAmount: 0,
      progressPercentage: 100,
      isUnreachable: false,
    };
  }

  // Without active monthly allocation, non-funded goals cannot be reached
  if (monthlyAllocation <= 0) {
    return {
      realMonthsToGoal: 0,
      realFuturePrice: targetPrice,
      todayRemainingAmount,
      progressPercentage,
      isUnreachable: true,
    };
  }

  const monthlyRate = getGeometricMonthlyRate(inflationRate);
  let month = 0;
  let accumulated = currentSaved;
  let currentPrice = targetPrice;
  const MAX_MONTHS = 600; // 50-year horizon cap

  while (accumulated < currentPrice && month < MAX_MONTHS) {
    month++;
    accumulated += monthlyAllocation;
    currentPrice = targetPrice * Math.pow(1 + monthlyRate, month);
    if (currentPrice <= 0) {
      currentPrice = 0;
      break;
    }
  }

  const isUnreachable = month >= MAX_MONTHS && accumulated < currentPrice;

  return {
    realMonthsToGoal: month,
    realFuturePrice: Math.round(currentPrice),
    todayRemainingAmount,
    progressPercentage,
    isUnreachable,
  };
}

export function getMotivationalMessage(percent: number, remainingToday: number): string {
  if (percent >= 100) return "🎉 Goal Reached! You have completely funded this target.";
  if (remainingToday <= 0) return "🎉 Target achieved! Ready for purchase.";
  if (percent >= 75) return `🔥 Almost there! Just ₹${remainingToday.toLocaleString()} left to achieve this!`;
  if (percent >= 50) return `🚀 Past the halfway mark! Just ₹${remainingToday.toLocaleString()} left to go.`;
  if (percent >= 25) return `🌱 Steady progress! Just ₹${remainingToday.toLocaleString()} remaining.`;
  return `✨ Journey underway. ₹${remainingToday.toLocaleString()} needed to hit your current target.`;
}
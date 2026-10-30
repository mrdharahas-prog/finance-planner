import type { SavingsGoalItem, GoalCalculationResult } from "./types";

export function getGeometricMonthlyRate(annualRatePercentage: number): number {
  if (annualRatePercentage <= 0) return 0;
  return Math.pow(1 + annualRatePercentage / 100, 1 / 12) - 1;
}

export function evaluateGoal(goal: SavingsGoalItem): GoalCalculationResult {
  const { targetPrice, currentSaved, monthlyAllocation, annualInflationRate } = goal;

  const remaining = Math.max(0, targetPrice - currentSaved);
  const progressPercentage = targetPrice > 0 
    ? Math.min(100, Math.round((currentSaved / targetPrice) * 100)) 
    : 0;

  if (monthlyAllocation <= 0 || targetPrice <= 0) {
    return {
      realMonthsToGoal: 0,
      realFuturePrice: targetPrice,
      remainingAmount: remaining,
      progressPercentage,
    };
  }

  const monthlyRate = getGeometricMonthlyRate(annualInflationRate);
  let month = 0;
  let accumulated = currentSaved;
  let currentPrice = targetPrice;
  const MAX_MONTHS = 600; // 50-year cap

  while (accumulated < currentPrice && month < MAX_MONTHS) {
    month++;
    accumulated += monthlyAllocation;
    currentPrice = targetPrice * Math.pow(1 + monthlyRate, month);
  }

  return {
    realMonthsToGoal: month,
    realFuturePrice: Math.round(currentPrice),
    remainingAmount: Math.max(0, Math.round(currentPrice - accumulated)),
    progressPercentage,
  };
}

export function getMotivationalMessage(percent: number, remaining: number): string {
  if (percent >= 100) return "🎉 Incredible! You've reached your target goal!";
  if (percent >= 75) return `🔥 Almost there! Just ₹${remaining.toLocaleString()} left to achieve this dream!`;
  if (percent >= 50) return `🚀 Halfway done! You've built real momentum. Just ₹${remaining.toLocaleString()} remaining.`;
  if (percent >= 25) return `🌱 Great start! 25% completed. Consistency is turning this into reality!`;
  return `✨ Every journey starts with step one. Just ₹${remaining.toLocaleString()} left to go!`;
}
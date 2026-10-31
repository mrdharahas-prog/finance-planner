import type { SavingsGoalItem, GoalCalculationResult, TransactionRecord } from "./types";

export function getGeometricMonthlyRate(annualRatePercentage: number): number {
  if (annualRatePercentage <= -100) return -1;
  return Math.pow(1 + annualRatePercentage / 100, 1 / 12) - 1;
}

export function computeGoalBalance(
  goal: SavingsGoalItem,
  transactions: TransactionRecord[]
): number {
  const goalTransactions = transactions.filter((t) => t.goalId === goal.id);
  const netActivity = goalTransactions.reduce((acc, t) => {
    return t.type === "deposit" ? acc + t.amount : acc - t.amount;
  }, 0);
  return (Number(goal.initialDeposit) || 0) + netActivity;
}

export function calculateRequiredMonthlySavings(
  targetPrice: number,
  currentSaved: number,
  targetMonths: number,
  annualInflationRate: number
): number {
  const cleanMonths = Math.max(1, Math.round(targetMonths));
  const monthlyRate = getGeometricMonthlyRate(annualInflationRate);
  const futurePrice = targetPrice * Math.pow(1 + monthlyRate, cleanMonths);
  const deficit = Math.max(0, futurePrice - currentSaved);
  return Math.ceil(deficit / cleanMonths);
}

export function evaluateGoal(
  goal: SavingsGoalItem,
  currentBalance: number
): GoalCalculationResult {
  const targetPrice = Math.max(0, Number(goal.targetPrice) || 0);
  const monthlyAllocation = Math.max(0, Number(goal.monthlyAllocation) || 0);
  const targetMonths = Math.max(1, Math.round(Number(goal.targetMonths) || 1));
  const inflationRate = Number(goal.annualInflationRate) || 0;
  const monthlyRate = getGeometricMonthlyRate(inflationRate);

  const todayRemaining = Math.max(0, targetPrice - currentBalance);
  const progressPercentage = targetPrice > 0
    ? Math.min(100, Math.round((currentBalance / targetPrice) * 100))
    : (currentBalance > 0 ? 100 : 0);

  const requiredMonthlyForDeadline = calculateRequiredMonthlySavings(
    targetPrice,
    currentBalance,
    targetMonths,
    inflationRate
  );

  const minMonthlyFor5Years = calculateRequiredMonthlySavings(
    targetPrice,
    currentBalance,
    60,
    inflationRate
  );

  if (currentBalance >= targetPrice && targetPrice > 0) {
    return {
      currentBalance,
      todayRemaining: 0,
      progressPercentage: 100,
      realMonthsToGoal: 0,
      realFuturePrice: targetPrice,
      requiredMonthlyForDeadline: 0,
      minMonthlyFor5Years: 0,
      isUnreachable: false,
    };
  }

  if (goal.mode === "byDeadline") {
    const futurePrice = Math.round(targetPrice * Math.pow(1 + monthlyRate, targetMonths));
    return {
      currentBalance,
      todayRemaining,
      progressPercentage,
      realMonthsToGoal: targetMonths,
      realFuturePrice: futurePrice,
      requiredMonthlyForDeadline,
      minMonthlyFor5Years,
      isUnreachable: false,
    };
  }

  if (monthlyAllocation <= 0) {
    return {
      currentBalance,
      todayRemaining,
      progressPercentage,
      realMonthsToGoal: 0,
      realFuturePrice: targetPrice,
      requiredMonthlyForDeadline,
      minMonthlyFor5Years,
      isUnreachable: true,
    };
  }

  let month = 0;
  let accumulated = currentBalance;
  let currentPrice = targetPrice;
  const MAX_MONTHS = 600;

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
    currentBalance,
    todayRemaining,
    progressPercentage,
    realMonthsToGoal: month,
    realFuturePrice: Math.round(currentPrice),
    requiredMonthlyForDeadline,
    minMonthlyFor5Years,
    isUnreachable,
  };
}

export function getMotivationalMessage(percent: number, remainingToday: number): string {
  if (percent >= 100) return "🎉 Target reached! You have completely funded this purchase.";
  if (remainingToday <= 0) return "🎉 Fully funded! Ready whenever you are.";
  if (percent >= 75) return `🔥 Almost there! Just ₹${remainingToday.toLocaleString()} left to achieve this!`;
  if (percent >= 50) return `🚀 Past the halfway mark! ₹${remainingToday.toLocaleString()} left to complete this goal.`;
  if (percent >= 25) return `🌱 Strong traction! ₹${remainingToday.toLocaleString()} remaining.`;
  return `✨ First steps matter. ₹${remainingToday.toLocaleString()} left to fully fund today's base price.`;
}
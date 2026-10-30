export interface SavingsGoalItem {
  id: string;
  title: string;
  targetPrice: number;
  currentSaved: number;
  monthlyAllocation: number; // in ₹
  annualInflationRate: number; // percentage
}

export interface GoalCalculationResult {
  realMonthsToGoal: number;
  realFuturePrice: number;
  remainingAmount: number;
  progressPercentage: number;
}
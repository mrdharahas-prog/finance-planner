export interface SavingsGoalItem {
  id: string;
  title: string;
  targetPrice: number;
  currentSaved: number;
  monthlyAllocation: number;
  annualInflationRate: number;
}

export interface GoalCalculationResult {
  realMonthsToGoal: number;
  realFuturePrice: number;
  todayRemainingAmount: number;
  progressPercentage: number;
  isUnreachable: boolean;
}

export interface TransactionRecord {
  id: string;
  goalId: string;
  goalTitle: string;
  type: "deposit" | "withdraw";
  amount: number;
  timestamp: string; // ISO String
}
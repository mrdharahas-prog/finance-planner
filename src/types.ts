export type GoalMode = "bySavings" | "byDeadline";

export interface SavingsGoalItem {
  id: string;
  title: string;
  targetPrice: number;
  initialDeposit: number;
  mode: GoalMode;
  monthlyAllocation: number; // Used in "bySavings" mode
  targetMonths: number;      // Used in "byDeadline" mode
  annualInflationRate: number; // Supports negative for depreciation
}

export interface TransactionRecord {
  id: string;
  goalId: string;
  goalTitle: string;
  type: "deposit" | "withdraw";
  amount: number;
  isoTimestamp: string;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
}

export interface GoalCalculationResult {
  currentBalance: number;
  todayRemaining: number;
  progressPercentage: number;
  realMonthsToGoal: number;
  realFuturePrice: number;
  requiredMonthlyForDeadline: number;
  minMonthlyFor5Years: number;
  isUnreachable: boolean;
}
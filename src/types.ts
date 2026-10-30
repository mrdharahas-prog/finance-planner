export interface SavingsGoal {
  monthlyIncome: number;
  itemPrice: number;
  priceMultiplier: number;
  monthlySavings: number;
  savingsRatePercentage: number;
  staticMonthsToGoal: number;
  realMonthsToGoal: number;
  realFuturePrice: number;
  totalSavedAtGoal: number;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
}

export interface FeasibilityReport {
  totalExpenses: number;
  disposableIncome: number;
  maxFeasibleSavingsRate: number;
  isFeasible: boolean;
}